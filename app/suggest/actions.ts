"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SuggestState = { error?: string; saved?: boolean };

const text = (formData: FormData, key: string) =>
	String(formData.get(key) ?? "");

export async function suggestQuest(
	_prev: SuggestState,
	formData: FormData,
): Promise<SuggestState> {
	const supabase = await createClient();
	// The database validates everything and sets the points from the difficulty.
	const { error } = await supabase.rpc("suggest_quest", {
		p_title: text(formData, "title"),
		p_description: text(formData, "description"),
		p_category: text(formData, "category"),
		p_area: text(formData, "area") as never,
		p_cost: text(formData, "cost") as never,
		p_difficulty: text(formData, "difficulty") as never,
	});
	revalidatePath("/suggest");
	return error ? { error: error.message } : { saved: true };
}

export async function suggestFeature(
	_prev: SuggestState,
	formData: FormData,
): Promise<SuggestState> {
	const supabase = await createClient();
	const { error } = await supabase.from("feature_requests").insert({
		title: text(formData, "title").trim(),
		details: text(formData, "details").trim(),
	});
	revalidatePath("/suggest");
	if (!error) return { saved: true };
	// A policy violation means 3 ideas are already waiting.
	return {
		error:
			error.code === "42501"
				? "You already have 3 ideas waiting. Hang tight!"
				: "Titles are 3-80 characters and details 10-1000.",
	};
}
