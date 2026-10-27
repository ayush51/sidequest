export function Avatar({
	url,
	name,
	size = 36,
}: {
	url?: string | null;
	name: string;
	size?: number;
}) {
	const style = { width: size, height: size };
	return url ? (
		// biome-ignore lint/performance/noImgElement: small remote avatar, no optimizer needed
		<img
			src={url}
			alt=""
			style={style}
			className="shrink-0 rounded-full object-cover"
		/>
	) : (
		<span
			style={{ ...style, fontSize: size * 0.4 }}
			className="grid shrink-0 place-items-center rounded-full bg-muted font-bold text-muted-foreground uppercase"
			aria-hidden
		>
			{name.slice(0, 1)}
		</span>
	);
}
