import { PHOTO_BONUS } from "@/lib/quests";
import { createClient } from "@/lib/supabase/server";

const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x);

// Each stat levels up from the XP of the quests finished in its categories.
export const STAT_XP_PER_LEVEL = 50;
const STATS = [
	{ name: "Body", categories: ["fitness", "outdoors"] },
	{ name: "Mind", categories: ["history", "art"] },
	{ name: "Taste", categories: ["food", "music"] },
	{ name: "Chaos", categories: ["nightlife", "wholesome"] },
];

export async function getCharacter() {
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const uid = auth?.claims.sub as string;

	const [profile, done] = await Promise.all([
		supabase
			.from("profiles")
			.select("points, longest_streak")
			.eq("id", uid)
			.maybeSingle(),
		supabase
			.from("user_quests")
			.select("photo_path, quests(category, points)")
			.eq("user_id", uid)
			.eq("status", "completed"),
	]);

	const rows = done.data ?? [];
	const xpByStat = new Map<string, number>();
	for (const r of rows) {
		const q = one(r.quests);
		const stat = STATS.find((s) => s.categories.includes(q?.category ?? ""));
		if (stat) {
			xpByStat.set(
				stat.name,
				(xpByStat.get(stat.name) ?? 0) +
					(q?.points ?? 0) +
					(r.photo_path ? PHOTO_BONUS : 0),
			);
		}
	}

	const xp = profile.data?.points ?? 0;
	const best = profile.data?.longest_streak ?? 0;
	const photos = rows.filter((r) => r.photo_path).length;

	const badges = [
		...[3, 7, 14, 30].map((n) => ({
			id: `streak-${n}`,
			kind: "streak" as const,
			label: `${n}-day streak`,
			earned: best >= n,
		})),
		{
			id: "photo-1",
			kind: "photo" as const,
			label: "First photo",
			earned: photos >= 1,
		},
		...[10, 50].map((n) => ({
			id: `quests-${n}`,
			kind: "quests" as const,
			label: `${n} quests`,
			earned: rows.length >= n,
		})),
		...[100, 500, 1000].map((n) => ({
			id: `xp-${n}`,
			kind: "xp" as const,
			label: `${n} XP`,
			earned: xp >= n,
		})),
	];

	return {
		stats: STATS.map((s) => {
			const statXp = xpByStat.get(s.name) ?? 0;
			return {
				name: s.name,
				level: 1 + Math.floor(statXp / STAT_XP_PER_LEVEL),
				progress: (statXp % STAT_XP_PER_LEVEL) / STAT_XP_PER_LEVEL,
			};
		}),
		badges,
	};
}
