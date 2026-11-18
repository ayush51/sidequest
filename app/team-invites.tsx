"use client";

import { Users } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToInvite } from "./actions";

type Invite = {
	id: string;
	inviter_name: string;
	title: string;
	description: string;
	points: number;
};

// Invites from friends to do their quest together. Joining adds it to your day.
export function TeamInvites({ invites }: { invites: Invite[] }) {
	const [error, setError] = useState<string>();
	const [pending, startTransition] = useTransition();

	function answer(id: string, accept: boolean) {
		setError(undefined);
		startTransition(async () => {
			const result = await respondToInvite(id, accept);
			if (result.error) setError(result.error);
		});
	}

	return (
		<section className="flex flex-col gap-3">
			{invites.map((i) => (
				<div
					key={i.id}
					className="flex flex-col gap-3 rounded-3xl border border-primary bg-card p-5"
				>
					<p className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary-ink uppercase">
						<Users className="size-4" />
						{i.inviter_name} invited you
					</p>
					<h3 className="text-2xl font-bold tracking-tight">{i.title}</h3>
					<p className="text-sm text-muted-foreground">{i.description}</p>
					<p className="text-sm text-muted-foreground">
						Finish it together and you each get +5 XP.
					</p>
					<div className="flex gap-2">
						<Button
							type="button"
							size="lg"
							className="flex-1"
							disabled={pending}
							onClick={() => answer(i.id, true)}
						>
							Join
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="lg"
							disabled={pending}
							onClick={() => answer(i.id, false)}
						>
							Not now
						</Button>
					</div>
				</div>
			))}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
		</section>
	);
}
