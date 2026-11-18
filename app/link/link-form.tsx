"use client";

import { Compass } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { linkSquareAccount } from "./actions";

const field =
	"h-12 rounded-2xl border bg-card px-4 text-base outline-none focus:border-ring";

export function LinkForm({
	squareName,
	suggested,
}: {
	squareName: string;
	suggested: string;
}) {
	const [mode, setMode] = useState<"login" | "signup">("login");
	const [state, action, pending] = useActionState(linkSquareAccount, {});
	const signup = mode === "signup";

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<Compass className="size-10 text-primary-ink" strokeWidth={2} />
				<h1 className="text-3xl font-bold tracking-tight">Hi, {squareName}</h1>
				<p className="max-w-xs text-muted-foreground">
					{signup
						? "Pick a name and a code for SideQuest. After this, The Square signs you straight in."
						: "Already play SideQuest? Sign in once to link it to The Square. After this, you'll go straight in."}
				</p>
			</div>
			<form
				key={mode}
				action={action}
				className="flex w-full max-w-xs flex-col gap-3"
			>
				<input type="hidden" name="mode" value={mode} />
				<input
					name="name"
					defaultValue={state.name ?? (signup ? suggested : "")}
					placeholder={signup ? "Pick a name" : "Your SideQuest name"}
					autoComplete="username"
					autoCapitalize="none"
					required
					className={field}
				/>
				<input
					name="pin"
					placeholder="4-digit code"
					type="password"
					inputMode="numeric"
					maxLength={4}
					autoComplete={signup ? "new-password" : "current-password"}
					required
					className={field}
				/>
				{state.error && (
					<p role="alert" className="text-sm font-semibold text-destructive">
						{state.error}
					</p>
				)}
				{signup && (
					<p className="text-sm text-muted-foreground">
						The code lets you sign in without The Square too. It can't be
						recovered.
					</p>
				)}
				<Button type="submit" size="lg" disabled={pending}>
					{signup ? "Create and link" : "Link my account"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => setMode(signup ? "login" : "signup")}
				>
					{signup
						? "I already play SideQuest"
						: "New to SideQuest? Create an account"}
				</Button>
			</form>
		</main>
	);
}
