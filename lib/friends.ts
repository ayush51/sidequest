import { PHOTO_BONUS, todayET } from "@/lib/quests";
import { createClient } from "@/lib/supabase/server";

const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x);

export async function searchProfiles(q: string) {
	const supabase = await createClient();
	const { data } = await supabase.rpc("search_profiles", { q });
	return (data ?? []) as {
		id: string;
		username: string;
		display_name: string;
	}[];
}

export async function getRelations() {
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getUser();
	const me = auth.user?.id;
	const { data } = await supabase
		.from("friendships")
		.select(
			"requester_id, addressee_id, status, requester:profiles!requester_id(username), addressee:profiles!addressee_id(username)",
		);
	const rows = data ?? [];
	return {
		// other user's id -> "friend" | "sent" | "received"
		byUser: new Map(
			rows.map((r) => [
				r.requester_id === me ? r.addressee_id : r.requester_id,
				r.status === "accepted"
					? "friend"
					: r.requester_id === me
						? "sent"
						: "received",
			]),
		),
		incoming: rows.filter(
			(r) => r.status === "pending" && r.addressee_id === me,
		),
	};
}

export async function getFeed() {
	const supabase = await createClient();
	const { data } = await supabase
		.from("user_quests")
		.select(
			"id, user_id, completed_at, photo_path, profiles(username, display_name, avatar_url), quests(title, points)",
		)
		.eq("status", "completed")
		.order("completed_at", { ascending: false })
		.limit(30);
	const items = data ?? [];

	const paths = items.flatMap((i) => (i.photo_path ? [i.photo_path] : []));
	const signed = paths.length
		? (
				await supabase.storage
					.from("quest-photos")
					.createSignedUrls(paths, 3600)
			).data
		: [];
	const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

	return items.map((i) => ({
		...i,
		photoUrl: i.photo_path ? (urls.get(i.photo_path) ?? null) : null,
		pointsEarned:
			(Array.isArray(i.quests) ? i.quests[0] : i.quests)?.points +
			(i.photo_path ? PHOTO_BONUS : 0),
	}));
}

// Points earned since Monday (Eastern) by you and your accepted friends.
// RLS already limits user_quests and profiles to you and people connected to you.
export async function getLeaderboard() {
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims.sub as string;

	// Monday of this week as a YYYY-MM-DD string (compared against each completion's Eastern date).
	const today = todayET();
	const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
	const weekStart = new Date(
		Date.parse(`${today}T12:00:00Z`) - ((dow + 6) % 7) * 864e5,
	)
		.toISOString()
		.slice(0, 10);

	const [friendships, profiles, completions] = await Promise.all([
		supabase
			.from("friendships")
			.select("requester_id, addressee_id")
			.eq("status", "accepted"),
		supabase
			.from("profiles")
			.select("id, username, display_name, avatar_url, points"),
		supabase
			.from("user_quests")
			.select("user_id, completed_at, photo_path, quests(points)")
			.eq("status", "completed")
			.gte("completed_at", new Date(Date.now() - 8 * 864e5).toISOString()),
	]);

	const ids = new Set([me]);
	for (const f of friendships.data ?? []) {
		ids.add(f.requester_id === me ? f.addressee_id : f.requester_id);
	}

	// Group-mates count too. Look up my own groups first: the admin can read every
	// membership, so filtering by my group ids keeps their board to their own groups.
	const mine = await supabase
		.from("group_members")
		.select("group_id")
		.eq("user_id", me);
	const mates = await supabase
		.from("group_members")
		.select("user_id")
		.in(
			"group_id",
			(mine.data ?? []).map((m) => m.group_id),
		);
	for (const m of mates.data ?? []) ids.add(m.user_id);

	const points = new Map<string, number>();
	for (const c of completions.data ?? []) {
		const etDate = new Date(c.completed_at).toLocaleDateString("en-CA", {
			timeZone: "America/New_York",
		});
		if (!ids.has(c.user_id) || etDate < weekStart) continue;
		const q = Array.isArray(c.quests) ? c.quests[0] : c.quests;
		const earned = (q?.points ?? 0) + (c.photo_path ? PHOTO_BONUS : 0);
		points.set(c.user_id, (points.get(c.user_id) ?? 0) + earned);
	}

	return (profiles.data ?? [])
		.filter((p) => ids.has(p.id))
		.map((p) => ({
			id: p.id,
			name: p.display_name ?? p.username,
			avatarUrl: p.avatar_url,
			xp: p.points,
			points: points.get(p.id) ?? 0,
			isMe: p.id === me,
		}))
		.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export async function getMyGroups() {
	const supabase = await createClient();
	const { data: claims } = await supabase.auth.getClaims();
	const me = claims?.claims.sub as string;
	const mine = await supabase
		.from("group_members")
		.select("group_id")
		.eq("user_id", me);
	const { data } = await supabase
		.from("groups")
		.select("id, name, group_members(count)")
		.in(
			"id",
			(mine.data ?? []).map((m) => m.group_id),
		)
		.order("name");
	return (data ?? []).map((g) => ({
		id: g.id,
		name: g.name,
		members: one(g.group_members)?.count ?? 0,
	}));
}
