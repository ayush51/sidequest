import type { NextRequest } from "next/server";
import { sendPush } from "@/lib/push";
import { todayET } from "@/lib/quests";
import { createAdminClient } from "@/lib/supabase/admin";

const one = <T>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x);

// Vercel calls this once a day (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
// It reminds everyone who turned reminders on and hasn't finished today's quest, and tells
// people with a live streak that it's on the line.
// `?only=<user id>` limits it to one person, `?dry=1` counts instead of sending (and previews the
// message when `only` is set), and `?force=1` sends even to people who already finished.
export async function GET(request: NextRequest) {
	const secret = process.env.CRON_SECRET;
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
		return new Response("Unauthorized", { status: 401 });
	}
	const only = request.nextUrl.searchParams.get("only");
	const dry = request.nextUrl.searchParams.get("dry") === "1";
	const force = request.nextUrl.searchParams.get("force") === "1";

	const admin = createAdminClient();
	let subscribed = admin.from("push_subscriptions").select("user_id");
	if (only) subscribed = subscribed.eq("user_id", only);
	const userIds = [
		...new Set(((await subscribed).data ?? []).map((s) => s.user_id)),
	];
	if (userIds.length === 0) return Response.json({ recipients: 0, sent: 0 });

	const today = todayET();
	const [{ data: dailies }, { data: profiles }] = await Promise.all([
		admin
			.from("user_quests")
			.select("user_id, status, quests(title, points)")
			.eq("assigned_on", today)
			.eq("kind", "daily")
			.in("user_id", userIds),
		admin
			.from("profiles")
			.select("id, current_streak, last_completed_on")
			.in("id", userIds),
	]);
	const dailyOf = new Map((dailies ?? []).map((d) => [d.user_id, d]));
	const { data: mutedRows } = await admin
		.from("muted_notifications")
		.select("user_id")
		.eq("type", "reminder")
		.in("user_id", userIds);
	const muted = new Set((mutedRows ?? []).map((m) => m.user_id));
	const pending = userIds.filter(
		(id) =>
			!muted.has(id) && (force || dailyOf.get(id)?.status !== "completed"),
	);

	// A streak is alive if they finished yesterday (see getStats in lib/quests.ts).
	const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 864e5)
		.toISOString()
		.slice(0, 10);
	const streakOf = new Map(
		(profiles ?? [])
			.filter(
				(p) =>
					p.last_completed_on &&
					p.last_completed_on >= yesterday &&
					p.current_streak >= 2,
			)
			.map((p) => [p.id, p.current_streak]),
	);

	const payloadFor = (id: string) => {
		const quest = one(dailyOf.get(id)?.quests);
		const streak = streakOf.get(id);
		return {
			title: streak
				? `Keep your ${streak}-day streak alive`
				: quest
					? "Your side quest is waiting"
					: "Your daily side quest is ready",
			body: quest
				? `${quest.title}, ${quest.points} XP if you do it today.`
				: "Come see what today's quest is.",
			url: "/",
			tag: "daily-reminder",
		};
	};

	if (dry) {
		return Response.json({
			recipients: pending.length,
			sent: 0,
			preview: only && pending[0] ? payloadFor(pending[0]) : undefined,
		});
	}
	const sent = await Promise.all(
		pending.map((id) => sendPush(id, payloadFor(id), "reminder")),
	);
	return Response.json({
		recipients: pending.length,
		sent: sent.reduce((a, b) => a + b, 0),
	});
}
