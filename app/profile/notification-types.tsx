"use client";

import { useOptimistic, useTransition } from "react";
import { NOTIFICATION_TYPES } from "@/lib/notifications";
import { setNotificationMuted } from "./actions";

// One switch per kind of notification. Off means muted: the reminder system skips that type.
export function NotificationTypes({ muted }: { muted: string[] }) {
	const [current, setCurrent] = useOptimistic(
		muted,
		(list, change: { id: string; muted: boolean }) =>
			change.muted
				? [...list, change.id]
				: list.filter((id) => id !== change.id),
	);
	const [, startTransition] = useTransition();

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
				Notify me about
			</h2>
			<ul className="flex flex-col gap-2">
				{NOTIFICATION_TYPES.map((t) => {
					const on = !current.includes(t.id);
					return (
						<li
							key={t.id}
							className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
						>
							<div>
								<p className="text-sm font-semibold">{t.label}</p>
								<p className="text-xs text-muted-foreground">{t.hint}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={on}
								aria-label={t.label}
								onClick={() =>
									startTransition(async () => {
										setCurrent({ id: t.id, muted: on });
										await setNotificationMuted(t.id, on);
									})
								}
								className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
									on ? "bg-primary" : "bg-muted"
								}`}
							>
								<span
									className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${
										on ? "translate-x-5" : ""
									}`}
								/>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
