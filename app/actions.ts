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

export async function reroll() {
	await rerollToday(await getInterests());
	revalidatePath("/");
}

export async function claimBonusQuest() {
	await claimBonus(await getInterests());
	revalidatePath("/");
}
