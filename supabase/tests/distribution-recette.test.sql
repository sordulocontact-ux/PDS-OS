-- Distribution, recette V1 of 23/10/2026 (docs/ARCHITECTURE.md § 8 octies,
-- « Recette V1 »): 20261026200101_distribution_dossier_guards.sql (six checks,
-- the refusal's cause, the anomalies, the direction's derogation, checks per
-- version), 20261026200201_distribution_closure_reserves.sql (an early closure
-- is the direction's, reserves followed until lifted) and
-- 20261026200301_distribution_declarations_platforms.sql (source and order of
-- the declarations, a platform verified with its proof).
-- Run with `supabase test db` (or psql on the pre-prod base: it rolls back).
begin;
select plan(47);

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
  ('manager', pg_temp.new_user('rmanager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('director', pg_temp.new_user('rdirector-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('director', 'general_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts where id = pg_temp.id_of('director');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id, due_date)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'), date '2026-12-05');
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id
  from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null;

-- The dossier of the V1: catalogue « 2026-11-14 », a design field.
insert into vars values ('snap1', '{"format": 1, "sections": [{"key": "release", "groups": [{"key": "release", "fields": [
  {"key": "credits", "label": "Crédits", "origin": "catalog", "value": "Mona Lys"},
  {"key": "preorder", "label": "Précommande", "origin": "distribution", "value": "Oui, à partir du 14/11/2026"},
  {"key": "upc", "label": "UPC", "origin": "distribution", "value": null}]}]}]}');
-- Same pre-order as the V1: the refusal's cause is still there.
insert into vars values ('snap_same', '{"format": 1, "sections": [{"key": "release", "groups": [{"key": "release", "fields": [
  {"key": "credits", "label": "Crédits", "origin": "catalog", "value": "Mona Lys"},
  {"key": "preorder", "label": "Précommande", "origin": "distribution", "value": "Oui, à partir du 14/11/2026"},
  {"key": "upc", "label": "UPC", "origin": "distribution", "value": "123456789012"}]}]}]}');
-- The pre-order moved to the 21/11.
insert into vars values ('snap2', '{"format": 1, "sections": [{"key": "release", "groups": [{"key": "release", "fields": [
  {"key": "credits", "label": "Crédits", "origin": "catalog", "value": "Mona Lys"},
  {"key": "preorder", "label": "Précommande", "origin": "distribution", "value": "Oui, à partir du 21/11/2026"}]}]}]}');
-- The Catalogue corrected after The Orchard's request.
insert into vars values ('snap3', '{"format": 1, "sections": [{"key": "release", "groups": [{"key": "release", "fields": [
  {"key": "credits", "label": "Crédits", "origin": "catalog", "value": "Mona Lys, Sami Kader"},
  {"key": "preorder", "label": "Précommande", "origin": "distribution", "value": "Oui, à partir du 21/11/2026"}]}]}]}');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.distribution_dossiers (organization_id, project_id, preorder, preorder_on, prelisten, price_tier)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), true, date '2026-11-14', false, 'front');
select public.confirm_distribution_params(pg_temp.id_of('project'), pg_temp.id_of('director_person'), null, null);

-- 1. Case A: never submitted nor validated at 0/6 ----------------------------
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap1')::jsonb) $$,
                 'P0001', 'checks_unrecorded', 'case A: a dossier at 0/6 is not submitted');
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['audio', 'identity', 'identifiers', 'rights', 'visual']) k;
select public.record_distribution_check(pg_temp.id_of('project'), 'calendar', 'not_applicable', null);
select is((select min(version_number) || '-' || max(version_number) from public.distribution_checks
            where project_id = pg_temp.id_of('project')),
          '1-1', 'each check says it is about the V1 being prepared');
select is(public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap1')::jsonb),
          1, 'six checks recorded (« non applicable » counts): the V1 is submitted');
insert into ids select 'v1', id from public.distribution_versions where project_id = pg_temp.id_of('project') and number = 1;
-- A check put back to « non vérifié » while the V1 waits.
select public.record_distribution_check(pg_temp.id_of('project'), 'audio', 'unchecked', null);
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), true, null) $$,
                 'P0001', 'checks_unrecorded', 'the validator cannot approve a version whose checks are not all recorded');

-- 2. Case B: the refusal names its cause, which must change ------------------
select throws_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), false, 'Précommande au 21/11') $$,
                 'P0001', 'modules_required', 'a refusal says what is to correct');
select throws_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), false, 'x', array['the_orchard']) $$,
                 '22023', null, 'among the modules that own a correction');
select lives_ok($$ select public.decide_distribution_version(pg_temp.id_of('v1'), false, 'Précommande au 21/11',
                     array['distribution']) $$, 'the validator refuses the V1: the parameters, pre-order to the 21/11');
select is((select array_agg(check_key order by check_key)::text from public.distribution_checks
            where project_id = pg_temp.id_of('project') and result = 'unchecked'),
          '{audio,calendar,rights}', 'only the checks of the parameters (and the one put back) are to redo');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['audio', 'rights', 'calendar']) k;
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap_same')::jsonb) $$,
                 'P0001', 'refusal_unresolved', 'case B: the pre-order still on the 14/11, the V2 is refused (a UPC that arrived does not count)');

-- 3. A derogation: the direction only, with its scope, risk, reason, deadline -
select throws_ok($$ select public.grant_distribution_derogation(pg_temp.id_of('project'), array['refusal'],
                      'Risque', 'Motif', current_date + 7) $$,
                 '42501', null, 'the owner does not derogate');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.grant_distribution_derogation(pg_temp.id_of('project'), array[]::text[],
                      'Risque', 'Motif', current_date + 7) $$,
                 'P0001', 'scope_required', 'a derogation says what it lets through');
select throws_ok($$ select public.grant_distribution_derogation(pg_temp.id_of('project'), array['refusal'],
                      ' ', 'Motif', current_date + 7) $$,
                 'P0001', 'reason_required', 'its risk and its reason');
select throws_ok($$ select public.grant_distribution_derogation(pg_temp.id_of('project'), array['refusal'],
                      'Risque', 'Motif', current_date - 1) $$,
                 'P0001', 'due_invalid', 'and a deadline to come');
select lives_ok($$ select public.grant_distribution_derogation(pg_temp.id_of('project'), array['checks'],
                     'La précommande ouvre une semaine plus tôt', 'Le distributeur ferme son planning', current_date + 7) $$,
                'the direction grants a derogation on the checks');
reset role;
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('project') and kind = 'distribution_derogation_granted'
              and recipient_person_id = pg_temp.id_of('manager_person')),
          1, 'the owner is told');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap_same')::jsonb) $$,
                 'P0001', 'refusal_unresolved', 'a derogation on the checks does not cover the refusal');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.grant_distribution_derogation(pg_temp.id_of('project'), array['refusal'],
                     'La précommande ouvre une semaine plus tôt', 'Le distributeur ferme son planning', current_date + 7) $$,
                'a new derogation replaces the one not used');
select is((select count(*)::int from public.distribution_derogations
            where project_id = pg_temp.id_of('project') and revoked_at is not null),
          1, 'the previous one is kept, revoked');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is(public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap_same')::jsonb),
          2, 'with the derogation, the V2 goes through');
select ok((select v.derogation_id = d.id and d.version_number = 2
             from public.distribution_versions v join public.distribution_derogations d on d.id = v.derogation_id
            where v.project_id = pg_temp.id_of('project') and v.number = 2),
          'the version carries the derogation the validator reads');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_distribution_version(
                     (select id from public.distribution_versions where project_id = pg_temp.id_of('project') and number = 2),
                     false, 'Finalement non', array['distribution']) $$, 'the validator still refuses the V2');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['rights', 'calendar']) k;
select is(public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap2')::jsonb),
          3, 'the pre-order moved to the 21/11: the V3 is submitted');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_distribution_version(
                     (select id from public.distribution_versions where project_id = pg_temp.id_of('project') and number = 3),
                     true, null) $$, 'the V3 is validated');

-- 4. Declarations: their source and their order (DIST-004) -------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit', current_date - 30) $$,
                 'P0001', 'date_order', 'a deposit is not dated before the validation');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit', null, null, null, null, null, null, 'fax') $$,
                 '23514', null, 'a known source');
select lives_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'deposit', null, 'ORCH-1', null, null, null, null, 'orchard_portal') $$,
                'the deposit, seen on The Orchard''s portal');
select is((select source from public.distribution_declarations where project_id = pg_temp.id_of('project') and kind = 'deposit'),
          'orchard_portal', 'its source is kept');
select throws_ok($$ select public.declare_distribution(pg_temp.id_of('project'), 'received', current_date - 1) $$,
                 'P0001', 'date_order', 'a reception is not dated before the deposit');

-- 5. Case C: The Orchard's correction, linked to its source ------------------
select lives_ok($$ select public.declare_distribution_corrections(pg_temp.id_of('project'),
                     'Le compositeur sous son nom civil', 'credit_isrc', 'catalog', 'major') $$,
                'The Orchard asks for a correction in the Catalogue');
select is((select array_agg(check_key order by check_key)::text from public.distribution_checks
            where project_id = pg_temp.id_of('project') and result = 'unchecked'),
          '{identifiers,identity}', 'only the checks of the Catalogue are to redo');
select public.record_distribution_check(pg_temp.id_of('project'), k, 'compliant', null)
  from unnest(array['identity', 'identifiers']) k;
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap2')::jsonb) $$,
                 'P0001', 'anomalies_unresolved', 'case C: nothing changed in the Catalogue, the V4 is refused');
select is(public.submit_distribution_version(pg_temp.id_of('project'), (select v from vars where k = 'snap3')::jsonb),
          4, 'the Catalogue corrected: the V4 is submitted');
select is((select state from public.distribution_anomalies
            where project_id = pg_temp.id_of('project') and kind = 'credit_isrc'),
          'in_correction', 'the anomaly is being corrected by this version');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_distribution_version(
  (select id from public.distribution_versions where project_id = pg_temp.id_of('project') and number = 4), true, null);
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.declare_distribution(pg_temp.id_of('project'), 'deposit');

-- 6. An early closure is the direction's (DIST-003) --------------------------
insert into vars values ('reserve', '[{"cause":"distributor","label":"The Orchard n''a pas répondu","details":["Réception","Acceptation"],"criticality":"critical","ownerPersonId":"'
  || pg_temp.id_of('manager_person') || '","dueOn":"' || (current_date + 1) || '","expectedProof":"E-mail d''acceptation"}]');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                      (select v from vars where k = 'reserve')::jsonb, 'On ferme') $$,
                 'P0001', 'not_accepted', 'before the acceptance, no closure with reserves');
select throws_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'cancelled', null, 'Sortie annulée') $$,
                 'P0001', 'reason_kind_required', 'a cancellation says its kind of reason');
select lives_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'cancelled', null,
                     'L''artiste retire le titre', 'artist_withdrawal') $$, 'the owner proposes to cancel');
insert into ids select 'cancel', id from public.distribution_closures where project_id = pg_temp.id_of('project');
select throws_ok($$ select public.decide_distribution_closure(pg_temp.id_of('cancel'), true, null) $$,
                 '42501', 'not_direction', 'only the direction decides a cancellation');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_distribution_closure(pg_temp.id_of('cancel'), false, 'On continue') $$,
                'the direction refuses it');

-- After the acceptance, a closure with reserves, then its reserve lifted.
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.declare_distribution(pg_temp.id_of('project'), k, null, null, null, null, null, null, 'orchard_email')
  from unnest(array['received', 'accepted']) k;
select lives_ok($$ select public.propose_distribution_closure(pg_temp.id_of('project'), 'reserves',
                     (select v from vars where k = 'reserve')::jsonb, 'Livraison non confirmée') $$,
                'accepted: the owner proposes a closure with reserves');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_distribution_closure(
  (select id from public.distribution_closures where project_id = pg_temp.id_of('project') and status = 'pending'), true, null);
insert into ids select 'reserve', id from public.distribution_reserves where project_id = pg_temp.id_of('project');

-- 7. A reserve lives until lifted with a proof and another person (DIST-007) -
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.request_distribution_reserve_lift(pg_temp.id_of('reserve'), 'Reçu', null, null, null) $$,
                 'P0001', 'proof_required', 'lifting a reserve needs its proof');
select lives_ok($$ select public.request_distribution_reserve_lift(pg_temp.id_of('reserve'), 'E-mail reçu', null, null,
                     'https://mail.example.com/orchard-ok') $$, 'its owner asks to lift it, with the proof');
select throws_ok($$ select public.decide_distribution_reserve_lift(pg_temp.id_of('reserve'), true, null) $$,
                 'P0001', 'same_person', 'never checked by the one who asked');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_distribution_reserve_lift(pg_temp.id_of('reserve'), true, null) $$,
                'another person confirms: the reserve is lifted');
select is((select (status, lifted_by = pg_temp.id_of('director_person'))::text
             from public.distribution_reserves where id = pg_temp.id_of('reserve')),
          '(lifted,t)', 'lifted, by whom');

-- 8. A reserve past its deadline is flagged and told ---------------------------
reset role;
update public.distribution_reserves set status = 'open', lifted_by = null, lifted_at = null,
  lift_requested_by = null, lift_requested_at = null, lift_proof_url = null, lift_note = null,
  due_on = current_date - 2
 where id = pg_temp.id_of('reserve');
select is(public.flag_overdue_distribution_reserves(), 1, 'the daily job flags the reserve past its deadline');
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('project') and kind = 'distribution_reserve_overdue'),
          2, 'its owner and the closure''s decider are told');
select is(public.flag_overdue_distribution_reserves(), 0, 'once');

select * from finish();
rollback;
