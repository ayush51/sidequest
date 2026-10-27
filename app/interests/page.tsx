import { connection } from "next/server";
import { getInterests } from "@/lib/quests";
import { createClient } from "@/lib/supabase/server";
import { InterestsForm } from "./interests-form";

export default async function InterestsPage() {
	await connection();
	const supabase = await createClient();
	const [{ data: all }, mine] = await Promise.all([
		supabase.from("interests").select("slug, label").order("label"),
		getInterests(),
	]);

	return (
		<main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 p-6 pb-28">
			<header className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">
					What are you into?
				</h1>
				<p className="text-muted-foreground">
					Pick as many as you like. Your quests will lean this way.
				</p>
			</header>
			<InterestsForm all={all ?? []} mine={mine} />
		</main>
	);
}
