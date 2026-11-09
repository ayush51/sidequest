import Link from "next/link";
import { connection } from "next/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { Achievements } from "./achievements";
import { AvatarEditor, CodeForm, NameForm } from "./profile-forms";

export default async function ProfilePage() {
	await connection();
	const supabase = await createClient();
	const { data: claims } = await supabase.auth.getClaims();
	const uid = claims?.claims.sub as string;
	const { data: profile } = await supabase
		.from("profiles")
		.select("username, display_name, avatar_url, is_admin")
		.eq("id", uid)
		.single();

	const username = profile?.username ?? "";
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 p-6 pb-28">
			<header className="flex flex-col items-center gap-1 text-center">
				<h1 className="text-4xl font-bold tracking-tight">Profile</h1>
				<p className="text-muted-foreground">@{username}</p>
			</header>
			<AvatarEditor
				userId={uid}
				name={profile?.display_name ?? username}
				avatarUrl={profile?.avatar_url ?? null}
			/>
			<Achievements />
			<NameForm name={profile?.display_name ?? username} />
			<CodeForm />
			<div className="flex flex-col gap-2">
				<Link
					href="/interests"
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					Edit interests
				</Link>
				<Link
					href="/suggest"
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					Suggest a quest or feature
				</Link>
				{profile?.is_admin && (
					<Link
						href="/admin"
						className={buttonVariants({ variant: "outline", size: "lg" })}
					>
						Admin
					</Link>
				)}
				<form action={signOut}>
					<Button type="submit" variant="ghost" size="lg" className="w-full">
						Sign out
					</Button>
				</form>
			</div>
		</main>
	);
}
