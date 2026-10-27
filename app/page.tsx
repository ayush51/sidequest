import { Flame, MapPin, Trophy, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	getInterests,
	getStats,
	getTodayQuest,
	PHOTO_BONUS,
} from "@/lib/quests";
import { signOut } from "./login/actions";
import { QuestComplete } from "./quest-complete";

const one = <T,>(x: T | T[] | null | undefined) =>
	Array.isArray(x) ? x[0] : x;

export default async function Home() {
	// Per-user page: render at request time so time-based reads aren't prerendered.
	await connection();
	const interests = await getInterests();
	if (interests.length === 0) redirect("/interests");
	const [today, stats] = await Promise.all([
		getTodayQuest(interests),
		getStats(),
	]);
	const quest = Array.isArray(today?.quests) ? today.quests[0] : today?.quests;
	const emoji = one(quest?.interests)?.emoji;

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
				<div className="flex">
					<Link
						href="/interests"
						className={buttonVariants({ variant: "ghost", size: "sm" })}
					>
						Interests
					</Link>
					<form action={signOut}>
						<Button type="submit" variant="ghost" size="sm">
							Sign out
						</Button>
					</form>
				</div>
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
							{quest.area.replaceAll("_", " ")}
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
						done={today.status === "completed"}
						earned={quest.points + (today.photo_path ? PHOTO_BONUS : 0)}
					/>
				</section>
			) : (
				<p className="text-muted-foreground">No quests available yet.</p>
			)}
		</main>
	);
}
