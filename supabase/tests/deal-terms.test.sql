-- Business module, BIZ 3 (…20261111231101): the terms negotiated in a deal.
-- Written by the direction and the assignee only, read by whoever reads the
-- deal; a value unless « to define »; each change kept in the journal with
-- the value and state before; a closed deal's terms no longer change.
-- Run with `supabase test db`.
begin;
select plan(16);

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
  p_participation_id => pg_temp.id_of('p1'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'd2', public.create_deal(
  p_artist_id => pg_temp.id_of('sami'), p_assignee_person_id => pg_temp.id_of('thibault_person'));
reset role;

create function pg_temp.term(p_deal text, p_key text) returns public.deal_terms
  language sql as $$ select * from public.deal_terms
                      where deal_id = pg_temp.id_of(p_deal) and term_key = p_key $$;
grant execute on function pg_temp.term(text, text) to authenticated;

-- Writing -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'master_split',
                     '{"units": 200000}'::jsonb, 'pds_proposal') $$,
  'the assignee proposes a term');
select is(((pg_temp.term('d1', 'master_split')).state, (pg_temp.term('d1', 'master_split')).changed_by),
  ('pds_proposal'::text, pg_temp.id_of('glen_person')), 'with its state and its author');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'master_split',
                     '{"units": 200000}'::jsonb, 'pds_proposal') $$,
  'P0001', 'term_unchanged', 'the same value and state twice is refused');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'royalties', null, 'confirmed') $$,
  '22023', 'term_value_required', 'a value, unless the term is to define');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'Royalties!', '{"units": 1}'::jsonb, 'confirmed') $$,
  '22023', 'invalid_term', 'a term''s key has the form of a key');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'royalties', '{"units": 1}'::jsonb, 'agreed') $$,
  '22023', 'invalid_state', 'four states only');
select lives_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'master_split',
                     '{"units": 250000}'::jsonb, 'counter_proposal') $$,
  'a counter-proposal replaces the value');
select is((select (detail ->> 'from_value')::jsonb from public.deal_events
            where deal_id = pg_temp.id_of('d1') and kind = 'term'
              and detail ->> 'state' = 'counter_proposal'),
  '{"units": 200000}'::jsonb, 'the journal keeps the value before');
select is((select count(*)::int from public.deal_events where deal_id = pg_temp.id_of('d1') and kind = 'term'),
  2, 'one line per change');
select lives_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'master_split', '{"units": 1}'::jsonb, 'to_define') $$,
  'back to « to define »');
select is((pg_temp.term('d1', 'master_split')).value, null::jsonb, 'its value is dropped');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d2'), 'royalties', '{"units": 1}'::jsonb, 'confirmed') $$,
  'P0002', 'deal_not_found', 'not on another''s deal');
reset role;

-- Reading ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.deal_terms where deal_id = pg_temp.id_of('d1')), 1,
  'the owner of the linked project reads the terms');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'royalties', '{"units": 1}'::jsonb, 'confirmed') $$,
  '42501', 'forbidden', 'but writes none');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select count(*)::int from public.deal_terms where deal_id = pg_temp.id_of('d1')), 0,
  'another negotiator reads none');
reset role;

-- A closed deal ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select public.abandon_deal(pg_temp.id_of('d1'), 'Plus disponible');
select throws_ok($$ select public.set_deal_term(pg_temp.id_of('d1'), 'royalties', '{"units": 1}'::jsonb, 'confirmed') $$,
  'P0001', 'deal_closed', 'a closed deal''s terms no longer change');
reset role;

select * from finish();
rollback;
