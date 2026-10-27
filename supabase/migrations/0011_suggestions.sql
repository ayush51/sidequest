-- Suggested quests (instantly live for everyone, with reports + admin removal),
-- feature requests, and an admin flag for the creator.

alter table profiles add column is_admin boolean not null default false; -- not user-editable (column grants)

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- Admin can read every profile (to show who suggested what).
create policy "profiles: admin read all" on profiles for select to authenticated
  using (is_admin());

-- Quests: track the author; admin can see and moderate everything.
alter table quests add column author_id uuid references profiles on delete set null;

-- A quest stays readable to someone it was already assigned to, even if later hidden.
create policy "quests: readable if assigned to me" on quests for select to authenticated
  using (exists (select 1 from user_quests uq where uq.quest_id = quests.id and uq.user_id = auth.uid()));
create policy "quests: admin read all" on quests for select to authenticated using (is_admin());
create policy "quests: admin update" on quests for update to authenticated
  using (is_admin()) with check (is_admin());

-- Suggesting a quest publishes it immediately. Points come from difficulty, not the user.
create function suggest_quest(
  p_title text, p_description text, p_category text,
  p_area dmv_area, p_cost cost_tier, p_difficulty difficulty
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  p_title := btrim(p_title);
  p_description := btrim(p_description);
  if char_length(p_title) not between 3 and 60 then
    raise exception 'The title must be 3-60 characters.';
  end if;
  if char_length(p_description) not between 10 and 280 then
    raise exception 'The description must be 10-280 characters.';
  end if;
  if not exists (select 1 from interests where slug = p_category) then
    raise exception 'Pick a category.';
  end if;
  if (select count(*) from quests where author_id = uid and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'You can suggest up to 5 quests a day.';
  end if;

  insert into quests (title, description, category, area, cost, difficulty, points, status, author_id)
  values (
    p_title, p_description, p_category, p_area, p_cost, p_difficulty,
    case p_difficulty when 'chill' then 10 when 'medium' then 15 else 25 end,
    'approved', uid
  )
  returning id into new_id;
  return new_id;
end $$;

-- Reports: 3 different people hide a user-suggested quest automatically.
create table quest_reports (
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  quest_id uuid not null references quests on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);
alter table quest_reports enable row level security;
create policy "quest_reports: read own or admin" on quest_reports for select to authenticated
  using (user_id = auth.uid() or is_admin());

create function report_quest(p_quest uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into quest_reports (user_id, quest_id) values (auth.uid(), p_quest) on conflict do nothing;
  update quests set status = 'rejected'
  where id = p_quest and author_id is not null and status = 'approved'
    and (select count(*) from quest_reports where quest_id = p_quest) >= 3;
end $$;

-- Feature requests: users submit, only the creator moves them forward.
create type feature_status as enum ('pending', 'approved', 'building', 'shipped', 'rejected');

create table feature_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  details text not null check (char_length(details) between 10 and 1000),
  status feature_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now()
);
alter table feature_requests enable row level security;

create policy "feature_requests: read own or admin" on feature_requests for select to authenticated
  using (author_id = auth.uid() or is_admin());
create policy "feature_requests: submit as self" on feature_requests for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'pending'
    and (select count(*) from feature_requests f where f.author_id = auth.uid() and f.status = 'pending') < 3
  );
create policy "feature_requests: admin updates" on feature_requests for update to authenticated
  using (is_admin()) with check (is_admin());
