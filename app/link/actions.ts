"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { credentials } from "@/lib/credentials";
import { openPending, PENDING_COOKIE } from "@/lib/square-pass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LinkState = { error?: string; name?: string };

// Finish signing in from The Square: sign in to (or create) a SideQuest
// account the usual way, name and 4-digit code, then remember the link so
// every later tap from The Square goes straight in.
export async function linkSquareAccount(
	_prev: LinkState,
	formData: FormData,
): Promise<LinkState> {
	const jar = await cookies();
	const pending = openPending(
		jar.get(PENDING_COOKIE)?.value,
		process.env.SQUARE_SSO_SECRET,
	);
	if (!pending) {
		return {
			error: "That took too long. Open SideQuest from The Square again.",
		};
	}

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
	const { data, error } =
		mode === "signup"
			? await supabase.auth.signUp({
					...creds,
					options: { data: { username: name } },
				})
			: await supabase.auth.signInWithPassword(creds);
	const userId = data.user?.id;
	if (error || !userId) {
		return {
			name,
			error:
				mode === "signup"
					? "That name is taken. Try another!"
					: "Wrong name or code.",
		};
	}

	const { error: linkError } = await createAdminClient()
		.from("square_links")
		.insert({ iss: pending.iss, sub: pending.sub, user_id: userId });
	if (linkError) {
		// Already linked to someone else on The Square: don't stay signed in as it.
		await supabase.auth.signOut();
		return {
			name,
			error: "That account is already linked to someone else on The Square.",
		};
	}
	jar.delete(PENDING_COOKIE);
	redirect("/");
}
