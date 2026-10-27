-- Groups: join with a code and see each other's activity and points while you're a member.
-- Membership grants friend-level visibility (no per-pair friendship rows), so leaving removes it.

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  code text not null unique,
  joinable boolean not null default true, -- false stops new joins; existing members stay
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on group_members (user_id);

-- Failed join attempts, used to rate-limit code guessing. Written only by join_group().
create table group_join_attempts (
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index group_join_attempts_idx on group_join_attempts (user_id, created_at desc);

alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_join_attempts enable row level security;

-- security definer so policies on group_members can ask about group_members without recursing.
create function my_group_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from group_members where user_id = auth.uid()
$$;

create function shares_group(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b using (group_id)
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- Group-mates count as friends (feed, photos, points) and as connected (names, avatars).
create or replace function are_friends(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (addressee_id = auth.uid() and requester_id = other))
  ) or shares_group(other)
$$;

create or replace function is_connected(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where (requester_id = auth.uid() and addressee_id = other)
       or (addressee_id = auth.uid() and requester_id = other)
  ) or shares_group(other)
$$;

create policy "groups: members and admin read" on groups for select to authenticated
  using (id in (select my_group_ids()) or is_admin());
create policy "groups: admin update" on groups for update to authenticated
  using (is_admin()) with check (is_admin());
create policy "groups: admin delete" on groups for delete to authenticated using (is_admin());

create policy "group_members: see your groups" on group_members for select to authenticated
  using (group_id in (select my_group_ids()) or is_admin());
create policy "group_members: leave or admin removes" on group_members for delete to authenticated
  using (user_id = auth.uid() or is_admin());
-- No insert policy: people join through join_group() only.

-- Codes avoid look-alike characters (no 0/O, 1/I/L).
create function random_group_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end $$;

create function create_group(p_name text) returns groups
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  loop
    begin
      insert into groups (name, code) values (btrim(p_name), random_group_code()) returning * into g;
      return g;
    exception when unique_violation then
      -- code collision: try another
    end;
  end loop;
end $$;

create function rotate_group_code(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  loop
    new_code := random_group_code();
    begin
      update groups set code = new_code where id = p_group;
      return new_code;
    exception when unique_violation then
      -- code collision: try another
    end;
  end loop;
end $$;

-- Join with a code: 5 wrong tries an hour, groups capped at 50 members.
create function join_group(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g groups;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if (select count(*) from group_join_attempts
      where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many tries. Try again in an hour.';
  end if;

  select * into g from groups where code = upper(btrim(p_code)) and joinable;
  if not found then
    insert into group_join_attempts (user_id) values (uid);
    raise exception 'That code didn''t work.';
  end if;
  if (select count(*) from group_members where group_id = g.id) >= 50
     and not exists (select 1 from group_members where group_id = g.id and user_id = uid) then
    raise exception 'That group is full.';
  end if;

  insert into group_members (group_id, user_id) values (g.id, uid) on conflict do nothing;
  return g.name;
end $$;
