import { Crown, Zap } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import {
	getFeed,
	getLeaderboard,
	getMyGroups,
	getRelations,
	searchProfiles,
} from "@/lib/friends";
import { leaveGroup, respondToRequest, sendRequest } from "./actions";
import { JoinGroupForm } from "./join-group-form";

const one = <T,>(x: T | T[] | null | undefined) =>
	Array.isArray(x) ? x[0] : x;

const views = [
	{ id: "feed", label: "Feed" },
	{ id: "ranks", label: "Ranks" },
	{ id: "people", label: "People" },
] as const;

export default async function FriendsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; view?: string }>;
}) {
	await connection();
	const { q = "", view: v } = await searchParams;
	const view = views.find((x) => x.id === v)?.id ?? "feed";
	const [relations, feed, board, groups, results] = await Promise.all([
		getRelations(),
		getFeed(),
		getLeaderboard(),
		getMyGroups(),
		q.trim().length >= 2 ? searchProfiles(q.trim()) : [],
	]);

	return (
		<main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 p-6 pb-28">
			<h1 className="text-4xl font-bold tracking-tight">Social</h1>

			<nav className="grid grid-cols-3 gap-1 rounded-2xl border bg-card p-1">
				{views.map((x) => (
					<Link
						key={x.id}
						href={`/friends?view=${x.id}`}
						aria-current={view === x.id ? "page" : undefined}
						className={`rounded-xl py-2 text-center text-sm font-semibold ${
							view === x.id
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground"
						}`}
					>
						{x.label}
					</Link>
				))}
			</nav>

			{view === "people" && (
				<>
					<section className="flex flex-col gap-2">
						<form className="flex gap-2">
							<input type="hidden" name="view" value="people" />
							<input
								name="q"
								defaultValue={q}
								placeholder="Find a friend by name"
								className="h-12 min-w-0 flex-1 rounded-2xl border bg-card px-4 outline-none focus:border-ring"
							/>
							<Button type="submit" size="lg">
								Search
							</Button>
						</form>
						{q && results.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No one found. Names start-match, 2+ letters.
							</p>
						)}
						{results.map((p) => {
							const state = relations.byUser.get(p.id);
							return (
								<div key={p.id} className="flex items-center justify-between">
									<span>{p.display_name ?? p.username}</span>
									{state === "friend" ? (
										<span className="text-sm">Friends</span>
									) : state ? (
										<span className="text-sm text-muted-foreground">
											{state === "sent" ? "Requested" : "Wants to be friends"}
										</span>
									) : (
										<form action={sendRequest.bind(null, p.id)}>
											<Button type="submit" size="sm">
												Add
											</Button>
										</form>
									)}
								</div>
							);
						})}
					</section>

					{relations.incoming.length > 0 && (
						<section className="flex flex-col gap-2">
							<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
								Requests
							</h2>
							{relations.incoming.map((r) => (
								<div
									key={r.requester_id}
									className="flex items-center justify-between"
								>
									<span>{one(r.requester)?.username}</span>
									<span className="flex gap-3 text-sm">
										<form
											action={respondToRequest.bind(null, r.requester_id, true)}
										>
											<Button type="submit" size="sm">
												Accept
											</Button>
										</form>
										<form
											action={respondToRequest.bind(
												null,
												r.requester_id,
												false,
											)}
										>
											<Button type="submit" size="sm" variant="ghost">
												Decline
											</Button>
										</form>
									</span>
								</div>
							))}
						</section>
					)}

					<section className="flex flex-col gap-2">
						<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
							Groups
						</h2>
						{groups.map((g) => (
							<div
								key={g.id}
								className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
							>
								<span className="font-semibold">
									{g.name}
									<span className="font-normal text-muted-foreground">
										{" "}
										· {g.members} {g.members === 1 ? "member" : "members"}
									</span>
								</span>
								<form action={leaveGroup.bind(null, g.id)}>
									<Button type="submit" variant="ghost" size="sm">
										Leave
									</Button>
								</form>
							</div>
						))}
						<JoinGroupForm />
					</section>

					<section className="flex flex-col gap-2">
						<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
							Your people
						</h2>
						<ul className="flex flex-col gap-2">
							{[...board]
								.sort((a, b) => a.name.localeCompare(b.name))
								.map((row) => (
									<li
										key={row.id}
										className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
									>
										<Avatar url={row.avatarUrl} name={row.name} size={32} />
										<span className="flex-1 font-semibold">
											{row.name}
											{row.isMe && (
												<span className="font-normal text-muted-foreground">
													{" "}
													(you)
												</span>
											)}
										</span>
										<span className="text-sm font-semibold text-muted-foreground tabular-nums">
											{row.xp} XP
										</span>
									</li>
								))}
						</ul>
					</section>
				</>
			)}

			{view === "ranks" && (
				<section className="flex flex-col gap-2">
					<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
						This week
					</h2>
					<ol className="flex flex-col gap-2">
						{board.map((row, i) => (
							<li
								key={row.id}
								className={`flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 ${
									row.isMe ? "border-primary" : ""
								}`}
							>
								<span className="w-6 text-center font-bold tabular-nums">
									{i === 0 && row.points > 0 ? (
										<Crown
											className="mx-auto size-5 text-primary-ink"
											aria-label="First place"
										/>
									) : (
										i + 1
									)}
								</span>
								<Avatar url={row.avatarUrl} name={row.name} size={32} />
								<span className="flex-1 font-semibold">
									{row.name}
									{row.isMe && (
										<span className="font-normal text-muted-foreground">
											{" "}
											(you)
										</span>
									)}
								</span>
								<span className="font-bold tabular-nums">{row.points}</span>
							</li>
						))}
					</ol>
				</section>
			)}

			{view === "feed" && (
				<section className="flex flex-col gap-3">
					<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
						Activity
					</h2>
					{feed.length === 0 && (
						<p className="text-sm text-muted-foreground">
							Nothing yet. Complete a quest, or add friends to see theirs!
						</p>
					)}
					{feed.map((item) => {
						const who = one(item.profiles);
						return (
							<article
								key={item.id}
								className="flex flex-col gap-2 rounded-3xl border bg-card p-4"
							>
								<div className="flex items-center gap-3">
									<Avatar
										url={who?.avatar_url}
										name={who?.display_name ?? who?.username ?? "?"}
									/>
									<p>
										<strong>{who?.display_name ?? who?.username}</strong>{" "}
										finished <strong>{one(item.quests)?.title}</strong>
									</p>
								</div>
								{item.photoUrl && (
									// biome-ignore lint/performance/noImgElement: signed URLs are short-lived, skip the image optimizer
									<img
										src={item.photoUrl}
										alt={`Proof of ${one(item.quests)?.title}`}
										className="rounded-2xl"
									/>
								)}
								<p className="text-sm text-muted-foreground">
									<Zap className="mr-1 inline size-3.5 text-primary-ink" />
									{item.pointsEarned} XP ·{" "}
									{new Date(item.completed_at).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										timeZone: "America/New_York",
									})}
								</p>
							</article>
						);
					})}
				</section>
			)}
		</main>
	);
}
