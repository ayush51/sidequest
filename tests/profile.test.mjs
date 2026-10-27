// Profile: change display name, upload a photo, change the 4-digit code, sign out and back in.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to clean up the throwaway account).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const name = `zz_test_pr${Math.floor(Math.random() * 1e6)}`;
const email = `${name}@users.sidequest.app`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	// Delete the uploaded avatar (exact paths only), then the account.
	const files = sql(
		`select o.name from storage.objects o join auth.users u on o.name like u.id::text || '/%' where o.bucket_id = 'avatars' and u.email = '${email}'`,
	).match(/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg/g);
	for (const file of files ?? []) {
		execFileSync("supabase", [
			"storage",
			"rm",
			`ss:///avatars/${file}`,
			"--linked",
			"--experimental",
			"--yes",
		]);
	}
	sql(`delete from auth.users where email = '${email}'`);
});

test("profile: name, photo, code change, sign out and back in", async () => {
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
	await page.waitForURL(/\/profile/);
	await page.getByText(`@${name}`).waitFor();

	// Display name persists across a reload and shows on the leaderboard.
	await page.fill("#display-name", "Test Nova");
	await page.getByRole("button", { name: "Save name" }).click();
	await page.getByText("Saved.").waitFor();
	await page.reload();
	await page.waitForLoadState("networkidle"); // let the page hydrate before using it
	assert.equal(await page.inputValue("#display-name"), "Test Nova");

	// Photo: upload a generated JPEG; it must be served from the public bucket.
	const dataUrl = await page.evaluate(() => {
		const c = document.createElement("canvas");
		c.width = 800;
		c.height = 600;
		const g = c.getContext("2d");
		g.fillStyle = "#c6ff3d";
		g.fillRect(0, 0, 800, 600);
		return c.toDataURL("image/jpeg", 0.9);
	});
	await page.setInputFiles("input[type=file]", {
		name: "me.jpg",
		mimeType: "image/jpeg",
		buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
	});
	const avatar = page.locator('main img[src*="/avatars/"]');
	await avatar.waitFor();
	await page.waitForFunction(
		() =>
			document.querySelector('main img[src*="/avatars/"]')?.naturalWidth > 0,
	);

	await page.getByRole("link", { name: "Friends" }).click();
	await page.waitForURL(/\/friends/);
	await page.getByText("Test Nova").first().waitFor();
	await page.locator('ol img[src*="/avatars/"]').waitFor();

	// Code change: wrong current code is rejected, right one works.
	await page.goto(`${BASE}/profile`);
	await page.fill("input[name=current]", "0000");
	await page.fill("input[name=next]", "1234");
	await page.getByRole("button", { name: "Change code" }).click();
	await page.getByText("Your current code is wrong.").waitFor();
	await page.fill("input[name=current]", "4821");
	await page.fill("input[name=next]", "1234");
	await page.getByRole("button", { name: "Change code" }).click();
	await page.getByText("Code changed.").waitFor();

	// Old code no longer works; the new one does.
	await page.getByRole("button", { name: "Sign out" }).click();
	await page.waitForURL(/\/login/);
	await page.fill("input[name=name]", name);
	await page.fill("input[name=pin]", "4821");
	await page.getByRole("button", { name: /Let.s go/ }).click();
	await page.getByText("Wrong name or code.").waitFor();
	assert.equal(
		await page.inputValue("input[name=name]"),
		name,
		"name is kept after a wrong code",
	);
	await page.fill("input[name=pin]", "1234");
	await page.getByRole("button", { name: /Let.s go/ }).click();
	await page.waitForURL((u) => u.pathname === "/");
});
