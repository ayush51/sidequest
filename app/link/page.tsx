import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { openPending, PENDING_COOKIE, usernameFrom } from "@/lib/square-pass";
import { LinkForm } from "./link-form";

// Arrived from The Square but not linked yet (see app/sso/route.ts).
export default async function LinkPage() {
	const pending = openPending(
		(await cookies()).get(PENDING_COOKIE)?.value,
		process.env.SQUARE_SSO_SECRET,
	);
	if (!pending) redirect("/login");
	return (
		<LinkForm
			squareName={pending.name}
			suggested={usernameFrom(pending.name)}
		/>
	);
}
