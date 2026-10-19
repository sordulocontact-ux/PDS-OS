-- Juridique, lot 9 J8 (supabase/migrations/20261019090401_clearance_withdraw_replace.sql):
-- a refusal is decided — withdraw the element (with why, the project's
-- responsible told) or replace it (a new borrowing, linked).
begin;
select plan(8);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director'),
               ('director', 'general_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Sami ' || (select v from vars where k = 'tag'),
        array['songwriter']);
insert into ids select 'sami', id from public.network_contacts
 where name = 'Sami ' || (select v from vars where k = 'tag');

-- « Pas d'accord nécessaire » -------------------------------------------------------------------

reset role;
insert into public.legal_clearances (organization_id, project_id, element, work, author, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'sample', 'Night Lights', 'The Velvetones',
        'refused'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'sample', 'Day Lights', null, 'refused');
insert into ids select 'night', id from public.legal_clearances
 where project_id = pg_temp.id_of('project') and work = 'Night Lights';
insert into ids select 'day', id from public.legal_clearances
 where project_id = pg_temp.id_of('project') and work = 'Day Lights';

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.withdraw_clearance(pg_temp.id_of('night'), 'x') $$,
  '42501', null, 'only the Juridique decides');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.withdraw_clearance(pg_temp.id_of('night'), '') $$,
  'P0001', 'clearance_note_required', 'withdrawing says why');
select public.withdraw_clearance(pg_temp.id_of('night'), 'Refus définitif des ayants droit.');
select is((select status || '|' || withdrawn_reason from public.legal_clearances
            where id = pg_temp.id_of('night')),
          'abandoned|Refus définitif des ayants droit.', 'withdrawn, with why');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'legal_element_withdrawn' and subject_id = pg_temp.id_of('night')
              and recipient_person_id = pg_temp.id_of('manager_person')),
          1, 'the project''s responsible is told (the Master redoes the passage)');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.replace_clearance(pg_temp.id_of('night'), 'Une version rejouée') $$,
  'P0001', 'clearance_closed', 'a closed borrowing is not replaced');
insert into ids select 'new', public.replace_clearance(pg_temp.id_of('day'),
  'Une version rejouée du motif, enregistrée par Yanis Morel.');
select is((select replaces_id from public.legal_clearances where id = pg_temp.id_of('new')),
          pg_temp.id_of('day'), 'the new borrowing names the one it replaces');
select is((select status || '|' || rights_scope from public.legal_clearances
            where id = pg_temp.id_of('new')),
          'to_investigate|work', 'a new request, the work only');
select is((select status from public.legal_clearances where id = pg_temp.id_of('day')),
          'abandoned', 'the former borrowing is closed');

select * from finish();
rollback;
