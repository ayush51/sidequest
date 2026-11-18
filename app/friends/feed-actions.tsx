"use client";

import { Flame, Heart, Laugh, MessageCircle, Send, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { addComment, deleteComment, react } from "./actions";

type Kind = "heart" | "fire" | "laugh";
type Counts = Record<Kind, number>;
type Comment = { id: string; name: string; body: string; mine: boolean };

const kinds = [
	{ kind: "heart", Icon: Heart, label: "Heart" },
	{ kind: "fire", Icon: Flame, label: "Fire" },
	{ kind: "laugh", Icon: Laugh, label: "Laugh" },
] as const;

const pill =
	"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors";

// Reactions and comments under one feed post.
export function FeedActions({
	userQuestId,
	counts,
	mine,
	comments,
	isAdmin,
}: {
	userQuestId: string;
	counts: Counts;
	mine: Kind | null;
	comments: Comment[];
	isAdmin: boolean;
}) {
	const [reaction, setReaction] = useOptimistic(
		{ counts, mine },
		(state, next: Kind | null) => {
			const updated = { ...state.counts };
			if (state.mine) updated[state.mine] -= 1;
			if (next) updated[next] += 1;
			return { counts: updated, mine: next };
		},
	);
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const [error, setError] = useState<string>();
	const [pending, startTransition] = useTransition();

	function toggle(kind: Kind) {
		startTransition(async () => {
			const next = reaction.mine === kind ? null : kind;
			setReaction(next);
			await react(userQuestId, next);
		});
	}

	function send(event: React.FormEvent) {
		event.preventDefault();
		setError(undefined);
		startTransition(async () => {
			const result = await addComment(userQuestId, text);
			if (result.error) return setError(result.error);
			setText("");
		});
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				{kinds.map(({ kind, Icon, label }) => {
					const active = reaction.mine === kind;
					return (
						<button
							key={kind}
							type="button"
							aria-label={label}
							aria-pressed={active}
							onClick={() => toggle(kind)}
							className={`${pill} ${
								active
									? "border-primary bg-primary text-primary-foreground"
									: "text-muted-foreground"
							}`}
						>
							<Icon className="size-4" />
							{reaction.counts[kind] > 0 && reaction.counts[kind]}
						</button>
					);
				})}
				<button
					type="button"
					aria-expanded={open}
					onClick={() => setOpen(!open)}
					className={`${pill} ml-auto text-muted-foreground`}
				>
					<MessageCircle className="size-4" />
					{comments.length > 0 ? comments.length : "Comment"}
				</button>
			</div>

			{open && (
				<div className="flex flex-col gap-2">
					{comments.map((c) => (
						<div key={c.id} className="flex items-start gap-2 text-sm">
							<p className="flex-1 break-words">
								<strong>{c.name}</strong> {c.body}
							</p>
							{(c.mine || isAdmin) && (
								<button
									type="button"
									aria-label="Delete comment"
									disabled={pending}
									onClick={() =>
										startTransition(async () => {
											await deleteComment(c.id);
										})
									}
									className="text-muted-foreground"
								>
									<X className="size-4" />
								</button>
							)}
						</div>
					))}
					<form onSubmit={send} className="flex gap-2">
						<input
							value={text}
							onChange={(e) => setText(e.target.value)}
							maxLength={280}
							placeholder="Add a comment"
							aria-label="Add a comment"
							className="h-10 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm outline-none focus:border-ring"
						/>
						<button
							type="submit"
							aria-label="Send comment"
							disabled={pending || text.trim().length === 0}
							className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
						>
							<Send className="size-4" />
						</button>
					</form>
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
