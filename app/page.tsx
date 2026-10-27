import { Button } from "@/components/ui/button";
import { getStats, getTodayQuest, PHOTO_BONUS } from "@/lib/quests";
import { signOut } from "./login/actions";
import { QuestComplete } from "./quest-complete";

const one = <T,>(x: T | T[] | null | undefined) =>
	Array.isArray(x) ? x[0] : x;

export default async function Home() {
	const [today, stats] = await Promise.all([getTodayQuest(), getStats()]);
	const quest = Array.isArray(today?.quests) ? today.quests[0] : today?.quests;
	const emoji = one(quest?.interests)?.emoji;

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center gap-5 p-6 pb-28 text-center">
			<h1 className="text-3xl font-extrabold">SideQuest 🧭</h1>
			<ul className="flex flex-wrap justify-center gap-2 text-sm font-bold">
				<li className="rounded-full bg-primary px-3 py-1 text-primary-foreground">
					⭐ {stats.points} pts
				</li>
				<li className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
					🔥 {stats.streak} day streak
				</li>
				<li className="rounded-full bg-accent px-3 py-1 text-accent-foreground">
					Lv {stats.level}
				</li>
			</ul>

			{today && quest ? (
				<section className="fade-in zoom-in-95 slide-in-from-bottom-4 relative flex w-full animate-in flex-col gap-3 rounded-3xl border-2 bg-card p-6 text-left shadow-sm duration-500">
					<span className="text-6xl" aria-hidden>
						{emoji ?? "✨"}
					</span>
					<p className="flex gap-2 text-xs font-bold">
						<span className="rounded-full bg-muted px-2 py-0.5 capitalize">
							{quest.area.replaceAll("_", " ")}
						</span>
						<span className="rounded-full bg-muted px-2 py-0.5">
							{quest.cost}
						</span>
						<span className="rounded-full bg-primary/30 px-2 py-0.5">
							{quest.points} pts
						</span>
					</p>
					<h2 className="text-2xl font-extrabold">{quest.title}</h2>
					<p className="text-muted-foreground">{quest.description}</p>
					<QuestComplete
						userQuestId={today.id}
						bonus={PHOTO_BONUS}
						done={today.status === "completed"}
						earned={quest.points + (today.photo_path ? PHOTO_BONUS : 0)}
					/>
				</section>
			) : (
				<p className="text-muted-foreground">No quests available yet.</p>
			)}

			<form action={signOut} className="mt-auto">
				<Button type="submit" variant="ghost" size="sm">
					Sign out
				</Button>
			</form>
		</main>
	);
}
