import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
	PENDING_COOKIE,
	PENDING_SECONDS,
	sealPending,
	verifyPass,
} from "@/lib/square-pass";
import { createAdminClient, signInAs } from "@/lib/supabase/admin";

// Arriving from The Square's app menu with a pass (see lib/square-pass.ts).
// A linked person is signed straight in. Anyone else goes to /link to link the
// SideQuest account they already have, or create one. Anything wrong with the
// pass (forged, expired, already used) lands on the normal sign-in page.
export async function GET(request: NextRequest) {
	const secret = process.env.SQUARE_SSO_SECRET;
	const claims = verifyPass(request.nextUrl.searchParams.get("t"), secret);
	if (!claims || !secret) redirect("/login");

	const admin = createAdminClient();
	// One use: the nonce can be spent once, and is kept until the pass expires.
	const { error: replay } = await admin.from("square_passes").insert({
		jti: claims.jti,
		expires_at: new Date(claims.exp * 1000).toISOString(),
	});
	if (replay) redirect("/login");
	await admin
		.from("square_passes")
		.delete()
		.lt("expires_at", new Date().toISOString());

	const { data: link } = await admin
		.from("square_links")
		.select("user_id")
		.eq("iss", claims.iss)
		.eq("sub", claims.sub)
		.maybeSingle();
	if (link && (await signInAs(link.user_id))) redirect("/");

	const jar = await cookies();
	jar.set(
		PENDING_COOKIE,
		sealPending(
			{
				iss: claims.iss,
				sub: claims.sub,
				name: claims.name,
				exp: Math.floor(Date.now() / 1000) + PENDING_SECONDS,
			},
			secret,
		),
		{
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: PENDING_SECONDS,
			path: "/",
		},
	);
	redirect("/link");
}
