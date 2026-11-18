import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Service role: bypasses RLS. Server only, and only for signing in from The
// Square (app/sso, app/link). Never import this into a client component.
export function createAdminClient() {
	return createSupabaseClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{ auth: { autoRefreshToken: false, persistSession: false } },
	);
}

// Start a session for a linked user, without their code: the pass already
// proved who they are. generateLink only RETURNS a one-time token (nothing is
// emailed); verifying it on the cookie-bound client sets the session cookies.
export async function signInAs(userId: string) {
	const admin = createAdminClient();
	const { data: found } = await admin.auth.admin.getUserById(userId);
	const email = found.user?.email;
	if (!email) return false;
	const { data, error } = await admin.auth.admin.generateLink({
		type: "magiclink",
		email,
	});
	const tokenHash = data?.properties?.hashed_token;
	if (error || !tokenHash) return false;
	const supabase = await createClient();
	const { error: verifyError } = await supabase.auth.verifyOtp({
		type: "magiclink",
		token_hash: tokenHash,
	});
	return !verifyError;
}
