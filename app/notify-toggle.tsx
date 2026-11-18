"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription } from "./actions";

type Status = "checking" | "unsupported" | "install" | "off" | "on" | "blocked";

const DISMISSED = "sq-nudge-dismissed";

// The browser wants the public key as bytes.
function keyBytes(base64url: string) {
	const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	return Uint8Array.from(
		atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
		(c) => c.charCodeAt(0),
	);
}

const installHint =
	"On iPhone, reminders work once SideQuest is on your Home Screen. Tap Share, then Add to Home Screen, then open it from there.";

// Daily reminder opt-in. "card" is the friendly prompt on Today (shown only while it's off),
// "row" is the on/off switch on Profile.
export function NotifyToggle({ variant }: { variant: "card" | "row" }) {
	const [status, setStatus] = useState<Status>("checking");
	const [dismissed, setDismissed] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	useEffect(() => {
		try {
			setDismissed(localStorage.getItem(DISMISSED) === "1");
		} catch {
			setDismissed(false);
		}
		const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (
			!("serviceWorker" in navigator && "PushManager" in window) ||
			!("Notification" in window)
		) {
			setStatus(ios && !standalone ? "install" : "unsupported");
			return;
		}
		if (Notification.permission === "denied") {
			setStatus("blocked");
			return;
		}
		navigator.serviceWorker
			.register("/sw.js")
			.then((reg) => reg.pushManager.getSubscription())
			.then((sub) => setStatus(sub ? "on" : "off"))
			.catch(() => setStatus("unsupported"));
	}, []);

	async function enable() {
		setBusy(true);
		setError(undefined);
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				setStatus(permission === "denied" ? "blocked" : "off");
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub =
				(await reg.pushManager.getSubscription()) ??
				(await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: keyBytes(
						process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
					),
				}));
			const keys = sub.toJSON().keys;
			const result = await savePushSubscription({
				endpoint: sub.endpoint,
				p256dh: keys?.p256dh ?? "",
				auth: keys?.auth ?? "",
			});
			if (result.error) setError(result.error);
			else setStatus("on");
		} catch {
			setError("Couldn't turn on reminders on this device.");
		} finally {
			setBusy(false);
		}
	}

	async function disable() {
		setBusy(true);
		setError(undefined);
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await removePushSubscription(sub.endpoint);
				await sub.unsubscribe();
			}
			setStatus("off");
		} catch {
			setError("Couldn't turn off reminders. Try again.");
		} finally {
			setBusy(false);
		}
	}

	function dismiss() {
		setDismissed(true);
		try {
			localStorage.setItem(DISMISSED, "1");
		} catch {
			// Fine: it just comes back next visit.
		}
	}

	if (variant === "card") {
		if (dismissed || (status !== "off" && status !== "install")) return null;
		return (
			<section className="flex flex-col gap-3 rounded-3xl border bg-card p-5">
				<p className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary-ink uppercase">
					<Bell className="size-4" />
					Daily nudge
				</p>
				<p className="text-sm text-muted-foreground">
					{status === "install"
						? installHint
						: "Get a quick reminder if you haven't done your side quest yet, and a ping when a friend invites you."}
				</p>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				<div className="flex gap-2">
					{status === "off" && (
						<Button
							type="button"
							size="lg"
							className="flex-1"
							disabled={busy}
							onClick={enable}
						>
							Turn on
						</Button>
					)}
					<Button
						type="button"
						variant="ghost"
						size="lg"
						className={status === "install" ? "flex-1" : ""}
						onClick={dismiss}
					>
						{status === "install" ? "Got it" : "Not now"}
					</Button>
				</div>
			</section>
		);
	}

	if (status === "checking") return null;
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-xs font-bold tracking-widest text-primary-ink uppercase">
				Reminders
			</h2>
			<div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
				<p className="text-sm">
					{status === "on" && "Daily reminder is on."}
					{status === "off" && "Daily reminder is off."}
					{status === "blocked" &&
						"Reminders are blocked. Allow notifications for SideQuest in your browser settings."}
					{status === "install" && installHint}
					{status === "unsupported" && "This browser can't show reminders."}
				</p>
				{(status === "on" || status === "off") && (
					<Button
						type="button"
						variant={status === "on" ? "outline" : "default"}
						size="sm"
						disabled={busy}
						onClick={status === "on" ? disable : enable}
					>
						{status === "on" ? "Turn off" : "Turn on"}
					</Button>
				)}
			</div>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
		</section>
	);
}
