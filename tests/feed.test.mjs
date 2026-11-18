// Feed reactions and comments: a friend reacts (one at a time, reversible) and comments, the poster
// sees it but can't delete the friend's comment, and a stranger sees and can do nothing.
// Needs the app running (pnpm dev) with .env.local, and a logged-in Supabase CLI.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const fileEnv = Object.fromEntries(
	readFileSync(new URL("../.env.local", import.meta.url), "utf8")
		.split("\n")
		.filter((l) => l.includes("=") && !l.startsWith("#"))
		.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const env = (key) => process.env[key] ?? fileEnv[key];

const suffix = Math.floor(Math.random() * 1e6);
const nameA = `zz_test_fa${suffix}`;
const nameB = `zz_test_fb${suffix}`;
const nameC = `zz_test_fc${suffix}`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();
const rows = (query) => JSON.parse(sql(query)).rows;
const idOf = (name) => `(select id from profiles where username = '${name}')`;

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	for (const name of [nameA, nameB, nameC]) {
		sql(`delete from auth.users where email = '${name}@users.sidequest.app'`);
	}
});

async function signUp(name) {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	await page.goto(`${BASE}/login`);
	await page.getByRole("button", { name: /Create account/ }).click();
	await page.fill("input[name=name]", name);
	await page.fill("input[name=pin]", "4821");
	await page.getByRole("button", { name: "Create account" }).last().click();
	await page.waitForURL(/\/interests/);
	await page.getByText("Outdoors", { exact: true }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await page.waitForURL((u) => u.pathname === "/");
	await page.getByRole("button", { name: /Complete quest/ }).waitFor();
	return page;
}

const feed = async (page) => {
	await page.goto(`${BASE}/friends?view=feed`);
	await page.waitForLoadState("networkidle"); // let the buttons hydrate
	return page.locator("article", { hasText: nameA });
};

// The thumbs update on screen instantly; wait until the change is really saved.
const settle = async (query, expected) => {
	for (
		let i = 0;
		i < 12 && String(rows(query).length) !== String(expected);
		i++
	) {
		await new Promise((r) => setTimeout(r, 500));
	}
	assert.equal(rows(query).length, expected);
};

test("react, comment, moderation and privacy on a feed post", async () => {
	const a = await signUp(nameA);
	const b = await signUp(nameB);
	// A finished today's quest and is friends with B. A has reminders on (a device that can't be
	// reached), so a comment runs the poster-ping code without delivering anything.
	sql(
		`insert into friendships (requester_id, addressee_id, status)
		 select ${idOf(nameA)}, ${idOf(nameB)}, 'accepted'`,
	);
	sql(
		`update user_quests set status = 'completed', completed_at = now()
		 where user_id = ${idOf(nameA)} and kind = 'daily'`,
	);
	sql(
		`insert into push_subscriptions (user_id, endpoint, p256dh, auth)
		 select ${idOf(nameA)}, 'https://127.0.0.1:9/' || '${nameA}', 'key', 'auth'`,
	);
	const post = rows(
		`select id from user_quests where user_id = ${idOf(nameA)} and kind = 'daily'`,
	)[0].id;
	const reactions = `select 1 from feed_reactions where user_quest_id = '${post}'`;
	const comments = `select 1 from feed_comments where user_quest_id = '${post}'`;

	// B reacts: one at a time, and tapping again takes it back.
	const article = await feed(b);
	const heart = article.getByRole("button", { name: "Heart" });
	const fire = article.getByRole("button", { name: "Fire" });
	await heart.click();
	await settle(reactions, 1);
	assert.equal(await heart.getAttribute("aria-pressed"), "true");
	await fire.click();
	await settle(reactions, 1);
	assert.equal(await fire.getAttribute("aria-pressed"), "true");
	assert.equal(await heart.getAttribute("aria-pressed"), "false");
	assert.equal(
		rows(`select kind from feed_reactions where user_quest_id = '${post}'`)[0]
			.kind,
		"fire",
	);
	const again = await feed(b);
	assert.equal(
		await again
			.getByRole("button", { name: "Fire" })
			.getAttribute("aria-pressed"),
		"true",
	);
	await again.getByRole("button", { name: "Fire" }).click();
	await settle(reactions, 0);

	// B comments, then deletes their own comment.
	await again.getByRole("button", { name: "Comment", exact: true }).click();
	await again.getByLabel("Add a comment").fill("nice one");
	await again.getByRole("button", { name: "Send comment" }).click();
	await again.getByText("nice one").waitFor();
	await settle(comments, 1);
	await again.getByRole("button", { name: "Delete comment" }).click();
	await settle(comments, 0);

	// B comments again; A (the poster) sees it but can't delete it.
	const second = await feed(b);
	await second.getByRole("button", { name: "Comment", exact: true }).click();
	await second.getByLabel("Add a comment").fill("you did it");
	await second.getByRole("button", { name: "Send comment" }).click();
	await settle(comments, 1);
	const mine = await feed(a);
	await mine.getByRole("button", { name: "1", exact: true }).click();
	await mine.getByText("you did it").waitFor();
	assert.equal(
		await mine.getByText(nameB, { exact: true }).count(),
		1,
		"shows who commented",
	);
	assert.equal(
		await mine.getByRole("button", { name: "Delete comment" }).count(),
		0,
		"poster cannot delete B's comment",
	);

	// A stranger sees nothing and can do nothing.
	const stranger = createClient(
		env("NEXT_PUBLIC_SUPABASE_URL"),
		env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
	);
	assert.ifError(
		(
			await stranger.auth.signUp({
				email: `${nameC}@users.sidequest.app`,
				password: `${nameC}:4821`,
				options: { data: { username: nameC } },
			})
		).error,
	);
	assert.equal(
		(await stranger.from("feed_comments").select("id")).data.length,
		0,
	);
	assert.ok(
		(
			await stranger
				.from("feed_comments")
				.insert({ user_quest_id: post, body: "hi" })
		).error,
		"stranger cannot comment",
	);
	assert.ok(
		(
			await stranger
				.from("feed_reactions")
				.insert({ user_quest_id: post, kind: "heart" })
		).error,
		"stranger cannot react",
	);
});
