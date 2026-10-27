import { getStats, getTodayQuest } from "@/lib/quests";
import { completeQuest } from "./actions";
import { signOut } from "./login/actions";

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
							+{quest.points} pts! 🎉 Come back tomorrow.
						</p>
					) : (
						<form action={completeQuest.bind(null, today.id)}>
							<button
								type="submit"
								className="w-full rounded-2xl bg-foreground px-4 py-3 font-semibold text-background"
							>
								Mark complete
							</button>
						</form>
					)}
				</section>
			) : (
				<p className="text-muted-foreground">No quests available yet.</p>
			)}
			<form action={signOut}>
				<button type="submit" className="text-sm underline">
					Sign out
				</button>
			</form>
		</main>
	);
}
