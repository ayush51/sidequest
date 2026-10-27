-- One quest per user per day, completed or not.

create type user_quest_status as enum ('assigned', 'completed');

create table user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  quest_id uuid not null references quests on delete cascade,
  assigned_on date not null,
  status user_quest_status not null default 'assigned',
  completed_at timestamptz,
  unique (user_id, assigned_on),
  unique (user_id, quest_id)
);

alter table user_quests enable row level security;

create policy "user_quests: read own" on user_quests for select to authenticated
  using (user_id = auth.uid());
create policy "user_quests: insert own" on user_quests for insert to authenticated
  with check (user_id = auth.uid());
create policy "user_quests: update own" on user_quests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
