-- Master ↔ Juridique, audit of 06/10/2026: the brief's engineers are credited
-- on the titles (20261006002001_master_brief_engineer_credits.sql), and a
-- fiche de renseignements never links a credit by its name
-- (20261006001001_legal_forms_no_name_link.sql). Run with `supabase test db`.
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
create function pg_temp.tagged(p text) returns text language sql as $$
  select p || ' ' || (select v from vars where k = 'tag')
$$;

insert into ids values ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('manager'));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

-- A project owned by the manager with two titles; the second already has a
-- mix credit written by hand. Three engineers in the Réseau.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), pg_temp.tagged('Dioo'), 'signed');
insert into ids select 'artist', id from public.artists where name = pg_temp.tagged('Dioo');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), pg_temp.tagged('Projet'), 'music_release', 'ep',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects where title = pg_temp.tagged('Projet');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('m1'), 1),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('m2'), 2);
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', pg_temp.tagged('Paul Mix'), array['engineer']),
       (pg_temp.id_of('org'), 'person', pg_temp.tagged('Léa Mix'), array['engineer']),
       (pg_temp.id_of('org'), 'person', pg_temp.tagged('Ana Master'), array['engineer']);
insert into ids select 'paul', id from public.network_contacts where name = pg_temp.tagged('Paul Mix');
insert into ids select 'lea', id from public.network_contacts where name = pg_temp.tagged('Léa Mix');
insert into ids select 'ana', id from public.network_contacts where name = pg_temp.tagged('Ana Master');
insert into public.master_contributors (organization_id, master_id, name, role)
values (pg_temp.id_of('org'), pg_temp.id_of('m2'), 'Mixé à la main', 'mix_engineer');

-- The brief credits its engineers ----------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.master_briefs (organization_id, project_id, mix_contact_id, mastering_same_engineer)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('paul'), true);
reset role;
select is((select count(*)::int from public.master_contributors
            where master_id = pg_temp.id_of('m1') and contact_id = pg_temp.id_of('paul')
              and from_brief and role in ('mix_engineer', 'mastering_engineer')),
          2, 'the brief''s engineer is credited for the mix and the mastering, linked by contact');
select is((select count(*)::int from public.master_contributors
            where master_id = pg_temp.id_of('m2') and role = 'mix_engineer'),
          1, 'a title already credited for its mix keeps its own credit');
select is((select count(*)::int from public.master_contributors
            where master_id = pg_temp.id_of('m2') and role = 'mastering_engineer'
              and contact_id = pg_temp.id_of('paul')),
          1, 'but gets the mastering engineer it lacked');

-- A change of engineer replaces the brief's credits only ------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
update public.master_briefs
   set mix_contact_id = pg_temp.id_of('lea'), mastering_same_engineer = false,
       mastering_contact_id = pg_temp.id_of('ana')
 where project_id = pg_temp.id_of('project');
reset role;
select is((select count(*)::int from public.master_contributors
            where contact_id = pg_temp.id_of('paul')),
          0, 'the previous engineer''s brief credits are gone');
select is((select string_agg(role, ',' order by role) from public.master_contributors
            where master_id = pg_temp.id_of('m1') and from_brief),
          'mastering_engineer,mix_engineer', 'the new engineers are credited');
select is((select contact_id from public.master_contributors
            where master_id = pg_temp.id_of('m1') and role = 'mastering_engineer'),
          pg_temp.id_of('ana'), 'the mastering goes to its own engineer');
select is((select name from public.master_contributors
            where master_id = pg_temp.id_of('m2') and role = 'mix_engineer'),
          'Mixé à la main', 'a credit written by hand is never touched');

-- A fiche never links a credit by its name ---------------------------------------
reset role;
insert into public.master_contributors (organization_id, master_id, name, role)
values (pg_temp.id_of('org'), pg_temp.id_of('m1'), pg_temp.tagged('Paul Mix'), 'producer'),
       (pg_temp.id_of('org'), pg_temp.id_of('m1'), pg_temp.tagged('Nouvelle Plume'), 'lyricist');
insert into ids select 'paul_credit', id from public.master_contributors
 where master_id = pg_temp.id_of('m1') and name = pg_temp.tagged('Paul Mix');
insert into ids select 'plume_credit', id from public.master_contributors
 where master_id = pg_temp.id_of('m1') and name = pg_temp.tagged('Nouvelle Plume');
update public.memberships m set role = 'general_director'
 where m.person_id = pg_temp.id_of('manager_person');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$
  select * from public.prepare_legal_form(%L, null, %L, array['producer'], array[%L]::uuid[], '{}'::jsonb, 1)
$$, pg_temp.id_of('project'), pg_temp.tagged('paul mix'), pg_temp.id_of('paul_credit')),
  'P0001', 'legal_form_namesake', 'no new contact when the Réseau has a namesake');
select lives_ok(format($$
  select * from public.prepare_legal_form(%L, %L, %L, array['producer'], array[%L]::uuid[], '{}'::jsonb, 1)
$$, pg_temp.id_of('project'), pg_temp.id_of('paul'), pg_temp.tagged('Paul Mix'), pg_temp.id_of('paul_credit')),
  'a fiche for an existing contact');
reset role;
select is((select contact_id from public.master_contributors where id = pg_temp.id_of('paul_credit')),
          null, 'an existing contact never takes a credit by its name');
select pg_temp.act_as(pg_temp.id_of('manager'));
select * from public.prepare_legal_form(pg_temp.id_of('project'), null, pg_temp.tagged('Nouvelle Plume'),
  array['songwriter'], array[pg_temp.id_of('plume_credit')], '{}'::jsonb, 1);
reset role;
select isnt((select contact_id from public.master_contributors where id = pg_temp.id_of('plume_credit')),
            null, 'a contact created for the fiche takes the credits of its name');

select * from finish();
rollback;
