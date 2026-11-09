-- PO's reading of a reply received, kept with it: the first reading only, never on an
-- outgoing message, by whoever may write the borrowing
-- (supabase/migrations/20261109180101_clearance_reply_reading.sql).
begin;
select plan(5);

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

insert into public.legal_clearance_communications
  (organization_id, clearance_id, kind, direction, body, occurred_at)
values (pg_temp.id_of('org'), pg_temp.id_of('clearance'), 'email', 'in', '5000 € et 3 %', now()),
       (pg_temp.id_of('org'), pg_temp.id_of('clearance'), 'message', 'out', 'Demande', now());
insert into ids select 'in', id from public.legal_clearance_communications
 where clearance_id = pg_temp.id_of('clearance') and direction = 'in';
insert into ids select 'out', id from public.legal_clearance_communications
 where clearance_id = pg_temp.id_of('clearance') and direction = 'out';

select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(
  $$ select public.keep_clearance_reading(pg_temp.id_of('in'), '{"event": "terms", "terms": []}') $$,
  'the reading of a reply received is kept');
select lives_ok(
  $$ select public.keep_clearance_reading(pg_temp.id_of('in'), '{"event": "other"}') $$,
  'a second reading does not fail');
select lives_ok(
  $$ select public.keep_clearance_reading(pg_temp.id_of('out'), '{"event": "terms"}') $$,
  'an outgoing message is left as is');

reset role;
select is((select reading->>'event' from public.legal_clearance_communications where id = pg_temp.id_of('in')),
          'terms', 'the first reading stays');
select is((select reading from public.legal_clearance_communications where id = pg_temp.id_of('out')),
          null, 'never on what was sent');

select * from finish();
rollback;
