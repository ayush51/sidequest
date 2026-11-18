-- Reactions and comments on feed posts (a post is a completed user_quests row).
-- Both tables inherit who can see a post from user_quests' own row-level security: the policies
-- ask "can I read that post?", so only people who can see a post can react or comment on it.
-- User columns point at auth.users (not profiles) so the API gets no ambiguous joins.

create table feed_reactions (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  user_quest_id uuid not null references user_quests on delete cascade,
  kind text not null check (kind in ('heart', 'fire', 'laugh')),
  created_at timestamptz not null default now(),
  primary key (user_id, user_quest_id)
);

create table feed_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  user_quest_id uuid not null references user_quests on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index feed_comments_post_idx on feed_comments (user_quest_id, created_at);

alter table feed_reactions enable row level security;
alter table feed_comments enable row level security;

-- Visible = I can read that completed post (the creator can read all, to moderate).
create policy "feed_reactions: read visible" on feed_reactions for select to authenticated
  using (is_admin()
    or exists (select 1 from user_quests u where u.id = user_quest_id and u.status = 'completed'));
create policy "feed_reactions: insert own" on feed_reactions for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from user_quests u where u.id = user_quest_id and u.status = 'completed'));
create policy "feed_reactions: update own" on feed_reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "feed_reactions: delete own" on feed_reactions for delete to authenticated
  using (user_id = auth.uid());

create policy "feed_comments: read visible" on feed_comments for select to authenticated
  using (is_admin()
    or exists (select 1 from user_quests u where u.id = user_quest_id and u.status = 'completed'));
create policy "feed_comments: insert own" on feed_comments for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from user_quests u where u.id = user_quest_id and u.status = 'completed'));
-- You can delete your own comments, and the creator can delete anyone's.
create policy "feed_comments: delete own or admin" on feed_comments for delete to authenticated
  using (user_id = auth.uid() or is_admin());
