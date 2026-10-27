"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { joinGroup } from "./actions";

export function JoinGroupForm() {
	const [state, action, pending] = useActionState(joinGroup, {});
	return (
		<form action={action} className="flex flex-col gap-2" key={state.joined}>
			<div className="flex gap-2">
				<input
					name="code"
					placeholder="Group code"
					maxLength={12}
					autoCapitalize="characters"
					autoComplete="off"
					className="h-12 min-w-0 flex-1 rounded-2xl border bg-card px-4 uppercase outline-none placeholder:normal-case focus:border-ring"
				/>
				<Button type="submit" size="lg" disabled={pending}>
					Join
				</Button>
			</div>
			{state.error && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.joined && (
				<p className="text-sm text-primary-ink">You joined {state.joined}.</p>
			)}
		</form>
	);
}
