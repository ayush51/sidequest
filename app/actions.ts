"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeQuest(userQuestId: string) {
	const supabase = await createClient();
	await supabase.rpc("complete_quest", { p_user_quest: userQuestId });
	revalidatePath("/");
}
