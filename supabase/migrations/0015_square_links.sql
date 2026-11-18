-- Sign in from The Square (app/sso, app/link): a member taps SideQuest in The
-- Square's app menu and arrives signed in. Both tables are server-only: RLS is
-- on with no policies, so only the service role (those two routes) can touch them.

-- Which SideQuest account belongs to which person on The Square. `iss` is the
-- Square instance (e.g. 'ava'), `sub` the person's id there. One account per
-- person, and one person per account on each instance.
create table square_links (
  iss text not null,
  sub text not null,
  user_id uuid not null references auth.users on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (iss, sub),
  unique (user_id, iss)
);
alter table square_links enable row level security;

-- Passes already used. A pass is good for five minutes and ONE use; its nonce
-- (jti) is kept here until it expires so a replay is refused.
create table square_passes (
  jti text primary key,
  expires_at timestamptz not null
);
alter table square_passes enable row level security;
