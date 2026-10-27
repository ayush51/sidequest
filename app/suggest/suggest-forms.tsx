"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { areaOptions } from "@/lib/areas";
import { type SuggestState, suggestFeature, suggestQuest } from "./actions";

const field =
	"w-full rounded-2xl border bg-card px-4 text-base outline-none focus:border-ring";
const input = `${field} h-12`;
const textarea = `${field} min-h-24 py-3`;

function Status({ state, done }: { state: SuggestState; done: string }) {
	return (
		<>
			{state.error && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.saved && <p className="text-sm text-primary-ink">{done}</p>}
		</>
	);
}

export function QuestForm({
	categories,
}: {
	categories: { slug: string; label: string }[];
}) {
	const [state, action, pending] = useActionState(suggestQuest, {});
	return (
		// Remount on success so the fields clear.
		<form
			action={action}
			className="flex flex-col gap-3"
			key={String(state.saved)}
		>
			<input
				name="title"
				placeholder="Quest title"
				maxLength={60}
				required
				className={input}
			/>
			<textarea
				name="description"
				placeholder="What should people do? Keep it legal and safe."
				maxLength={280}
				required
				className={textarea}
			/>
			<select name="category" defaultValue="" required className={input}>
				<option value="" disabled>
					Category
				</option>
				{categories.map((c) => (
					<option key={c.slug} value={c.slug}>
						{c.label}
					</option>
				))}
			</select>
			<select name="area" defaultValue="anywhere" className={input}>
				{areaOptions.map((a) => (
					<option key={a.value} value={a.value}>
						{a.label}
					</option>
				))}
			</select>
			<div className="grid grid-cols-2 gap-3">
				<select name="cost" defaultValue="free" className={input}>
					<option value="free">Free</option>
					<option value="$">$</option>
					<option value="$$">$$</option>
				</select>
				<select name="difficulty" defaultValue="chill" className={input}>
					<option value="chill">Chill</option>
					<option value="medium">Medium</option>
					<option value="bold">Bold</option>
				</select>
			</div>
			<Status
				state={state}
				done="Sent! It joins the pool once it's approved."
			/>
			<Button type="submit" size="lg" disabled={pending}>
				Suggest quest
			</Button>
		</form>
	);
}

export function FeatureForm() {
	const [state, action, pending] = useActionState(suggestFeature, {});
	return (
		<form
			action={action}
			className="flex flex-col gap-3"
			key={String(state.saved)}
		>
			<input
				name="title"
				placeholder="Feature idea"
				maxLength={80}
				required
				className={input}
			/>
			<textarea
				name="details"
				placeholder="What should it do, and why would it help?"
				maxLength={1000}
				required
				className={textarea}
			/>
			<Status state={state} done="Thanks! Your idea is waiting for review." />
			<Button type="submit" size="lg" disabled={pending}>
				Suggest feature
			</Button>
		</form>
	);
}
