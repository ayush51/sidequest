import { createClient } from "@/lib/supabase/server";

// DMV only for now, so "today" is Eastern time.
const todayET = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export async function getTodayQuest() {
	const supabase = await createClient();
	const today = todayET();

	const fetchToday = () =>
		supabase
			.from("user_quests")
			.select("id, status, quests(title, description, area, cost, points)")
			.eq("assigned_on", today)
			.maybeSingle();

	const existing = await fetchToday();
	if (existing.data) return existing.data;

	const [done, pool] = await Promise.all([
		supabase.from("user_quests").select("quest_id"),
		supabase.from("quests").select("id"), // RLS limits this to approved quests
	]);
	const doneIds = new Set((done.data ?? []).map((r) => r.quest_id));
	const choices = (pool.data ?? []).filter((q) => !doneIds.has(q.id));
	if (choices.length === 0) return null;

	const pick = choices[Math.floor(Math.random() * choices.length)];
	await supabase
		.from("user_quests")
		.insert({ quest_id: pick.id, assigned_on: today });

	// Re-read so a concurrent request that won the insert race gives the same quest.
	return (await fetchToday()).data;
}

export async function getStats() {
	const supabase = await createClient();
	const { data } = await supabase
		.from("profiles")
		.select("points, current_streak, last_completed_on")
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
