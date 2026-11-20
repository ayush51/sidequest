import * as webpush from "web-push";
import type { NotificationType } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
	title: string;
	body: string;
	url?: string;
	tag?: string;
};

// Sends a notification to every device a person turned reminders on for, and returns how many
// went out. Skips it if they muted that type. A device the browser says is gone (404 or 410) is
// forgotten. Does nothing until the VAPID keys are set.
export async function sendPush(
	userId: string,
	payload: PushPayload,
	type: NotificationType,
) {
	const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } =
		process.env;
	if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		return 0;
	}
	webpush.setVapidDetails(
		VAPID_SUBJECT,
		NEXT_PUBLIC_VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY,
	);

	const admin = createAdminClient();
	const { data: muted } = await admin
		.from("muted_notifications")
		.select("type")
		.eq("user_id", userId)
		.eq("type", type)
		.maybeSingle();
	if (muted) return 0;

	const { data: devices } = await admin
		.from("push_subscriptions")
		.select("id, endpoint, p256dh, auth")
		.eq("user_id", userId);

	let sent = 0;
	await Promise.all(
		(devices ?? []).map(async (d) => {
			try {
				await webpush.sendNotification(
					{ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
					JSON.stringify(payload),
					{ TTL: 6 * 60 * 60 },
				);
				sent++;
			} catch (error) {
				const status = (error as { statusCode?: number }).statusCode;
				if (status === 404 || status === 410) {
					await admin.from("push_subscriptions").delete().eq("id", d.id);
				}
			}
		}),
	);
	return sent;
}

// Send a batch of notifications. One failing never stops the others or the action that asked.
export async function sendPings(
	pings: { to: string; payload: PushPayload; type: NotificationType }[],
) {
	await Promise.allSettled(pings.map((p) => sendPush(p.to, p.payload, p.type)));
}
