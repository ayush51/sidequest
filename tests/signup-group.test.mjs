// Signup with a group code: a good code joins the group, a bad one still creates the account
// and lands on Friends. The group is created with SQL here.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to set up and clean up).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const suffix = Math.floor(Math.random() * 1e6);
const nameA = `zz_test_sa${suffix}`;
const nameB = `zz_test_sb${suffix}`;
const groupName = `Test Signup ${suffix}`;
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

async function signUp(name, group) {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	await page.goto(`${BASE}/login`);
	await page.getByRole("button", { name: /Create account/ }).click();
	await page.fill("input[name=name]", name);
	await page.fill("input[name=pin]", "4821");
	await page.fill("input[name=group]", group);
	await page.getByRole("button", { name: "Create account" }).last().click();
	return page;
}

test("signup with a group code joins the group", async () => {
	const page = await signUp(nameA, code.toLowerCase());
	await page.waitForURL(/\/interests/);
	await page.goto(`${BASE}/friends`);
	await page.getByText(`${groupName} · 1 member`).waitFor();
});

test("a wrong group code still creates the account and lands on Friends", async () => {
	const page = await signUp(nameB, "NOPE12");
	await page.waitForURL(/\/friends/);
	assert.equal(await page.getByText(groupName).count(), 0);
});
