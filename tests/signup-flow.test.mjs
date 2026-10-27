// End-to-end check of the new-user flow. Needs the app running (pnpm dev) and a
// logged-in Supabase CLI (used only to delete the throwaway account afterward).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const name = `zz_test_e2e${Math.floor(Math.random() * 1e6)}`;
let browser;
let page;

before(async () => {
	browser = await chromium.launch();
	page = await browser.newPage({ viewport: { width: 390, height: 844 } });
});

after(async () => {
	await browser?.close();
	execFileSync("supabase", [
		"db",
		"query",
		"--linked",
		`delete from auth.users where email = '${name}@users.sidequest.app'`,
	]);
});

const path = () => new URL(page.url()).pathname;

test("new user: signup -> interests -> first quest -> complete -> edit", async () => {
	await page.goto(`${BASE}/login`);
	await page.getByRole("button", { name: /Create account/ }).click();
	await page.fill("input[name=name]", name);
	await page.fill("input[name=pin]", "4821");
	await page.getByRole("button", { name: "Create account" }).last().click();
	await page.waitForURL(/\/interests/);
	assert.equal(path(), "/interests", "new users are sent to the picker");

	await page.getByRole("button", { name: "Save" }).click();
	await page.getByText("Pick at least one").waitFor();

	await page.getByText("Outdoors", { exact: true }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await page.waitForURL((u) => u.pathname === "/");

	// Regression: the first visit used to show "No quests available yet".
	await page.getByText(/today.s quest/i).waitFor();
	assert.equal(await page.getByText("No quests available").count(), 0);
	assert.ok((await page.locator("h2").first().textContent())?.length > 0);

	await page.getByRole("button", { name: /Complete quest/ }).click();
	await page.getByText(/pts earned/).waitFor();
	const points = await page.locator("li", { hasText: "Points" }).textContent();
	assert.ok(
		!points.startsWith("0"),
		`points should be awarded, got: ${points}`,
	);

	await page.reload();
	await page.getByText(/pts earned/).waitFor();

	await page.getByRole("link", { name: "Interests" }).click();
	await page.waitForURL(/\/interests/);
	await page
		.locator("input[name=interest]")
		.first()
		.waitFor({ state: "attached" });
	const checked = await page.$$eval("input[name=interest]:checked", (els) =>
		els.map((e) => e.value),
	);
	assert.deepEqual(checked, ["outdoors"], "saved picks are preselected");
});
