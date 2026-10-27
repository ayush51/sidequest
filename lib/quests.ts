import { createClient } from "@/lib/supabase/server";

// Must match the bonus in complete_quest() (migration 0005).
export const PHOTO_BONUS = 5;

// DMV only for now, so "today" is Eastern time.
export const todayET = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

// RLS lets users read friends' completed quests and profiles, so every query
// here must be scoped to the signed-in user explicitly.
async function currentUser() {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	return { supabase, uid: data?.claims.sub as string };
}

export async function getInterests() {
	const { supabase, uid } = await currentUser();
	const { data } = await supabase
		.from("profile_interests")
		.select("interest_slug")
		.eq("profile_id", uid);
	return (data ?? []).map((r) => r.interest_slug);
}

// Must match claim_bonus() in migration 0008.
export const BONUS_LIMIT = 2;
const BONUS_MAX_POINTS = 10;

// Must match reroll_daily() in migration 0010.
export const FREE_REROLLS = 3;

const questSelect =
	"id, status, photo_path, rerolls, quests(title, description, area, cost, points, interests(emoji))";

const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x);

type CategoryRows =
	| { quests: { category: string } | { category: string }[] | null }[]
	| null;

// How the user's history nudges each category: +0.25 per finished quest, -0.4 per skip.
async function categoryTilt(
	supabase: Awaited<ReturnType<typeof createClient>>,
	uid: string,
) {
	const [finished, skipped] = await Promise.all([
		supabase
			.from("user_quests")
			.select("quests(category)")
			.eq("user_id", uid)
			.eq("status", "completed"),
		supabase
			.from("quest_rerolls")
			.select("quests(category)")
			.eq("user_id", uid),
	]);
	const tilt = new Map<string, number>();
	const add = (rows: CategoryRows, delta: number) => {
		for (const r of rows ?? []) {
			const category = one(r.quests)?.category;
			if (category) tilt.set(category, (tilt.get(category) ?? 0) + delta);
		}
	};
	add(finished.data, 0.25);
	add(skipped.data, -0.4);
	return tilt;
}

// Random quest the user hasn't had yet. Quests in their interests are 3x as likely,
// scaled by what they finish and skip (kept between 0.25x and 2x so one habit can't dominate).
async function pickQuest(
	supabase: Awaited<ReturnType<typeof createClient>>,
	uid: string,
	interests: string[],
	opts: { maxPoints?: number; excludeIds?: string[] } = {},
) {
	// Explicit status filter: RLS also lets authors see their own pending suggestions and the admin see everything.
	let pool = supabase
		.from("quests")
		.select("id, category")
		.eq("status", "approved");
	if (opts.maxPoints) pool = pool.lte("points", opts.maxPoints);
	const [done, all, tilt] = await Promise.all([
		supabase.from("user_quests").select("quest_id").eq("user_id", uid),
		pool,
		categoryTilt(supabase, uid),
	]);
	const doneIds = new Set((done.data ?? []).map((r) => r.quest_id));
	const choices = (all.data ?? []).filter(
		(q) => !doneIds.has(q.id) && !opts.excludeIds?.includes(q.id),
	);
	if (choices.length === 0) return null;

	const weight = (q: { category: string }) =>
		(interests.includes(q.category) ? 3 : 1) *
		Math.min(2, Math.max(0.25, 1 + (tilt.get(q.category) ?? 0)));
	let roll = Math.random() * choices.reduce((sum, q) => sum + weight(q), 0);
	for (const q of choices) {
		roll -= weight(q);
		if (roll < 0) return q.id;
	}
	return choices[choices.length - 1].id;
}

export async function getTodayQuest(interests: string[]) {
	const { supabase, uid } = await currentUser();
	const today = todayET();

	const existing = await supabase
		.from("user_quests")
		.select(questSelect)
		.eq("user_id", uid)
		.eq("assigned_on", today)
		.eq("kind", "daily")
		.maybeSingle();
	if (existing.data) return existing.data;

	const pick = await pickQuest(supabase, uid, interests);
	if (!pick) return null;

	// Return the new row from the insert itself: Next dedupes identical GETs within
	// one render, so re-reading with the same query would return the earlier empty result.
	const inserted = await supabase
		.from("user_quests")
		.insert({ quest_id: pick, assigned_on: today })
		.select(questSelect)
		.single();
	if (inserted.data) return inserted.data;

	// Lost an insert race to a concurrent request; read the winner's row.
	// (.limit(1) changes the URL so it isn't deduped with the first read.)
	return (
		await supabase
			.from("user_quests")
			.select(questSelect)
			.eq("user_id", uid)
			.eq("assigned_on", today)
			.eq("kind", "daily")
			.limit(1)
			.maybeSingle()
	).data;
}

export async function rerollToday(interests: string[]) {
	const { supabase, uid } = await currentUser();
	// Skip the current quest and anything skipped in the last 24h (the database
	// only enforces "not today", so this is a safe superset).
	const since = new Date(Date.now() - 864e5).toISOString();
	const [current, skipped] = await Promise.all([
		supabase
			.from("user_quests")
			.select("quest_id")
			.eq("user_id", uid)
			.eq("assigned_on", todayET())
			.eq("kind", "daily")
			.maybeSingle(),
		supabase
			.from("quest_rerolls")
			.select("quest_id")
			.eq("user_id", uid)
			.gte("created_at", since),
	]);
	const excludeIds = [
		...(current.data ? [current.data.quest_id] : []),
		...(skipped.data ?? []).map((r) => r.quest_id),
	];
	const pick = await pickQuest(supabase, uid, interests, { excludeIds });
	if (pick) await supabase.rpc("reroll_daily", { p_new_quest: pick });
}

export async function claimBonus(interests: string[]) {
	const { supabase, uid } = await currentUser();
	const pick = await pickQuest(supabase, uid, interests, {
		maxPoints: BONUS_MAX_POINTS,
	});
	if (pick) await supabase.rpc("claim_bonus", { p_quest: pick });
}

export async function getBonuses() {
	const { supabase, uid } = await currentUser();
	const { data } = await supabase
		.from("user_quests")
		.select(questSelect)
		.eq("user_id", uid)
		.eq("assigned_on", todayET())
		.eq("kind", "bonus")
		.order("id");
	return data ?? [];
}

export async function getStats() {
	const { supabase, uid } = await currentUser();
	const { data } = await supabase
		.from("profiles")
		.select("points, current_streak, last_completed_on, banked_rerolls")
		.eq("id", uid)
		.maybeSingle();

	const points = data?.points ?? 0;
	// A streak is only alive if the last completion was today or yesterday.
	const yesterday = new Date(Date.parse(`${todayET()}T00:00:00Z`) - 864e5)
		.toISOString()
		.slice(0, 10);
	const alive = data?.last_completed_on && data.last_completed_on >= yesterday;

	return {
		points,
		streak: alive ? data.current_streak : 0,
		level: 1 + Math.floor(points / 100),
		banked: data?.banked_rerolls ?? 0,
	};
}
