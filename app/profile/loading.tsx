export default function Loading() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center gap-4 p-6">
			<div className="size-24 animate-pulse rounded-full bg-muted" />
			<div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
			<div className="h-32 w-full animate-pulse rounded-2xl bg-muted" />
		</main>
	);
}
