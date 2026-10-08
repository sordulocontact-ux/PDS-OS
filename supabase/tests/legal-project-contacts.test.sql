-- Intervenants non crédités du Juridique (ticket « Architecture globale »,
-- lot 6, supabase/migrations/20261008000101_legal_project_contacts.sql).
-- Run with `supabase test db`.
begin;
select plan(11);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts
 where id = pg_temp.id_of('creative');

reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);
-- The creative director sees the project (its creative team).
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));

-- Two people of the Réseau: a photographer, and a mixer credited on the title.
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Léa ' || (select v from vars where k = 'tag'), array['other']),
       (pg_temp.id_of('org'), 'person', 'Tom ' || (select v from vars where k = 'tag'), array['other']);
insert into ids select 'lea', id from public.network_contacts
 where name = 'Léa ' || (select v from vars where k = 'tag');
insert into ids select 'tom', id from public.network_contacts
 where name = 'Tom ' || (select v from vars where k = 'tag');
insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'Tom ' || (select v from vars where k = 'tag'),
        'mix_engineer', pg_temp.id_of('tom'));

-- Tests -----------------------------------------------------------------------
select is((select relforcerowsecurity from pg_class where oid = 'public.legal_project_contacts'::regclass),
          true, 'the table forces row level security');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.add_legal_project_contact(%L, %L, 'provider') $$,
                 pg_temp.id_of('project'), pg_temp.id_of('lea')),
                 '42501', 'forbidden', 'without manage_legal, nobody is added');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'row', public.add_legal_project_contact(
  pg_temp.id_of('project'), pg_temp.id_of('lea'), 'provider');
select is((select role from public.legal_project_contacts where id = pg_temp.id_of('row')),
          'provider', 'the project manager adds a person of the Réseau with a role');
select throws_ok(format($$ select public.add_legal_project_contact(%L, %L, 'provider') $$,
                 pg_temp.id_of('project'), pg_temp.id_of('lea')),
                 'P0001', 'legal_contact_already_added', 'the same person is added once');
select throws_ok(format($$ select public.add_legal_project_contact(%L, %L, 'provider') $$,
                 pg_temp.id_of('project'), pg_temp.id_of('tom')),
                 'P0001', 'legal_contact_credited', 'a person credited on a title is known by the credit');
select throws_ok(format($$ select public.add_legal_project_contact(%L, %L, 'lawyer') $$,
                 pg_temp.id_of('project'), gen_random_uuid()),
                 'P0001', 'legal_contact_invalid', 'only a person of the Réseau');
select throws_ok($$ insert into public.legal_project_contacts (organization_id, project_id, contact_id, role)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('tom'), 'other') $$,
                 '42501', null, 'no direct write: only through the functions');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.legal_project_contacts
            where project_id = pg_temp.id_of('project')), 0,
          'a creative director does not read the legal file');

-- A mapped contract keeps the person in the file.
reset role;
insert into public.legal_agreement_needs (organization_id, project_id, contact_id, roles, contract_type)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lea'), array['provider'], 'service');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.remove_legal_project_contact(%L) $$, pg_temp.id_of('row')),
                 'P0001', 'legal_contact_in_use', 'a person with a mapped contract stays');
reset role;
delete from public.legal_agreement_needs where contact_id = pg_temp.id_of('lea');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.remove_legal_project_contact(%L) $$, pg_temp.id_of('row')),
                'then the person can be taken out');
select is((select count(*)::int from public.legal_project_contacts
            where project_id = pg_temp.id_of('project')), 0, 'and is gone');

select * from finish();
rollback;
