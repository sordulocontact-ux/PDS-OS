-- Images joined to a question to PO: uploaded into one's own folder only,
-- read by their sender only (not even the general director). Removal goes
-- through the Storage API (a direct delete is refused by Storage itself).
-- Run with `supabase test db`.
begin;
select plan(4);

-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('author', pg_temp.new_user('author-' || (select v from vars where k = 'tag') || '@pds.test'));
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('author', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'author');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

insert into vars values
  ('own', pg_temp.id_of('author_person') || '/' || gen_random_uuid() || '.jpg'),
  ('theirs', pg_temp.id_of('director_person') || '/' || gen_random_uuid() || '.jpg');

-- Upload ----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('author'));
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('assistant-images', (select v from vars where k = 'own')) $$,
                'a member uploads an image into their own folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('assistant-images', (select v from vars where k = 'theirs')) $$,
                 '42501', null, 'never into someone else''s folder');
select is((select count(*)::int from storage.objects
            where bucket_id = 'assistant-images' and name = (select v from vars where k = 'own')),
          1, 'the sender reads their image');

-- Nobody else -------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from storage.objects
            where bucket_id = 'assistant-images' and name = (select v from vars where k = 'own')),
          0, 'not even the general director reads it');
reset role;

select * from finish();
rollback;
