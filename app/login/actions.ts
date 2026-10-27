"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

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
		return { error: "Name: 3-20 letters, numbers or underscores." };
	}
	if (!/^\d{4}$/.test(pin)) return { error: "Your code is 4 digits." };

	// Supabase needs an email and a 6+ char password; derive both from name + code.
	const credentials = {
		email: `${name}@users.sidequest.app`,
		password: `${name}:${pin}`,
	};
	const supabase = await createClient();
	const { error } =
		mode === "signup"
			? await supabase.auth.signUp({
					...credentials,
					options: { data: { username: name } },
				})
			: await supabase.auth.signInWithPassword(credentials);

	if (error) {
		return {
			error:
				mode === "signup"
					? "That name is taken. Try another!"
					: "Wrong name or code.",
		};
	}
	redirect("/");
}
