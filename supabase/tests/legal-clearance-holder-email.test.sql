-- A rights holder kept by name only keeps the address the request went to, then is
-- linked to its new fiche of the Réseau
-- (supabase/migrations/20261109170101_clearance_holder_email.sql).
begin;
select plan(7);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('manager'));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Nom seul ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Nom seul ' || (select v from vars where k = 'tag');
insert into public.legal_clearances (organization_id, project_id, element, work, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'topline', 'bir haikem', 'contacted');
insert into ids select 'clearance', id from public.legal_clearances
 where project_id = pg_temp.id_of('project');
insert into public.legal_clearance_rightsholders (organization_id, clearance_id, "right", name, role)
values (pg_temp.id_of('org'), pg_temp.id_of('clearance'), 'work', 'Cherry pie', 'publisher');
insert into ids select 'holder', id from public.legal_clearance_rightsholders
 where clearance_id = pg_temp.id_of('clearance');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Cherry ' || (select v from vars where k = 'tag'),
        array['publisher']);
insert into ids select 'contact', id from public.network_contacts
 where name = 'Cherry ' || (select v from vars where k = 'tag');

select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(
  $$ select public.keep_clearance_holder_email(pg_temp.id_of('holder'), ' Ed@Cherry.fr ') $$,
  'the address the request went to is kept on the holder');
select is((select email from public.legal_clearance_rightsholders where id = pg_temp.id_of('holder')),
          'ed@cherry.fr', 'kept trimmed and lowercased');
select lives_ok(
  $$ select public.link_clearance_holder_contact(pg_temp.id_of('holder'), pg_temp.id_of('contact')) $$,
  'the holder is linked to its new fiche');

reset role;
select is((select contact_id from public.legal_clearance_rightsholders where id = pg_temp.id_of('holder')),
          pg_temp.id_of('contact'), 'linked');
select is((select email from public.network_contacts where id = pg_temp.id_of('contact')),
          'ed@cherry.fr', 'the fiche without an address takes the holder''s');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(
  $$ select public.link_clearance_holder_contact(pg_temp.id_of('holder'), pg_temp.id_of('contact')) $$,
  'P0001', 'clearance_holder_linked', 'a holder already in the Réseau is not linked again');

reset role;
select set_config('request.jwt.claims', null, true);
set local role anon;
select throws_ok(
  $$ select public.keep_clearance_holder_email(pg_temp.id_of('holder'), 'x@y.fr') $$,
  '42501', null, 'nobody outside the team');

select * from finish();
rollback;
