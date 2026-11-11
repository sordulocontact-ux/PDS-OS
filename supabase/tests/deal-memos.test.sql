-- Business module, BIZ 7 (…20261112020101): the deal memo and the contract.
-- A memo made at the accord de principe (draft, validated with it), by hand
-- (draft), validated by the direction only, the latest only; a
-- participation's deal reads its contract on the participation, any other
-- names one of its project or artist; the checks of a validated memo
-- against the contract by whoever writes the deal.
-- Run with `supabase test db`.
begin;
select plan(27);

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
insert into ids select 'd3', public.create_deal(
  p_artist_id => pg_temp.id_of('nadia'), p_assignee_person_id => pg_temp.id_of('glen_person'));
insert into ids select 'd4', public.create_deal(p_artist_id => pg_temp.id_of('sami'));
reset role;

-- A contract of Nadia, one of Sami, the amount entered on Nadia's.
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Nadia ' || pg_temp.tag(), array['artist']);
insert into ids select 'contact', id from public.network_contacts where name = 'Nadia ' || pg_temp.tag();
insert into public.contracts (organization_id, title, type, artist_id, owner_person_id)
values (pg_temp.id_of('org'), 'Contrat Nadia', 'artist', pg_temp.id_of('nadia'), pg_temp.id_of('director_person')),
       (pg_temp.id_of('org'), 'Contrat Sami', 'artist', pg_temp.id_of('sami'), pg_temp.id_of('director_person'));
insert into ids select 'k_nadia', id from public.contracts where title = 'Contrat Nadia' and artist_id = pg_temp.id_of('nadia');
insert into ids select 'k_sami', id from public.contracts where title = 'Contrat Sami' and artist_id = pg_temp.id_of('sami');
insert into public.financial_needs (organization_id, contract_id, contact_id, amount_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('k_nadia'), pg_temp.id_of('contact'), 300000);

-- The memo at the accord de principe ----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_term(pg_temp.id_of('d1'), 'advance', '{"mode": "advance", "cents": 200000}', 'confirmed');
select public.set_deal_stage(pg_temp.id_of('d1'), 'negotiation');
select is((select count(*)::int from public.deal_memos where deal_id = pg_temp.id_of('d1')), 0,
  'no memo before the accord de principe');
select public.set_deal_stage(pg_temp.id_of('d1'), 'agreement');
select is((select status from public.deal_memos where deal_id = pg_temp.id_of('d1') and number = 1), 'draft',
  'the proposed accord de principe makes memo n°1, a draft');
select is((select terms -> 0 ->> 'key' from public.deal_memos where deal_id = pg_temp.id_of('d1') and number = 1),
  'advance', 'it photographs the terms written');
select throws_ok($$ select public.validate_deal_memo(
    (select id from public.deal_memos where deal_id = pg_temp.id_of('d1') and number = 1)) $$,
  '42501', 'forbidden', 'the negotiator does not validate a memo');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.deal_memos where deal_id = pg_temp.id_of('d1')), 1,
  'the project''s owner reads the memos');
select throws_ok($$ select public.create_deal_memo(pg_temp.id_of('d1')) $$,
  '42501', 'forbidden', 'but does not make one');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.deal_memos where deal_id = pg_temp.id_of('d1')), 0,
  'another project manager reads none');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_deal_agreement(pg_temp.id_of('d1'), true);
select is((select status from public.deal_memos where deal_id = pg_temp.id_of('d1') and number = 1), 'validated',
  'validating the accord de principe validates its memo');
select is((select count(*)::int from public.deal_memos where deal_id = pg_temp.id_of('d1')), 1,
  'without making another');
select throws_ok($$ select public.validate_deal_memo(
    (select id from public.deal_memos where deal_id = pg_temp.id_of('d1') and number = 1)) $$,
  'P0001', 'memo_validated', 'a validated memo stays as it is');
reset role;

select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_term(pg_temp.id_of('d1'), 'royalties', '{"units": 200000}', 'confirmed');
insert into ids select 'memo2', public.create_deal_memo(pg_temp.id_of('d1'));
select is((select number from public.deal_memos where id = pg_temp.id_of('memo2')), 2,
  'a memo by hand takes the next number');
select is((select jsonb_array_length(terms) from public.deal_memos where id = pg_temp.id_of('memo2')), 2,
  'with the terms now');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.validate_deal_memo(
    (select id from public.deal_memos where deal_id = pg_temp.id_of('d1') and number = 1)) $$,
  'P0001', 'memo_validated', 'an older memo is not validated again');
select lives_ok($$ select public.validate_deal_memo(pg_temp.id_of('memo2')) $$,
  'the direction validates the latest draft');
reset role;

-- The direction proposing the accord validates its memo at once.
select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_deal_stage(pg_temp.id_of('d4'), 'agreement');
select is((select status from public.deal_memos where deal_id = pg_temp.id_of('d4')), 'validated',
  'the direction''s accord makes a validated memo');
reset role;

-- The contract --------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.link_deal_contract(pg_temp.id_of('d1'), pg_temp.id_of('k_nadia')) $$,
  'P0001', 'participation_contract', 'a participation''s deal reads the participation''s contract');
select throws_ok($$ select public.link_deal_contract(pg_temp.id_of('d3'), pg_temp.id_of('k_sami')) $$,
  '22023', 'contract_not_linkable', 'a contract of another artist is refused');
select is((select array_agg(contract_id) from public.list_deal_contract_options(pg_temp.id_of('d3'))),
  array[pg_temp.id_of('k_nadia')], 'the options are the contracts of the deal''s artist');
select lives_ok($$ select public.link_deal_contract(pg_temp.id_of('d3'), pg_temp.id_of('k_nadia')) $$,
  'the negotiator links the artist''s contract');
select is((select amount_cents from public.read_deal_contract(pg_temp.id_of('d3'))), 300000::bigint,
  'read_deal_contract gives the amount entered on it');
select ok(not (select visible from public.read_deal_contract(pg_temp.id_of('d3'))),
  'the negotiator may not open it in Contrats');

-- Checks
select public.set_deal_term(pg_temp.id_of('d3'), 'advance', '{"mode": "advance", "cents": 200000}', 'confirmed');
insert into ids select 'memo3', public.create_deal_memo(pg_temp.id_of('d3'));
select throws_ok($$ select public.set_deal_memo_check(pg_temp.id_of('memo3'), 'advance', 'conform') $$,
  'P0001', 'memo_not_validated', 'only a validated memo is compared');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.validate_deal_memo(pg_temp.id_of('memo3'));
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.set_deal_memo_check(pg_temp.id_of('memo3'), 'advance', 'different',
  'Le contrat porte 3 000 €') $$, 'the negotiator says the contract differs');
select throws_ok($$ select public.set_deal_memo_check(pg_temp.id_of('memo3'), 'advance', 'different',
  'Le contrat porte 3 000 €') $$, 'P0001', 'check_unchanged', 'the same verdict twice is refused');
select throws_ok($$ select public.set_deal_memo_check(pg_temp.id_of('memo3'), 'royalties', 'conform') $$,
  '22023', 'invalid_term', 'a term outside the memo is refused');
select is((select verdict from public.deal_memo_checks where memo_id = pg_temp.id_of('memo3')), 'different',
  'the verdict is kept, per contract');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select count(*)::int from public.deal_memo_checks), 0, 'another negotiator reads no check');
reset role;

select * from finish();
rollback;
