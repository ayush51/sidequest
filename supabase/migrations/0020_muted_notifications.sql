-- Per-type notification settings. A row means "this person muted this type"; no row means on.
-- Types are plain text so a new kind of notification needs no migration (the app owns the list,
-- see lib/notifications.ts). Read by the senders (lib/push.ts) with the service role.
-- The user column points at auth.users so it adds no join paths to the API.

create table muted_notifications (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, type)
);

alter table muted_notifications enable row level security;
create policy "muted_notifications: read own" on muted_notifications for select to authenticated
  using (user_id = auth.uid());
create policy "muted_notifications: insert own" on muted_notifications for insert to authenticated
  with check (user_id = auth.uid());
create policy "muted_notifications: delete own" on muted_notifications for delete to authenticated
  using (user_id = auth.uid());
