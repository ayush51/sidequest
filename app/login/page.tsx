"use client";

import { useActionState, useState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
	const [mode, setMode] = useState<"login" | "signup">("login");
	const [state, action, pending] = useActionState(authenticate, {});
	const signup = mode === "signup";

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
			<h1 className="text-4xl font-bold">SideQuest 🧭</h1>
			<form action={action} className="flex w-full max-w-xs flex-col gap-3">
				<input type="hidden" name="mode" value={mode} />
				<input
					name="name"
					placeholder="Your name"
					autoComplete="username"
					required
					className="rounded-2xl border px-4 py-3"
				/>
				<input
					name="pin"
					placeholder="4-digit code"
					type="password"
					inputMode="numeric"
					maxLength={4}
					autoComplete={signup ? "new-password" : "current-password"}
					required
					className="rounded-2xl border px-4 py-3"
				/>
				{state.error && (
					<p role="alert" className="text-sm text-red-600">
						{state.error}
					</p>
				)}
				{signup && (
					<p className="text-sm text-muted-foreground">
						No email needed, so remember your code. It can't be recovered.
					</p>
				)}
				<button
					type="submit"
					disabled={pending}
					className="rounded-2xl bg-foreground px-4 py-3 font-semibold text-background disabled:opacity-50"
				>
					{signup ? "Create account" : "Sign in"}
				</button>
				<button
					type="button"
					onClick={() => setMode(signup ? "login" : "signup")}
					className="text-sm underline"
				>
					{signup ? "Have an account? Sign in" : "New here? Create account"}
				</button>
			</form>
		</main>
	);
}
