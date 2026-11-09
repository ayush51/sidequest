// Two users: add each other by name search, accept, finish quests, check the weekly leaderboard.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to delete the throwaway accounts).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const suffix = Math.floor(Math.random() * 1e6);
const nameA = `zz_test_fa${suffix}`;
const nameB = `zz_test_fb${suffix}`;
let browser;

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	for (const name of [nameA, nameB]) {
		execFileSync("supabase", [
			"db",
			"query",
			"--linked",
			`delete from auth.users where email = '${name}@users.sidequest.app'`,
		]);
	}
});

async function signUpAndFinishQuest(name) {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	await page.goto(`${BASE}/login`);
	await page.getByRole("button", { name: /Create account/ }).click();
	await page.fill("input[name=name]", name);
	await page.fill("input[name=pin]", "4821");
	await page.getByRole("button", { name: "Create account" }).last().click();
	await page.waitForURL(/\/interests/);
	await page.getByText("Wholesome Chaos", { exact: true }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await page.waitForURL((u) => u.pathname === "/");
	await page.getByRole("button", { name: /Complete quest/ }).click();
	await page.getByText(/XP earned/).waitFor();
	return page;
}

test("friends: search, request, accept, weekly leaderboard", async () => {
	const a = await signUpAndFinishQuest(nameA);
	const b = await signUpAndFinishQuest(nameB);

	// Alone, each sees only themselves on the board.
	await a.goto(`${BASE}/friends`);
	await a.getByText("This week").waitFor();
	assert.equal(await a.locator("ol > li").count(), 1);

	// A finds B by name and sends a request.
	await a.fill("input[name=q]", nameB);
	await a.getByRole("button", { name: "Search" }).click();
	await a.getByText(nameB).waitFor();
	await a.getByRole("button", { name: "Add" }).click();
	await a.getByText("Requested").waitFor();

	// B accepts from the requests inbox.
	await b.goto(`${BASE}/friends`);
	await b.getByRole("button", { name: "Accept" }).click();
	await b
		.getByRole("button", { name: "Accept" })
		.waitFor({ state: "detached" });

	// Both now see both on the board, ranked by points (highest first).
	for (const page of [a, b]) {
		await page.goto(`${BASE}/friends`);
		await page.getByText("This week").waitFor();
		await page.waitForFunction(
			() => document.querySelectorAll("ol > li").length === 2,
		);
		const rows = await page.$$eval("ol > li", (items) =>
			items.map((li) => ({
				text: li.textContent,
				points: Number(li.lastElementChild.textContent),
			})),
		);
		assert.ok(rows.some((r) => r.text.includes(nameA)));
		assert.ok(rows.some((r) => r.text.includes(nameB)));
		assert.ok(
			rows.every((r) => r.points > 0),
			"both finished a quest this week",
		);
		assert.ok(
			rows[0].points >= rows[1].points,
			"sorted by points, highest first",
		);
		assert.equal(
			await page.locator("ol > li", { hasText: "(you)" }).count(),
			1,
			"exactly one row is marked as you",
		);
	}
});
