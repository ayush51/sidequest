"use client";

import { useState, useTransition } from "react";
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
}: {
	userQuestId: string;
	bonus: number;
}) {
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();

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
		});
	}

	return (
		<div className="flex flex-col gap-3">
			<label className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-dashed px-4 py-3 text-center text-sm">
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
				<p role="alert" className="text-sm text-red-600">
					{error}
				</p>
			)}
			<button
				type="button"
				onClick={submit}
				disabled={pending}
				className="w-full rounded-2xl bg-foreground px-4 py-3 font-semibold text-background disabled:opacity-50"
			>
				{pending ? "Saving..." : "Mark complete"}
			</button>
		</div>
	);
}
