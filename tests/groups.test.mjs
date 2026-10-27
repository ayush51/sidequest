// Groups: join by code, see each other without adding, leave. The group is created with SQL
// here; creating groups through the admin page is covered in admin.test.mjs.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to set up and clean up).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const suffix = Math.floor(Math.random() * 1e6);
const nameA = `zz_test_ga${suffix}`;
const nameB = `zz_test_gb${suffix}`;
const groupName = `Test Square ${suffix}`;
const code = `ZZ${String(suffix).padStart(6, "0").slice(0, 4)}`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

before(async () => {
	browser = await chromium.launch();
	sql(`insert into groups (name, code) values ('${groupName}', '${code}')`);
});

after(async () => {
	await browser?.close();
	sql(`delete from groups where name = '${groupName}'`);
	for (const name of [nameA, nameB]) {
		sql(`delete from auth.users where email = '${name}@users.sidequest.app'`);
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
	await page.getByText(/pts earned/).waitFor();
	return page;
}

async function joinGroup(page, groupCode) {
	await page.goto(`${BASE}/friends`);
	await page.waitForLoadState("networkidle"); // let the form hydrate
	await page.fill("input[name=code]", groupCode);
	await page.getByRole("button", { name: "Join" }).click();
}

test("groups: join by code, see each other, leave", async () => {
	const a = await signUpAndFinishQuest(nameA);
	const b = await signUpAndFinishQuest(nameB);

	// A wrong code is rejected.
	await joinGroup(a, "NOPE12");
	await a.getByText("That code didn't work.").waitFor();

	// Both join with the code (A types it in lowercase).
	await joinGroup(a, code.toLowerCase());
	await a.getByText(`You joined ${groupName}.`).waitFor();
	await joinGroup(b, code);
	await b.getByText(`You joined ${groupName}.`).waitFor();

	// Without adding each other, both appear on each other's board and feed.
	for (const [page, other] of [
		[a, nameB],
		[b, nameA],
	]) {
		await page.goto(`${BASE}/friends`);
		await page.waitForFunction(
			() => document.querySelectorAll("ol > li").length === 2,
		);
		await page.locator("ol > li", { hasText: other }).waitFor();
		await page.locator("article", { hasText: other }).first().waitFor();
		await page.getByText(`${groupName} · 2 members`).waitFor();
	}

	// A leaves; B no longer sees A anywhere, and the group shrinks to 1.
	await a.goto(`${BASE}/friends`);
	await a.getByRole("button", { name: "Leave" }).click();
	await a.getByText(groupName).waitFor({ state: "detached" });
	await b.goto(`${BASE}/friends`);
	await b.waitForFunction(
		() => document.querySelectorAll("ol > li").length === 1,
	);
	assert.equal(await b.getByText(nameA).count(), 0, "A is gone from B's page");
	await b.getByText(`${groupName} · 1 member`).waitFor();
});
