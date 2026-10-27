export default function Loading() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-6">
			<div className="h-10 animate-pulse rounded-2xl bg-muted" />
			<div className="h-40 animate-pulse rounded-3xl bg-muted" />
			<div className="h-40 animate-pulse rounded-3xl bg-muted" />
		</main>
	);
}
