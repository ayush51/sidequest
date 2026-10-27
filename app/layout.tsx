import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
	variable: "--font-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "SideQuest",
	description: "A daily side quest for the DMV. Do something fun, earn points.",
};

export const viewport: Viewport = {
	themeColor: "#0f1012",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col">
				{children}
				<BottomNav />
			</body>
		</html>
	);
}
