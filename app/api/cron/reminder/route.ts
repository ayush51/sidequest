import type { NextRequest } from "next/server";
import { sendPush } from "@/lib/push";
import { todayET } from "@/lib/quests";
import { createAdminClient } from "@/lib/supabase/admin";

const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x);

// Vercel calls this once a day (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
// It reminds everyone who turned reminders on and hasn't finished today's quest.
// `?only=<user id>` limits it to one person and `?dry=1` counts instead of sending, which is
// also how to send yourself a test notification.
export async function GET(request: NextRequest) {
	const secret = process.env.CRON_SECRET;
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
		return new Response("Unauthorized", { status: 401 });
	}
	const only = request.nextUrl.searchParams.get("only");
	const dry = request.nextUrl.searchParams.get("dry") === "1";

	const admin = createAdminClient();
	let subscribed = admin.from("push_subscriptions").select("user_id");
	if (only) subscribed = subscribed.eq("user_id", only);
	const userIds = [
		...new Set(((await subscribed).data ?? []).map((s) => s.user_id)),
	];
	if (userIds.length === 0) return Response.json({ recipients: 0, sent: 0 });

	const { data: dailies } = await admin
		.from("user_quests")
		.select("user_id, status, quests(title, points)")
		.eq("assigned_on", todayET())
		.eq("kind", "daily")
		.in("user_id", userIds);
	const today = new Map((dailies ?? []).map((d) => [d.user_id, d]));
	const pending = userIds.filter((id) => today.get(id)?.status !== "completed");
	if (dry) return Response.json({ recipients: pending.length, sent: 0 });

	const sent = await Promise.all(
		pending.map((id) => {
			const quest = one(today.get(id)?.quests);
			return sendPush(
				id,
				quest
					? {
							title: "Your side quest is waiting",
							body: `${quest.title}, ${quest.points} XP if you do it today.`,
							url: "/",
							tag: "daily-reminder",
						}
					: {
							title: "Your daily side quest is ready",
							body: "Come see what today's quest is.",
							url: "/",
							tag: "daily-reminder",
						},
			);
		}),
	);
	return Response.json({
		recipients: pending.length,
		sent: sent.reduce((a, b) => a + b, 0),
	});
}
