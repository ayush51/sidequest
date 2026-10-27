import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FeatureForm, QuestForm } from "./suggest-forms";

const statusLabel: Record<string, string> = {
	pending: "Waiting for review",
	approved: "Approved",
	building: "Being built",
	shipped: "Shipped",
	rejected: "Not this time",
};

const heading = "text-xs font-bold tracking-widest text-primary-ink uppercase";

export default async function SuggestPage() {
	await connection();
	const supabase = await createClient();
	const { data: claims } = await supabase.auth.getClaims();
	const uid = claims?.claims.sub as string;

	const [categories, quests, features] = await Promise.all([
		supabase.from("interests").select("slug, label").order("label"),
		supabase
			.from("quests")
			.select("id, title, status")
			.eq("author_id", uid)
			.order("created_at", { ascending: false })
			.limit(10),
		supabase
			.from("feature_requests")
			.select("id, title, status, admin_note")
			.eq("author_id", uid)
			.order("created_at", { ascending: false })
			.limit(10),
	]);

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 p-6 pb-28">
			<h1 className="text-4xl font-bold tracking-tight">Suggest</h1>

			<section className="flex flex-col gap-3">
				<h2 className={heading}>A side quest</h2>
				<QuestForm categories={categories.data ?? []} />
			</section>

			<section className="flex flex-col gap-3">
				<h2 className={heading}>A feature</h2>
				<FeatureForm />
			</section>

			{((quests.data?.length ?? 0) > 0 || (features.data?.length ?? 0) > 0) && (
				<section className="flex flex-col gap-2">
					<h2 className={heading}>Your suggestions</h2>
					<ul className="flex flex-col gap-2">
						{quests.data?.map((q) => (
							<li
								key={q.id}
								className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
							>
								<span className="font-semibold">{q.title}</span>
								<span className="text-sm text-muted-foreground">
									{q.status === "approved"
										? "In the pool"
										: statusLabel[q.status]}
								</span>
							</li>
						))}
						{features.data?.map((f) => (
							<li
								key={f.id}
								className="flex flex-col gap-1 rounded-2xl border bg-card px-4 py-3"
							>
								<span className="flex items-center justify-between gap-3">
									<span className="font-semibold">{f.title}</span>
									<span className="text-sm text-muted-foreground">
										{statusLabel[f.status]}
									</span>
								</span>
								{f.admin_note && (
									<span className="text-sm text-muted-foreground">
										{f.admin_note}
									</span>
								)}
							</li>
						))}
					</ul>
				</section>
			)}
		</main>
	);
}
