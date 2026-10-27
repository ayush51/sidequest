import { createClient } from "@/lib/supabase/server";

// Must match the bonus in complete_quest() (migration 0005).
export const PHOTO_BONUS = 5;

// DMV only for now, so "today" is Eastern time.
const todayET = () =>
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

export async function getTodayQuest(interests: string[]) {
	const { supabase, uid } = await currentUser();
	const today = todayET();
	const select =
		"id, status, photo_path, quests(title, description, area, cost, points, interests(emoji))";

	const existing = await supabase
		.from("user_quests")
		.select(select)
		.eq("user_id", uid)
		.eq("assigned_on", today)
		.maybeSingle();
	if (existing.data) return existing.data;

	const [done, pool] = await Promise.all([
		supabase.from("user_quests").select("quest_id").eq("user_id", uid),
		supabase.from("quests").select("id, category"), // RLS limits this to approved quests
	]);
	const doneIds = new Set((done.data ?? []).map((r) => r.quest_id));
	const choices = (pool.data ?? []).filter((q) => !doneIds.has(q.id));
	if (choices.length === 0) return null;

	// Quests in the user's interests are 3x as likely as the rest.
	const weight = (q: { category: string }) =>
		interests.includes(q.category) ? 3 : 1;
	let roll = Math.random() * choices.reduce((sum, q) => sum + weight(q), 0);
	let pick = choices[choices.length - 1];
	for (const q of choices) {
		roll -= weight(q);
		if (roll < 0) {
			pick = q;
			break;
		}
	}

	// Return the new row from the insert itself: Next dedupes identical GETs within
	// one render, so re-reading with the same query would return the earlier empty result.
	const inserted = await supabase
		.from("user_quests")
		.insert({ quest_id: pick.id, assigned_on: today })
		.select(select)
		.single();
	if (inserted.data) return inserted.data;

	// Lost an insert race to a concurrent request; read the winner's row.
	// (.limit(1) changes the URL so it isn't deduped with the first read.)
	return (
		await supabase
			.from("user_quests")
			.select(select)
			.eq("user_id", uid)
			.eq("assigned_on", today)
			.limit(1)
			.maybeSingle()
	).data;
}

export async function getStats() {
	const { supabase, uid } = await currentUser();
	const { data } = await supabase
		.from("profiles")
		.select("points, current_streak, last_completed_on")
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
	};
}
