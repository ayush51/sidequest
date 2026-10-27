// Admin page: approve a suggested quest and a feature request, create a group, remove a member.
// A throwaway account is made admin with SQL and deleted afterward.
// Needs the app running (pnpm dev) and a logged-in Supabase CLI.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const suffix = Math.floor(Math.random() * 1e6);
const adminName = `zz_test_ad${suffix}`;
const userName = `zz_test_us${suffix}`;
const questTitle = `Admin Test Quest ${suffix}`;
const featureTitle = `Admin Test Feature ${suffix}`;
const groupName = `Admin Test Group ${suffix}`;
let browser;

const sql = (query) =>
	execFileSync("supabase", ["db", "query", "--linked", query]).toString();

before(async () => {
	browser = await chromium.launch();
});

after(async () => {
	await browser?.close();
	sql(`delete from quests where title = '${questTitle}'`);
	sql(`delete from groups where name = '${groupName}'`);
	for (const name of [adminName, userName]) {
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
	await page.getByText("Wholesome Chaos", { exact: true }).click();
	await page.getByRole("button", { name: "Save" }).click();
	await page.waitForURL((u) => u.pathname === "/");
	return page;
}

test("admin: approve quest + feature, create group, remove member", async () => {
	const admin = await signUp(adminName);
	const user = await signUp(userName);
	sql(`update profiles set is_admin = true where username = '${adminName}'`);
	const userId = sql(
		`select id from profiles where username = '${userName}'`,
	).match(/[0-9a-f-]{36}/)[0];
	sql(
		`insert into quests (title, description, category, area, cost, difficulty, points, status, author_id) values ('${questTitle}', 'A test quest waiting for approval.', 'food', 'anywhere', 'free', 'chill', 10, 'pending', '${userId}')`,
	);
	sql(
		`insert into feature_requests (author_id, title, details) values ('${userId}', '${featureTitle}', 'A test feature waiting for approval.')`,
	);

	// Pending quests are not in the pool for the regular user.
	await user.goto(`${BASE}/admin`);
	await user.getByText(/could not be found/i).waitFor();

	await admin.goto(`${BASE}/profile`);
	await admin.getByRole("link", { name: "Admin" }).click();
	await admin.waitForURL(/\/admin/);
	await admin.waitForLoadState("networkidle");

	// Approve the quest with 20 points.
	const questCard = admin.locator("div.rounded-3xl", { hasText: questTitle });
	await questCard.locator("input[name=points]").fill("20");
	await questCard.getByRole("button", { name: "Approve" }).click();
	await questCard.waitFor({ state: "detached" });
	assert.match(
		sql(`select status, points from quests where title = '${questTitle}'`),
		/"points": 20[\s\S]*"status": "approved"|"status": "approved"[\s\S]*"points": 20/,
	);

	// Approve the feature with a note.
	const featureCard = admin.locator("div.rounded-3xl", {
		hasText: featureTitle,
	});
	await featureCard.locator("input[name=note]").fill("Great idea");
	await featureCard.getByRole("button", { name: "Approve" }).click();
	await featureCard.waitFor({ state: "detached" });
	const feature = sql(
		`select status, admin_note from feature_requests where title = '${featureTitle}'`,
	);
	assert.match(feature, /"status": "approved"/);
	assert.match(feature, /Great idea/);

	// Create a group, read its code, have the user join, then remove them.
	await admin.fill("input[name=name]", groupName);
	await admin.getByRole("button", { name: "Create" }).click();
	const groupCard = admin.locator("div.rounded-3xl", { hasText: groupName });
	await groupCard.waitFor();
	const code = (await groupCard.locator("code").textContent()).trim();
	assert.match(code, /^[A-HJ-KM-NP-Z2-9]{6}$/);

	await user.goto(`${BASE}/friends`);
	await user.waitForLoadState("networkidle");
	await user.fill("input[name=code]", code);
	await user.getByRole("button", { name: "Join" }).click();
	await user.getByText(`You joined ${groupName}.`).waitFor();

	await admin.reload();
	await admin
		.locator("div.rounded-3xl", { hasText: groupName })
		.getByText(userName)
		.waitFor();
	await admin
		.locator("div.rounded-3xl", { hasText: groupName })
		.getByRole("button", { name: "Remove" })
		.first()
		.click();
	await admin
		.locator("div.rounded-3xl", { hasText: groupName })
		.getByText(userName)
		.waitFor({ state: "detached" });
	assert.match(
		sql(
			`select count(*) as n from group_members gm join groups g on g.id = gm.group_id where g.name = '${groupName}'`,
		),
		/"n": 0/,
	);
});
