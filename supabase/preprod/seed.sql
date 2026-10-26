-- Pre-production seed (docs/PREPROD.md): the test accounts of
-- lib/preprod/accounts.ts and one project per moment of
-- lib/preprod/moments.ts, each brought to its moment by the real gestures
-- (the same functions as the app, played as each person: RLS applies).
-- NEVER on the production database: scripts/preprod-reset.sh refuses a base
-- holding any account outside @preprod.pds.
--
-- Run by scripts/preprod-reset.sh after `supabase db reset`, with psql and
-- the variable :pw (the shared password, sent on stdin, never in argv).

\set ON_ERROR_STOP on
begin;

-- Helpers (same as supabase/tests) -------------------------------------------
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create function pg_temp.id_of(p text) returns uuid language sql as $$
  select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Accounts --------------------------------------------------------------------
-- Created as GoTrue does for a confirmed email sign-up; the trigger
-- po_handle_confirmed then adds the person, the account and a pending
-- membership, approved here with its position.
create temp table seed_accounts (key text, email text, first_name text, last_name text, role text);
insert into seed_accounts values
  ('dg',  'claire.morel@preprod.pds', 'Claire', 'Morel',  'general_director'),
  ('cp',  'lina.haddad@preprod.pds',  'Lina',   'Haddad', 'project_manager'),
  ('cp2', 'tom.mercier@preprod.pds',  'Tom',    'Mercier','project_manager'),
  ('da',  'nadia.benali@preprod.pds', 'Nadia',  'Benali', 'creative_director');

-- `supabase db reset` may keep auth.users: start again from no test account.
delete from auth.users where email like '%@preprod.pds';
insert into ids select key, gen_random_uuid() from seed_accounts;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
select '00000000-0000-0000-0000-000000000000', ids.id, 'authenticated', 'authenticated',
       a.email, extensions.crypt(:'pw', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}',
       jsonb_build_object('first_name', a.first_name, 'last_name', a.last_name),
       now(), now(), '', '', '', ''
  from seed_accounts a join ids on ids.name = a.key;

insert into auth.identities (id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), ids.id, ids.id::text,
       jsonb_build_object('sub', ids.id::text, 'email', a.email, 'email_verified', true),
       'email', now(), now(), now()
  from seed_accounts a join ids on ids.name = a.key;

insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = a.role
  from seed_accounts a join ids on ids.name = a.key
 where m.person_id = (select person_id from public.accounts where id = ids.id);
insert into ids select a.key || '_person', ac.person_id
  from seed_accounts a join ids on ids.name = a.key join public.accounts ac on ac.id = ids.id;
-- One validator in V1 (sole_validator): Claire alone.
update public.memberships set status = 'suspended'
 where organization_id = pg_temp.id_of('org') and role = 'general_director'
   and status = 'approved' and person_id <> pg_temp.id_of('dg_person');

-- Catalogue: the artist of the proto, one title per project --------------------
select pg_temp.act_as(pg_temp.id_of('dg'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Mona Lys', 'signed');
insert into ids select 'artist', id from public.artists
 where organization_id = pg_temp.id_of('org') and name = 'Mona Lys';

-- A single, transmitted to Lina, Nadia as creative: what « Nouveau projet »
-- does. Returns nothing; the project is ids.<key>, its assignment <key>_a.
create function pg_temp.new_project(p_key text, p_title text, p_due date) returns void
language plpgsql as $$
declare v_master uuid; v_project uuid;
begin
  v_master := public.create_master(pg_temp.id_of('org'), p_title,
    jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'), 'role', 'main')));
  v_project := public.create_project(
    p_organization_id => pg_temp.id_of('org'), p_title => p_title, p_type => 'music_release',
    p_master_ids => array[v_master], p_due_date => p_due, p_budget_cents => 1500000,
    p_initial_context => 'Premier single de la saison de Mona Lys, avec un clip tourné à Paris.',
    p_assignee_person_id => pg_temp.id_of('cp_person'),
    p_creative_person_ids => array[pg_temp.id_of('da_person')],
    p_music_format => 'single', p_artist_id => pg_temp.id_of('artist'));
  insert into ids values (p_key, v_project);
  insert into ids select p_key || '_a', id from public.project_assignments
   where project_id = v_project order by created_at desc limit 1;
end $$;
grant execute on function pg_temp.new_project(text, text, date) to authenticated;

select pg_temp.new_project('accept', 'Velours', (current_date + 120));
select pg_temp.new_project('framing', 'Néons', (current_date + 100));
select pg_temp.new_project('brief', 'Marée basse', (current_date + 90));
select pg_temp.new_project('plan', 'Ciel ouvert', (current_date + 80));
select pg_temp.new_project('launched', 'Minuit pile', (current_date + 70));
reset role;

-- Lina accepts every project but « Velours », and opens their Cadrage ---------
select pg_temp.act_as(pg_temp.id_of('cp'));
select public.respond_to_assignment(pg_temp.id_of(k || '_a'), 'accepted')
  from unnest(array['framing', 'brief', 'plan', 'launched']) k;
select public.start_framing_without_call(pg_temp.id_of(k))
  from unnest(array['framing', 'brief', 'plan', 'launched']) k;
select public.start_stage(s.id)
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where d.key = 'framing' and s.state = 'not_started'
   and s.project_id in (select id from ids where name in ('framing', 'brief', 'plan', 'launched'));

-- The Cadrage's answers, as fill_page_test_data writes them -------------------
create function pg_temp.answer(p_project uuid, p_key text, p_value jsonb) returns void
language sql as $$
  insert into public.field_values (organization_id, project_id, deliverable, field_key,
                                   value, status, source_type)
  values (pg_temp.id_of('org'), p_project, 'brief', p_key, p_value, 'confirmed', 'manual')
$$;
grant execute on function pg_temp.answer(uuid, text, jsonb) to authenticated;

-- « Néons »: the objective dimension only, the rest is Lina's to fill.
select pg_temp.answer(pg_temp.id_of('framing'), k, to_jsonb(v)) from (values
  ('objective', 'Installer ce titre comme la sortie de référence de Mona Lys cette saison et élargir son public au-delà du rap.'),
  ('success_criteria', '500 000 écoutes en 8 semaines, 3 playlists éditoriales et un passage radio national.'),
  ('main_priority', 'Sortir à la date prévue avec le clip disponible dès le premier jour.')) as a (k, v);

-- Every required question, for the three projects past the Cadrage.
create function pg_temp.full_framing(p_project uuid, p_due date) returns void
language plpgsql as $$
begin
  perform pg_temp.answer(p_project, k, to_jsonb(v)) from (values
    ('objective', 'Installer ce titre comme la sortie de référence de Mona Lys cette saison et élargir son public au-delà du rap.'),
    ('success_criteria', '500 000 écoutes en 8 semaines, 3 playlists éditoriales et un passage radio national.'),
    ('main_priority', 'Sortir à la date prévue avec le clip disponible dès le premier jour.'),
    ('current_state', 'Titre enregistré, mix en cours.')) as a (k, v);
  perform pg_temp.answer(p_project, 'target_date', to_jsonb(p_due::text));
  perform pg_temp.answer(p_project, 'budget_envelope', to_jsonb(1500000));
  perform pg_temp.answer(p_project, k, '{"none": true}') from unnest(array['contributors', 'legal_blockers']) k;
  insert into public.needs (organization_id, project_id, label, family) values
    (pg_temp.id_of('org'), p_project, 'Clip', 'creation_content'),
    (pg_temp.id_of('org'), p_project, 'Contenus réseaux sociaux', 'creation_content'),
    (pg_temp.id_of('org'), p_project, 'Playlisting', 'promotion_distribution');
  insert into public.framing_constraints (organization_id, project_id, type, text)
  values (pg_temp.id_of('org'), p_project, 'production', 'Tournage du clip limité à deux jours.');
  insert into public.framing_legal_parties (organization_id, project_id, party_key, name, roles, document_status)
  values (pg_temp.id_of('org'), p_project, 'artist:' || pg_temp.id_of('artist'), 'Mona Lys',
          array['Artiste principale'], 'to_verify');
end $$;
grant execute on function pg_temp.full_framing(uuid, date) to authenticated;

select pg_temp.full_framing(p.id, p.due_date)
  from public.projects p where p.id in (select id from ids where name in ('brief', 'plan', 'launched'));

-- The Brief as buildBriefSnapshot freezes it (lib/framing/brief-snapshot.ts,
-- schema 2): labels of lib/i18n/fr/framing-intel.ts, values in words.
create function pg_temp.brief_of(p_title text, p_due date) returns jsonb language sql as $$
  select jsonb_build_object(
    'schema', 2,
    'project', jsonb_build_object('title', p_title, 'kind', 'Single', 'artist', 'Mona Lys'),
    'sources', '[]'::jsonb,
    'summary', jsonb_build_object(
      'decisions', jsonb_build_array('Sortir à la date prévue avec le clip disponible dès le premier jour.'),
      'open', jsonb_build_array('Mona Lys : à vérifier'),
      'risks', jsonb_build_array('Production : Tournage du clip limité à deux jours.'),
      'prerequisites', '[]'::jsonb,
      'owners', jsonb_build_array('Responsable : Lina Haddad', 'Validation : Claire Morel')),
    'dimensions', jsonb_build_array(
      jsonb_build_object('dimension', 'objective', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
        jsonb_build_object('key', 'objective', 'label', 'Résultat recherché', 'source', null, 'lines', '[]'::jsonb,
          'value', 'Installer ce titre comme la sortie de référence de Mona Lys cette saison et élargir son public au-delà du rap.'),
        jsonb_build_object('key', 'success_criteria', 'label', 'Critère de réussite', 'source', null, 'lines', '[]'::jsonb,
          'value', '500 000 écoutes en 8 semaines, 3 playlists éditoriales et un passage radio national.'),
        jsonb_build_object('key', 'main_priority', 'label', 'Priorité principale', 'source', null, 'lines', '[]'::jsonb,
          'value', 'Sortir à la date prévue avec le clip disponible dès le premier jour.'),
        jsonb_build_object('key', 'needs', 'label', 'Ce qu''il faut produire', 'source', null,
          'value', 'Clip, Contenus réseaux sociaux, Playlisting',
          'lines', jsonb_build_array('Clip', 'Contenus réseaux sociaux', 'Playlisting')))),
      jsonb_build_object('dimension', 'timing', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
        jsonb_build_object('key', 'target_date', 'label', 'Date cible', 'source', null, 'lines', '[]'::jsonb,
          'value', to_char(p_due, 'DD/MM/YYYY')))),
      jsonb_build_object('dimension', 'budget', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
        jsonb_build_object('key', 'budget_envelope', 'label', 'Enveloppe', 'source', null, 'lines', '[]'::jsonb,
          'value', '15 000 €'),
        jsonb_build_object('key', 'constraints', 'label', 'Contraintes', 'source', null,
          'value', 'Production : Tournage du clip limité à deux jours.',
          'lines', jsonb_build_array('Production : Tournage du clip limité à deux jours.')))),
      jsonb_build_object('dimension', 'team', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
        jsonb_build_object('key', 'contributors', 'label', 'Intervenants', 'source', null, 'lines', '[]'::jsonb,
          'value', 'Rien à signaler'))),
      jsonb_build_object('dimension', 'start', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
        jsonb_build_object('key', 'current_state', 'label', 'État réel', 'source', null, 'lines', '[]'::jsonb,
          'value', 'Titre enregistré, mix en cours.'))),
      jsonb_build_object('dimension', 'legal', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
        jsonb_build_object('key', 'legal_parties', 'label', 'Parties impliquées', 'source', null,
          'value', 'Mona Lys · à vérifier', 'lines', jsonb_build_array('Mona Lys · à vérifier')),
        jsonb_build_object('key', 'legal_blockers', 'label', 'Blocages connus', 'source', null, 'lines', '[]'::jsonb,
          'value', 'Rien à signaler')))))
$$;
grant execute on function pg_temp.brief_of(text, date) to authenticated;

insert into ids select k || '_brief', public.create_framing_brief(p.id, pg_temp.brief_of(p.title, p.due_date))
  from unnest(array['brief', 'plan', 'launched']) k join public.projects p on p.id = pg_temp.id_of(k);
insert into ids select k || '_val', public.send_framing_brief(pg_temp.id_of(k || '_brief'), null)
  from unnest(array['brief', 'plan', 'launched']) k;
reset role;

-- Claire validates the Brief of « Ciel ouvert » and « Minuit pile » -----------
select pg_temp.act_as(pg_temp.id_of('dg'));
select public.decide_framing_brief(pg_temp.id_of(k || '_val'), true, null, null)
  from unnest(array['plan', 'launched']) k;
reset role;

-- Lina launches the plan of « Minuit pile »: every workflow opens -------------
select pg_temp.act_as(pg_temp.id_of('cp'));
select public.launch_project_plan(pg_temp.id_of('launched'), jsonb_build_array(
  jsonb_build_object('column', 'focus', 'workflow', 'strategy', 'title', 'Stratégie',
                     'why', 'Choisir les leviers de la sortie.'),
  jsonb_build_object('column', 'focus', 'workflow', 'legal', 'title', 'Juridique',
                     'why', 'Sécuriser les droits avant la sortie.'),
  jsonb_build_object('column', 'focus', 'workflow', 'master', 'title', 'Master',
                     'why', 'Le mix est en cours.'),
  jsonb_build_object('column', 'next', 'workflow', 'design', 'title', 'Conception',
                     'dependsOn', jsonb_build_array('strategy')),
  jsonb_build_object('column', 'next', 'workflow', 'production', 'title', 'Production'),
  jsonb_build_object('column', 'next', 'workflow', 'activations', 'title', 'Activations'),
  jsonb_build_object('column', 'anticipate', 'workflow', 'distribution', 'title', 'Distribution',
                     'dependsOn', jsonb_build_array('master')),
  jsonb_build_object('column', 'anticipate', 'workflow', 'review', 'title', 'Suivi & bilan')));
reset role;

commit;
