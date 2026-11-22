-- Projet collectif, retours d'Ibé du 18/11/2026
-- (20261121210101_collective_title_contracts): the contracts a title needs,
-- confirmed by the Juridique; no contract drafted for a guest before the
-- accord of its deal is validated (generate_legal_contract, and a
-- participation's contract_id); a simple project, the main artist, an
-- artist not invited: unchanged. delete_project_row empties the new table.
-- Run with `supabase test db`. Test data only.
begin;
select plan(39);

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
  from (values ('director'), ('owner'), ('creative'), ('otherpm'), ('glen'), ('outsider')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into public.organizations (slug, name)
values ('needs-' || (select v from vars where k = 'tag'), 'Autre maison');
insert into ids select 'org2', id from public.organizations
 where slug = 'needs-' || (select v from vars where k = 'tag');
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('otherpm', 'project_manager'),
               ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
update public.memberships m set organization_id = (select id from ids where name = 'org2'),
                                status = 'approved', role = 'general_director'
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = 'outsider'));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'otherpm', 'glen', 'outsider');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
-- A refusal's message and detail (pgTAP checks the message only).
create function pg_temp.refusal(p_sql text) returns text language plpgsql as $$
declare v_message text; v_detail text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_message = message_text, v_detail = pg_exception_detail;
  return v_message || ' · ' || coalesce(v_detail, '');
end $$;
grant execute on function pg_temp.refusal(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou'), ('Beat')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou'), ('beat', 'Beat')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective run by « owner » (its creative director on the team): Nadia
-- on title 1, Lou on title 2; a third title, abandoned.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')],
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
insert into ids select 't3', public.add_project_title(pg_temp.id_of('c1'));
select public.abandon_project_title(pg_temp.id_of('t3'), 'Pas retenu');
reset role;

-- A simple project of the same owner.
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Solo ' || pg_temp.tag(), 'content', pg_temp.id_of('owner_person'));
insert into ids select 's1', id from public.projects where title = 'Solo ' || pg_temp.tag();

-- The people of the Réseau: the artists' own contact cards, and Jean.
insert into public.network_contacts (organization_id, kind, name, roles, artist_id)
select pg_temp.id_of('org'), 'person', v.label || ' (fiche) ' || pg_temp.tag(), array['artist'],
       pg_temp.id_of(v.artist)
  from (values ('Nadia', 'nadia'), ('PDS', 'pds'), ('Beat', 'beat'), ('Jean', null)) as v (label, artist);
insert into ids select 'nc_' || lower(split_part(name, ' ', 1)), id from public.network_contacts
 where name like '% (fiche) ' || pg_temp.tag();

-- A validated template, and the needs of the mapping.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'template', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Participation ' || pg_temp.tag(), 'artist', array['performer'],
  null, 'Entre PDS et l''artiste.');
select public.set_contract_template_status(pg_temp.id_of('template'), 'validated');
select public.approve_contract_mapping(p_project_id, (
  select jsonb_agg(jsonb_build_object('contact_id', pg_temp.id_of(c), 'needed', true,
                                      'roles', jsonb_build_array('performer'),
                                      'template_id', pg_temp.id_of('template')))
    from unnest(array['nc_nadia', 'nc_pds', 'nc_beat', 'nc_jean']) c))
  from (values (pg_temp.id_of('c1')), (pg_temp.id_of('s1'))) as x (p_project_id);
reset role;
insert into ids select 'need_' || replace(k.name, 'nc_', '') || '_' || x.p, n.id
  from public.legal_agreement_needs n
  join ids k on k.id = n.contact_id and k.name like 'nc_%'
  join (values ('c1'), ('s1')) as x (p) on n.project_id = pg_temp.id_of(x.p);

-- 1. The contracts a title needs ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t1'),
                     array['production', 'publishing']) $$,
  'the Juridique of the project confirms the contracts title 1 needs');
select is((select string_agg(kind || '=' || needed, ', ' order by kind) from public.title_contract_needs
            where project_title_id = pg_temp.id_of('t1')),
  'beatmaker=false, image_rights=false, production=true, publishing=true',
  'four lines: the kinds ticked needed, the others not');
select lives_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t1'), array['image_rights']) $$,
  'confirmed again');
select is((select string_agg(kind || '=' || needed, ', ' order by kind) from public.title_contract_needs
            where project_title_id = pg_temp.id_of('t1')),
  'beatmaker=false, image_rights=true, production=false, publishing=false',
  'the new confirmation replaces the former, still four lines');
select is((select count(*)::int from public.title_contract_needs
            where project_title_id = pg_temp.id_of('t1') and confirmed_by = pg_temp.id_of('owner_person')),
  4, 'who confirmed it');
select is((select detail -> 'kinds' from public.project_title_events
            where title_id = pg_temp.id_of('t1') and kind = 'contract_needs_confirmed'
            order by seq desc limit 1),
  '["image_rights"]'::jsonb, 'the journal says which contracts');
select lives_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t2'), '{}') $$,
  'none ticked: no contract needed');
select throws_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t2'), array['mixing']) $$,
  '22023', 'invalid_kinds', 'never an unknown kind');
select throws_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t3'), array['production']) $$,
  'P0001', 'title_abandoned', 'never on an abandoned title');
select throws_ok(format($$ insert into public.title_contract_needs
                             (organization_id, project_id, project_title_id, kind, needed)
                           values (%L, %L, %L, 'production', true) $$,
                        pg_temp.id_of('org'), pg_temp.id_of('c1'), pg_temp.id_of('t2')),
  '42501', null, 'never written directly');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t1'), array['production']) $$,
  '42501', 'forbidden', 'a member of the team without the Juridique cannot');
select is((select count(*)::int from public.title_contract_needs where project_id = pg_temp.id_of('c1')),
  0, 'nor read them');
reset role;
select pg_temp.act_as(pg_temp.id_of('otherpm'));
select throws_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t1'), array['production']) $$,
  'P0002', 'title_not_found', 'a manager out of the project does not see the title');
select is((select count(*)::int from public.title_contract_needs where project_id = pg_temp.id_of('c1')),
  0, 'nor its needs');
reset role;
select pg_temp.act_as(pg_temp.id_of('outsider'));
select throws_ok($$ select public.confirm_title_contract_needs(pg_temp.id_of('t1'), array['production']) $$,
  'P0002', 'title_not_found', 'nor another house');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.title_contract_needs where project_id = pg_temp.id_of('c1')),
  8, 'the direction reads them');
reset role;
select throws_ok(format($$ insert into public.title_contract_needs
                             (organization_id, project_id, project_title_id, kind, needed)
                           values (%L, %L, %L, 'production', true) $$,
                        pg_temp.id_of('org'), pg_temp.id_of('s1'), pg_temp.id_of('t1')),
  '23514', 'not_collective', 'a collective only, whoever writes');

-- 2. No contract before the accord --------------------------------------------------------------
select ok(public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('nadia')),
  'a guest without a deal waits for its accord');
select ok(not public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('pds')),
  'not the main artist');
select ok(not public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('beat')),
  'nor an artist not invited');
select ok(not public.artist_agreement_pending(pg_temp.id_of('s1'), pg_temp.id_of('nadia')),
  'nor in a simple project');

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_nadia_c1'), '{}'::jsonb) $$,
  'P0001', 'agreement_not_validated', 'no contract for a guest before its accord');
select is(pg_temp.refusal($$ select public.generate_legal_contract(pg_temp.id_of('need_nadia_c1'), '{}'::jsonb) $$),
  'agreement_not_validated · Titre de Nadia ' || pg_temp.tag() || ' (à nommer)',
  'the refusal names the titles waiting');
select lives_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_pds_c1'), '{}'::jsonb) $$,
  'the main artist''s contract goes');
select lives_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_beat_c1'), '{}'::jsonb, true) $$,
  'an artist not invited (a beatmaker): unchanged');
select lives_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_jean_c1'), '{}'::jsonb) $$,
  'a contact that is no artist: unchanged');
select lives_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_nadia_s1'), '{}'::jsonb) $$,
  'a simple project: unchanged');

-- A deal opened: still waiting.
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p_nadia'), p_assignee_person_id => pg_temp.id_of('glen_person'));
select throws_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_nadia_c1'), '{}'::jsonb) $$,
  'P0001', 'agreement_not_validated', 'a deal without its accord: still no contract');
reset role;

-- The participation's contract waits too.
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Lien ' || pg_temp.tag(), 'artist', 'draft', pg_temp.id_of('c1'),
        pg_temp.id_of('owner_person'));
insert into ids select 'k1', id from public.contracts where title = 'Lien ' || pg_temp.tag();
select throws_ok($$ update public.title_participations set contract_id = pg_temp.id_of('k1')
                     where id = pg_temp.id_of('p_nadia') $$,
  'P0001', 'agreement_not_validated', 'a participation takes no contract before its accord');
select throws_ok($$ update public.title_participations set contract_id = pg_temp.id_of('k1')
                     where id = pg_temp.id_of('p_lou') $$,
  'P0001', 'agreement_not_validated', 'nor without a deal');

-- The accord proposed, then validated by the direction.
select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_term(pg_temp.id_of('d1'), 'master_split', '{"units": 500000}'::jsonb, 'confirmed');
select public.set_deal_stage(pg_temp.id_of('d1'), 'agreement');
reset role;
select ok(public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('nadia')),
  'an accord proposed is not validated yet');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_deal_agreement(pg_temp.id_of('d1'), true);
reset role;
select ok(not public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('nadia')),
  'validated: the guest no longer waits');
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.generate_legal_contract(pg_temp.id_of('need_nadia_c1'), '{}'::jsonb) $$,
  'then her contract is drafted');
reset role;
select lives_ok($$ update public.title_participations set contract_id = pg_temp.id_of('k1')
                    where id = pg_temp.id_of('p_nadia') $$,
  'and her participation takes its contract');
select lives_ok($$ update public.title_participations set contract_id = null
                    where id = pg_temp.id_of('p_nadia') $$,
  'a contract unlinked always passes');

-- The same artist invited on another title waits again; withdrawn, no longer.
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(pg_temp.id_of('t2'), pg_temp.id_of('nadia'));
reset role;
select ok(public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('nadia')),
  'invited on a second title without its accord: waiting again');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_status(
  (select id from public.title_participations
    where title_id = pg_temp.id_of('t2') and artist_id = pg_temp.id_of('nadia')), 'withdrawn');
reset role;
select ok(not public.artist_agreement_pending(pg_temp.id_of('c1'), pg_temp.id_of('nadia')),
  'withdrawn from it: no longer');

-- 3. delete_project_row ---------------------------------------------------------------------------
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('c1')) $$,
  'the collective is deleted with its titles'' needs');
select is((select count(*)::int from public.title_contract_needs where project_id = pg_temp.id_of('c1')),
  0, 'none left');

select * from finish();
rollback;
