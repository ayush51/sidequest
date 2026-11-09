"use server";

import { redirect } from "next/navigation";
import { credentials } from "@/lib/credentials";
import { createClient } from "@/lib/supabase/server";

// `name` is returned so the form can keep it: React clears the fields after each submit.
export type AuthState = { error?: string; name?: string };

export async function authenticate(
	_prev: AuthState,
	formData: FormData,
): Promise<AuthState> {
	const mode = formData.get("mode");
	const name = String(formData.get("name") ?? "")
		.trim()
		.toLowerCase();
	const pin = String(formData.get("pin") ?? "");

	if (!/^[a-z0-9_]{3,20}$/.test(name)) {
		return { name, error: "Name: 3-20 letters, numbers or underscores." };
	}
	if (!/^\d{4}$/.test(pin)) return { name, error: "Your code is 4 digits." };

	const creds = credentials(name, pin);
	const supabase = await createClient();
	const { error } =
		mode === "signup"
			? await supabase.auth.signUp({
					...creds,
					options: { data: { username: name } },
				})
			: await supabase.auth.signInWithPassword(creds);

	if (error) {
		return {
			name,
			error:
				mode === "signup"
					? "That name is taken. Try another!"
					: "Wrong name or code.",
		};
	}
	// Optional group code at signup. A wrong code never blocks the new account:
	// send them to Social, where the join box lets them try again.
	const group = String(formData.get("group") ?? "").trim();
	if (mode === "signup" && group) {
		const { data } = await supabase.rpc("join_group", { p_code: group });
		if (!data || data.error) redirect("/friends?view=people");
	}
	redirect("/");
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
	redirect("/login");
}
