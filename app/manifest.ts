import type { MetadataRoute } from "next";

// What lets people "Add to Home Screen". Reminders on iPhone only work once it's installed.
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "SideQuest",
		short_name: "SideQuest",
		description: "A daily side quest for the DMV. Do something fun, earn XP.",
		start_url: "/",
		display: "standalone",
		background_color: "#0f1012",
		theme_color: "#0f1012",
		icons: [
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
