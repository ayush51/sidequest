import {
	Flame,
	MapPin,
	Plus,
	Shuffle,
	Trophy,
	Wallet,
	Zap,
} from "lucide-react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import {
	BONUS_LIMIT,
	getBonuses,
	getInterests,
	getStats,
	getTodayQuest,
	PHOTO_BONUS,
} from "@/lib/quests";
import { claimBonusQuest, reroll } from "./actions";
import { QuestComplete } from "./quest-complete";

const AREAS: Record<string, string> = {
	dc_other: "DC",
	maryland_other: "Maryland",
	virginia_other: "Virginia",
};
const areaLabel = (area: string) => AREAS[area] ?? area.replaceAll("_", " ");

const one = <T,>(x: T | T[] | null | undefined) =>
	Array.isArray(x) ? x[0] : x;

export default async function Home() {
	// Per-user page: render at request time so time-based reads aren't prerendered.
	await connection();
	const interests = await getInterests();
	if (interests.length === 0) redirect("/interests");
	const [today, stats, bonuses] = await Promise.all([
		getTodayQuest(interests),
		getStats(),
		getBonuses(),
	]);
	const quest = Array.isArray(today?.quests) ? today.quests[0] : today?.quests;
	const emoji = one(quest?.interests)?.emoji;
	const done = today?.status === "completed";
	const canClaimBonus =
		bonuses.length < BONUS_LIMIT &&
		bonuses.every((b) => b.status === "completed");

	const tiles = [
		{ Icon: Zap, label: "Points", value: stats.points },
		{ Icon: Flame, label: "Streak", value: stats.streak },
		{ Icon: Trophy, label: "Level", value: stats.level },
	];

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 p-6 pb-28">
			<header className="flex items-center justify-between">
				<h1 className="text-xl font-bold tracking-tight">
					sidequest<span className="text-primary-ink">.</span>
				</h1>
			</header>

			<ul className="grid grid-cols-3 gap-2">
				{tiles.map(({ Icon, label, value }) => (
					<li key={label} className="rounded-2xl border bg-card p-3">
						<Icon className="size-4 text-primary-ink" strokeWidth={2.5} />
						<p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
						<p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
							{label}
						</p>
					</li>
				))}
			</ul>

			{today && quest ? (
				<section className="fade-in slide-in-from-bottom-3 relative flex animate-in flex-col gap-5 rounded-3xl border bg-card p-6 duration-500">
					<div className="flex items-center justify-between">
						<p className="text-xs font-bold tracking-widest text-primary-ink uppercase">
							Today's quest
						</p>
						{emoji && (
							<span
								className="grid size-10 place-items-center rounded-xl bg-muted text-xl"
								aria-hidden
							>
								{emoji}
							</span>
						)}
					</div>
					<h2 className="text-4xl leading-[1.05] font-bold tracking-tight">
						{quest.title}
					</h2>
					<p className="text-muted-foreground">{quest.description}</p>
					<ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-muted-foreground">
						<li className="flex items-center gap-1.5 capitalize">
							<MapPin className="size-4" />
							{areaLabel(quest.area)}
						</li>
						<li className="flex items-center gap-1.5">
							<Wallet className="size-4" />
							{quest.cost}
						</li>
						<li className="flex items-center gap-1.5 text-foreground">
							<Zap className="size-4 text-primary-ink" />
							{quest.points} pts
						</li>
					</ul>
					<QuestComplete
						userQuestId={today.id}
						bonus={PHOTO_BONUS}
						done={done}
						earned={quest.points + (today.photo_path ? PHOTO_BONUS : 0)}
					/>
					{!done && !today.rerolled && (
						<form action={reroll}>
							<Button
								type="submit"
								variant="ghost"
								size="sm"
								className="w-full text-muted-foreground"
							>
								<Shuffle className="size-4" />
								Not feeling it? Reroll (1 left)
							</Button>
						</form>
					)}
				</section>
			) : (
				<p className="text-muted-foreground">No quests available yet.</p>
			)}
			{done && (
				<section className="flex flex-col gap-3">
					<p className="text-xs font-bold tracking-widest text-primary-ink uppercase">
						Bonus round
					</p>
					{bonuses.map((b) => {
						const bq = one(b.quests);
						return bq ? (
							<div
								key={b.id}
								className="flex flex-col gap-3 rounded-3xl border bg-card p-5"
							>
								<h3 className="text-2xl font-bold tracking-tight">
									{bq.title}
								</h3>
								<p className="text-sm text-muted-foreground">
									{bq.description}
								</p>
								<QuestComplete
									userQuestId={b.id}
									bonus={PHOTO_BONUS}
									done={b.status === "completed"}
									earned={bq.points + (b.photo_path ? PHOTO_BONUS : 0)}
								/>
							</div>
						) : null;
					})}
					{canClaimBonus ? (
						<form action={claimBonusQuest}>
							<Button
								type="submit"
								variant="outline"
								size="lg"
								className="w-full"
							>
								<Plus className="size-5" />
								Get a bonus quest
							</Button>
						</form>
					) : (
						bonuses.length >= BONUS_LIMIT && (
							<p className="text-center text-sm text-muted-foreground">
								That's all the bonuses for today. Nice.
							</p>
						)
					)}
				</section>
			)}
		</main>
	);
}
