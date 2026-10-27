export default function Loading() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-6">
			<div className="h-24 animate-pulse rounded-2xl bg-muted" />
			<div className="grid grid-cols-2 gap-2">
				{Array.from({ length: 8 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
					<div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
				))}
			</div>
		</main>
	);
}
