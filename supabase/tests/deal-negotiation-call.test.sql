-- Business, réunion avec Ibé du 18/11/2026 (…20261120140101): the call of
-- negotiation. The project's owner plans a music deal's call on the
-- negotiator's free slots without writing the deal; the call stays the
-- deal's (recorded by its negotiator); a participation without a deal gets
-- one; the board reads where a participation's deal stands; the project's
-- owner is told when the accord is validated.
-- Run with `supabase test db`.
begin;
select plan(43);

-- Fixtures (as deal-calls.test.sql) ------------------------------------------
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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('other_pm'), ('glen'), ('thibault'), ('creative')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other_pm', 'project_manager'), ('glen', 'business_manager'),
               ('thibault', 'business'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other_pm', 'glen', 'thibault', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
-- A slot tomorrow-ish, far from any other test's calls.
create function pg_temp.at(p_hours integer) returns timestamptz language sql as $$
  select date_trunc('hour', now()) + make_interval(days => 30, hours => p_hours) $$;
grant execute on function pg_temp.at(integer) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective, launched and run by « owner », with two participations.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'a_c1', public.transmit_project(pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('nadia'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('lou'));
insert into ids select 'p1', id from public.title_participations
 where project_id = pg_temp.id_of('c1') and artist_id = pg_temp.id_of('nadia');
insert into ids select 'p2', id from public.title_participations
 where project_id = pg_temp.id_of('c1') and artist_id = pg_temp.id_of('lou');
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;

-- The negotiator's free slots ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok((select count(*) from public.negotiator_free_slots(pg_temp.id_of('glen_person'))) > 0,
  'the project''s owner reads the free slots of a negotiator');
select is((select count(*)::int from public.negotiator_free_slots(pg_temp.id_of('glen_person'))
            where starts_at < now() + interval '1 hour'
               or extract(isodow from starts_at at time zone 'Europe/Paris') > 5),
  0, 'only slots to come, on working days');
insert into vars select 'slot', min(starts_at)::text
  from public.negotiator_free_slots(pg_temp.id_of('glen_person'));
select ok((select count(*) from public.negotiator_free_slots(pg_temp.id_of('glen_person'),
             (current_date + interval '4 years')::date, (current_date + interval '4 years 1 month')::date)) > 0,
  'any month up to five years ahead has its free slots');
select is((select count(*)::int from public.negotiator_free_slots(pg_temp.id_of('glen_person'),
             (current_date + interval '6 years')::date, (current_date + interval '6 years 1 month')::date)),
  0, 'nothing beyond five years');
select is((select count(*)::int from public.negotiator_free_slots(pg_temp.id_of('glen_person'),
             current_date, (current_date + interval '1 year')::date)
            where starts_at > now() + interval '63 days'),
  0, 'two months at most a call');
select throws_ok($$ select * from public.negotiator_free_slots(pg_temp.id_of('creative_person')) $$,
  '42501', null, 'never the slots of a member who does not negotiate');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select * from public.negotiator_free_slots(pg_temp.id_of('glen_person')) $$,
  '42501', null, 'read by whoever plans calls (direction, project managers), not by a negotiator');
reset role;

-- « Caler le call » on a deal ------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'k1', public.plan_deal_negotiation_call(
  'Call · Nadia', (select v::timestamptz from vars where k = 'slot'),
  (select v::timestamptz + interval '30 minutes' from vars where k = 'slot'),
  p_deal_id => pg_temp.id_of('d1'),
  p_guests => '[{"email": "Manager@Nadia.test", "name": "Son manager"}]'::jsonb,
  p_agenda => '[{"topic": "Où en est le deal", "minutes": 5}]'::jsonb);
select is((select (deal_id, project_id, created_by) from public.calls where id = pg_temp.id_of('k1')),
  (pg_temp.id_of('d1'), null::uuid, pg_temp.id_of('owner_person')),
  'the project''s owner plans the deal''s call: the deal''s, by her');
select is((select email from public.call_guests where call_id = pg_temp.id_of('k1')),
  'manager@nadia.test', 'with its guest');
select is((select stage from public.deals where id = pg_temp.id_of('d1')), 'call_planned',
  'a deal to contact moves to « Call prévu »');
select is((select count(*)::int from public.deal_events
            where deal_id = pg_temp.id_of('d1') and kind = 'stage' and to_stage = 'call_planned'
              and detail ->> 'call' = pg_temp.id_of('k1')::text),
  1, 'its journal says which call');
select ok(public.is_call_owner(pg_temp.id_of('k1')),
  'she runs the call she planned: records and processes it (Sacha 21/11/2026)');
select ok(not exists (select 1 from public.negotiator_free_slots(pg_temp.id_of('glen_person'))
                       where starts_at = (select v::timestamptz from vars where k = 'slot')),
  'the slot taken is no longer free');
select lives_ok($$ select public.set_deal_negotiation_call_link(pg_temp.id_of('k1'),
  'https://meet.google.com/abc-defg-hij', 'evt1') $$, 'she writes the Meet link Google gave');
select throws_ok($$ select public.set_deal_negotiation_call_link(pg_temp.id_of('k1'),
  'https://meet.google.com/xyz', 'evt2') $$, 'P0001', 'link_exists', 'once');
select throws_ok($$ select public.plan_deal_negotiation_call('x', pg_temp.at(2), pg_temp.at(1),
  p_deal_id => pg_temp.id_of('d1')) $$, '22023', 'invalid_slot', 'a slot ends after it starts');
select throws_ok($$ select public.plan_deal_negotiation_call('x', pg_temp.at(1), pg_temp.at(2),
  p_deal_id => pg_temp.id_of('d1'), p_assignee_person_id => pg_temp.id_of('thibault_person')) $$,
  'P0001', 'negotiator_changed', 'never with another negotiator than the deal''s');
select throws_ok($$ update public.deals set stage = 'negotiation' where id = pg_temp.id_of('d1') $$,
  '42501', null, 'she still never writes the deal');
select lives_ok($$ select public.reschedule_call(pg_temp.id_of('k1'), pg_temp.at(30),
  pg_temp.at(30) + interval '30 minutes') $$, 'she moves the call she planned');
select is((select occurred_at from public.calls where id = pg_temp.id_of('k1')), pg_temp.at(30),
  'to its new slot');
select throws_ok($$ select public.reschedule_call(pg_temp.id_of('k1'), pg_temp.at(31),
  pg_temp.at(30)) $$, '22023', 'invalid_slot', 'a moved slot ends after it starts');
select ok(public.can_arrange_call(pg_temp.id_of('k1')), 'she arranges the call she planned');
select lives_ok($$ insert into public.call_guests (call_id, organization_id, email)
  values (pg_temp.id_of('k1'), pg_temp.id_of('org'), 'avocat@nadia.test') $$, 'she adds a guest');
select lives_ok($$ delete from public.call_guests where call_id = pg_temp.id_of('k1')
  and email = 'avocat@nadia.test' $$, 'and takes one off');
select is((select count(*)::int from public.call_guests
            where call_id = pg_temp.id_of('k1') and email = 'avocat@nadia.test'), 0, 'taken off');
update public.calls set agenda = '[{"topic": "Avance", "minutes": 10}]'::jsonb, title = 'Call · Nadia (2)'
 where id = pg_temp.id_of('k1');
select is((select title from public.calls where id = pg_temp.id_of('k1')), 'Call · Nadia (2)',
  'she changes its name and agenda');
reset role;

select pg_temp.act_as(pg_temp.id_of('glen'));
select ok(public.is_call_owner(pg_temp.id_of('k1')), 'the negotiator records and processes it');
select lives_ok($$ select public.reschedule_call(pg_temp.id_of('k1'),
  (select v::timestamptz from vars where k = 'slot'),
  (select v::timestamptz + interval '30 minutes' from vars where k = 'slot')) $$,
  'the negotiator moves it too (back to its first slot)');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'negotiation') $$,
  'P0001', 'negotiation_needs_call', 'no negotiation before the call took place');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ select public.plan_deal_negotiation_call('x', pg_temp.at(1), pg_temp.at(2),
  p_deal_id => pg_temp.id_of('d1')) $$, 'P0002', 'deal_not_found',
  'another project manager does not see the deal');
select throws_ok($$ select public.reschedule_call(pg_temp.id_of('k1'), pg_temp.at(33),
  pg_temp.at(33) + interval '30 minutes') $$, '42501', 'forbidden',
  'another project manager never moves it');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select throws_ok($$ select public.plan_deal_negotiation_call('x', pg_temp.at(1), pg_temp.at(2),
  p_deal_id => pg_temp.id_of('d1')) $$, 'P0002', 'deal_not_found', 'nor another negotiator');
reset role;

-- On a participation without a deal ---------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.plan_deal_negotiation_call('x', pg_temp.at(3), pg_temp.at(4),
  p_participation_id => pg_temp.id_of('p2')) $$, '22023', 'negotiator_required',
  'a new deal needs its negotiator');
insert into ids select 'k2', public.plan_deal_negotiation_call('Call · Lou', pg_temp.at(3), pg_temp.at(4),
  p_participation_id => pg_temp.id_of('p2'), p_assignee_person_id => pg_temp.id_of('glen_person'));
insert into ids select 'd2', deal_id from public.calls where id = pg_temp.id_of('k2');
select is((select (participation_id, assignee_person_id, stage) from public.deals
            where id = pg_temp.id_of('d2')),
  (pg_temp.id_of('p2'), pg_temp.id_of('glen_person'), 'call_planned'::text),
  'the participation''s deal is opened, given to its negotiator, its call planned');

-- Where a participation's deal stands ----------------------------------------------------------
select is((select (deal_id, stage, agreement_validated, can_plan_call)
             from public.participation_deal_state(pg_temp.id_of('p1'))),
  (pg_temp.id_of('d1'), 'call_planned'::text, false, true),
  'the owner reads her participation''s deal: its stage, its accord, her gesture');
select is((select next_call_at from public.participation_deal_state(pg_temp.id_of('p1'))),
  (select v::timestamptz from vars where k = 'slot'), 'and its next call');
select is((select count(*)::int from public.project_participation_deal_states(pg_temp.id_of('c1'))),
  2, 'one row per participation of the project');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.participation_deal_state(pg_temp.id_of('p1'))), 0,
  'nothing for whoever does not see the project');
reset role;

-- The accord validated: the project's owner is told -------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_term(pg_temp.id_of('d1'), 'master_split', '{"units": 500000}'::jsonb, 'confirmed');
select public.set_deal_stage(pg_temp.id_of('d1'), 'agreement');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_deal_agreement(pg_temp.id_of('d1'), true);
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('owner_person')
              and kind = 'deal_agreement_validated' and subject_id = pg_temp.id_of('d1')),
  1, 'the project''s owner is told the accord is validated');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('glen_person')
              and kind = 'deal_agreement_validated' and subject_id = pg_temp.id_of('d1')),
  1, 'the negotiator once, as before');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select (agreement_validated, can_plan_call)
             from public.participation_deal_state(pg_temp.id_of('p1'))),
  (true, false), 'the contracts may go; no negotiation call any more');
select throws_ok($$ select public.plan_deal_negotiation_call('x', pg_temp.at(5), pg_temp.at(6),
  p_deal_id => pg_temp.id_of('d1')) $$, 'P0001', 'negotiation_call_too_late',
  'after the accord, the call of negotiation is over');
reset role;

-- The direction proposing and validating at once tells the owner too.
select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_deal_term(pg_temp.id_of('d2'), 'master_split', '{"units": 500000}'::jsonb, 'confirmed');
select public.set_deal_stage(pg_temp.id_of('d2'), 'agreement');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('owner_person')
              and kind = 'deal_agreement_validated' and subject_id = pg_temp.id_of('d2')),
  1, 'an accord the direction validates at once is told to the owner');

select * from finish();
rollback;
