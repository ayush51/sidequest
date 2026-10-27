-- Suggested quests wait for the creator's approval before joining the pool, so the
-- report/auto-hide feature from 0011 is not needed.

drop function report_quest(uuid);
drop table quest_reports;

-- Authors can see their own suggestions (pending or not) to track their status.
create policy "quests: read own suggestions" on quests for select to authenticated
  using (author_id = auth.uid());

create or replace function suggest_quest(
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

  -- Starts as pending; the default points follow difficulty and the creator can change them.
  insert into quests (title, description, category, area, cost, difficulty, points, status, author_id)
  values (
    p_title, p_description, p_category, p_area, p_cost, p_difficulty,
    case p_difficulty when 'chill' then 10 when 'medium' then 15 else 25 end,
    'pending', uid
  )
  returning id into new_id;
  return new_id;
end $$;
