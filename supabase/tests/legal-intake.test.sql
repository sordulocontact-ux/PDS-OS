-- Juridique, Cadrage juridique (supabase/migrations/20261004001001_legal_intake.sql).
-- Run with `supabase test db`.
begin;
select plan(28);

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

-- Reading and writing ---------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'contributors', pg_temp.id_of('master'),
    'Ever a composé, Samy au piano.',
    '[{"kind": "contribution", "value": {"name": "Ever", "role": "composer"}, "quote": "Ever a composé"},
      {"kind": "contribution", "value": {"name": "Samy", "role": "musician"}, "quote": "Samy au piano"}]'::jsonb)
$$, 'the project owner records an answer and its facts (manage_legal)');

select is((select status from public.legal_intakes where project_id = pg_temp.id_of('project')),
          'draft', 'the first answer opens the intake as a draft');
select is((select count(*)::int from public.legal_facts
            where project_id = pg_temp.id_of('project') and status = 'declared'
              and declared_by = pg_temp.id_of('manager_person')),
          2, 'each fact is declared by the person who answered');
select is((select count(*)::int from public.master_contributors
            where master_id = pg_temp.id_of('master') and name in ('Ever', 'Samy')),
          2, 'a contribution becomes a credit of the title');

select lives_ok($$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'third_party', pg_temp.id_of('master'),
    'Dioo a repris la topline de Humanisme.',
    '[{"kind": "third_party", "value": {"element": "topline", "work": "Humanisme"}, "quote": "la topline de Humanisme"}]'::jsonb)
$$, 'a third-party element is recorded');
select is((select status from public.legal_clearances where project_id = pg_temp.id_of('project')),
          'to_investigate', 'it opens a clearance to investigate, never an authorization');
select is((select status from public.legal_facts
            where project_id = pg_temp.id_of('project') and kind = 'third_party'),
          'to_verify', 'a third-party element stays to verify, not merely declared');

-- Correction: a new answer supersedes, nothing is deleted.
select lives_ok($$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'third_party', pg_temp.id_of('master'),
    'Finalement non, rien de repris.', '[{"kind": "none", "value": {}, "quote": "rien de repris"}]'::jsonb)
$$, 'the answer is corrected');
select is((select count(*)::int from public.legal_facts
            where project_id = pg_temp.id_of('project') and question_key = 'third_party'),
          2, 'the corrected fact is kept in the history');
select is((select count(*)::int from public.legal_facts
            where project_id = pg_temp.id_of('project') and question_key = 'third_party'
              and superseded_by_answer_id is null),
          1, 'only the new fact is active');
select is((select count(*)::int from public.legal_clearances where project_id = pg_temp.id_of('project')),
          0, 'the untouched clearance goes with the corrected fact');

-- Confirmation (supabase/migrations/20261004001101_legal_intake_confirmation.sql)
select public.record_legal_answer(
  pg_temp.id_of('project'), 'third_party', pg_temp.id_of('master'),
  'Si, la topline de Humanisme.',
  '[{"kind": "third_party", "value": {"element": "topline", "work": "Humanisme"}, "quote": "la topline de Humanisme"}]'::jsonb);
select lives_ok($$ select public.confirm_legal_intake(pg_temp.id_of('project')) $$,
                'the project owner confirms the dossier');
select is((select status from public.legal_intakes where project_id = pg_temp.id_of('project')),
          'confirmed', 'the dossier is confirmed');
select is((select count(*)::int from public.legal_facts
            where project_id = pg_temp.id_of('project') and superseded_by_answer_id is null
              and status = 'confirmed' and confirmed_by = pg_temp.id_of('manager_person')),
          2, 'its declared facts are confirmed, by whom');
select is((select status from public.legal_facts
            where project_id = pg_temp.id_of('project') and superseded_by_answer_id is null
              and kind = 'third_party'),
          'to_verify', 'a fact to verify stays to verify: confirming is not authorizing');

select public.record_legal_answer(
  pg_temp.id_of('project'), 'agreements', null, 'Aucun accord.',
  '[{"kind": "none", "value": {}, "quote": "Aucun accord"}]'::jsonb);
select is((select status from public.legal_intakes where project_id = pg_temp.id_of('project')),
          'draft', 'a new answer reopens the confirmed dossier');
select is((select confirmed_at from public.legal_intakes where project_id = pg_temp.id_of('project')),
          null, 'and clears its confirmation');

-- A person already known as a Réseau contact (an engineer of the Cadrage)
-- is credited linked to it (supabase/migrations/20261010001801_legal_answer_known_contact.sql).
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Karim ' || (select v from vars where k = 'tag'), array['engineer']);
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Karim ' || (select v from vars where k = 'tag');
insert into vars select 'engineer_name', 'Karim ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($f$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'contributors', pg_temp.id_of('master'),
    '%1$s : mix (Cadrage). Ever a composé, Samy au piano.',
    jsonb_build_array(
      jsonb_build_object('kind', 'contribution', 'value',
        jsonb_build_object('name', '%1$s', 'role', 'mix_engineer'),
        'quote', '%1$s : mix', 'contact_id', pg_temp.id_of('engineer')),
      jsonb_build_object('kind', 'contribution', 'value',
        jsonb_build_object('name', 'Ever', 'role', 'composer'),
        'quote', 'Ever a composé', 'contact_id', 'not-a-uuid')))
$f$, (select v from vars where k = 'engineer_name')),
  'an answer carries the contact of a known person');
select is((select contact_id from public.master_contributors
            where master_id = pg_temp.id_of('master') and role = 'mix_engineer'),
          pg_temp.id_of('engineer'), 'the credit is linked to that contact, not by its name');
select is((select contact_id from public.master_contributors
            where master_id = pg_temp.id_of('master') and name = 'Ever'),
          null, 'a contact that is not a live contact of the organization is ignored');
select public.record_legal_answer(
  pg_temp.id_of('project'), 'contributors', pg_temp.id_of('master'), 'Le mixeur.',
  jsonb_build_array(jsonb_build_object('kind', 'contribution', 'value',
    jsonb_build_object('name', 'Le mixeur', 'role', 'mix_engineer'),
    'quote', 'Le mixeur', 'contact_id', pg_temp.id_of('engineer'))));
select is((select count(*)::int from public.master_contributors
            where master_id = pg_temp.id_of('master') and role = 'mix_engineer'),
          1, 'the same contact in the same role is not credited twice');

-- Guards ------------------------------------------------------------------------
select throws_ok($$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'contributors', pg_temp.id_of('other_master'), 'x', '[]'::jsonb)
$$, 'P0001', 'legal_master_not_in_project', 'a title outside the project is refused');
select throws_ok($$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'agreements', pg_temp.id_of('master'), 'x', '[]'::jsonb)
$$, 'P0001', 'legal_question_scope', 'a project-wide question names no title');

-- Nothing to ask (no answer ever recorded): the dossier is still confirmed.
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Vide ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'empty_project', id from public.projects
 where title = 'Vide ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.confirm_legal_intake(pg_temp.id_of('empty_project')) $$,
                'a dossier with nothing to ask is confirmed without any answer');
select is((select status from public.legal_intakes where project_id = pg_temp.id_of('empty_project')),
          'confirmed', 'confirming opens the dossier it did not have yet');

reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.legal_facts where project_id = pg_temp.id_of('project')),
          0, 'a creative director reads no legal fact (no manage_legal)');
select throws_ok($$
  select public.record_legal_answer(
    pg_temp.id_of('project'), 'agreements', null, 'x', '[]'::jsonb)
$$, '42501', 'forbidden', 'nor records an answer');
select throws_ok($$ select public.confirm_legal_intake(pg_temp.id_of('project')) $$,
                 '42501', 'forbidden', 'nor confirms the dossier');

select * from finish();
rollback;
