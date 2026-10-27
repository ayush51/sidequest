-- Optional proof photo for a completed quest. Private bucket, one folder per user.

alter table user_quests add column photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quest-photos', 'quest-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "quest photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'quest-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "quest photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'quest-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- complete_quest now accepts an optional photo path (must live in the caller's folder).
drop function complete_quest(uuid);

create function complete_quest(p_user_quest uuid, p_photo_path text default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  earned int;
  prev date;
  new_streak int;
begin
  if p_photo_path is not null and p_photo_path not like uid::text || '/%' then
    raise exception 'invalid photo path';
  end if;

  select q.points into earned
  from user_quests uq join quests q on q.id = uq.quest_id
  where uq.id = p_user_quest and uq.user_id = uid and uq.status = 'assigned'
  for update of uq;
  if not found then return 0; end if;
  if p_photo_path is not null then earned := earned + 5; end if; -- photo bonus

  update user_quests
  set status = 'completed', completed_at = now(), photo_path = p_photo_path
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
