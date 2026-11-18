// Shows push notifications and opens the app when one is tapped. No caching, no offline mode.
self.addEventListener("push", (event) => {
	const data = event.data ? event.data.json() : {};
	event.waitUntil(
		self.registration.showNotification(data.title || "SideQuest", {
			body: data.body,
			icon: "/icons/icon-192.png",
			badge: "/icons/icon-192.png",
			tag: data.tag,
			data: { url: data.url || "/" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = event.notification.data?.url || "/";
	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((open) => {
				for (const client of open) {
					if ("focus" in client) {
						client.navigate?.(url);
						return client.focus();
					}
				}
				return clients.openWindow(url);
			}),
	);
});
