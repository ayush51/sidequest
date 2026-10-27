import { PHOTO_BONUS } from "@/lib/quests";
import { createClient } from "@/lib/supabase/server";

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
			"id, user_id, completed_at, photo_path, profiles(username, display_name), quests(title, points)",
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
