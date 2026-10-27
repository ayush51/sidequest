import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { areaLabel } from "@/lib/areas";
import { createClient } from "@/lib/supabase/server";
import {
	approveQuest,
	createGroup,
	rejectQuest,
	removeGroupMember,
	rotateGroupCode,
	setFeatureStatus,
	setGroupJoinable,
} from "./actions";

const one = <T,>(x: T | T[] | null | undefined) =>
	Array.isArray(x) ? x[0] : x;

const heading = "text-xs font-bold tracking-widest text-primary-ink uppercase";
const card = "flex flex-col gap-3 rounded-3xl border bg-card p-4";

export default async function AdminPage() {
	await connection();
	const supabase = await createClient();
	const { data: isAdmin } = await supabase.rpc("is_admin");
	if (!isAdmin) notFound();

	const [quests, pending, recent, groups] = await Promise.all([
		supabase
			.from("quests")
			.select(
				"id, title, description, area, cost, difficulty, points, interests(label), profiles(display_name, username)",
			)
			.eq("status", "pending")
			.order("created_at"),
		supabase
			.from("feature_requests")
			.select("id, title, details, profiles(display_name, username)")
			.eq("status", "pending")
			.order("created_at"),
		supabase
			.from("feature_requests")
			.select("id, title, status, admin_note")
			.neq("status", "pending")
			.order("created_at", { ascending: false })
			.limit(15),
		supabase
			.from("groups")
			.select(
				"id, name, code, joinable, group_members(user_id, profiles(display_name, username))",
			)
			.order("created_at"),
	]);

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 p-6 pb-28">
			<h1 className="text-4xl font-bold tracking-tight">Admin</h1>

			<section className="flex flex-col gap-3">
				<h2 className={heading}>Groups ({groups.data?.length ?? 0})</h2>
				<form action={createGroup} className="flex gap-2">
					<input
						name="name"
						placeholder="New group name"
						maxLength={40}
						required
						className="h-12 min-w-0 flex-1 rounded-2xl border bg-card px-4 outline-none focus:border-ring"
					/>
					<Button type="submit" size="lg">
						Create
					</Button>
				</form>
				{groups.data?.map((g) => (
					<div key={g.id} className={card}>
						<div className="flex items-center justify-between gap-3">
							<p className="text-xl font-bold">{g.name}</p>
							<code className="rounded-lg bg-muted px-2 py-1 text-lg font-bold tracking-widest">
								{g.code}
							</code>
						</div>
						<p className="text-sm text-muted-foreground">
							{g.group_members.length} members ·{" "}
							{g.joinable ? "open to join" : "closed to new joins"}
						</p>
						<div className="flex gap-2">
							<form action={rotateGroupCode.bind(null, g.id)}>
								<Button type="submit" variant="outline" size="sm">
									New code
								</Button>
							</form>
							<form action={setGroupJoinable.bind(null, g.id, !g.joinable)}>
								<Button type="submit" variant="outline" size="sm">
									{g.joinable ? "Close joining" : "Open joining"}
								</Button>
							</form>
						</div>
						<ul className="flex flex-col gap-1">
							{g.group_members.map((m) => {
								const who = one(m.profiles);
								return (
									<li
										key={m.user_id}
										className="flex items-center justify-between text-sm"
									>
										<span>{who?.display_name ?? who?.username}</span>
										<form
											action={removeGroupMember.bind(null, g.id, m.user_id)}
										>
											<Button type="submit" variant="ghost" size="xs">
												Remove
											</Button>
										</form>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</section>

			<section className="flex flex-col gap-3">
				<h2 className={heading}>
					Quest suggestions ({quests.data?.length ?? 0})
				</h2>
				{quests.data?.length === 0 && (
					<p className="text-sm text-muted-foreground">Nothing waiting.</p>
				)}
				{quests.data?.map((q) => {
					const who = one(q.profiles);
					return (
						<div key={q.id} className={card}>
							<p className="text-xl font-bold">{q.title}</p>
							<p className="text-muted-foreground">{q.description}</p>
							<p className="text-sm text-muted-foreground">
								{one(q.interests)?.label} · {areaLabel(q.area)} · {q.cost} ·{" "}
								{q.difficulty} · by {who?.display_name ?? who?.username}
							</p>
							<form
								action={approveQuest.bind(null, q.id)}
								className="flex items-center gap-2"
							>
								<input
									name="points"
									type="number"
									min={1}
									max={100}
									defaultValue={q.points}
									aria-label="Points"
									className="h-10 w-20 rounded-xl border bg-background px-3"
								/>
								<span className="text-sm text-muted-foreground">pts</span>
								<Button type="submit" size="sm" className="ml-auto">
									Approve
								</Button>
							</form>
							<form action={rejectQuest.bind(null, q.id)}>
								<Button type="submit" variant="ghost" size="sm">
									Reject
								</Button>
							</form>
						</div>
					);
				})}
			</section>

			<section className="flex flex-col gap-3">
				<h2 className={heading}>
					Feature requests ({pending.data?.length ?? 0})
				</h2>
				{pending.data?.length === 0 && (
					<p className="text-sm text-muted-foreground">Nothing waiting.</p>
				)}
				{pending.data?.map((f) => {
					const who = one(f.profiles);
					return (
						<div key={f.id} className={card}>
							<p className="text-xl font-bold">{f.title}</p>
							<p className="whitespace-pre-wrap text-muted-foreground">
								{f.details}
							</p>
							<p className="text-sm text-muted-foreground">
								by {who?.display_name ?? who?.username}
							</p>
							<form className="flex flex-col gap-2">
								<input
									name="note"
									placeholder="Optional note for the author"
									className="h-10 rounded-xl border bg-background px-3"
								/>
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										formAction={setFeatureStatus.bind(null, f.id, "approved")}
									>
										Approve
									</Button>
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										formAction={setFeatureStatus.bind(null, f.id, "rejected")}
									>
										Reject
									</Button>
								</div>
							</form>
						</div>
					);
				})}
			</section>

			{(recent.data?.length ?? 0) > 0 && (
				<section className="flex flex-col gap-2">
					<h2 className={heading}>Recent features</h2>
					<ul className="flex flex-col gap-2">
						{recent.data?.map((f) => (
							<li
								key={f.id}
								className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
							>
								<span className="font-semibold">{f.title}</span>
								<span className="text-sm text-muted-foreground">
									{f.status}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}
		</main>
	);
}
