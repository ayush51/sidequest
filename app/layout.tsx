import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const nunito = Nunito({
	variable: "--font-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "SideQuest",
	description: "A daily side quest for the DMV. Do something fun, earn points.",
};

export const viewport: Viewport = {
	themeColor: "#fbbf6a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${nunito.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col">
				{children}
				<BottomNav />
			</body>
		</html>
	);
}
