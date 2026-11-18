import { currentUser, questSelect, todayET } from "@/lib/quests";
import { createClient } from "@/lib/supabase/server";

// team_quests points at auth.users, not profiles (see migration 0017), so names are
// looked up separately instead of joined.

// Invites sent to me today that I can still accept.
export async function getTeamInvites() {
	const supabase = await createClient();
	const { data } = await supabase.rpc("my_team_invites");
	return (data ?? []) as {
		id: string;
		inviter_name: string;
		title: string;
		description: string;
		points: number;
	}[];
}

// Today's team activity: the invites I sent (and whether they joined), and the team
// quests I accepted, each with the friend I'm doing it with.
export async function getTeam() {
	const { supabase, uid } = await currentUser();
	const [teams, accepted] = await Promise.all([
		supabase
			.from("team_quests")
			.select("inviter_id, invitee_id, quest_id, status")
			.eq("assigned_on", todayET())
			.neq("status", "declined"),
		supabase
			.from("user_quests")
			.select(questSelect)
			.eq("user_id", uid)
			.eq("assigned_on", todayET())
			.eq("kind", "team")
			.order("id"),
	]);
	const rows = teams.data ?? [];
	const otherIds = [
		...new Set(
			rows.map((t) => (t.inviter_id === uid ? t.invitee_id : t.inviter_id)),
		),
	];
	const { data: people } = otherIds.length
		? await supabase
				.from("profiles")
				.select("id, username, display_name")
				.in("id", otherIds)
		: { data: [] };
	const nameOf = (id?: string) => {
		const p = people?.find((x) => x.id === id);
		return p?.display_name ?? p?.username ?? "A friend";
	};

	return {
		sent: rows
			.filter((t) => t.inviter_id === uid)
			.map((t) => ({
				questId: t.quest_id as string,
				name: nameOf(t.invitee_id),
				status: t.status as string,
			})),
		quests: (accepted.data ?? []).map((q) => ({
			...q,
			partner: nameOf(
				rows.find(
					(t) =>
						t.invitee_id === uid &&
						t.quest_id === q.quest_id &&
						t.status === "accepted",
				)?.inviter_id,
			),
		})),
	};
}
