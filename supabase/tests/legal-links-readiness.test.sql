-- Juridique, lot 9 J4 and J11:
--   20261019090301_legal_form_links.sql — a fiche's link kept sealed, sent by
--   whom, revoked with why;
--   20261019090201_release_readiness.sql — the direction's waivers, the
--   label's policy and the final validation of « Prêt pour la sortie ».
begin;
select plan(17);

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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');

reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Yanis ' || (select v from vars where k = 'tag'),
        array['musician']);
insert into ids select 'yanis', id from public.network_contacts
 where name = 'Yanis ' || (select v from vars where k = 'tag');

-- J4: the fiche's link -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'form', form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), pg_temp.id_of('yanis'), 'Yanis', array['musician'], '{}',
  '{}'::jsonb, 1);
select lives_ok($$ select public.seal_legal_form_link(pg_temp.id_of('form'), 'v1.a.b.c') $$,
  'the server keeps the link sealed');
select throws_ok($$ select public.seal_legal_form_link(pg_temp.id_of('form'), 'v1.x.y.z') $$,
  'P0001', 'legal_form_state_invalid', 'a sealed link is never replaced (« Nouveau lien » makes a new fiche link)');
select public.set_legal_form_state(pg_temp.id_of('form'), 'sent');
select is((select sent_by from public.legal_forms where id = pg_temp.id_of('form')),
          pg_temp.id_of('manager_person'), 'who sent the link is kept');
select throws_ok($$ select public.revoke_legal_form(pg_temp.id_of('form'), ' ') $$,
  'P0001', 'legal_form_reason_required', 'revoking the access says why');
select public.revoke_legal_form(pg_temp.id_of('form'), 'Mauvaise adresse e-mail.');
select is((select status || '|' || revoked_reason || '|' || (link_sealed is null)::text
             from public.legal_forms where id = pg_temp.id_of('form')),
          'revoked|Mauvaise adresse e-mail.|true',
          'revoked with why, the sealed link dropped');
select is((select revoked_by from public.legal_forms where id = pg_temp.id_of('form')),
          pg_temp.id_of('manager_person'), 'who revoked it is kept');

-- J11: the direction's decisions -----------------------------------------------------------------
select throws_ok($$ select public.grant_release_waiver(pg_temp.id_of('project'), 'clearance:x',
    'Emprunt', 'Accord oral') $$,
  '42501', 'forbidden', 'a project manager grants no waiver');
select throws_ok($$ select public.validate_release(pg_temp.id_of('project'), '[]'::jsonb) $$,
  '42501', 'forbidden', 'a project manager does not validate the release');
select throws_ok($$ select public.set_release_policy(pg_temp.id_of('org'), true) $$,
  '42501', 'forbidden', 'a project manager does not set the label''s policy');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.grant_release_waiver(pg_temp.id_of('project'), 'clearance:x',
    'Emprunt', '') $$,
  'P0001', 'release_waiver_reason_required', 'a waiver says why');
select lives_ok($$ select public.grant_release_waiver(pg_temp.id_of('project'), 'clearance:x',
    'Emprunt « Night Lights »', 'Accord écrit des ayants droit reçu, licence en cours.') $$,
  'the direction grants a waiver');
select is((select granted_by from public.release_readiness_waivers
            where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('director_person'), 'the waiver keeps who granted it');
select lives_ok($$ select public.set_release_policy(pg_temp.id_of('org'), true) $$,
  'the direction sets the label''s policy');
select lives_ok($$ select public.validate_release(pg_temp.id_of('project'),
    '[{"key": "clearance:x", "status": "waived"}]'::jsonb) $$,
  'the direction validates the release with the controls it saw');
select throws_ok($$ select public.validate_release(pg_temp.id_of('project'), '[]'::jsonb) $$,
  'P0001', 'release_already_validated', 'a release is validated once');
select throws_ok($$ select public.grant_release_waiver(pg_temp.id_of('project'), 'sacem:y',
    'SACEM', 'x') $$,
  'P0001', 'release_already_validated', 'no waiver after the validation');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.release_validations
            where project_id = pg_temp.id_of('project')),
          1, 'whoever sees the project reads the validation (the Distribution)');

select * from finish();
reset role;
-- The label's policy is per organization: put it back.
delete from public.release_readiness_policies where organization_id = (select id from ids where name = 'org');
rollback;
