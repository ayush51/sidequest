"use server";

import { revalidatePath } from "next/cache";
import { credentials } from "@/lib/credentials";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; saved?: boolean };

async function currentProfile() {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const uid = data?.claims.sub as string;
	return { supabase, uid };
}

// Only accept URLs that point into this user's own avatars folder.
export async function saveAvatarUrl(url: string): Promise<FormState> {
	const { supabase, uid } = await currentProfile();
	const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${uid}/`;
	if (!url.startsWith(prefix)) return { error: "Invalid photo." };
	const { error } = await supabase
		.from("profiles")
		.update({ avatar_url: url })
		.eq("id", uid);
	revalidatePath("/profile");
	return error ? { error: "Couldn't save your photo." } : { saved: true };
}

export async function updateDisplayName(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const name = String(formData.get("name") ?? "").trim();
	if (name.length < 1 || name.length > 30) {
		return { error: "Names are 1-30 characters." };
	}
	const { supabase, uid } = await currentProfile();
	const { error } = await supabase
		.from("profiles")
		.update({ display_name: name })
		.eq("id", uid);
	revalidatePath("/profile");
	return error ? { error: "Couldn't save that name." } : { saved: true };
}

export async function changeCode(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const current = String(formData.get("current") ?? "");
	const next = String(formData.get("next") ?? "");
	if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) {
		return { error: "Codes are 4 digits." };
	}
	const { supabase, uid } = await currentProfile();
	const { data: profile } = await supabase
		.from("profiles")
		.select("username")
		.eq("id", uid)
		.single();
	if (!profile?.username) return { error: "Couldn't change your code." };

	const check = await supabase.auth.signInWithPassword(
		credentials(profile.username, current),
	);
	if (check.error) return { error: "Your current code is wrong." };

	const { error } = await supabase.auth.updateUser({
		password: credentials(profile.username, next).password,
	});
	return error ? { error: "Couldn't change your code." } : { saved: true };
}
