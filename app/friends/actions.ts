"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendRequest(addresseeId: string) {
	const supabase = await createClient();
	await supabase.from("friendships").insert({ addressee_id: addresseeId });
	revalidatePath("/friends");
}

export async function respondToRequest(requesterId: string, accept: boolean) {
	const supabase = await createClient();
	const query = supabase.from("friendships");
	if (accept) {
		await query
			.update({ status: "accepted" })
			.eq("requester_id", requesterId)
			.eq("status", "pending");
	} else {
		await query.delete().eq("requester_id", requesterId);
	}
	revalidatePath("/friends");
}
