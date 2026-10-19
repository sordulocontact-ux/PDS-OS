-- Marketing › Activations : the core, Influence, agency mode and RP
-- (supabase/migrations/20261011000101 to 20261011000501, statuses
-- 20261011300101, journey 20261019060101). Fixture « Piégée /
-- Dioo / Alka » and ATYR figures : simulation only, rolled back. Nothing
-- real is contacted, published, verified or paid.
-- Run with `supabase test db`.
begin;
select plan(65);

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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;

insert into ids values
  ('manager', pg_temp.new_user('act-manager-' || pg_temp.tag() || '@pds.test')),
  ('creative', pg_temp.new_user('act-creative-' || pg_temp.tag() || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || pg_temp.tag(), 'content', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects where title = 'Piégée ' || pg_temp.tag();
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles) values
  (pg_temp.id_of('org'), 'person', 'Alka ' || pg_temp.tag(), array['influencer']),
  (pg_temp.id_of('org'), 'organization', 'Média musical A ' || pg_temp.tag(), array['media']);
insert into ids select 'alka', id from public.network_contacts where name = 'Alka ' || pg_temp.tag();
insert into ids select 'media', id from public.network_contacts where name = 'Média musical A ' || pg_temp.tag();

-- 1. Activations : who creates, what is required -------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ insert into public.marketing_activations (organization_id, project_id, kind, title)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'content', 'Capsule') $$,
                 '42501', null, 'only the project''s owner creates an activation');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ insert into public.marketing_activations (organization_id, project_id, kind, title)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'influence', 'Sans mode') $$,
                 '23514', null, 'Influence and RP need their mode (in house or agency)');
insert into public.marketing_activations (organization_id, project_id, kind, mode, title)
select pg_temp.id_of('org'), pg_temp.id_of('project'), k, m, t
  from (values ('event', null, 'Session acoustique'), ('content', null, 'Capsule 1'), ('content', null, 'Capsule 2'),
               ('content', null, 'Capsule 3'), ('content', null, 'Capsule 4'), ('content', null, 'Capsule 5'),
               ('influence', 'agency', 'Campagne ATYR'), ('press', 'agency', 'RP agence')) as v (k, m, t);
select is((select count(*)::int from public.marketing_activations where project_id = pg_temp.id_of('project')),
          8, 'the eight activations of the fixture, each with its own kind');
insert into ids select 'session', id from public.marketing_activations where project_id = pg_temp.id_of('project') and title = 'Session acoustique';
insert into ids select 'atyr', id from public.marketing_activations where project_id = pg_temp.id_of('project') and title = 'Campagne ATYR';
insert into ids select 'rp', id from public.marketing_activations where project_id = pg_temp.id_of('project') and title = 'RP agence';
insert into public.marketing_activations (organization_id, project_id, kind, mode, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'influence', 'internal', 'Influence interne'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'press', 'internal', 'RP interne');
insert into ids select 'influence', id from public.marketing_activations where project_id = pg_temp.id_of('project') and title = 'Influence interne';
insert into ids select 'press', id from public.marketing_activations where project_id = pg_temp.id_of('project') and title = 'RP interne';

select throws_ok($$ update public.marketing_activations set status = 'cancelled' where id = pg_temp.id_of('session') $$,
                 '23514', null, 'cancelling says why');
-- « Prête » is computed : starting (En cours, Réalisée déclarée) needs an owner,
-- a due date, no open blocker, no blocking dependency left open.
-- « Suspendue » is back (20261019060101): it keeps the status it interrupts.
update public.marketing_activations set status = 'suspended', status_reason = 'On attend la salle (simulation)'
 where id = pg_temp.id_of('session');
select is((select status_before_suspension from public.marketing_activations where id = pg_temp.id_of('session')),
          'to_prepare', 'a suspension keeps the status it interrupts');
select throws_ok($$ update public.marketing_activations set status = 'in_progress', status_reason = null
                    where id = pg_temp.id_of('session') $$,
                 '23514', 'invalid_transition', '« Reprendre » returns where it was, nowhere else');
update public.marketing_activations set status = 'to_prepare' where id = pg_temp.id_of('session');
select is((select row(status, status_reason, status_before_suspension)::text from public.marketing_activations
            where id = pg_temp.id_of('session')),
          '(to_prepare,,)', '« Reprendre » clears the reason and the kept status');
select throws_ok($$ update public.marketing_activations set status = 'in_progress' where id = pg_temp.id_of('session') $$,
                 '23514', 'activation_not_ready:owner,due', 'no start without an owner nor a due date');
update public.marketing_activations
   set owner_person_id = pg_temp.id_of('manager_person'), due_on = date '2026-10-15'
 where id = pg_temp.id_of('session');
insert into public.activation_blockers (organization_id, project_id, activation_id, category, description)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'production',
        'Montage en retard (simulation)');
select throws_ok($$ update public.marketing_activations set status = 'done_declared' where id = pg_temp.id_of('session') $$,
                 '23514', 'activation_not_ready:blocker', 'an open blocker stops the start');
update public.activation_blockers set status = 'resolved', resolution_note = 'Montage livré (simulation)'
 where activation_id = pg_temp.id_of('session');
insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Valider le montage (simulation)',
        pg_temp.id_of('manager_person'), date '2026-10-14');
insert into ids select 'montage', id from public.tasks
 where project_id = pg_temp.id_of('project') and title = 'Valider le montage (simulation)';
insert into public.activation_dependencies (organization_id, project_id, activation_id, kind, task_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'task', pg_temp.id_of('montage'));
select throws_ok($$ update public.marketing_activations set status = 'done_declared' where id = pg_temp.id_of('session') $$,
                 '23514', 'activation_not_ready:dependency', 'a blocking dependency left open stops the start');
update public.tasks set status = 'done', done_at = now() where id = pg_temp.id_of('montage');
update public.marketing_activations set status = 'done_declared' where id = pg_temp.id_of('session');
select ok(exists (select 1 from public.activation_events where activation_id = pg_temp.id_of('session')
                   and kind = 'activation.status' and actor = pg_temp.id_of('manager_person')),
          'a status change is journaled with its author');
select throws_ok($$ insert into public.activation_events (organization_id, project_id, activation_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'activation.status') $$,
                 '42501', null, 'the journal is written by the database only');

-- 2. Declared ≠ verified ---------------------------------------------------------------
select throws_ok($$ insert into public.activation_evidence (organization_id, project_id, activation_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'publication') $$,
                 '23514', null, 'a proof names a link, a file or its source');
insert into public.activation_evidence (organization_id, project_id, activation_id, kind, url, declared_source)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'publication',
        'https://video.example.com/session', 'internal');
insert into ids select 'proof', id from public.activation_evidence where activation_id = pg_temp.id_of('session');
select is((select count(*)::int from public.activation_evidence_checks where evidence_id = pg_temp.id_of('proof')),
          0, 'a session declared published stays unverified : no check is made by itself');
insert into public.activation_evidence (organization_id, project_id, activation_id, kind, declaration_note, declared_source)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'coverage',
        'Le média dit avoir publié', 'media');
insert into ids select 'note_only', id from public.activation_evidence
 where activation_id = pg_temp.id_of('session') and url is null;

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ insert into public.activation_evidence_checks (organization_id, project_id, evidence_id, result, method)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('note_only'), 'verified', 'link_opened') $$,
                 '23514', 'verification_needs_method', 'without link nor file, verified only by a documented other method');
select lives_ok($$ insert into public.activation_evidence_checks (organization_id, project_id, evidence_id, result, method)
                   values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('proof'), 'unavailable', 'link_opened') $$,
                'a PDS validator checks a proof : the link is unavailable');
select is((select checked_by from public.activation_evidence_checks where evidence_id = pg_temp.id_of('proof')),
          pg_temp.id_of('creative_person'), 'who checked is written by the database');
select is((select count(*)::int from public.activation_evidence where id = pg_temp.id_of('proof')),
          1, 'a failed check never erases the declaration');

select pg_temp.act_as(pg_temp.id_of('manager'));
update public.activation_evidence set withdrawn_reason = 'Lien supprimé par le créateur' where id = pg_temp.id_of('proof');
select throws_ok($$ insert into public.activation_evidence_checks (organization_id, project_id, evidence_id, result, method)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('proof'), 'verified', 'link_opened') $$,
                 '23514', 'evidence_withdrawn', 'a withdrawn proof stays in history, no longer checked');

-- 3. Statistics : declared, never summed by the database, invalidated not erased --------
select throws_ok($$ insert into public.activation_metrics (organization_id, project_id, activation_id, metric, value, source, collected_on, verification)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'views', 10, 'internal', current_date, 'verified') $$,
                 '42501', null, 'a snapshot cannot be recorded as verified');
insert into public.activation_metrics (organization_id, project_id, activation_id, metric, value, source, collected_on)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('session'), 'views', 1200, 'internal', current_date);
insert into ids select 'metric', id from public.activation_metrics where activation_id = pg_temp.id_of('session');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ update public.activation_metrics set invalidation_reason = 'Erreur' where id = pg_temp.id_of('metric') $$,
                 '42501', null, 'a validator verifies but does not invalidate');
update public.activation_metrics set verification = 'verified' where id = pg_temp.id_of('metric');
select is((select verification from public.activation_metrics where id = pg_temp.id_of('metric')),
          'verified', 'verifying a snapshot is a separate act');

-- 4. Next action and task, closure ----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.create_activation_task(pg_temp.id_of('session'), 'rule:evidence_missing',
                     'Fournir la preuve', pg_temp.id_of('manager_person'), current_date + 3) $$,
                'a task is created only when asked, with whom and when');
select is((select activation_id from public.tasks where title = 'Fournir la preuve' and project_id = pg_temp.id_of('project')),
          pg_temp.id_of('session'), 'the task leads back to its activation');
select throws_ok($$ select public.close_activation(pg_temp.id_of('session'), 'definitive',
                     '[{"key":"proof_missing","label":"Preuve attendue et absente"}]'::jsonb, '') $$,
                 '23514', 'reason_required', 'a definitive closure despite reserves needs a reason');
select throws_ok($$ update public.marketing_activations set closure_kind = 'definitive', status = 'closed'
                    where id = pg_temp.id_of('session') $$,
                 '42501', null, 'the closure columns are not granted : closing goes through close_activation');
select lives_ok($$ select public.close_activation(pg_temp.id_of('session'), 'with_reserves',
                    '[{"key":"proof_missing","label":"Preuve attendue et absente"}]'::jsonb, '') $$,
                'closed with reserves, kept as shown');
select throws_ok($$ select public.reopen_activation(pg_temp.id_of('session'), '') $$,
                 '23514', 'reason_required', 'reopening says why');

-- 5. Sheets : versioned, validated by a PDS validator ---------------------------------------
insert into ids select 'framing', public.save_activation_sheet(pg_temp.id_of('influence'), 'framing', null,
  '{"objective":{"value":"Faire découvrir Dioo","source":"strategy"}}'::jsonb);
select public.decide_activation_sheet(pg_temp.id_of('framing'), 'submit', null);
select throws_ok($$ select public.decide_activation_sheet(pg_temp.id_of('framing'), 'validate', null) $$,
                 '42501', null, 'the owner does not validate their own framing (validator : director or creative)');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_activation_sheet(pg_temp.id_of('framing'), 'request_changes', '') $$,
                 '23514', 'comment_required', 'asking for changes says which');
select public.decide_activation_sheet(pg_temp.id_of('framing'), 'validate', null);
select pg_temp.act_as(pg_temp.id_of('manager'));
select isnt(public.save_activation_sheet(pg_temp.id_of('influence'), 'framing', null,
              '{"objective":{"value":"Faire découvrir Dioo et Piégée","source":"manual"}}'::jsonb),
            pg_temp.id_of('framing'), 'a change after validation opens a new version');

-- 6. Influence in house : one collaboration, negotiation, express agreement ---------------
insert into public.activation_targets (organization_id, project_id, activation_id, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), pg_temp.id_of('alka'));
insert into ids select 'collab', id from public.activation_targets where activation_id = pg_temp.id_of('influence');
select throws_ok($$ insert into public.activation_targets (organization_id, project_id, activation_id, contact_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), pg_temp.id_of('alka')) $$,
                 '23505', null, 'one collaboration per campaign and influencer');
insert into public.influence_proposals (organization_id, project_id, activation_id, target_id, party, fee_amount, deliverables)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), pg_temp.id_of('collab'),
        'pds', 800, '1 TikTok');
insert into ids select 'proposal', id from public.influence_proposals where target_id = pg_temp.id_of('collab');
select throws_ok($$ select public.prepare_influence_agreement(pg_temp.id_of('proposal')) $$,
                 'P0001', 'terms_not_accepted', 'no agreement link before the terms are validated');
select public.accept_influence_terms(pg_temp.id_of('proposal'));
insert into public.influence_rights (organization_id, project_id, activation_id, target_id, kind, platforms)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), pg_temp.id_of('collab'),
        'organic', array['TikTok']);
insert into vars select 'token', public.prepare_influence_agreement(pg_temp.id_of('proposal'));
select throws_ok($$ select public.advance_influence_payment(
                      (select id from public.influence_payments limit 0), 'ready_to_pay', null, null) $$,
                 'P0001', 'payment_not_found', 'no payment to move yet');
insert into public.influence_payments (organization_id, project_id, activation_id, target_id, amount)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), pg_temp.id_of('collab'), 800);
insert into ids select 'payment', id from public.influence_payments where target_id = pg_temp.id_of('collab');
select throws_ok($$ select public.advance_influence_payment(pg_temp.id_of('payment'), 'ready_to_pay', null, null) $$,
                 'P0001', 'agreement_required', '« Bon à payer » needs the creator''s agreement');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.influence_proposals where target_id = pg_temp.id_of('collab')),
          0, 'amounts are read by the budget readers only');

reset role;
set local role anon;
select is((public.get_influence_agreement((select v from vars where k = 'token')) ->> 'state'),
          'open', 'the creator opens the exact version without account');
select throws_ok($$ select public.respond_influence_agreement((select v from vars where k = 'token'), 'accept', 'Alka', null,
                     (select content_hash from public.influence_agreements limit 1), false) $$,
                 null, null, 'anon reads no agreement row');
reset role;
select throws_ok(format($$ select public.respond_influence_agreement(%L, 'accept', 'Alka', null, %L, false) $$,
                        (select v from vars where k = 'token'),
                        (select content_hash from public.influence_agreements where target_id = pg_temp.id_of('collab') and status = 'pending')),
                 'P0001', 'agreement_identity_required', '« Bon pour accord » needs the name and the consent');
select is(public.respond_influence_agreement((select v from vars where k = 'token'), 'accept', 'Alka', null,
            (select content_hash from public.influence_agreements where target_id = pg_temp.id_of('collab') and status = 'pending'), true),
          'accepted', '« Bon pour accord » recorded with its trace');
select is((select status from public.influence_rights where target_id = pg_temp.id_of('collab') and kind = 'organic'),
          'accepted', 'the organic rights shown are accepted with it — never the advertising ones');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.advance_influence_payment(pg_temp.id_of('payment'), 'paid_verified', null, null) $$,
                 'P0001', 'proof_required', '« Payé vérifié » needs a payment proof ; nothing is ever transferred');

-- 7. Agency : read only source, preview, PDS decisions that survive ------------------------
select throws_ok($$ insert into public.agency_sources (organization_id, project_id, activation_id, label, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), 'Tableau', 'manual') $$,
                 '23514', 'activation_not_agency', 'an in-house campaign has no agency source');
insert into public.agency_sources (organization_id, project_id, activation_id, label, kind, mapping, key_fields)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('atyr'), 'ATYR', 'manual',
        '{"handle":"@"}'::jsonb, array['handle']);
insert into ids select 'source', id from public.agency_sources where activation_id = pg_temp.id_of('atyr');
insert into ids select 'snap1', public.record_agency_preview(pg_temp.id_of('source'), null, array['@', 'Vues', 'Statut'],
  '[{"key":"djuno","position":2,"raw":{"@":"djuno"},"mapped":{"handle":"djuno","views":628200,"agency_status":"1 - Proposé"},"errors":[]},
    {"key":"danilo","position":3,"raw":{"@":"danilo"},"mapped":{"handle":"danilo","views":678600,"agency_status":"Proposé"},"errors":[]},
    {"key":"og","position":4,"raw":{"@":"og"},"mapped":{"handle":"og","views":2432306,"agency_status":"Publié"},"errors":["Planning : #REF!"]}]'::jsonb,
  '[]'::jsonb);
select is((select count(*)::int from public.agency_snapshot_rows where snapshot_id = pg_temp.id_of('snap1') and change = 'added'),
          3, 'three profiles read, shown as additions before anything is applied');
select is((select count(*)::int from public.agency_rows where source_id = pg_temp.id_of('source')),
          0, 'nothing is applied before confirmation');
select is(public.apply_agency_snapshot(pg_temp.id_of('snap1'), null), 'applied', 'the person confirms the read');
update public.agency_rows set pds_decision = 'validated', pds_note = 'Note interne'
 where source_id = pg_temp.id_of('source') and row_key = 'danilo';
select throws_ok($$ update public.agency_rows set agency_status = 'Validé' where row_key = 'og' and source_id = pg_temp.id_of('source') $$,
                 '42501', null, 'the agency''s values are never edited in PDS OS');
insert into ids select 'snap2', public.record_agency_preview(pg_temp.id_of('source'), null, array['@', 'Vues', 'Statut'],
  '[{"key":"danilo","position":2,"raw":{"@":"danilo","Statut":"Publié"},"mapped":{"handle":"danilo","views":678600,"agency_status":"Publié"},"errors":[]},
    {"key":"og","position":3,"raw":{"@":"og"},"mapped":{"handle":"og","views":2432306,"agency_status":"Publié"},"errors":["Planning : #REF!"]}]'::jsonb,
  '[]'::jsonb);
select is((select string_agg(row_key || ':' || change, ',' order by row_key) from public.agency_snapshot_rows
            where snapshot_id = pg_temp.id_of('snap2')),
          'danilo:modified,djuno:absent,og:unchanged', 'a refresh shows modified, absent and unchanged rows');
select public.apply_agency_snapshot(pg_temp.id_of('snap2'), null);
select is((select pds_decision || '/' || pds_note from public.agency_rows where row_key = 'danilo' and source_id = pg_temp.id_of('source')),
          'validated/Note interne', 'a refresh never replaces a PDS decision nor its note');
select isnt((select absent_since from public.agency_rows where row_key = 'djuno' and source_id = pg_temp.id_of('source')),
            null, 'a row absent from the last source is marked, never deleted');

insert into public.activation_metrics (organization_id, project_id, activation_id, agency_row_id, metric, value, source, collected_on)
select pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('atyr'), r.id, 'views', (r.current ->> 'views')::numeric,
       'agency', current_date
  from public.agency_rows r where r.source_id = pg_temp.id_of('source');
select is((select sum(value)::bigint from public.activation_metrics where activation_id = pg_temp.id_of('atyr') and metric = 'views'),
          3739106::bigint, 'ATYR : 628 200 + 678 600 + 2 432 306 = 3 739 106 views');
select is((select count(*)::int from public.activation_metrics where activation_id = pg_temp.id_of('atyr') and verification = 'verified'),
          0, '… declared by the agency, never verified');

insert into public.agency_reports (organization_id, project_id, activation_id, body, received_on)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('atyr'), 'Bilan ATYR', current_date);
insert into ids select 'report', id from public.agency_reports where activation_id = pg_temp.id_of('atyr');
select throws_ok($$ select public.decide_agency_report(pg_temp.id_of('report'), 'validated', null,
                     '[{"key":"unproven","label":"Actions déclarées sans preuve"}]'::jsonb) $$,
                 '23514', 'reason_required', 'a definitive validation despite reserves needs a reason');
select lives_ok($$ select public.decide_agency_report(pg_temp.id_of('report'), 'provisional', null,
                    '[{"key":"unproven","label":"Actions déclarées sans preuve"}]'::jsonb) $$,
                'validated provisionally with reserves, without free comment');

-- 8. RP : opportunities, follow-ups ---------------------------------------------------------
insert into public.activation_targets (organization_id, project_id, activation_id, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'), pg_temp.id_of('media'));
insert into ids select 'target', id from public.activation_targets where activation_id = pg_temp.id_of('press');
select throws_ok($$ insert into public.press_opportunities (organization_id, project_id, activation_id, target_id, type, status, confirmed_by_name, confirmation_channel)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'), pg_temp.id_of('target'), 'interview', 'confirmed', 'Journaliste', 'email') $$,
                 '23514', null, 'an interview proposed without date is not a confirmed slot');
update public.activation_targets set outcome = 'declined', outcome_reason = 'Pas le bon moment' where id = pg_temp.id_of('target');
select throws_ok($$ insert into public.activation_messages (organization_id, project_id, activation_id, target_id, kind, body)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'), pg_temp.id_of('target'), 'follow_up', 'Relance') $$,
                 '23514', 'follow_up_blocked', 'no follow-up after a decline without a written exemption');
insert into public.activation_messages (organization_id, project_id, activation_id, target_id, kind, body)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'), null, 'pitch', 'Modèle commun');
insert into ids select 'pitch', id from public.activation_messages where activation_id = pg_temp.id_of('press') and kind = 'pitch';
select throws_ok($$ update public.activation_messages set status = 'sent_declared' where id = pg_temp.id_of('pitch') $$,
                 '42501', null, 'a message is never marked sent by an update');
select throws_ok($$ select public.advance_activation_message(pg_temp.id_of('pitch'), 'declare_sent', null, current_date, null) $$,
                 'P0001', 'invalid_transition', 'validated before sent, never sent from a draft');

-- 9. The journey (20261019060101): « Réalisée » needs the campaign begun --------------------
update public.marketing_activations
   set owner_person_id = pg_temp.id_of('manager_person'), due_on = date '2026-12-12'
 where id in (pg_temp.id_of('influence'), pg_temp.id_of('press'));
update public.marketing_activations set status = 'in_progress'
 where id in (pg_temp.id_of('influence'), pg_temp.id_of('press'));
select throws_ok($$ update public.marketing_activations set status = 'done_declared' where id = pg_temp.id_of('influence') $$,
                 '23514', 'activation_not_done:no_publication', 'no creator has published: the campaign is not done');
select throws_ok($$ update public.marketing_activations set status = 'done_declared' where id = pg_temp.id_of('press') $$,
                 '23514', 'activation_not_done:no_message', 'no message has left for the media: the campaign is not done');
insert into public.activation_evidence (organization_id, project_id, activation_id, target_id, kind, url, declared_source)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('influence'), pg_temp.id_of('collab'),
        'publication', 'https://video.example.com/alka', 'creator');
select lives_ok($$ update public.marketing_activations set status = 'done_declared' where id = pg_temp.id_of('influence') $$,
                'a first publication: the campaign may be declared done');
update public.marketing_activations set status = 'suspended', status_reason = 'Campagne en pause (simulation)'
 where id = pg_temp.id_of('press');
select lives_ok($$ update public.marketing_activations set status = 'in_progress' where id = pg_temp.id_of('press') $$,
                '« Reprendre » after a suspension, back to « En cours »');
select throws_ok($$ select public.declare_activation_transmission(pg_temp.id_of('influence')) $$,
                 '23514', 'activation_not_agency', 'only an agency receives the dossier');
select throws_ok($$ select public.declare_activation_transmission(pg_temp.id_of('rp')) $$,
                 '23514', 'framing_not_validated', 'the framing is validated before it is sent to the agency');
update public.marketing_activations set owner_person_id = pg_temp.id_of('creative_person')
 where id = pg_temp.id_of('atyr');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'activation_owner_assigned' and subject_id = pg_temp.id_of('atyr')
              and recipient_person_id = pg_temp.id_of('creative_person')),
          1, 'the person given an activation is told');

select * from finish();
rollback;
