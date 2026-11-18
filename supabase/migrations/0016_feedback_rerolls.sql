-- Quest feedback and more rerolls.
-- 1) Thumbs up / down on a quest. A thumbs down means that quest is never picked for that
--    person again (lib/quests.ts); both votes also nudge the quest's category.
-- 2) 5 free rerolls a day (was 3). Banked rerolls from streaks are unchanged.

create table quest_feedback (
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  quest_id uuid not null references quests on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

alter table quest_feedback enable row level security;
create policy "quest_feedback: read own" on quest_feedback for select to authenticated
  using (user_id = auth.uid());
create policy "quest_feedback: insert own" on quest_feedback for insert to authenticated
  with check (user_id = auth.uid());
create policy "quest_feedback: update own" on quest_feedback for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quest_feedback: delete own" on quest_feedback for delete to authenticated
  using (user_id = auth.uid());

-- Same as 0010 except the free limit is 5.
create or replace function reroll_daily(p_new_quest uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  cur user_quests;
  banked int;
begin
  select * into cur from user_quests
  where user_id = uid and assigned_on = today and kind = 'daily' for update;
  if not found or cur.status <> 'assigned' then
    raise exception 'cannot reroll';
  end if;

  -- 5 free rerolls a day; after that, spend a banked one.
  if cur.rerolls >= 5 then
    select banked_rerolls into banked from profiles where id = uid for update;
    if banked < 1 then raise exception 'no rerolls left'; end if;
  end if;

  if p_new_quest = cur.quest_id
     or not exists (select 1 from quests where id = p_new_quest and status = 'approved')
     or exists (select 1 from user_quests where user_id = uid and quest_id = p_new_quest)
     or exists (
       select 1 from quest_rerolls
       where user_id = uid and quest_id = p_new_quest
         and (created_at at time zone 'America/New_York')::date = today
     ) then
    raise exception 'invalid quest';
  end if;

  insert into quest_rerolls (user_id, quest_id) values (uid, cur.quest_id);
  if cur.rerolls >= 5 then
    update profiles set banked_rerolls = banked_rerolls - 1 where id = uid;
  end if;
  update user_quests set quest_id = p_new_quest, rerolls = cur.rerolls + 1 where id = cur.id;
end $$;
