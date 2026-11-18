"use server";

import { revalidatePath } from "next/cache";
import { claimBonus, getInterests, rerollToday } from "@/lib/quests";
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
	return data?.error ? { error: data.error } : {};
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
