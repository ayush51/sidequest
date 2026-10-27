-- 3 free rerolls a day, plus rerolls banked from 7-day streaks (max 3). Skips are logged
-- so future picks can lean away from categories a user keeps skipping.

alter table user_quests add column rerolls int not null default 0;
update user_quests set rerolls = 1 where rerolled;
alter table user_quests drop column rerolled;

-- Only the existing column-level grant (username, display_name, avatar_url) is editable
-- by users, so this can't be changed from the client.
alter table profiles add column banked_rerolls int not null default 0;

create table quest_rerolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  quest_id uuid not null references quests on delete cascade,
  created_at timestamptz not null default now()
);
create index quest_rerolls_user_idx on quest_rerolls (user_id, created_at desc);

alter table quest_rerolls enable row level security;
-- Rows are written only by reroll_daily() (security definer), so there is no insert policy.
create policy "quest_rerolls: read own" on quest_rerolls for select to authenticated
  using (user_id = auth.uid());

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

  -- 3 free rerolls a day; after that, spend a banked one.
  if cur.rerolls >= 3 then
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
  if cur.rerolls >= 3 then
    update profiles set banked_rerolls = banked_rerolls - 1 where id = uid;
  end if;
  update user_quests set quest_id = p_new_quest, rerolls = cur.rerolls + 1 where id = cur.id;
end $$;

-- Same as before, plus: a streak reaching a multiple of 7 banks one reroll (max 3).
create or replace function complete_quest(p_user_quest uuid, p_photo_path text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  earned int;
  prev date;
  cur_streak int;
  new_streak int;
begin
  if p_photo_path is not null and p_photo_path not like uid::text || '/%' then
    raise exception 'invalid photo path';
  end if;

  select q.points into earned
  from user_quests uq join quests q on q.id = uq.quest_id
  where uq.id = p_user_quest and uq.user_id = uid and uq.status = 'assigned'
  for update of uq;
  if not found then return 0; end if;
  if p_photo_path is not null then earned := earned + 5; end if; -- photo bonus

  update user_quests
  set status = 'completed', completed_at = now(), photo_path = p_photo_path
  where id = p_user_quest;

  select last_completed_on, current_streak into prev, cur_streak
  from profiles where id = uid for update;
  new_streak := case
    when prev = today then cur_streak
    when prev = today - 1 then cur_streak + 1
    else 1
  end;

  update profiles set
    points = points + earned,
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_completed_on = today,
    banked_rerolls = case
      when new_streak > cur_streak and new_streak % 7 = 0 then least(banked_rerolls + 1, 3)
      else banked_rerolls
    end
  where id = uid;

  return earned;
end $$;
