// Character: Profile shows four stats and the achievement cards, which unlock from XP and streak.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to set XP and clean up the throwaway account).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const name = `zz_test_ch${Math.floor(Math.random() * 1e6)}`;
const email = `${name}@users.sidequest.app`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	sql(`delete from auth.users where email = '${email}'`);
});

test("profile shows stats and unlocks achievements", async () => {
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

	await page.getByRole("link", { name: "Profile" }).click();
	await page.getByText("Character", { exact: true }).waitFor();
	for (const stat of ["Body", "Mind", "Taste", "Chaos"]) {
		await page.getByText(stat, { exact: true }).waitFor();
	}
	const cards = page.locator("li[data-earned]");
	assert.equal(await cards.count(), 10);
	assert.equal(await page.locator("li[data-earned=true]").count(), 0);

	// 600 XP and an 8-day best streak unlock: 3-day, 7-day, 100 XP, 500 XP.
	sql(
		`update profiles set points = 600, longest_streak = 8 where id = (select id from auth.users where email = '${email}')`,
	);
	await page.reload();
	await page.getByText("Character", { exact: true }).waitFor();
	assert.equal(await page.locator("li[data-earned=true]").count(), 4);
});
