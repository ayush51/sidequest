"use client";

import { Share2, Users } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { getTeamCandidates, inviteToTeam } from "./actions";

type Person = {
	id: string;
	name: string;
	avatar_url: string | null;
	invited: boolean;
};

// "Team up" on today's quest: pick friends or group-mates to do it with. Each one has to
// accept, and when you both finish you each get +5 XP.
export function TeamUp({
	questTitle,
	canInvite,
	mates,
}: {
	questTitle: string;
	canInvite: boolean;
	mates: { name: string; status: string }[];
}) {
	const [open, setOpen] = useState(false);
	const [people, setPeople] = useState<Person[] | null>(null);
	const [error, setError] = useState<string>();
	const [pending, startTransition] = useTransition();

	function toggle() {
		setOpen(!open);
		if (!people)
			startTransition(async () => setPeople(await getTeamCandidates()));
	}

	function invite(id: string) {
		setError(undefined);
		startTransition(async () => {
			const result = await inviteToTeam(id);
			if (result.error) return setError(result.error);
			setPeople(
				(list) =>
					list?.map((p) => (p.id === id ? { ...p, invited: true } : p)) ?? null,
			);
		});
	}

	async function share() {
		const text = `Do today's side quest with me: ${questTitle}`;
		const url = window.location.origin;
		try {
			if (navigator.share) await navigator.share({ text, url });
			else await navigator.clipboard.writeText(`${text} ${url}`);
		} catch {
			// Dismissing the share sheet is fine.
		}
	}

	if (!canInvite && mates.length === 0) return null;

	return (
		<div className="flex flex-col gap-3">
			{mates.length > 0 && (
				<ul className="flex flex-wrap gap-2">
					{mates.map((m) => (
						<li
							key={m.name}
							className="rounded-full border px-3 py-1 text-sm font-medium"
						>
							{m.name}
							<span className="text-muted-foreground">
								{" "}
								· {m.status === "accepted" ? "joined" : "invited"}
							</span>
						</li>
					))}
				</ul>
			)}
			{canInvite && (
				<>
					<Button
						type="button"
						variant="outline"
						size="lg"
						onClick={toggle}
						aria-expanded={open}
					>
						<Users className="size-5" />
						Team up
					</Button>
					{open && (
						<div className="flex flex-col gap-2 rounded-2xl border p-3">
							{people === null && (
								<p className="text-sm text-muted-foreground">Loading...</p>
							)}
							{people?.length === 0 && (
								<p className="text-sm text-muted-foreground">
									Add friends or join a group on the{" "}
									<Link href="/friends?view=people" className="underline">
										Social tab
									</Link>{" "}
									to team up.
								</p>
							)}
							{people?.map((p) => (
								<div key={p.id} className="flex items-center gap-3">
									<Avatar url={p.avatar_url} name={p.name} size={32} />
									<span className="flex-1 font-semibold">{p.name}</span>
									{p.invited ? (
										<span className="text-sm text-muted-foreground">
											Invited
										</span>
									) : (
										<Button
											type="button"
											size="sm"
											disabled={pending}
											onClick={() => invite(p.id)}
										>
											Invite
										</Button>
									)}
								</div>
							))}
							{error && (
								<p role="alert" className="text-sm text-destructive">
									{error}
								</p>
							)}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={share}
								className="text-muted-foreground"
							>
								<Share2 className="size-4" />
								Invite someone new
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
