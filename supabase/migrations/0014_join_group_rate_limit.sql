-- join_group used to raise on a wrong code, which rolled back the failed-attempt record,
-- so the rate limit never counted. Failures that must be recorded now return an error
-- value instead of raising.

drop function join_group(text);

create function join_group(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  g groups;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if (select count(*) from group_join_attempts
      where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('error', 'Too many tries. Try again in an hour.');
  end if;

  select * into g from groups where code = upper(btrim(p_code)) and joinable;
  if not found then
    insert into group_join_attempts (user_id) values (uid);
    return jsonb_build_object('error', 'That code didn''t work.');
  end if;
  if (select count(*) from group_members where group_id = g.id) >= 50
     and not exists (select 1 from group_members where group_id = g.id and user_id = uid) then
    return jsonb_build_object('error', 'That group is full.');
  end if;

  insert into group_members (group_id, user_id) values (g.id, uid) on conflict do nothing;
  return jsonb_build_object('name', g.name);
end $$;
