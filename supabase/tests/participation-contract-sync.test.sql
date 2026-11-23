-- Projet collectif, retours d'Ibé du 18/11/2026
-- (20261121230101_participation_contract_from_person): the person's contract
-- (legal_agreement_needs.contract_id) covers the artist's participations of
-- the collective once their accord is validated, so the banner, the locks,
-- participation_covered and the deals read it (title_participations.
-- contract_id); a participation waiting for its accord is linked when the
-- accord is validated, one added later too; a contract removed unlinks; a
-- link set by hand stays without a person's contract and gives way to it;
-- the main artist and a simple project: unchanged; the catch-up.
-- Run with `supabase test db`. Test data only.
begin;
select plan(27);

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
  from (values ('director'), ('owner'), ('glen')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'glen');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
create function pg_temp.contract_of(p text) returns uuid language sql as $$
  select contract_id from public.title_participations where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.contract_of(text) to authenticated;
create function pg_temp.need_contract(p text) returns uuid language sql as $$
  select contract_id from public.legal_agreement_needs where id = pg_temp.id_of(p) $$;
-- A deal on a participation, its accord validated by the direction.
create function pg_temp.validate_accord(p_participation text, p_deal text) returns void
language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.id_of('owner'));
  insert into ids select p_deal, public.create_deal(
    p_participation_id => pg_temp.id_of(p_participation),
    p_assignee_person_id => pg_temp.id_of('glen_person'));
  reset role;
  perform pg_temp.act_as(pg_temp.id_of('glen'));
  perform public.set_deal_term(pg_temp.id_of(p_deal), 'master_split', '{"units": 500000}'::jsonb, 'confirmed');
  perform public.set_deal_stage(pg_temp.id_of(p_deal), 'agreement');
  reset role;
  perform pg_temp.act_as(pg_temp.id_of('director'));
  perform public.decide_deal_agreement(pg_temp.id_of(p_deal), true);
  reset role;
end $$;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective run by « owner »: Nadia on title 1, Lou on title 2.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou')]);
reset role;
insert into ids select 'assignment', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
insert into ids select 'p_nadia', id from public.title_participations
 where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('nadia');
insert into ids select 'p_lou', id from public.title_participations
 where title_id = pg_temp.id_of('t2') and artist_id = pg_temp.id_of('lou');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('assignment'), 'accepted');
select public.set_title_participation_status(pg_temp.id_of('p_nadia'), 'confirmed');
select public.set_title_participation_status(pg_temp.id_of('p_lou'), 'confirmed');
reset role;

-- A simple project of the same owner.
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Solo ' || pg_temp.tag(), 'content', pg_temp.id_of('owner_person'));
insert into ids select 's1', id from public.projects where title = 'Solo ' || pg_temp.tag();

-- The artists' people of the Réseau, a validated template, the needs.
insert into public.network_contacts (organization_id, kind, name, roles, artist_id)
select pg_temp.id_of('org'), 'person', v.label || ' (fiche) ' || pg_temp.tag(), array['artist'],
       pg_temp.id_of(v.artist)
  from (values ('Nadia', 'nadia'), ('Lou', 'lou'), ('PDS', 'pds')) as v (label, artist);
insert into ids select 'nc_' || lower(split_part(name, ' ', 1)), id from public.network_contacts
 where name like '% (fiche) ' || pg_temp.tag();
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'template', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Participation ' || pg_temp.tag(), 'artist', array['performer'],
  null, 'Entre PDS et l''artiste.');
select public.set_contract_template_status(pg_temp.id_of('template'), 'validated');
select public.approve_contract_mapping(p_project_id, (
  select jsonb_agg(jsonb_build_object('contact_id', pg_temp.id_of(c), 'needed', true,
                                      'roles', jsonb_build_array('performer'),
                                      'template_id', pg_temp.id_of('template')))
    from unnest(array['nc_nadia', 'nc_lou', 'nc_pds']) c))
  from (values (pg_temp.id_of('c1')), (pg_temp.id_of('s1'))) as x (p_project_id);
reset role;
insert into ids select 'need_' || replace(k.name, 'nc_', '') || '_' || x.p, n.id
  from public.legal_agreement_needs n
  join ids k on k.id = n.contact_id and k.name like 'nc_%'
  join (values ('c1'), ('s1')) as x (p) on n.project_id = pg_temp.id_of(x.p);

-- 1. The person's contract covers the participation --------------------------------------------
select pg_temp.validate_accord('p_nadia', 'd_nadia');
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'k_nadia', public.generate_legal_contract(pg_temp.id_of('need_nadia_c1'), '{}'::jsonb);
reset role;
select is(pg_temp.contract_of('p_nadia'), pg_temp.id_of('k_nadia'),
  'Nadia''s contract drafted: her participation carries it');
select ok(not public.participation_covered(pg_temp.id_of('p_nadia'), 'shoot'),
  'a draft does not cover yet');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select string_agg(artist_name, ', ' order by artist_name)
             from public.list_contract_gaps(pg_temp.id_of('c1'), 'shoot')),
  'Lou ' || pg_temp.tag() || ', Nadia ' || pg_temp.tag(), 'the banner lists both, nothing signed');
reset role;

update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('k_nadia');
select ok(public.participation_covered(pg_temp.id_of('p_nadia'), 'shoot'),
  'signed: her participation is covered for the shoot');
select ok(public.participation_covered(pg_temp.id_of('p_nadia'), 'release'), 'and the release');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select string_agg(artist_name, ', ' order by artist_name)
             from public.list_contract_gaps(pg_temp.id_of('c1'), 'shoot')),
  'Lou ' || pg_temp.tag(), 'the banner no longer lists her');
reset role;
select is(public.contract_gaps_text(pg_temp.id_of('c1'), 'release'),
  'Lou ' || pg_temp.tag() || ' (Titre de Lou ' || pg_temp.tag() || ' (à nommer))',
  'nor the locks');

-- The deal reads the same contract, and follows it: signed, the deal is signed
-- (20261123100101, deal_follows_contract).
select is((select stage from public.deals where id = pg_temp.id_of('d_nadia')), 'signed',
  'the deal is signed with its contract');
select is((select detail ->> 'contract' from public.deal_events
            where deal_id = pg_temp.id_of('d_nadia') and kind = 'stage' and to_stage = 'signed'),
  'signed', 'journaled with the contract''s status');
select is((select contract_id from public.read_deal_contract(pg_temp.id_of('d_nadia'))),
  pg_temp.id_of('k_nadia'), 'the deal names the person''s contract');

-- 2. A participation added later waits for its accord, then is linked -------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'p_nadia2', x.participation_id
  from public.add_title_participation(pg_temp.id_of('t2'), pg_temp.id_of('nadia')) x;
select public.set_title_participation_status(pg_temp.id_of('p_nadia2'), 'confirmed');
reset role;
select is(pg_temp.contract_of('p_nadia2'), null,
  'Nadia added on title 2: not linked before its accord');
select is(pg_temp.contract_of('p_nadia'), pg_temp.id_of('k_nadia'), 'her first title keeps it');
select ok((select count(*) = 1 from public.contract_gaps(pg_temp.id_of('c1'), 'shoot')
            where participation_id = pg_temp.id_of('p_nadia2')),
  'the banner lists the new participation');
select pg_temp.validate_accord('p_nadia2', 'd_nadia2');
select is(pg_temp.contract_of('p_nadia2'), pg_temp.id_of('k_nadia'),
  'its accord validated: the person''s contract covers it');
select ok(public.participation_covered(pg_temp.id_of('p_nadia2'), 'shoot'), 'covered');

-- 3. A link set by hand: kept without a person's contract, gives way to it ----------------------
select pg_temp.validate_accord('p_lou', 'd_lou');
select is(pg_temp.contract_of('p_lou'), null, 'Lou''s accord validated, no contract drafted: none');
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'À la main ' || pg_temp.tag(), 'artist', 'draft', pg_temp.id_of('c1'),
        pg_temp.id_of('owner_person'));
insert into ids select 'k_hand', id from public.contracts where title = 'À la main ' || pg_temp.tag();
update public.title_participations set contract_id = pg_temp.id_of('k_hand') where id = pg_temp.id_of('p_lou');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_note(pg_temp.id_of('p_lou'), 'Relancer');
reset role;
select public.sync_participation_contracts(pg_temp.id_of('c1'), pg_temp.id_of('lou'));
select is(pg_temp.contract_of('p_lou'), pg_temp.id_of('k_hand'),
  'without a person''s contract, the link set by hand stays');
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'k_lou', public.generate_legal_contract(pg_temp.id_of('need_lou_c1'), '{}'::jsonb);
reset role;
select is(pg_temp.contract_of('p_lou'), pg_temp.id_of('k_lou'),
  'Lou''s contract drafted: the person''s contract wins');

-- 4. The main artist and a simple project: unchanged ------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'k_pds', public.generate_legal_contract(pg_temp.id_of('need_pds_c1'), '{}'::jsonb);
insert into ids select 'k_solo', public.generate_legal_contract(pg_temp.id_of('need_nadia_s1'), '{}'::jsonb);
reset role;
select is((select count(*)::int from public.title_participations where contract_id = pg_temp.id_of('k_pds')),
  0, 'the main artist''s contract links no participation');
select is((select count(*)::int from public.title_participations
            where contract_id = pg_temp.id_of('k_solo') or project_id = pg_temp.id_of('s1')),
  0, 'a simple project''s contract links nothing');
select is(pg_temp.contract_of('p_nadia'), pg_temp.id_of('k_nadia'),
  'Nadia keeps her collective''s contract');

-- 5. The person's contract removed: its participations unlinked -------------------------------
update public.legal_agreement_needs set contract_id = null where id = pg_temp.id_of('need_nadia_c1');
select is((select count(*)::int from public.title_participations
            where id in (pg_temp.id_of('p_nadia'), pg_temp.id_of('p_nadia2')) and contract_id is not null),
  0, 'the contract taken off the need: both participations unlinked');
select is(pg_temp.contract_of('p_lou'), pg_temp.id_of('k_lou'), 'Lou''s untouched');
select ok((select count(*) = 2 from public.contract_gaps(pg_temp.id_of('c1'), 'shoot')
            where participation_id in (pg_temp.id_of('p_nadia'), pg_temp.id_of('p_nadia2'))),
  'the banner lists her again');
update public.legal_agreement_needs set contract_id = pg_temp.id_of('k_nadia')
 where id = pg_temp.id_of('need_nadia_c1');
select is((select count(*)::int from public.title_participations
            where id in (pg_temp.id_of('p_nadia'), pg_temp.id_of('p_nadia2'))
              and contract_id = pg_temp.id_of('k_nadia')),
  2, 'set again: both covered again');

-- 6. The catch-up: participations left without the person's contract ---------------------------
update public.title_participations set contract_id = null
 where id in (pg_temp.id_of('p_nadia'), pg_temp.id_of('p_nadia2'), pg_temp.id_of('p_lou'));
select public.sync_participation_contracts(x.project_id, x.artist_id)
  from (select distinct tp.project_id, tp.artist_id
          from public.title_participations tp
          join public.projects p on p.id = tp.project_id and p.collective
         where tp.project_id = pg_temp.id_of('c1')) x;
select is((select string_agg(a.name || '=' || (tp.contract_id = n.contract_id)::text, ', ' order by a.name, tp.id)
             from public.title_participations tp
             join public.artists a on a.id = tp.artist_id
             join public.network_contacts nc on nc.artist_id = tp.artist_id
             join public.legal_agreement_needs n on n.contact_id = nc.id and n.project_id = tp.project_id
            where tp.project_id = pg_temp.id_of('c1')),
  'Lou ' || pg_temp.tag() || '=true, Nadia ' || pg_temp.tag() || '=true, Nadia ' || pg_temp.tag() || '=true',
  'the catch-up links every participation to its person''s contract');

-- The project deleted with its needs and participations.
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('c1')) $$,
  'the collective is deleted');

select * from finish();
rollback;
