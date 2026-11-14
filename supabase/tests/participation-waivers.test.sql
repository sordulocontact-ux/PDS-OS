-- Projet collectif, lot 12 (20261114110101, décision 6, principle 5): a
-- confirmed participation without its contract signed blocks the shoot of
-- the titles it is on (the sheet's deliverable: its targeted titles, else
-- every title not abandoned) and the release (a version submitted to the
-- Distribution), unless the direction granted an open waiver of that scope
-- (reason, due date; append-only, revocable, in the collective's journal).
-- A simple project is unchanged. Run with `supabase test db`.
begin;
select plan(29);

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
  from (values ('director'), ('owner'), ('creative')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective: Nadia confirmed on title 1 (no contract), Lou proposed on
-- title 2; its creative director on the team. A simple project beside it.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')],
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou')]);
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Contenu ' || pg_temp.tag(),
  'content', p_assignee_person_id => pg_temp.id_of('owner_person'));
reset role;
insert into ids select 'a_c1', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 'a_simple', id from public.project_assignments where project_id = pg_temp.id_of('simple');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
insert into ids select 'p_nadia', id from public.title_participations where title_id = pg_temp.id_of('t1');
insert into ids select 'p_lou', id from public.title_participations where title_id = pg_temp.id_of('t2');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a_simple'), 'accepted');
select public.set_title_participation_status(pg_temp.id_of('p_nadia'), 'confirmed');
reset role;

-- Deliverables of the Stratégie and their sheets, ready for the shoot: one
-- for the whole project, one targeting no title, one targeting title 2; one
-- on the simple project.
insert into public.strategy_deliverables (organization_id, project_id, title)
select pg_temp.id_of('org'), pg_temp.id_of(p), d
  from (values ('c1', 'Clip'), ('c1', 'Coulisses'), ('c1', 'Teaser Lou'), ('c1', 'Live'),
               ('simple', 'Clip simple')) as v (p, d);
insert into ids select 'd_' || lower(replace(title, ' ', '_')), id from public.strategy_deliverables
 where project_id in (pg_temp.id_of('c1'), pg_temp.id_of('simple'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_marketing_title_scope('none', null, pg_temp.id_of('d_coulisses'), null);
select public.set_marketing_title_scope('titles', array[pg_temp.id_of('t2')], pg_temp.id_of('d_teaser_lou'), null);
reset role;
insert into public.production_sheets (organization_id, project_id, deliverable_id, mode, ready_at)
select pg_temp.id_of('org'), d.project_id, d.id, 'direct', now()
  from public.strategy_deliverables d
 where d.project_id in (pg_temp.id_of('c1'), pg_temp.id_of('simple'));
insert into ids select 's_' || lower(replace(d.title, ' ', '_')), s.id
  from public.production_sheets s join public.strategy_deliverables d on d.id = s.deliverable_id
 where s.project_id in (pg_temp.id_of('c1'), pg_temp.id_of('simple'));
insert into public.production_shoots (organization_id, project_id, sheet_id, state)
select organization_id, project_id, id, 'planned' from public.production_sheets
 where project_id in (pg_temp.id_of('c1'), pg_temp.id_of('simple'));

create function pg_temp.start(p_sheet text) returns void language sql as $$
  update public.production_shoots set state = 'in_progress' where sheet_id = pg_temp.id_of(p_sheet);
$$;
grant execute on function pg_temp.start(text) to authenticated;

-- The shoot ------------------------------------------------------------------------------
select throws_like($$ select pg_temp.start('s_clip') $$,
  '%contract_missing%', 'the whole project''s shoot is refused: Nadia''s contract is missing');
select is((select g.artist_name from public.contract_gaps(pg_temp.id_of('c1'), 'shoot', pg_temp.id_of('d_clip')) g),
  'Nadia ' || pg_temp.tag(), 'the gap names the participation (the main artist and a proposed guest are not checked)');
select lives_ok($$ select pg_temp.start('s_coulisses') $$,
  'a deliverable targeting no title checks nothing');
select lives_ok($$ select pg_temp.start('s_teaser_lou') $$,
  'a deliverable targeting title 2 checks only its confirmed participations (none)');
select lives_ok($$ select pg_temp.start('s_clip_simple') $$,
  'a simple project''s shoot is unchanged');

-- The waiver -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'shoot', 'Tournage calé', current_date + 7) $$,
  '42501', 'forbidden', 'the project''s owner does not grant it');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'shoot', '  ', current_date + 7) $$,
  '23514', 'reason_required', 'a reason is required');
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'shoot', 'Tournage calé', null) $$,
  '23514', 'due_required', 'a due date is required');
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'shoot', 'Tournage calé', current_date - 1) $$,
  '23514', 'due_in_past', 'never in the past');
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'tour', 'Tournage calé', current_date + 7) $$,
  '22023', 'invalid_scope', 'shoot or release only');
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_lou'), 'shoot', 'Tournage calé', current_date + 7) $$,
  'P0001', 'participation_not_confirmed', 'only a confirmed participation');
insert into ids select 'w_shoot', public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'shoot',
  'Le contrat part en signature lundi', current_date + 7, 'Image utilisée sans accord écrit');
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'shoot', 'Encore', current_date + 7) $$,
  'P0001', 'waiver_open', 'one open waiver per scope');
reset role;
select is((select granted_by from public.participation_waivers where id = pg_temp.id_of('w_shoot')),
  pg_temp.id_of('director_person'), 'who granted it is kept');
select is((select detail ->> 'scope' from public.project_title_events
            where project_id = pg_temp.id_of('c1') and kind = 'waiver_granted'),
  'shoot', 'the collective''s journal notes it (the Activité)');
select is((select count(*)::int from public.notifications
            where kind = 'participation_waiver_granted' and recipient_person_id = pg_temp.id_of('owner_person')),
  1, 'the project''s owner is told');
select lives_ok($$ select pg_temp.start('s_clip') $$, 'with the waiver, the shoot starts');

-- The release ----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select array_agg(artist_name) from public.list_contract_gaps(pg_temp.id_of('c1'), 'release')),
  array['Nadia ' || pg_temp.tag()], 'a shoot waiver never covers the release');
select is((select count(*)::int from public.list_contract_gaps(pg_temp.id_of('simple'), 'release')),
  0, 'a simple project has no gap');
reset role;
select throws_like($$ insert into public.distribution_versions (organization_id, project_id, number, snapshot, submitted_by)
                      values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 1, '{}'::jsonb, pg_temp.id_of('owner_person')) $$,
  '%contract_missing%', 'a version submitted to the Distribution is refused');

-- Revocation, append-only ------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.revoke_participation_waiver(pg_temp.id_of('w_shoot'), 'Non') $$,
  '42501', 'forbidden', 'only the direction revokes');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.revoke_participation_waiver(pg_temp.id_of('w_shoot'), 'Le contrat est contesté');
select throws_ok($$ select public.revoke_participation_waiver(pg_temp.id_of('w_shoot')) $$,
  'P0001', 'waiver_revoked', 'once');
reset role;
select is((select reason || ' / ' || revoke_reason from public.participation_waivers where id = pg_temp.id_of('w_shoot')),
  'Le contrat part en signature lundi / Le contrat est contesté', 'revoked, nothing overwritten');
select throws_ok($$ update public.participation_waivers set due_on = current_date + 30 where id = pg_temp.id_of('w_shoot') $$,
  'P0001', 'waiver_revoked', 'a revoked waiver never changes');
select is((select count(*)::int from public.project_title_events
            where project_id = pg_temp.id_of('c1') and kind = 'waiver_revoked'),
  1, 'the revocation is in the journal');
select throws_like($$ select pg_temp.start('s_live') $$,
  '%contract_missing%', 'revoked: the next shoot is refused again');

-- A waiver past its due date no longer covers.
insert into public.participation_waivers (organization_id, project_id, participation_id, scope, reason, due_on, granted_by)
values (pg_temp.id_of('org'), pg_temp.id_of('c1'), pg_temp.id_of('p_nadia'), 'shoot', 'Ancienne',
        current_date - 3, pg_temp.id_of('director_person'));
select is((select count(*)::int from public.contract_gaps(pg_temp.id_of('c1'), 'shoot')),
  1, 'a lapsed waiver does not cover');

-- The contract signed: covered for both; no waiver granted any more.
insert into public.contracts (organization_id, title, type, status, signed_on, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Participation ' || pg_temp.tag(), 'other', 'signed', current_date,
        pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
update public.title_participations
   set contract_id = (select id from public.contracts where title = 'Participation ' || pg_temp.tag())
 where id = pg_temp.id_of('p_nadia');
select is((select count(*)::int from public.contract_gaps(pg_temp.id_of('c1'), 'release')),
  0, 'the contract signed covers the release');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.grant_participation_waiver(pg_temp.id_of('p_nadia'), 'release', 'Sortie', current_date + 7) $$,
  'P0001', 'contract_signed', 'nothing to waive once signed');
reset role;

-- The project deleted: its waivers go with it.
select public.delete_project_row(pg_temp.id_of('c1'));
select is((select count(*)::int from public.participation_waivers where project_id = pg_temp.id_of('c1')),
  0, 'delete_project_row empties it');

select * from finish();
rollback;
