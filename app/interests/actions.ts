"use server";

import { createClient } from "@/lib/supabase/server";

export type InterestsState = { error?: string; saved?: boolean };

export async function saveInterests(
	_prev: InterestsState,
	formData: FormData,
): Promise<InterestsState> {
	const slugs = formData.getAll("interest").map(String);
	if (slugs.length === 0) return { error: "Pick at least one." };

	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const uid = data?.claims.sub as string;

	await supabase.from("profile_interests").delete().eq("profile_id", uid);
	await supabase
		.from("profile_interests")
		.insert(slugs.map((interest_slug) => ({ interest_slug })));

	return { saved: true };
}
