-- Push notifications: one row per device (browser) that opted in to reminders.
-- The user column points at auth.users, like team_quests, so it adds no join paths to the API.
-- Rows are written only by save_push_subscription(), and the daily reminder reads them with the
-- service role (app/api/cron/reminder).

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy "push_subscriptions: read own" on push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy "push_subscriptions: delete own" on push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- Save this device for the signed-in user. If someone else used the same browser before, the
-- device moves to the current user instead of failing on the unique endpoint.
create function save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

revoke execute on function save_push_subscription(text, text, text) from public, anon;
grant execute on function save_push_subscription(text, text, text) to authenticated;
