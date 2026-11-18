// Team quests: A invites a friend to their daily quest, B joins, and when both finish each gets +5 XP.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI (to set up and clean up).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const suffix = Math.floor(Math.random() * 1e6);
const nameA = `zz_test_ta${suffix}`;
const nameB = `zz_test_tb${suffix}`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();
const rows = (query) => JSON.parse(sql(query)).rows;
const points = (name) =>
	rows(`select points from profiles where username = '${name}'`)[0].points;

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	for (const name of [nameA, nameB]) {
		sql(`delete from auth.users where email = '${name}@users.sidequest.app'`);
	}
});

async function signUp(name) {
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
	await page.getByRole("button", { name: /Complete quest/ }).waitFor();
	await page.waitForLoadState("networkidle"); // let the buttons hydrate
	return page;
}

test("invite a friend, they join, both finish, +5 XP each once", async () => {
	const a = await signUp(nameA);
	const b = await signUp(nameB);

	// Setup: accepted friends, and different daily quests so the invite can't clash.
	sql(
		`insert into friendships (requester_id, addressee_id, status)
		 select (select id from profiles where username = '${nameA}'), (select id from profiles where username = '${nameB}'), 'accepted'`,
	);
	sql(
		`update user_quests set quest_id = (
		   select id from quests where status = 'approved'
		     and id <> (select quest_id from user_quests where user_id = (select id from profiles where username = '${nameA}') and kind = 'daily')
		   order by title limit 1)
		 where user_id = (select id from profiles where username = '${nameB}') and kind = 'daily'`,
	);
	// Both have reminders on (a device that can't be reached), so the invite, joined and
	// finished pings all run their send code. They must never get in the way of the actions.
	sql(
		`insert into push_subscriptions (user_id, endpoint, p256dh, auth)
		 select id, 'https://127.0.0.1:9/' || username, 'key', 'auth' from profiles
		 where username in ('${nameA}', '${nameB}')`,
	);
	await b.reload();
	await b.waitForLoadState("networkidle");

	// A opens Team up and invites B.
	await a.getByRole("button", { name: "Team up" }).click();
	await a.getByText(nameB, { exact: true }).waitFor();
	await a.getByRole("button", { name: "Invite", exact: true }).click();
	await a.getByText("Invited", { exact: true }).waitFor();
	await a.getByText(/· invited/).waitFor();

	// B sees the invite and joins; the team quest shows up on B's day.
	await b.reload();
	await b.getByText(`${nameA} invited you`).waitFor();
	await b.waitForLoadState("networkidle");
	await b.getByRole("button", { name: "Join", exact: true }).click();
	const team = b.locator("div.rounded-3xl", { hasText: "Team quest with" });
	await team.getByText(`Team quest with ${nameA}`).waitFor();
	assert.equal(await b.getByText(`${nameA} invited you`).count(), 0);

	// A now sees B as joined.
	await a.reload();
	await a.getByText(/· joined/).waitFor();

	// B finishes the team quest first: no bonus yet.
	const teamPoints = rows(
		`select q.points from user_quests u join quests q on q.id = u.quest_id
		 where u.user_id = (select id from profiles where username = '${nameB}') and u.kind = 'team'`,
	)[0].points;
	await team.getByRole("button", { name: /Complete quest/ }).click();
	await team.getByText(/XP earned/).waitFor();
	assert.equal(points(nameB), teamPoints, "no bonus until both finish");

	// A finishes the daily: both get +5, once.
	const dailyPoints = rows(
		`select q.points from user_quests u join quests q on q.id = u.quest_id
		 where u.user_id = (select id from profiles where username = '${nameA}') and u.kind = 'daily'`,
	)[0].points;
	await a.getByRole("button", { name: /Complete quest/ }).click();
	await a.getByText(/XP earned/).waitFor();
	assert.equal(points(nameA), dailyPoints + 5);
	assert.equal(points(nameB), teamPoints + 5);
	await a.reload();
	await a.waitForLoadState("networkidle");
	assert.equal(points(nameA), dailyPoints + 5, "paid once, not on every load");
});
