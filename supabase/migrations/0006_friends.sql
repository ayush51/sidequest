-- Friends: requests, name search, and a feed of friends' completed quests.

create type friendship_status as enum ('pending', 'accepted');

create table friendships (
  requester_id uuid not null default auth.uid() references profiles on delete cascade,
  addressee_id uuid not null references profiles on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- One row per pair, whichever side asked first.
create unique index friendships_pair
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table friendships enable row level security;
revoke update on friendships from authenticated;
grant update (status) on friendships to authenticated;

create policy "friendships: involved can read" on friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships: request as self" on friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
create policy "friendships: addressee accepts" on friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "friendships: either side removes" on friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- security definer so these checks don't recurse through friendships' own RLS.
create function are_friends(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (addressee_id = auth.uid() and requester_id = other))
  )
$$;

create function is_connected(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where (requester_id = auth.uid() and addressee_id = other)
       or (addressee_id = auth.uid() and requester_id = other)
  )
$$;

-- Names are visible once a request exists (so the inbox can show who asked).
create policy "profiles: connected can read" on profiles for select to authenticated
  using (is_connected(id));

-- Friends' completed quests (and photos) are visible to each other.
create policy "user_quests: friends read completed" on user_quests for select to authenticated
  using (status = 'completed' and are_friends(user_id));

create policy "quest photos: friends read" on storage.objects for select to authenticated
  using (bucket_id = 'quest-photos' and are_friends(((storage.foldername(name))[1])::uuid));

-- Name search: username prefix, names only.
create function search_profiles(q text) returns table (id uuid, username text, display_name text)
language sql stable security definer set search_path = public as $$
  select id, username, display_name from profiles
  where length(q) >= 2 and starts_with(username, lower(q)) and id <> auth.uid()
  order by username limit 10
$$;
