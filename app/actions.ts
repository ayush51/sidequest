"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeQuest(userQuestId: string) {
	const supabase = await createClient();
	await supabase
		.from("user_quests")
		.update({ status: "completed", completed_at: new Date().toISOString() })
		.eq("id", userQuestId)
		.eq("status", "assigned");
	revalidatePath("/");
}
