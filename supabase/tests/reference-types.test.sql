-- MKT-C2-09 (…20261013100501): every element of the Conception says what
-- it is (reference, moodboard, or « à qualifier » for what came before),
-- its rights of use, and the moodboard of its project it sits in.
-- Run with `supabase test db`.
begin;
select plan(5);

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
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'RT ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;
-- Stratégie validated (set directly: not under test).
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.id_of('project')
   and d.key = 'launch_strategy';

select pg_temp.act_as(pg_temp.id_of('owner'));
select public.start_design_without_exchange(pg_temp.id_of('project'), 'Test');
with r as (insert into public.design_references (organization_id, project_id, kind, url)
           values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'link', 'https://example.com/a')
           returning id)
insert into ids select 'old', id from r;
select is((select type from public.design_references where id = pg_temp.id_of('old')), 'to_qualify',
          'an element added without a type is « à qualifier »');
with r as (insert into public.design_references (organization_id, project_id, kind, url, type, usage)
           values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'link', 'https://are.na/b', 'moodboard', 'inspiration')
           returning id)
insert into ids select 'board', id from r;
select lives_ok($$ update public.design_references set type = 'reference', moodboard_id = pg_temp.id_of('board')
                   where id = pg_temp.id_of('old') $$, 'a reference sits in a moodboard of its project');
select throws_ok($$ update public.design_references set moodboard_id = pg_temp.id_of('old')
                    where id = pg_temp.id_of('board') $$, '23514', null, 'a moodboard never sits in another');
select throws_ok($$ update public.design_references set usage = 'stolen' where id = pg_temp.id_of('old') $$,
  '23514', null, 'the rights of use come from a closed list');
select throws_ok($$ update public.design_references set type = 'proposal' where id = pg_temp.id_of('old') $$,
  '23514', null, 'a proposal is not a reference: it is a design version');

select * from finish();
rollback;
