import { Camera, Check, Flame, Zap } from "lucide-react";
import { getCharacter } from "@/lib/character";

const icons = { streak: Flame, photo: Camera, quests: Check, xp: Zap };
const heading = "text-xs font-bold tracking-widest text-primary-ink uppercase";

export async function Achievements() {
	const { stats, badges } = await getCharacter();
	return (
		<>
			<section className="flex flex-col gap-3">
				<h2 className={heading}>Character</h2>
				<ul className="grid grid-cols-2 gap-2">
					{stats.map((s) => (
						<li key={s.name} className="rounded-2xl border bg-card p-3">
							<div className="flex items-baseline justify-between">
								<p className="font-bold">{s.name}</p>
								<p className="text-sm font-semibold text-muted-foreground tabular-nums">
									Lv {s.level}
								</p>
							</div>
							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary"
									style={{ width: `${s.progress * 100}%` }}
								/>
							</div>
						</li>
					))}
				</ul>
			</section>
			<section className="flex flex-col gap-3">
				<h2 className={heading}>Achievements</h2>
				<ul className="grid grid-cols-3 gap-2">
					{badges.map((b) => {
						const Icon = icons[b.kind];
						return (
							<li
								key={b.id}
								data-earned={b.earned}
								className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center ${
									b.earned ? "bg-card" : "opacity-40"
								}`}
							>
								<Icon
									className={`size-5 ${b.earned ? "text-primary-ink" : ""}`}
									strokeWidth={2.5}
								/>
								<p className="text-[11px] leading-tight font-semibold">
									{b.label}
								</p>
							</li>
						);
					})}
				</ul>
			</section>
		</>
	);
}
