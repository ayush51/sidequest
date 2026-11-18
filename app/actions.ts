"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendPush } from "@/lib/push";
import {
	claimBonus,
	currentUser,
	getInterests,
	rerollToday,
	todayET,
} from "@/lib/quests";
import { createClient } from "@/lib/supabase/server";

export async function completeQuest(userQuestId: string, photoPath?: string) {
	const supabase = await createClient();
	await supabase.rpc("complete_quest", {
		p_user_quest: userQuestId,
		p_photo_path: photoPath ?? null,
	});
	revalidatePath("/");
}

export type RerollState = { error?: string };

export async function reroll(
	_prev: RerollState,
	formData: FormData,
): Promise<RerollState> {
	const category = String(formData.get("category") ?? "") || undefined;
	const swapped = await rerollToday(await getInterests(), category);
	revalidatePath("/");
	return swapped
		? {}
		: {
				error: category
					? "No more quests in that category. Try another."
					: "Couldn't find another quest. Try again.",
			};
}

// 1 = thumbs up, -1 = thumbs down, 0 = take the vote back.
export async function voteQuest(questId: string, vote: 1 | -1 | 0) {
	const supabase = await createClient();
	if (vote === 0) {
		await supabase.from("quest_feedback").delete().eq("quest_id", questId);
	} else {
		await supabase
			.from("quest_feedback")
			.upsert({ quest_id: questId, vote }, { onConflict: "user_id,quest_id" });
	}
	revalidatePath("/");
}

export async function claimBonusQuest() {
	await claimBonus(await getInterests());
	revalidatePath("/");
}

export type TeamResult = { error?: string };

// Friends and group-mates I can invite to today's quest.
export async function getTeamCandidates() {
	const supabase = await createClient();
	const { data } = await supabase.rpc("team_candidates");
	return (data ?? []) as {
		id: string;
		name: string;
		avatar_url: string | null;
		invited: boolean;
	}[];
}

export async function inviteToTeam(inviteeId: string): Promise<TeamResult> {
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("invite_to_team", {
		p_invitee: inviteeId,
	});
	revalidatePath("/");
	if (error) return { error: "Couldn't send that invite." };
	if (data?.error) return { error: data.error };

	// Tell the invitee (if they have reminders on). Never lets a notification problem fail the invite.
	const { uid } = await currentUser();
	const [{ data: me }, { data: daily }] = await Promise.all([
		supabase
			.from("profiles")
			.select("display_name, username")
			.eq("id", uid)
			.maybeSingle(),
		supabase
			.from("user_quests")
			.select("quests(title)")
			.eq("user_id", uid)
			.eq("assigned_on", todayET())
			.eq("kind", "daily")
			.maybeSingle(),
	]);
	const quest = Array.isArray(daily?.quests) ? daily.quests[0] : daily?.quests;
	after(async () => {
		try {
			await sendPush(inviteeId, {
				title: `${me?.display_name ?? me?.username ?? "A friend"} invited you`,
				body: `${quest?.title ?? "Today's quest"}. Finish it together for +5 XP each.`,
				url: "/",
				tag: "team-invite",
			});
		} catch {
			// The invite already went through.
		}
	});
	return {};
}

export async function respondToInvite(
	teamId: string,
	accept: boolean,
): Promise<TeamResult> {
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("respond_to_team_invite", {
		p_team: teamId,
		p_accept: accept,
	});
	revalidatePath("/");
	if (error) return { error: "Something went wrong. Try again." };
	return data?.error ? { error: data.error } : {};
}

export type PushResult = { error?: string };

// Turn on reminders for this device.
export async function savePushSubscription(sub: {
	endpoint: string;
	p256dh: string;
	auth: string;
}): Promise<PushResult> {
	const supabase = await createClient();
	const { error } = await supabase.rpc("save_push_subscription", {
		p_endpoint: sub.endpoint,
		p_p256dh: sub.p256dh,
		p_auth: sub.auth,
	});
	return error ? { error: "Couldn't turn on reminders. Try again." } : {};
}

// Turn off reminders for this device (row-level security limits it to your own).
export async function removePushSubscription(endpoint: string) {
	const supabase = await createClient();
	await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
