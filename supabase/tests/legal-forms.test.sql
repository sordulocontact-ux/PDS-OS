-- Juridique, branch 02: fiches de renseignements
-- (supabase/migrations/20261004004001_legal_forms.sql). Run with `supabase test db`.
begin;
select plan(13);

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

-- A project owned by the manager, with one title, and another title outside it.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_master', public.create_master(
  pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);

-- A credit of the project, not in the Réseau yet ---------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.master_contributors (organization_id, master_id, name, role)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'Ever', 'composer');
insert into ids select 'credit', id from public.master_contributors where master_id = pg_temp.id_of('master');
create temp table links (token text, form uuid) on commit drop;
grant all on links to authenticated, anon;

insert into links select token, form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), null, 'Ever', array['songwriter'], array[pg_temp.id_of('credit')],
  '{"roles": ["composer"]}'::jsonb, 1);
select is((select count(*)::int from links where token ~ '^[0-9a-f]{64}$'), 1,
          'preparing a fiche returns a token once');
select isnt((select contact_id from public.master_contributors where id = pg_temp.id_of('credit')), null,
            'the credit is linked to the contact created for it');
select is((select count(*)::int from public.legal_forms where token_hash = (select token from links)), 0,
          'only the token''s hash is stored');

-- The outside person, without an account ------------------------------------------
reset role;
set local role anon;
select is((public.get_legal_form((select token from links)) ->> 'state'), 'open',
          'an outside person opens the fiche without an account');
select is(public.get_legal_form(repeat('0', 64)), null, 'an unknown token shows nothing');
select is(public.submit_legal_form((select token from links), array['composer'], null,
          '{"legal_first_name": "Evan", "legal_last_name": "Ever", "email": "ever@example.com", "entity_type": "person", "ipi_coad": "00123456789"}'::jsonb,
          '{"proposed_split": "33,33 %"}'::jsonb, 1),
          'complete', 'the fiche is submitted and complete');
select throws_ok($$ select public.submit_legal_form((select token from links), array['composer'], null, '{}'::jsonb, '{}'::jsonb, 1) $$,
                 'P0001', 'legal_form_closed', 'a fiche is submitted once');
reset role;
select is((select details ->> 'ipi_coad' from public.contact_legal_details
            where contact_id = (select contact_id from public.master_contributors where id = pg_temp.id_of('credit'))),
          '00123456789', 'the person''s data goes to the contact (Person)');
select is((select contribution ->> 'proposed_split' from public.legal_form_submissions
            where form_id = (select form from links)),
          '33,33 %', 'the project''s data stays with the submission (Contribution)');

-- A correction of a known value waits for review ----------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
delete from links;
insert into links select token, form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), (select contact_id from public.master_contributors where id = pg_temp.id_of('credit')),
  'Ever', array['songwriter'], '{}', '{}'::jsonb, 1);
reset role;
set local role anon;
select is(public.submit_legal_form((select token from links), array['composer'], null,
          '{"ipi_coad": "99999999999"}'::jsonb, '{}'::jsonb, 1),
          'action_required', 'a value that differs from the known one waits for review');
reset role;
select is((select details ->> 'ipi_coad' from public.contact_legal_details
            where contact_id = (select contact_id from public.master_contributors where id = pg_temp.id_of('credit'))),
          '00123456789', 'and is not applied before review');

-- Revoked and expired links ----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
delete from links;
insert into links select token, form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), (select contact_id from public.master_contributors where id = pg_temp.id_of('credit')),
  'Ever', array['songwriter'], '{}', '{}'::jsonb, 1);
select public.set_legal_form_state((select form from links), 'revoked');
reset role;
set local role anon;
select throws_ok($$ select public.submit_legal_form((select token from links), array['composer'], null, '{}'::jsonb, '{}'::jsonb, 1) $$,
                 'P0001', 'legal_form_closed', 'a revoked link no longer submits');
reset role;
update public.legal_forms set status = 'sent', revoked_at = null, expires_at = now() - interval '1 day'
 where id = (select form from links);
set local role anon;
select is((public.get_legal_form((select token from links)) ->> 'state'), 'expired',
          'an expired link says so and no longer opens');

select * from finish();
rollback;
