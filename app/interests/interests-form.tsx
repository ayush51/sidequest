"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { saveInterests } from "./actions";

export function InterestsForm({
	all,
	mine,
}: {
	all: { slug: string; label: string }[];
	mine: string[];
}) {
	const [state, action, pending] = useActionState(saveInterests, {});

	// Full page load: the router cache can hold an old "no interests" redirect for "/".
	useEffect(() => {
		if (state.saved) window.location.assign("/");
	}, [state.saved]);

	return (
		<form action={action} className="flex flex-col gap-4">
			<ul className="grid grid-cols-2 gap-2">
				{all.map((i) => (
					<li key={i.slug}>
						<label className="block cursor-pointer">
							<input
								type="checkbox"
								name="interest"
								value={i.slug}
								defaultChecked={mine.includes(i.slug)}
								className="peer sr-only"
							/>
							<span className="flex h-16 items-center justify-center rounded-2xl border bg-card px-3 text-center font-semibold transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
								{i.label}
							</span>
						</label>
					</li>
				))}
			</ul>
			{state.error && (
				<p role="alert" className="text-sm font-semibold text-destructive">
					{state.error}
				</p>
			)}
			<Button type="submit" size="lg" disabled={pending || state.saved}>
				{pending ? "Saving..." : "Save"}
			</Button>
		</form>
	);
}
