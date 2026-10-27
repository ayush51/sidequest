"use client";

import { ArrowRight, Camera, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { completeQuest } from "./actions";

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
				<p className="flex items-center justify-center gap-2 rounded-2xl border border-primary px-4 py-3 font-bold text-primary-ink">
					<Check className="size-5" strokeWidth={3} />+{earned} pts earned
				</p>
				{celebrating && !reduceMotion && (
					<motion.span
						aria-hidden
						className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-primary"
						initial={{ scale: 1, opacity: 0.8 }}
						animate={{ scale: 1.5, opacity: 0 }}
						transition={{ duration: 0.9, ease: "easeOut" }}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<Button type="button" size="lg" onClick={submit} disabled={pending}>
				{pending ? "Saving..." : "Complete quest"}
				{!pending && <ArrowRight className="size-5" strokeWidth={2.5} />}
			</Button>
			<label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-semibold text-muted-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
				<Camera className="size-4" />
				{file ? file.name : `Add a photo, +${bonus} pts`}
				<input
					type="file"
					accept="image/*"
					capture="environment"
					className="sr-only"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
			</label>
		</div>
	);
}
