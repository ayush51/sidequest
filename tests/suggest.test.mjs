// Suggestions: a quest and a feature wait for review; regular users can't open /admin.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to clean up the throwaway account).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const name = `zz_test_sg${Math.floor(Math.random() * 1e6)}`;
const email = `${name}@users.sidequest.app`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	// Suggested quests outlive the account (author is set to null), so delete them first.
	sql(
		`delete from quests where author_id in (select id from auth.users where email = '${email}')`,
	);
	sql(`delete from auth.users where email = '${email}'`);
});

test("suggest a quest and a feature; /admin is hidden from regular users", async () => {
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
	await page.getByRole("link", { name: "Suggest a quest or feature" }).click();
	await page.waitForURL(/\/suggest/);
	await page.waitForLoadState("networkidle"); // let the forms hydrate

	// Quest: too-short title is rejected by the database, a valid one is accepted.
	await page.fill("input[name=title]", "ab");
	await page.fill(
		"textarea[name=description]",
		"Find a public spot with a view and watch the sunrise.",
	);
	await page.selectOption("select[name=category]", "outdoors");
	await page.getByRole("button", { name: "Suggest quest" }).click();
	await page.getByText("The title must be 3-60 characters.").waitFor();
	await page.fill("input[name=title]", "Rooftop Sunrise");
	await page.fill(
		"textarea[name=description]",
		"Find a public spot with a view and watch the sunrise.",
	);
	await page.selectOption("select[name=category]", "outdoors");
	await page.getByRole("button", { name: "Suggest quest" }).click();
	await page.getByText(/joins the pool once it.s approved/).waitFor();

	// Feature
	await page.locator("input[name=title]").last().fill("Dark map view");
	await page
		.locator("textarea[name=details]")
		.fill("A map of all the quest spots would be great.");
	await page.getByRole("button", { name: "Suggest feature" }).click();
	await page.getByText(/idea is waiting for review/).waitFor();

	// Both show up as waiting, and the quest is pending (not in the pool) in the database.
	await page.reload();
	await page.getByText("Rooftop Sunrise").waitFor();
	await page.getByText("Dark map view").waitFor();
	assert.equal(await page.getByText("Waiting for review").count(), 2);
	const row = sql(
		`select status from quests where title = 'Rooftop Sunrise' and author_id in (select id from auth.users where email = '${email}')`,
	);
	assert.match(row, /"status": "pending"/);

	// Regular users get a not-found page (the HTTP status is already 200 once the page
	// streams), see none of the admin content, and have no Admin link.
	await page.goto(`${BASE}/admin`);
	await page.getByText(/could not be found/i).waitFor();
	assert.equal(await page.getByText("Quest suggestions").count(), 0);
	assert.equal(await page.getByText("Feature requests").count(), 0);
	await page.goto(`${BASE}/profile`);
	assert.equal(await page.getByRole("link", { name: "Admin" }).count(), 0);
});
