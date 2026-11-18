"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { voteQuest } from "./actions";

// Thumbs on a quest. Tapping the active thumb takes the vote back.
export function QuestVote({
	questId,
	vote,
}: {
	questId: string;
	vote: number;
}) {
	const [current, setCurrent] = useOptimistic(vote);
	const [, startTransition] = useTransition();

	function cast(next: 1 | -1) {
		startTransition(async () => {
			const value = current === next ? 0 : next;
			setCurrent(value);
			await voteQuest(questId, value);
		});
	}

	const thumb = (active: boolean) =>
		`grid size-10 place-items-center rounded-full border transition-colors ${
			active
				? "border-primary bg-primary text-primary-foreground"
				: "text-muted-foreground"
		}`;

	return (
		<div className="flex items-center justify-between gap-3">
			<p role="status" className="text-sm text-muted-foreground">
				{current < 0
					? "Got it. This one won't come back."
					: current > 0
						? "Nice. You'll get more like this."
						: "Like this one?"}
			</p>
			<div className="flex gap-2">
				<button
					type="button"
					aria-label="Like this quest"
					aria-pressed={current > 0}
					onClick={() => cast(1)}
					className={thumb(current > 0)}
				>
					<ThumbsUp className="size-4" />
				</button>
				<button
					type="button"
					aria-label="Not for me"
					aria-pressed={current < 0}
					onClick={() => cast(-1)}
					className={thumb(current < 0)}
				>
					<ThumbsDown className="size-4" />
				</button>
			</div>
		</div>
	);
}
