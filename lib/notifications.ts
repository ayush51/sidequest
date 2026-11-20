// The kinds of notification people can mute (Profile > Reminders). Add one here when a new
// kind of push is built; no migration needed (see muted_notifications).
export const NOTIFICATION_TYPES = [
	{
		id: "reminder",
		label: "Daily reminder",
		hint: "If you haven't done your quest yet",
	},
	{
		id: "team",
		label: "Team quests",
		hint: "Invites, joins, and a teammate finishing",
	},
	{
		id: "comment",
		label: "Comments",
		hint: "When someone comments on your post",
	},
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]["id"];

export const isNotificationType = (x: string): x is NotificationType =>
	NOTIFICATION_TYPES.some((t) => t.id === x);
