-- Team quests: invite a friend or group-mate to do your daily quest with you.
-- They accept, get the same quest as a 'team' quest, and when you BOTH finish it each of you gets +5 XP.
-- Everything is written by the functions below (no insert/update policies), so nobody can
-- invite a stranger, accept for someone else or claim the bonus alone.

alter type quest_kind add value if not exists 'team';

-- The user columns point at auth.users, not profiles, on purpose: a second foreign key to
-- profiles would make the API refuse every quests -> profiles join as ambiguous (PGRST201).
create table team_quests (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users on delete cascade,
  invitee_id uuid not null references auth.users on delete cascade,
  quest_id uuid not null references quests on delete cascade,
  assigned_on date not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  bonus_paid boolean not null default false,
  created_at timestamptz not null default now(),
  unique (inviter_id, invitee_id, quest_id),
  check (inviter_id <> invitee_id)
);
create index team_quests_invitee_idx on team_quests (invitee_id, assigned_on);

alter table team_quests enable row level security;
create policy "team_quests: read own" on team_quests for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

-- Invite someone to your daily quest. Up to 3 teammates, friends and group-mates only.
-- Problems come back as {error}, not exceptions.
create function invite_to_team(p_invitee uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  cur user_quests;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select * into cur from user_quests
  where user_id = uid and assigned_on = today and kind = 'daily';
  if not found or cur.status <> 'assigned' then
    return jsonb_build_object('error', 'Invite someone before you finish your quest.');
  end if;
  if p_invitee = uid or not (are_friends(p_invitee) or shares_group(p_invitee)) then
    return jsonb_build_object('error', 'You can only invite friends and group-mates.');
  end if;
  if exists (select 1 from user_quests where user_id = p_invitee and quest_id = cur.quest_id) then
    return jsonb_build_object('error', 'They have already done this one.');
  end if;
  if (select count(*) from team_quests
      where inviter_id = uid and assigned_on = today and quest_id = cur.quest_id) >= 3 then
    return jsonb_build_object('error', 'That is a full team. Three teammates max.');
  end if;

  insert into team_quests (inviter_id, invitee_id, quest_id, assigned_on)
  values (uid, p_invitee, cur.quest_id, today)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- Accept or decline an invite. Accepting adds the quest to your day as a 'team' quest.
create function respond_to_team_invite(p_team uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  t team_quests;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select * into t from team_quests
  where id = p_team and invitee_id = uid and status = 'pending' for update;
  if not found then return jsonb_build_object('error', 'That invite is gone.'); end if;

  if not p_accept then
    update team_quests set status = 'declined' where id = t.id;
    return jsonb_build_object('ok', true);
  end if;

  -- Still valid only if it is today's invite and the inviter is still on that quest.
  if t.assigned_on <> today or not exists (
       select 1 from user_quests
       where user_id = t.inviter_id and kind = 'daily' and assigned_on = today and quest_id = t.quest_id) then
    update team_quests set status = 'declined' where id = t.id;
    return jsonb_build_object('error', 'That invite expired.');
  end if;
  if exists (select 1 from user_quests where user_id = uid and quest_id = t.quest_id) then
    update team_quests set status = 'declined' where id = t.id;
    return jsonb_build_object('error', 'You have already done this one.');
  end if;

  insert into user_quests (user_id, quest_id, assigned_on, kind) values (uid, t.quest_id, today, 'team');
  update team_quests set status = 'accepted' where id = t.id;
  return jsonb_build_object('ok', true);
end $$;

-- Today's invites for me that I can still accept, with the quest and who sent it.
create function my_team_invites()
returns table (id uuid, inviter_name text, title text, description text, points int)
language sql stable security definer set search_path = public as $$
  select t.id, coalesce(p.display_name, p.username), q.title, q.description, q.points
  from team_quests t
  join profiles p on p.id = t.inviter_id
  join quests q on q.id = t.quest_id
  where t.invitee_id = auth.uid()
    and t.status = 'pending'
    and t.assigned_on = (now() at time zone 'America/New_York')::date
    and exists (
      select 1 from user_quests u
      where u.user_id = t.inviter_id and u.kind = 'daily'
        and u.assigned_on = t.assigned_on and u.quest_id = t.quest_id)
    and not exists (select 1 from user_quests u where u.user_id = auth.uid() and u.quest_id = t.quest_id)
  order by t.created_at
$$;

-- Friends and group-mates I could invite, and whether I already invited them to today's quest.
create function team_candidates()
returns table (id uuid, name text, avatar_url text, invited boolean)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.display_name, p.username), p.avatar_url,
    exists (
      select 1 from team_quests t
      join user_quests u on u.user_id = auth.uid() and u.kind = 'daily' and u.quest_id = t.quest_id
      where t.inviter_id = auth.uid() and t.invitee_id = p.id
        and t.assigned_on = (now() at time zone 'America/New_York')::date)
  from profiles p
  where p.id <> auth.uid() and (are_friends(p.id) or shares_group(p.id))
  order by 2
$$;

-- When the second person finishes, pay both +5 XP, once. Locking the team row first makes
-- two people finishing at the same moment safe: the second one sees the first one's finish.
create function pay_team_bonus() returns trigger
language plpgsql security definer set search_path = public as $$
declare t team_quests;
begin
  for t in
    select * from team_quests
    where status = 'accepted' and not bonus_paid and quest_id = new.quest_id
      and (inviter_id = new.user_id or invitee_id = new.user_id)
    for update
  loop
    if exists (select 1 from user_quests where user_id = t.inviter_id and quest_id = t.quest_id and status = 'completed')
       and exists (select 1 from user_quests where user_id = t.invitee_id and quest_id = t.quest_id and status = 'completed') then
      update profiles set points = points + 5 where id in (t.inviter_id, t.invitee_id);
      update team_quests set bonus_paid = true where id = t.id;
    end if;
  end loop;
  return null;
end $$;

create trigger user_quests_team_bonus
  after update of status on user_quests
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function pay_team_bonus();

-- Signed-in users only.
revoke execute on function invite_to_team(uuid), respond_to_team_invite(uuid, boolean),
  my_team_invites(), team_candidates(), pay_team_bonus() from public, anon;
grant execute on function invite_to_team(uuid), respond_to_team_invite(uuid, boolean),
  my_team_invites(), team_candidates() to authenticated;
