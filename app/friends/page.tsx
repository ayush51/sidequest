import Link from "next/link";
import { getFeed, getRelations, searchProfiles } from "@/lib/friends";
import { respondToRequest, sendRequest } from "./actions";

const one = <T,>(x: T | T[] | null | undefined) =>
	Array.isArray(x) ? x[0] : x;

export default async function FriendsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>;
}) {
	const { q = "" } = await searchParams;
	const [relations, feed, results] = await Promise.all([
		getRelations(),
		getFeed(),
		q.trim().length >= 2 ? searchProfiles(q.trim()) : [],
	]);

	return (
		<main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 p-6">
			<header className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Friends 👯</h1>
				<Link href="/" className="text-sm underline">
					← Today
				</Link>
			</header>

			<section className="flex flex-col gap-2">
				<form className="flex gap-2">
					<input
						name="q"
						defaultValue={q}
						placeholder="Find a friend by name"
						className="min-w-0 flex-1 rounded-2xl border px-4 py-3"
					/>
					<button
						type="submit"
						className="rounded-2xl bg-foreground px-4 py-3 font-semibold text-background"
					>
						Search
					</button>
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
								<span className="text-sm">Friends ✓</span>
							) : state ? (
								<span className="text-sm text-muted-foreground">
									{state === "sent" ? "Requested" : "Wants to be friends"}
								</span>
							) : (
								<form action={sendRequest.bind(null, p.id)}>
									<button type="submit" className="text-sm underline">
										Add
									</button>
								</form>
							)}
						</div>
					);
				})}
			</section>

			{relations.incoming.length > 0 && (
				<section className="flex flex-col gap-2">
					<h2 className="font-semibold">Requests</h2>
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
									<button type="submit" className="font-semibold underline">
										Accept
									</button>
								</form>
								<form
									action={respondToRequest.bind(null, r.requester_id, false)}
								>
									<button type="submit" className="underline">
										Decline
									</button>
								</form>
							</span>
						</div>
					))}
				</section>
			)}

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold">Activity</h2>
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
							className="flex flex-col gap-2 rounded-3xl border p-4"
						>
							<p>
								<strong>{who?.display_name ?? who?.username}</strong> finished{" "}
								<strong>{one(item.quests)?.title}</strong>
							</p>
							{item.photoUrl && (
								// biome-ignore lint/performance/noImgElement: signed URLs are short-lived, skip the image optimizer
								<img
									src={item.photoUrl}
									alt={`Proof of ${one(item.quests)?.title}`}
									className="rounded-2xl"
								/>
							)}
							<p className="text-sm text-muted-foreground">
								+{item.pointsEarned} pts ·{" "}
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
		</main>
	);
}
