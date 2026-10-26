-- What remained of the Activations and of the person's page (20/10/2026):
-- partial and unavailable statistics (20261020040101), « Brief et
-- proposition » and the agency's recap marked sent in one gesture
-- (20261020040201), « Ce qui vous a été demandé » after a call on /c/
-- (20261020040301). Simulation only, rolled back. Run with `supabase test db`.
begin;
select plan(23);

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
create function pg_temp.v(p_k text) returns text language sql as $$
  select v from vars where k = p_k
$$;

insert into ids values
  ('manager', pg_temp.new_user('r4-manager-' || pg_temp.v('tag') || '@pds.test')),
  ('creative', pg_temp.new_user('r4-creative-' || pg_temp.v('tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'R4 ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects where title = 'R4 ' || pg_temp.v('tag');
insert into public.marketing_activations (organization_id, project_id, kind, mode, title, owner_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'influence', 'internal', 'Influence',
        pg_temp.id_of('manager_person')),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'influence', 'agency', 'Influence agence',
        pg_temp.id_of('manager_person'));
insert into ids select 'internal', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and mode = 'internal';
-- Nothing happens with a creator before the campaign is launched (20261026400101).
update public.marketing_activations
   set due_on = (now() at time zone 'Europe/Paris')::date + 20, status = 'in_progress'
 where id = pg_temp.id_of('internal');
insert into ids select 'agency', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and mode = 'agency';
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Léa ' || pg_temp.v('tag'), '{influencer}'),
       (pg_temp.id_of('org'), 'person', 'Bastien ' || pg_temp.v('tag'), '{other}');
insert into ids select 'lea', id from public.network_contacts where name = 'Léa ' || pg_temp.v('tag');
insert into ids select 'bastien', id from public.network_contacts where name = 'Bastien ' || pg_temp.v('tag');
insert into public.activation_targets (organization_id, project_id, activation_id, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('internal'), pg_temp.id_of('lea'));
insert into ids select 'target', id from public.activation_targets where activation_id = pg_temp.id_of('internal');

-- 1. Statistics: partial, unavailable ------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$insert into public.activation_metrics
    (organization_id, project_id, activation_id, metric, value, unit, source, collected_on, partial)
    values (%L, %L, %L, 'views', 48200, 'count', 'internal', current_date, true)$$,
    pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('internal')),
  'the owner records a partial reading');
select is((select availability from public.marketing_review_evidence
            where activation_id = pg_temp.id_of('internal') and kind = 'statistic'),
          'partial', 'the Suivi & bilan reads it « Partielles »');
select lives_ok(format('update public.marketing_activations set metrics_unavailable = true where id = %L',
                       pg_temp.id_of('internal')),
                'the owner says the statistics are unavailable');
reset role;
select ok((select metrics_unavailable and metrics_expected from public.marketing_activations
            where id = pg_temp.id_of('internal')),
          '« Indisponibles » is not « Non attendues »');

-- 2. Brief et proposition ---------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$select public.send_influence_brief(%L, 500, '1 vidéo', 'Sur son compte',
                   'Non demandés', 'Bonjour Léa', 'email')$$, pg_temp.id_of('target')),
                 '23514', 'concept_not_validated', 'no brief before the concept is validated');
reset role;
insert into public.activation_sheets (organization_id, project_id, activation_id, kind, target_id, version,
                                      fields, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('internal'), 'concept',
        pg_temp.id_of('target'), 1, '{"angle": {"value": "Sa nuit"}}', 'validated');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$select public.send_influence_brief(%L, 500, '1 vidéo', 'Sur son compte',
                   'Non demandés', 'Bonjour Léa', 'email')$$, pg_temp.id_of('target')),
                 'P0001', 'target_not_found', 'someone outside the project reaches nothing');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$select public.send_influence_brief(%L, 0, '', '', '', 'Bonjour Léa', 'email')$$,
                        pg_temp.id_of('target')),
                 '23514', 'invalid_input', 'a fee in euros is required');
select lives_ok(format($$select public.send_influence_brief(%L, 500, '1 vidéo TikTok, 30 s',
                   'Sur son compte TikTok', 'Spark Ads · 30 jours · inclus', 'Bonjour Léa', 'whatsapp')$$,
                   pg_temp.id_of('target')),
                'the owner marks the brief and the proposal sent');
reset role;
select is((select party || ':' || fee_amount::int || ':' || ads_usage from public.influence_proposals
            where target_id = pg_temp.id_of('target')),
          'pds:500:Spark Ads · 30 jours · inclus', 'PDS''s position is recorded');
select is((select status || ':' || channel from public.activation_messages
            where target_id = pg_temp.id_of('target') and kind = 'brief'),
          'sent_declared:whatsapp', 'the brief is declared sent, by its channel');
select ok((select validated_by = sent_declared_by and sent_declared_by = pg_temp.id_of('manager_person')
             from public.activation_messages
            where target_id = pg_temp.id_of('target') and kind = 'brief'),
          'whoever marks it sent read it: no separate review');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$select public.send_influence_brief(%L, 600, '', '', '', 'Encore', 'email')$$,
                        pg_temp.id_of('target')),
                 '23514', 'brief_already_sent', 'the second position goes through the negotiation');

-- 3. The agency's recap --------------------------------------------------------------
select throws_ok(format($$select public.send_agency_recap(%L, 'Retour', 'Bonjour Jeanne')$$,
                        pg_temp.id_of('internal')),
                 'P0001', 'invalid_transition', 'a recap is for an agency');
select lives_ok(format($$select public.send_agency_recap(%L, 'Retour', 'Bonjour Jeanne')$$,
                       pg_temp.id_of('agency')),
                'the owner marks the recap sent');
reset role;
select is((select count(*)::int from public.activation_messages
            where activation_id = pg_temp.id_of('agency') and kind = 'agency_recap'
              and status = 'sent_declared'), 1, 'one recap, declared sent');
set local role anon;
select throws_ok(format($$select public.send_agency_recap(%L, 'Retour', 'x')$$, pg_temp.id_of('agency')),
                 '42501', null, 'anon sends nothing');
reset role;

-- 4. « Ce qui vous a été demandé » after a call --------------------------------------
insert into public.strategy_deliverables (organization_id, project_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip ' || pg_temp.v('tag'));
insert into ids select 'deliverable', id from public.strategy_deliverables where title = 'Clip ' || pg_temp.v('tag');
insert into public.production_sheets (organization_id, project_id, deliverable_id, mode)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'call');
insert into ids select 'sheet', id from public.production_sheets where deliverable_id = pg_temp.id_of('deliverable');
insert into public.calls (organization_id, project_id, title, occurred_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Call de production ' || pg_temp.v('tag'),
        now() - interval '2 days');
insert into ids select 'call', id from public.calls where title = 'Call de production ' || pg_temp.v('tag');
insert into public.call_guests (organization_id, call_id, email, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('call'), 'bastien@example.com', pg_temp.id_of('bastien'));
insert into public.production_calls (organization_id, project_id, sheet_id, call_id, purpose, format)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('call'),
        'Préparer le tournage', 'video');
insert into public.production_call_items (organization_id, project_id, sheet_id, call_id, topic, kind, body,
                                          status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('call'),
        'Lieux', 'action', 'Envoyer trois lieux', 'proposed');
insert into ids select 'item', id from public.production_call_items where call_id = pg_temp.id_of('call');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('bastien'));
insert into vars select 'lea_token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('lea'));
reset role;

set local role anon;
select is(public.get_contact_call_requests(pg_temp.v('token')) -> 0 ->> 'settled', 'false',
          'before PDS confirms the suites: « PDS confirme les suites du call »');
reset role;
update public.production_call_items set status = 'confirmed' where id = pg_temp.id_of('item');
insert into public.call_summaries (organization_id, call_id, version, text, recipients)
values (pg_temp.id_of('org'), pg_temp.id_of('call'), 1, 'Résumé',
        jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('bastien'), 'name', 'Bastien')));
insert into public.production_plan_actions (organization_id, project_id, sheet_id, title, contact_id, item_id,
                                            status, due_date)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Envoyer trois lieux',
        pg_temp.id_of('bastien'), pg_temp.id_of('item'), 'approved', current_date + 3);
set local role anon;
select is(public.get_contact_call_requests(pg_temp.v('token')) -> 0 ->> 'settled', 'true',
          'once the summary is sent, the suites are settled');
select is(public.get_contact_call_requests(pg_temp.v('token')) -> 0 -> 'asked' -> 0 ->> 'title',
          'Envoyer trois lieux', 'what PDS confirmed was asked of him');
select is(public.get_contact_call_requests(pg_temp.v('token')) -> 0 -> 'asked' -> 0 ->> 'doneAt', null,
          '« À faire » until it is done');
select ok(position('Interne' in public.get_contact_call_requests(pg_temp.v('token'))::text) = 0
          and position('Résumé' in public.get_contact_call_requests(pg_temp.v('token'))::text) = 0,
          'never a summary or report text, only what was asked');
select is(public.get_contact_call_requests(pg_temp.v('lea_token')), '[]'::jsonb,
          'a person not invited sees no call');
select is(public.get_contact_call_requests(repeat('0', 64)), '[]'::jsonb, 'an unknown token reads nothing');
reset role;

select * from finish();
rollback;
