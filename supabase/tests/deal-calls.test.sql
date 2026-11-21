-- Business module, BIZ 6 (…20261112010101): the calls of a deal. Seen by the
-- deal's readers only, worked on by its writers; its project stays the
-- deal's (calls.project_id null); no member attendee; PO's proposals read
-- by the deal's readers, settled once by its writers; delete_project_row
-- takes the calls of the project's deals.
-- Run with `supabase test db`.
begin;
select plan(29);

-- Fixtures (as deals.test.sql) ----------------------------------------------

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
create function pg_temp.deal(p text) returns public.deals
  language sql as $$ select * from public.deals where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.deal(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('sami', 'Sami')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- Two collectives: c1 launched and run by « owner », c2 not launched.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'c2', public.create_project(pg_temp.id_of('org'), 'Mic bis ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m2')], p_music_format => 'single');
insert into ids select 'a_c1', public.transmit_project(pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id in (pg_temp.id_of('c1'), pg_temp.id_of('c2'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('nadia'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c2')), pg_temp.id_of('sami'));
reset role;
insert into ids select 'p1', id from public.title_participations where project_id = pg_temp.id_of('c1');
insert into ids select 'p2', id from public.title_participations where project_id = pg_temp.id_of('c2');

select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'd2', public.create_deal(
  p_artist_id => pg_temp.id_of('sami'), p_assignee_person_id => pg_temp.id_of('glen_person'));
select public.abandon_deal(pg_temp.id_of('d2'), 'Plus d''actualité');
reset role;

-- Planning a deal's call --------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
with x as (
  insert into public.calls (organization_id, deal_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), 'Call Nadia') returning id)
insert into ids select 'k1', id from x;
select is((select project_id from public.calls where id = pg_temp.id_of('k1')), null,
  'a deal''s call keeps its project through the deal, not in calls.project_id');
select throws_ok($$ insert into public.calls (organization_id, deal_id, project_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), pg_temp.id_of('c1'), 'x') $$,
  '23514', null, 'a deal''s call never carries the project itself');
select throws_ok($$ insert into public.calls (organization_id, deal_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('d2'), 'x') $$,
  '42501', null, 'no call on a closed deal');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ insert into public.calls (organization_id, deal_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), 'x') $$,
  '42501', null, 'the project''s owner reads the deal but does not plan its calls');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select throws_ok($$ insert into public.calls (organization_id, deal_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), 'x') $$,
  '42501', null, 'another negotiator does not either');
reset role;

-- Who sees it, who works on it ---------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select ok(public.can_see_call(pg_temp.id_of('k1')), 'the negotiator sees the call');
select ok(public.is_call_owner(pg_temp.id_of('k1')), 'and works on it');
select lives_ok($$ insert into public.transcripts (organization_id, call_id, text, provider, model)
  values (pg_temp.id_of('org'), pg_temp.id_of('k1'), 'On propose 25 % de royalties.', 'test', 'test') $$,
  'he writes its transcript (the processing runs under his session)');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select ok(public.is_call_owner(pg_temp.id_of('k1')), 'the direction works on it too');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.calls where id = pg_temp.id_of('k1')), 1,
  'the project''s owner reads the call (he reads the deal)');
select ok(public.is_call_owner(pg_temp.id_of('k1')),
  'and runs it: she makes the meeting (Sacha 21/11/2026)');
select is((select count(*)::int from public.calls
            where project_id = pg_temp.id_of('c1') and id = pg_temp.id_of('k1')), 0,
  'the deal''s call is not among the project''s calls');
select lives_ok($$ insert into public.transcripts (organization_id, call_id, text, provider, model)
  values (pg_temp.id_of('org'), pg_temp.id_of('k1'), 'x', 'test', 'test') $$,
  'and writes its transcript');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.calls where id = pg_temp.id_of('k1')), 0,
  'another project manager does not see the call');
select is((select count(*)::int from public.transcripts where call_id = pg_temp.id_of('k1')), 0,
  'nor its transcript');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select ok(not public.can_see_call(pg_temp.id_of('k1')), 'nor another negotiator');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select ok(not public.can_see_call(pg_temp.id_of('k1')), 'nor the creative director');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ insert into public.call_attendees (organization_id, call_id, person_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('k1'), pg_temp.id_of('owner_person')) $$,
  '23514', 'deal_call_no_attendee', 'no member attendee on a deal''s call');
reset role;
select throws_ok($$ update public.calls set deal_id = null where id = pg_temp.id_of('k1') $$,
  '23514', 'call_deal_fixed', 'a call never changes deal');

-- PO's proposals --------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
with x as (
  insert into public.deal_call_proposals (organization_id, deal_id, call_id, kind, term_key, value, term_state, quote)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), pg_temp.id_of('k1'), 'term', 'royalties',
          '{"units": 250000}', 'pds_proposal', 'On propose 25 % de royalties.') returning id)
insert into ids select 'q1', id from x;
select throws_ok($$ insert into public.deal_call_proposals (organization_id, deal_id, call_id, kind, stage, quote, status, settled_at)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), pg_temp.id_of('k1'), 'stage', 'negotiation', 'On négocie maintenant.', 'applied', now()) $$,
  '42501', null, 'a proposal is written « proposé » only');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.deal_call_proposals where id = pg_temp.id_of('q1')), 1,
  'the project''s owner reads the proposals');
select throws_ok($$ select public.settle_deal_call_proposal(pg_temp.id_of('q1'), 'dismissed') $$,
  '42501', 'forbidden', 'but does not settle them');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select count(*)::int from public.deal_call_proposals), 0,
  'another negotiator reads none');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.settle_deal_call_proposal(pg_temp.id_of('q1'), 'applied') $$,
  'the negotiator applies it');
select is((select status from public.deal_call_proposals where id = pg_temp.id_of('q1')), 'applied',
  'it is applied');
select throws_ok($$ select public.settle_deal_call_proposal(pg_temp.id_of('q1'), 'dismissed') $$,
  'P0001', 'proposal_settled', 'once');
reset role;

-- Deleting the project ---------------------------------------------------------------------
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('c1')) $$,
  'delete_project_row takes the calls of the project''s deals');
select is((select count(*)::int from public.calls where id = pg_temp.id_of('k1')), 0,
  'the deal''s call is gone with its deal');
select is((select count(*)::int from public.deal_call_proposals where id = pg_temp.id_of('q1')), 0,
  'and its proposals');

select * from finish();
rollback;
