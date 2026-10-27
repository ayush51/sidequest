import Link from "next/link";
import { getStats, getTodayQuest, PHOTO_BONUS } from "@/lib/quests";
import { signOut } from "./login/actions";
import { QuestComplete } from "./quest-complete";

export default async function Home() {
	const [today, stats] = await Promise.all([getTodayQuest(), getStats()]);
	const quest = Array.isArray(today?.quests) ? today.quests[0] : today?.quests;
	const done = today?.status === "completed";

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
			<h1 className="text-4xl font-bold">SideQuest 🧭</h1>
			<p className="flex gap-4 font-semibold">
				<span>⭐ {stats.points} pts</span>
				<span>🔥 {stats.streak} day streak</span>
				<span>Lv {stats.level}</span>
			</p>
			{today && quest ? (
				<section className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border p-6 text-left">
					<p className="text-sm text-muted-foreground">
						Today's quest · {quest.area.replaceAll("_", " ")} · {quest.cost}
					</p>
					<h2 className="text-2xl font-bold">{quest.title}</h2>
					<p>{quest.description}</p>
					<p className="font-semibold">{quest.points} pts</p>
					{done ? (
						<p className="rounded-2xl bg-muted px-4 py-3 text-center font-semibold">
							+{quest.points + (today.photo_path ? PHOTO_BONUS : 0)} pts! 🎉
							Come back tomorrow.
						</p>
					) : (
						<QuestComplete userQuestId={today.id} bonus={PHOTO_BONUS} />
					)}
				</section>
			) : (
				<p className="text-muted-foreground">No quests available yet.</p>
			)}
			<Link href="/friends" className="font-semibold underline">
				Friends 👯
			</Link>
			<form action={signOut}>
				<button type="submit" className="text-sm underline">
					Sign out
				</button>
			</form>
		</main>
	);
}
