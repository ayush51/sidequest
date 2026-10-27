"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { completeQuest } from "./actions";

const BURST = [
	"🎉",
	"⭐",
	"✨",
	"🎊",
	"🧭",
	"🔥",
	"⭐",
	"🎉",
	"✨",
	"🎊",
	"🧭",
	"🔥",
];

// Phone photos are several MB; shrink to ~1280px JPEG before upload (bucket limit is 2 MB).
async function shrink(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))),
			"image/jpeg",
			0.8,
		),
	);
}

export function QuestComplete({
	userQuestId,
	bonus,
	done,
	earned,
}: {
	userQuestId: string;
	bonus: number;
	done: boolean;
	earned: number;
}) {
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState("");
	const [celebrating, setCelebrating] = useState(false);
	const [pending, startTransition] = useTransition();
	const reduceMotion = useReducedMotion();

	function submit() {
		setError("");
		startTransition(async () => {
			let photoPath: string | undefined;
			if (file) {
				try {
					const supabase = createClient();
					const { data } = await supabase.auth.getUser();
					const path = `${data.user?.id}/${userQuestId}.jpg`;
					const { error: uploadError } = await supabase.storage
						.from("quest-photos")
						.upload(path, await shrink(file), {
							contentType: "image/jpeg",
							upsert: true,
						});
					if (uploadError) throw uploadError;
					photoPath = path;
				} catch {
					setError("Couldn't upload that photo. Try another or skip it.");
					return;
				}
			}
			await completeQuest(userQuestId, photoPath);
			setCelebrating(true);
		});
	}

	if (done) {
		return (
			<div className="relative">
				<p className="rounded-2xl bg-secondary px-4 py-3 text-center font-bold text-secondary-foreground">
					+{earned} pts! 🎉 Come back tomorrow.
				</p>
				{celebrating && !reduceMotion && (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 overflow-visible"
					>
						{BURST.map((emoji, i) => {
							const angle = (i / BURST.length) * Math.PI * 2;
							return (
								<motion.span
									// biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
									key={i}
									className="absolute top-1/2 left-1/2 text-2xl"
									initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
									animate={{
										x: Math.cos(angle) * 130,
										y: Math.sin(angle) * 130 - 40,
										opacity: 0,
										scale: 1.3,
									}}
									transition={{ duration: 1.2, ease: "easeOut" }}
								>
									{emoji}
								</motion.span>
							);
						})}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<label className="flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-dashed px-4 py-3 text-center text-sm font-semibold">
				{file ? `📸 ${file.name}` : `📸 Add a photo (+${bonus} pts)`}
				<input
					type="file"
					accept="image/*"
					capture="environment"
					className="sr-only"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
			</label>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<Button type="button" size="lg" onClick={submit} disabled={pending}>
				{pending ? "Saving..." : "I did it! 🎯"}
			</Button>
		</div>
	);
}
