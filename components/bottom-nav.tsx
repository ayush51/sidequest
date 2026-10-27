"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
	{ href: "/", label: "Today", emoji: "🧭" },
	{ href: "/friends", label: "Friends", emoji: "👯" },
];

export function BottomNav() {
	const pathname = usePathname();
	if (pathname.startsWith("/login")) return null;

	return (
		<nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
			<ul className="mx-auto flex max-w-sm">
				{tabs.map((tab) => {
					const active =
						tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
					return (
						<li key={tab.href} className="flex-1">
							<Link
								href={tab.href}
								aria-current={active ? "page" : undefined}
								className={`flex flex-col items-center gap-0.5 py-2 text-xs font-bold ${
									active ? "text-accent" : "text-muted-foreground"
								}`}
							>
								<span className="text-2xl">{tab.emoji}</span>
								{tab.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
