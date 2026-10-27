"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS already limits these updates to the admin; this check just fails loudly.
async function adminClient() {
	const supabase = await createClient();
	const { data } = await supabase.rpc("is_admin");
	if (!data) throw new Error("Not allowed");
	return supabase;
}

export async function approveQuest(id: string, formData: FormData) {
	const supabase = await adminClient();
	const points = Math.min(
		100,
		Math.max(1, Number(formData.get("points")) || 10),
	);
	await supabase
		.from("quests")
		.update({ status: "approved", points })
		.eq("id", id);
	revalidatePath("/admin");
}

export async function rejectQuest(id: string) {
	const supabase = await adminClient();
	await supabase.from("quests").update({ status: "rejected" }).eq("id", id);
	revalidatePath("/admin");
}

export async function setFeatureStatus(
	id: string,
	status: "approved" | "rejected",
	formData: FormData,
) {
	const supabase = await adminClient();
	const note = String(formData.get("note") ?? "").trim();
	await supabase
		.from("feature_requests")
		.update({ status, admin_note: note || null })
		.eq("id", id);
	revalidatePath("/admin");
}

export async function createGroup(formData: FormData) {
	const supabase = await adminClient();
	const name = String(formData.get("name") ?? "").trim();
	if (name.length >= 2) await supabase.rpc("create_group", { p_name: name });
	revalidatePath("/admin");
}

export async function rotateGroupCode(groupId: string) {
	const supabase = await adminClient();
	await supabase.rpc("rotate_group_code", { p_group: groupId });
	revalidatePath("/admin");
}

export async function setGroupJoinable(groupId: string, joinable: boolean) {
	const supabase = await adminClient();
	await supabase.from("groups").update({ joinable }).eq("id", groupId);
	revalidatePath("/admin");
}

export async function removeGroupMember(groupId: string, userId: string) {
	const supabase = await adminClient();
	await supabase
		.from("group_members")
		.delete()
		.eq("group_id", groupId)
		.eq("user_id", userId);
	revalidatePath("/admin");
}
