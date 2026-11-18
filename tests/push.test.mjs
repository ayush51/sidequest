// Push reminders: the installable-app files are public, the daily cron refuses outsiders, each
// device belongs to one person, the reminder skips people who already finished, and the opt-in
// card can be dismissed. Actually delivering a push needs a real browser and push service, so
// that is checked by hand on a phone.
// Needs the app running (pnpm dev) with .env.local (including CRON_SECRET), and a logged-in Supabase CLI.
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
const names = [
	`zz_test_pa${suffix}`,
	`zz_test_pb${suffix}`,
	`zz_test_pc${suffix}`,
];
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	for (const name of names) {
		sql(`delete from auth.users where email = '${name}@users.sidequest.app'`);
	}
});

const cron = (query = "", secret = env("CRON_SECRET")) =>
	fetch(`${BASE}/api/cron/reminder${query}`, {
		headers: secret ? { authorization: `Bearer ${secret}` } : {},
	});

test("the manifest, service worker and icons are public", async () => {
	const manifest = await fetch(`${BASE}/manifest.webmanifest`);
	assert.equal(manifest.status, 200);
	const json = await manifest.json();
	assert.equal(json.name, "SideQuest");
	assert.equal(json.display, "standalone");
	assert.ok(json.icons.some((i) => i.sizes === "512x512"));

	const sw = await fetch(`${BASE}/sw.js`);
	assert.equal(sw.status, 200);
	assert.match(await sw.text(), /showNotification/);

	const icon = await fetch(`${BASE}/icons/icon-192.png`);
	assert.equal(icon.status, 200);
	assert.equal(icon.headers.get("content-type"), "image/png");
});

test("the daily cron refuses callers without the secret", async () => {
	assert.equal((await cron("", "")).status, 401);
	assert.equal((await cron("", "not-the-secret")).status, 401);
});

test("each device belongs to one person, and finished people are not reminded", async () => {
	assert.ok(env("CRON_SECRET"), "CRON_SECRET must be in .env.local");
	const users = [];
	for (const name of names.slice(0, 2)) {
		const client = createClient(
			env("NEXT_PUBLIC_SUPABASE_URL"),
			env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
		);
		const { data, error } = await client.auth.signUp({
			email: `${name}@users.sidequest.app`,
			password: `${name}:4821`,
			options: { data: { username: name } },
		});
		assert.ifError(error);
		users.push({ client, id: data.user.id });
	}
	const [a, b] = users;
	const endpoint = `https://push.example.test/${suffix}`;
	const save = (u) =>
		u.client.rpc("save_push_subscription", {
			p_endpoint: endpoint,
			p_p256dh: "key",
			p_auth: "auth",
		});
	const mine = async (u) =>
		(await u.client.from("push_subscriptions").select("id")).data.length;

	// A's device is A's alone.
	assert.ifError((await save(a)).error);
	assert.equal(await mine(a), 1);
	assert.equal(await mine(b), 0, "B cannot see A's device");

	// B signs in on the same browser: the device moves to B instead of failing.
	assert.ifError((await save(b)).error);
	assert.equal(await mine(a), 0);
	assert.equal(await mine(b), 1);

	// B has reminders on and hasn't finished: B is a recipient. Finished: nobody is.
	const dry = async () =>
		(await (await cron(`?dry=1&only=${b.id}`)).json()).recipients;
	assert.equal(await dry(), 1);
	sql(
		`insert into user_quests (user_id, quest_id, assigned_on, status, kind)
		 select '${b.id}', id, (now() at time zone 'America/New_York')::date, 'completed', 'daily'
		 from quests where status = 'approved' limit 1`,
	);
	assert.equal(await dry(), 0, "no reminder once today's quest is done");
	assert.equal(
		(await (await cron(`?dry=1&force=1&only=${b.id}`)).json()).recipients,
		1,
		"force sends to people who finished too",
	);

	// Turning reminders off removes the device.
	assert.ifError(
		(
			await b.client
				.from("push_subscriptions")
				.delete()
				.eq("endpoint", endpoint)
		).error,
	);
	assert.equal(await mine(b), 0);
});

test("the opt-in card can be dismissed and the Profile switch shows", async () => {
	const name = names[2];
	// Headless Chromium always reports notifications as blocked, which hides the card by design.
	// Pretend this is a first-time visitor who hasn't decided yet.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	await context.addInitScript(() => {
		Object.defineProperty(window.Notification, "permission", {
			get: () => "default",
		});
	});
	const page = await context.newPage();
	await page.goto(`${BASE}/login`);
	await page.getByRole("button", { name: /Create account/ }).click();
	await page.fill("input[name=name]", name);
	await page.fill("input[name=pin]", "4821");
	await page.getByRole("button", { name: "Create account" }).last().click();
	await page.waitForURL(/\/interests/);
	await page.getByText("Outdoors", { exact: true }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await page.waitForURL((u) => u.pathname === "/");

	await page.getByText("Daily nudge", { exact: true }).waitFor();
	await page.waitForLoadState("networkidle"); // let the buttons hydrate
	await page.getByRole("button", { name: "Not now" }).click();
	await page
		.getByText("Daily nudge", { exact: true })
		.waitFor({ state: "detached" });
	await page.reload();
	await page.getByText(/today.s quest/i).waitFor();
	await page.waitForTimeout(500);
	assert.equal(await page.getByText("Daily nudge", { exact: true }).count(), 0);

	await page.getByRole("link", { name: "Profile" }).click();
	await page.getByText("Daily reminder is off.").waitFor();
	await page.getByRole("button", { name: "Turn on" }).waitFor();
});
