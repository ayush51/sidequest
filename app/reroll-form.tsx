"use client";

import { Shuffle } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { reroll } from "./actions";

export function RerollForm({
	left,
	categories,
}: {
	left: number;
	categories: { slug: string; label: string }[];
}) {
	const [state, action, pending] = useActionState(reroll, {});
	return (
		<form action={action} className="flex flex-col gap-2">
			<select
				name="category"
				defaultValue=""
				aria-label="Reroll into"
				className="h-11 rounded-xl border bg-card px-3 text-sm text-muted-foreground outline-none focus:border-ring"
			>
				<option value="">Any category</option>
				{categories.map((c) => (
					<option key={c.slug} value={c.slug}>
						{c.label}
					</option>
				))}
			</select>
			<Button
				type="submit"
				variant="ghost"
				size="sm"
				disabled={pending}
				className="w-full text-muted-foreground"
			>
				<Shuffle className="size-4" />
				Not feeling it? Reroll ({left} left)
			</Button>
			{state.error && (
				<p role="alert" className="text-center text-sm text-destructive">
					{state.error}
				</p>
			)}
		</form>
	);
}
