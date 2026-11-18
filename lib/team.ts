import type { PushPayload } from "@/lib/push";
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

type Ping = { to: string; payload: PushPayload };

async function myName(
	supabase: Awaited<ReturnType<typeof createClient>>,
	uid: string,
) {
	const { data } = await supabase
		.from("profiles")
		.select("display_name, username")
		.eq("id", uid)
		.maybeSingle();
	return data?.display_name ?? data?.username ?? "A friend";
}

// I just joined a team quest: tell whoever invited me.
export async function teamJoinedPing(teamId: string): Promise<Ping | null> {
	const { supabase, uid } = await currentUser();
	const { data: team } = await supabase
		.from("team_quests")
		.select("inviter_id, quests(title)")
		.eq("id", teamId)
		.eq("invitee_id", uid)
		.maybeSingle();
	if (!team) return null;
	const quest = Array.isArray(team.quests) ? team.quests[0] : team.quests;
	return {
		to: team.inviter_id,
		payload: {
			title: `${await myName(supabase, uid)} joined your team`,
			body: `${quest?.title ?? "Your quest"}. Finish it together for +5 XP each.`,
			url: "/",
			tag: "team-joined",
		},
	};
}

// I just finished a quest. Teammates who haven't finished theirs yet get a nudge. If they had,
// the bonus was already paid (bonus_paid) and there's nobody left to nudge.
export async function teamFinishedPings(userQuestId: string): Promise<Ping[]> {
	const { supabase, uid } = await currentUser();
	const { data: mine } = await supabase
		.from("user_quests")
		.select("quest_id, quests(title)")
		.eq("id", userQuestId)
		.eq("user_id", uid)
		.maybeSingle();
	if (!mine) return [];
	const { data: teams } = await supabase
		.from("team_quests")
		.select("inviter_id, invitee_id")
		.eq("quest_id", mine.quest_id)
		.eq("status", "accepted")
		.eq("bonus_paid", false)
		.or(`inviter_id.eq.${uid},invitee_id.eq.${uid}`);
	if (!teams?.length) return [];
	const quest = Array.isArray(mine.quests) ? mine.quests[0] : mine.quests;
	const name = await myName(supabase, uid);
	return teams.map((t) => ({
		to: t.inviter_id === uid ? t.invitee_id : t.inviter_id,
		payload: {
			title: `${name} finished ${quest?.title ?? "your quest"}`,
			body: "Your turn. Finish it and you each get +5 XP.",
			url: "/",
			tag: "team-finished",
		},
	}));
}
