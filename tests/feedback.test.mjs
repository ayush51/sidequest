// Feedback: thumbs up/down on a quest (and taking it back), and rerolling into a chosen category
// never lands on a thumbs-downed quest. The category pool is set up with SQL so the result is certain.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to set up and clean up).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const name = `zz_test_fb${Math.floor(Math.random() * 1e6)}`;
const email = `${name}@users.sidequest.app`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();
const rows = (query) => JSON.parse(sql(query)).rows;
const uidOf = `(select id from auth.users where email = '${email}')`;

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	sql(`delete from auth.users where email = '${email}'`);
});

test("thumbs are saved and reversible; a rerolled category skips disliked quests", async () => {
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
	await page.getByText(/today.s quest/i).waitFor();
	await page.waitForLoadState("networkidle"); // let the thumbs hydrate

	const votes = () =>
		rows(`select vote from quest_feedback where user_id = ${uidOf}`).map(
			(r) => r.vote,
		);

	// The thumbs update instantly on screen; wait until the vote is really saved.
	const settle = async (expected) => {
		for (let i = 0; i < 10 && String(votes()) !== String(expected); i++) {
			await page.waitForTimeout(500);
		}
		assert.deepEqual(votes(), expected);
	};

	// Thumbs down is saved and survives a reload; tapping it again takes it back.
	await page.getByRole("button", { name: "Not for me" }).click();
	await page.getByText("Got it. This one won't come back.").waitFor();
	await settle([-1]);
	await page.reload();
	await page.waitForLoadState("networkidle");
	assert.equal(
		await page
			.getByRole("button", { name: "Not for me" })
			.getAttribute("aria-pressed"),
		"true",
	);
	await page.getByRole("button", { name: "Not for me" }).click();
	await page.getByText("Like this one?").waitFor();
	await settle([]);
	await page.getByRole("button", { name: "Like this quest" }).click();
	await page.getByText("Nice. You'll get more like this.").waitFor();
	await settle([1]);
	await page.getByRole("button", { name: "Like this quest" }).click();
	await page.getByText("Like this one?").waitFor();
	await settle([]);

	// Setup: today's quest is an outdoors one, and every music quest but one is thumbs-downed.
	const keep = rows(
		"select id, title from quests where category = 'music' and status = 'approved' order by title limit 1",
	)[0];
	sql(
		`update user_quests set quest_id = (select id from quests where category = 'outdoors' and status = 'approved' order by title limit 1)
		 where user_id = ${uidOf} and kind = 'daily'`,
	);
	sql(
		`insert into quest_feedback (user_id, quest_id, vote)
		 select ${uidOf}, id, -1 from quests where category = 'music' and status = 'approved' and id <> '${keep.id}'`,
	);
	await page.reload();
	await page.waitForLoadState("networkidle");

	// Rerolling into Music can only land on the one quest that wasn't thumbs-downed.
	await page.selectOption("select[name=category]", "music");
	await page.getByRole("button", { name: /Reroll/ }).click();
	await page.getByRole("heading", { name: keep.title }).waitFor();

	// Nothing else is left in Music, and the page says so.
	await page.selectOption("select[name=category]", "music");
	await page.getByRole("button", { name: /Reroll/ }).click();
	await page.getByText("No more quests in that category.").waitFor();
});
