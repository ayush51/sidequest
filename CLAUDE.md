# SideQuest

Mobile-first PWA: daily real-world side quests (DC/MD/VA), points, streaks, friends, user-suggested quests.

## Stack (do not substitute)
Next.js App Router + TS, Tailwind, shadcn/ui, Motion, Supabase (Postgres/Auth/Realtime/RLS), Vercel (iad1), pnpm, Biome.

## Commands
- `pnpm dev` run locally (Turbopack)
- `pnpm typecheck` / `pnpm lint` / `pnpm format`
- `pnpm build` production build

## Conventions
- Server components by default; `"use client"` only for interactivity.
- Mutations via Server Actions; optimistic UI on quest completion.
- RLS on every table. Friends see only what users opt to share.
- Add `loading.tsx` skeletons per route; prefetch links.
- Quests must be legal and safe (no trespassing/risk). Moderate suggestions.
- UX: playful, rounded, bright, mascot/emoji, confetti, dark mode, WCAG AA, thumb-friendly bottom nav (Today, Friends, Explore, Profile).
- Schema must allow adding geolocation later (area + optional lat/lng on quests).

## Workflow
Plan first, then vertical slices: auth, daily quest + completion, points/streaks, friends, suggestions, polish.
After each slice: typecheck, lint, run, commit. Use Context7 for library docs. Justify new deps.
