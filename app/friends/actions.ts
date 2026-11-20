"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendPings } from "@/lib/push";
import { currentUser } from "@/lib/quests";
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

// Reactions: one per person per post. Pass null to take yours back.
export async function react(
	userQuestId: string,
	kind: "heart" | "fire" | "laugh" | null,
) {
	const supabase = await createClient();
	if (kind) {
		await supabase
			.from("feed_reactions")
			.upsert(
				{ user_quest_id: userQuestId, kind },
				{ onConflict: "user_id,user_quest_id" },
			);
	} else {
		await supabase
			.from("feed_reactions")
			.delete()
			.eq("user_quest_id", userQuestId);
	}
	revalidatePath("/friends");
}

export async function addComment(
	userQuestId: string,
	body: string,
): Promise<{ error?: string }> {
	const text = body.trim();
	if (text.length < 1 || text.length > 280) {
		return { error: "Comments are 1 to 280 characters." };
	}
	const supabase = await createClient();
	const { error } = await supabase
		.from("feed_comments")
		.insert({ user_quest_id: userQuestId, body: text });
	if (error) return { error: "Couldn't post that. Try again." };

	// Tell the person who did the quest, and only them. Not for comments on your own post.
	const { uid } = await currentUser();
	const { data: post } = await supabase
		.from("user_quests")
		.select("user_id, quests(title)")
		.eq("id", userQuestId)
		.maybeSingle();
	if (post && post.user_id !== uid) {
		const { data: me } = await supabase
			.from("profiles")
			.select("display_name, username")
			.eq("id", uid)
			.maybeSingle();
		const quest = Array.isArray(post.quests) ? post.quests[0] : post.quests;
		const ping = {
			type: "comment" as const,
			to: post.user_id as string,
			payload: {
				title: `${me?.display_name ?? me?.username ?? "Someone"} commented on ${quest?.title ?? "your quest"}`,
				body: text.length > 100 ? `${text.slice(0, 97)}...` : text,
				url: "/friends?view=feed",
				// One notification per post: more comments replace it instead of stacking.
				tag: `comment-${userQuestId}`,
			},
		};
		after(() => sendPings([ping]));
	}
	revalidatePath("/friends");
	return {};
}

// Row-level security lets you delete your own comments, and the creator delete any.
export async function deleteComment(commentId: string) {
	const supabase = await createClient();
	await supabase.from("feed_comments").delete().eq("id", commentId);
	revalidatePath("/friends");
}
