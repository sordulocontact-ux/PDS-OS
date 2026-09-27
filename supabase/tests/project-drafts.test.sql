-- Drafts of the new project form: personal to their author, who must be
-- allowed to create projects; authorship set by the database.
-- Run with `supabase test db`.
begin;
select plan(10);

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
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('author', pg_temp.new_user('drafter-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('peer', pg_temp.new_user('peer-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('author', 'general_director'), ('peer', 'general_director'),
               ('manager', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('author', 'peer', 'manager');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Writing ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('author'));
select lives_ok($$
  insert into public.project_drafts (organization_id, form_values)
  values (pg_temp.id_of('org'), '{"title": "Album 2027"}')
$$, 'whoever creates projects saves a draft');
insert into ids select 'draft', id from public.project_drafts
 where created_by = pg_temp.id_of('author_person');
select is((select created_by from public.project_drafts where id = pg_temp.id_of('draft')),
          pg_temp.id_of('author_person'), 'authorship is set by the database');
select throws_ok($$
  insert into public.project_drafts (organization_id, form_values, created_by)
  values (pg_temp.id_of('org'), '{}', pg_temp.id_of('peer_person'))
$$, '42501', null, 'authorship is never chosen by the client');
select throws_ok($$
  insert into public.project_drafts (organization_id, form_values)
  values (pg_temp.id_of('org'), '[]')
$$, '23514', null, 'a draft is an object of fields');
select lives_ok($$
  update public.project_drafts set form_values = '{"title": "Album 2028"}'
   where id = pg_temp.id_of('draft')
$$, 'the author updates their draft');

-- Nobody else -----------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('peer'));
select is((select count(*) from public.project_drafts where id = pg_temp.id_of('draft')),
          0::bigint, 'another director does not see it');
update public.project_drafts set form_values = '{}' where id = pg_temp.id_of('draft');
delete from public.project_drafts where id = pg_temp.id_of('draft');

reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$
  insert into public.project_drafts (organization_id, form_values)
  values (pg_temp.id_of('org'), '{}')
$$, '42501', null, 'without create_projects, no draft');

reset role;
select is((select form_values->>'title' from public.project_drafts where id = pg_temp.id_of('draft')),
          'Album 2028', 'nor changes or deletes it');

-- Deleting --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('author'));
select lives_ok($$ delete from public.project_drafts where id = pg_temp.id_of('draft') $$,
                'the author deletes their draft');
reset role;
select is((select count(*) from public.project_drafts where id = pg_temp.id_of('draft')),
          0::bigint, 'and it is gone');

select * from finish();
rollback;
