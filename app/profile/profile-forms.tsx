"use client";

import { Camera } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { changeCode, saveAvatarUrl, updateDisplayName } from "./actions";

const field =
	"h-12 w-full rounded-2xl border bg-card px-4 text-base outline-none focus:border-ring";

// Center-crop to a square and shrink so the file stays well under the 1 MB bucket limit.
async function squareJpeg(file: File, size = 512): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	canvas
		.getContext("2d")
		?.drawImage(
			bitmap,
			(bitmap.width - side) / 2,
			(bitmap.height - side) / 2,
			side,
			side,
			0,
			0,
			size,
			size,
		);
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))),
			"image/jpeg",
			0.85,
		),
	);
}

export function AvatarEditor({
	userId,
	name,
	avatarUrl,
}: {
	userId: string;
	name: string;
	avatarUrl: string | null;
}) {
	const [url, setUrl] = useState(avatarUrl);
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();

	function pick(file: File) {
		setError("");
		startTransition(async () => {
			try {
				const supabase = createClient();
				const path = `${userId}/${crypto.randomUUID()}.jpg`;
				const { error: uploadError } = await supabase.storage
					.from("avatars")
					.upload(path, await squareJpeg(file), { contentType: "image/jpeg" });
				if (uploadError) throw uploadError;
				const publicUrl = supabase.storage.from("avatars").getPublicUrl(path)
					.data.publicUrl;
				const saved = await saveAvatarUrl(publicUrl);
				if (saved.error) throw new Error(saved.error);
				// Remove the previous photo so old files don't pile up.
				const old = url?.split("/avatars/")[1];
				if (old) await supabase.storage.from("avatars").remove([old]);
				setUrl(publicUrl);
			} catch {
				setError("Couldn't update your photo. Try another image.");
			}
		});
	}

	return (
		<div className="flex flex-col items-center gap-3">
			<Avatar url={url} name={name} size={96} />
			<label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
				<Camera className="size-4" />
				{pending ? "Uploading..." : url ? "Change photo" : "Add a photo"}
				<input
					type="file"
					accept="image/*"
					className="sr-only"
					disabled={pending}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) pick(file);
					}}
				/>
			</label>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}

export function NameForm({ name }: { name: string }) {
	const [state, action, pending] = useActionState(updateDisplayName, {});
	return (
		<form action={action} className="flex flex-col gap-2">
			<label htmlFor="display-name" className="text-sm font-semibold">
				Display name
			</label>
			<input
				id="display-name"
				name="name"
				defaultValue={name}
				maxLength={30}
				className={field}
			/>
			{state.error && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.saved && <p className="text-sm text-primary-ink">Saved.</p>}
			<Button type="submit" variant="outline" disabled={pending}>
				Save name
			</Button>
		</form>
	);
}

export function CodeForm() {
	const [state, action, pending] = useActionState(changeCode, {});
	return (
		<form
			action={action}
			className="flex flex-col gap-2"
			key={String(state.saved)}
		>
			<p className="text-sm font-semibold">Change your code</p>
			<input
				name="current"
				type="password"
				inputMode="numeric"
				maxLength={4}
				placeholder="Current code"
				autoComplete="current-password"
				className={field}
			/>
			<input
				name="next"
				type="password"
				inputMode="numeric"
				maxLength={4}
				placeholder="New 4-digit code"
				autoComplete="new-password"
				className={field}
			/>
			{state.error && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.saved && <p className="text-sm text-primary-ink">Code changed.</p>}
			<Button type="submit" variant="outline" disabled={pending}>
				Change code
			</Button>
		</form>
	);
}
