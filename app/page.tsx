import { signOut } from "./login/actions";

export default function Home() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
			<h1 className="text-4xl font-bold">SideQuest 🧭</h1>
			<p className="text-muted-foreground">
				Your daily DMV adventure is coming soon.
			</p>
			<form action={signOut}>
				<button type="submit" className="text-sm underline">
					Sign out
				</button>
			</form>
		</main>
	);
}
