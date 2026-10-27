-- Initial schema: interests, profiles, quests. Later slices add their own migrations.

create type difficulty as enum ('chill', 'medium', 'bold');
create type cost_tier as enum ('free', '$', '$$');
create type quest_status as enum ('approved', 'pending', 'rejected');
create type dmv_area as enum (
  'georgetown', 'national_mall', 'old_town_alexandria', 'eastern_market',
  'great_falls', 'capital_crescent_trail', 'u_street', 'shirlington',
  'dc_other', 'maryland_other', 'virginia_other'
);

create table interests (
  slug text primary key,
  label text not null,
  emoji text not null
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null references interests,
  area dmv_area not null,
  cost cost_tier not null default 'free',
  difficulty difficulty not null default 'chill',
  points int not null default 10 check (points between 1 and 100),
  status quest_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- New auth user -> profile row.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

alter table interests enable row level security;
alter table profiles enable row level security;
alter table quests enable row level security;

create policy "interests readable" on interests for select to authenticated using (true);
create policy "profiles: read self" on profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles: update self" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "quests: approved readable" on quests for select to authenticated
  using (status = 'approved');
