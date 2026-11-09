"use client";

import { Compass } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { authenticate } from "./actions";

const field =
	"h-12 rounded-2xl border bg-card px-4 text-base outline-none focus:border-ring";

export default function LoginPage() {
	const [mode, setMode] = useState<"login" | "signup">("login");
	const [state, action, pending] = useActionState(authenticate, {});
	const signup = mode === "signup";

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<Compass className="size-10 text-primary-ink" strokeWidth={2} />
				<h1 className="text-5xl font-bold tracking-tight">
					sidequest<span className="text-primary-ink">.</span>
				</h1>
				<p className="text-muted-foreground">A small adventure, every day.</p>
			</div>
			<form action={action} className="flex w-full max-w-xs flex-col gap-3">
				<input type="hidden" name="mode" value={mode} />
				<input
					name="name"
					defaultValue={state.name}
					placeholder="Your name"
					autoComplete="username"
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
				{signup && (
					<input
						name="group"
						placeholder="Group code: ava"
						aria-label="Group code (optional)"
						maxLength={12}
						autoCapitalize="none"
						autoComplete="off"
						className={field}
					/>
				)}
				{state.error && (
					<p role="alert" className="text-sm font-semibold text-destructive">
						{state.error}
					</p>
				)}
				{signup && (
					<p className="text-sm text-muted-foreground">
						No email needed, so remember your code. It can't be recovered.
					</p>
				)}
				<Button type="submit" size="lg" disabled={pending}>
					{signup ? "Create account" : "Let's go"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => setMode(signup ? "login" : "signup")}
				>
					{signup ? "Have an account? Sign in" : "New here? Create account"}
				</Button>
			</form>
		</main>
	);
}
