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

export type JoinState = { error?: string; joined?: string };

export async function joinGroup(
	_prev: JoinState,
	formData: FormData,
): Promise<JoinState> {
	const supabase = await createClient();
	const { data, error } = await supabase.rpc("join_group", {
		p_code: String(formData.get("code") ?? ""),
	});
	revalidatePath("/friends");
	const result = data as { error?: string; name?: string } | null;
	if (error || !result) return { error: "Couldn't join. Try again." };
	return result.error ? { error: result.error } : { joined: result.name };
}

export async function leaveGroup(groupId: string) {
	const supabase = await createClient();
	const { data: claims } = await supabase.auth.getClaims();
	await supabase
		.from("group_members")
		.delete()
		.eq("group_id", groupId)
		.eq("user_id", claims?.claims.sub as string);
	revalidatePath("/friends");
}
