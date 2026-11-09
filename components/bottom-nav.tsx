"use client";

import { Compass, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
	{ href: "/", label: "Today", Icon: Compass },
	{ href: "/friends", label: "Social", Icon: Users },
	{ href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
	const pathname = usePathname();
	if (pathname.startsWith("/login")) return null;

	return (
		<nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
			<ul className="mx-auto flex max-w-sm">
				{tabs.map(({ href, label, Icon }) => {
					const active =
						href === "/" ? pathname === "/" : pathname.startsWith(href);
					return (
						<li key={href} className="flex-1">
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold tracking-wide uppercase ${
									active ? "text-foreground" : "text-muted-foreground"
								}`}
							>
								<span
									className={`rounded-full px-4 py-1 transition-colors ${
										active ? "bg-primary text-primary-foreground" : ""
									}`}
								>
									<Icon className="size-5" strokeWidth={2.25} />
								</span>
								{label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
