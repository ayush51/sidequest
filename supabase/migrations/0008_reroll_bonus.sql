-- Reroll today's quest once; claim up to 2 quick bonus quests after finishing the daily one.

create type quest_kind as enum ('daily', 'bonus');

alter table user_quests
  add column kind quest_kind not null default 'daily',
  add column rerolled boolean not null default false;

-- One daily quest per day; bonuses are capped by claim_bonus() below.
alter table user_quests drop constraint user_quests_user_id_assigned_on_key;
create unique index user_quests_one_daily on user_quests (user_id, assigned_on) where kind = 'daily';

-- Direct inserts can only create the daily quest; bonuses go through claim_bonus().
drop policy "user_quests: insert own" on user_quests;
create policy "user_quests: insert own daily" on user_quests for insert to authenticated
  with check (user_id = auth.uid() and kind = 'daily');

create function reroll_daily(p_new_quest uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  cur user_quests;
begin
  select * into cur from user_quests
  where user_id = uid and assigned_on = today and kind = 'daily' for update;
  if not found or cur.status <> 'assigned' or cur.rerolled then
    raise exception 'cannot reroll';
  end if;
  if p_new_quest = cur.quest_id
     or not exists (select 1 from quests where id = p_new_quest and status = 'approved')
     or exists (select 1 from user_quests where user_id = uid and quest_id = p_new_quest) then
    raise exception 'invalid quest';
  end if;
  update user_quests set quest_id = p_new_quest, rerolled = true where id = cur.id;
end $$;

-- Bonus rules: daily done today, at most 2 bonuses a day, quick quests only (<= 10 pts).
create function claim_bonus(p_quest uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
begin
  if not exists (
    select 1 from user_quests
    where user_id = uid and assigned_on = today and kind = 'daily' and status = 'completed'
  ) then
    raise exception 'finish the daily quest first';
  end if;
  if (select count(*) from user_quests
      where user_id = uid and assigned_on = today and kind = 'bonus') >= 2 then
    raise exception 'bonus limit reached';
  end if;
  if not exists (select 1 from quests where id = p_quest and status = 'approved' and points <= 10) then
    raise exception 'not a bonus quest';
  end if;
  insert into user_quests (user_id, quest_id, assigned_on, kind) values (uid, p_quest, today, 'bonus');
end $$;
