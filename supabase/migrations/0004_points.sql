-- Points and streaks. complete_quest() is the only way to earn them.

alter table profiles
  add column points int not null default 0,
  add column current_streak int not null default 0,
  add column longest_streak int not null default 0,
  add column last_completed_on date;

-- Users may edit only identity fields, never points or streaks.
revoke update on profiles from authenticated;
grant update (username, display_name, avatar_url) on profiles to authenticated;

-- Completion goes through complete_quest(), not direct updates.
drop policy "user_quests: update own" on user_quests;

create function complete_quest(p_user_quest uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  earned int;
  prev date;
  new_streak int;
begin
  select q.points into earned
  from user_quests uq join quests q on q.id = uq.quest_id
  where uq.id = p_user_quest and uq.user_id = uid and uq.status = 'assigned'
  for update of uq;
  if not found then return 0; end if;

  update user_quests set status = 'completed', completed_at = now()
  where id = p_user_quest;

  select last_completed_on into prev from profiles where id = uid for update;
  new_streak := case
    when prev = today then (select current_streak from profiles where id = uid)
    when prev = today - 1 then (select current_streak from profiles where id = uid) + 1
    else 1
  end;

  update profiles set
    points = points + earned,
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_completed_on = today
  where id = uid;

  return earned;
end $$;
