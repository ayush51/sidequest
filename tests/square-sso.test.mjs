// Signing in from The Square (app/sso, app/link): a pass for someone new goes
// to /link, where they create an account; their next pass signs them straight
// in; a used pass, a forged one and an expired one land on /login.
// Needs the app running (pnpm dev) with SQUARE_SSO_SECRET and
// SUPABASE_SERVICE_ROLE_KEY set, and a logged-in Supabase CLI (for clean-up).
// Skipped when SQUARE_SSO_SECRET isn't set.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.SQUARE_SSO_SECRET;
const suffix = Math.floor(Math.random() * 1e6);
const name = `zz_test_sq${suffix}`;
const sub = `zz-square-${suffix}`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

// The same shape The Square's lib/app-pass.js mints.
function pass({ exp = 300, secret = SECRET } = {}) {
	const now = Math.floor(Date.now() / 1000);
	const payload = Buffer.from(
		JSON.stringify({
			v: 1,
			aud: "sidequest",
			iss: "zz-test",
			sub,
			name: "Square Tester",
			owner: false,
			iat: now,
			exp: now + exp,
			jti: randomBytes(16).toString("base64url"),
		}),
	).toString("base64url");
	const sig = createHmac("sha256", secret).update(payload).digest("base64url");
	return `${payload}.${sig}`;
}

before(async () => {
	if (SECRET) browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	if (SECRET) {
		// The link goes with the user (on delete cascade).
		sql(`delete from auth.users where email = '${name}@users.sidequest.app'`);
	}
});

test("a pass from The Square links, then signs straight in", {
	skip: !SECRET,
}, async () => {
	// First visit: not linked, so create an account on /link.
	const first = await browser.newPage({
		viewport: { width: 390, height: 844 },
	});
	await first.goto(`${BASE}/sso?t=${pass()}`);
	await first.waitForURL(/\/link/);
	await first.getByText("Hi, Square Tester").waitFor();
	await first.getByRole("button", { name: /New to SideQuest/ }).click();
	await first.fill("input[name=name]", name);
	await first.fill("input[name=pin]", "4821");
	await first.getByRole("button", { name: "Create and link" }).click();
	await first.waitForURL((u) => !/\/(link|login)/.test(u.pathname));

	// A fresh device: the next pass goes straight in, no code.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const second = await context.newPage();
	const token = pass();
	await second.goto(`${BASE}/sso?t=${token}`);
	await second.waitForURL((u) => !/\/(link|login|sso)/.test(u.pathname));

	// The same pass again is refused, and so are forged and expired ones.
	for (const bad of [
		token,
		pass({ secret: "not-the-secret" }),
		pass({ exp: -10 }),
	]) {
		const page = await browser.newPage();
		await page.goto(`${BASE}/sso?t=${bad}`);
		await page.waitForURL(/\/login/);
		assert.match(page.url(), /\/login/);
		await page.close();
	}
	await context.close();
});
