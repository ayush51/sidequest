-- Which interests each user picked; used to weight their daily quest.

create table profile_interests (
  profile_id uuid not null default auth.uid() references profiles on delete cascade,
  interest_slug text not null references interests on delete cascade,
  primary key (profile_id, interest_slug)
);

alter table profile_interests enable row level security;

create policy "profile_interests: own" on profile_interests for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
