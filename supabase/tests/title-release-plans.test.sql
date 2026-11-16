-- Projet collectif, lot 14 (20261114130101, § 3.1 « Sortie ≠ plan de
-- sortie »): each title of a collective has its editorial Plan de sortie,
-- born « Brouillon » with it; the project's owner alone writes it; its
-- statuses follow their rules (a target date read on the title's release,
-- or the compilation's in « compilation » mode); a version is recorded as
-- it is (content, draft, sources) and never changes; a link shows one
-- version, without the draft, until it is withdrawn; a title abandoned
-- archives its plan, reactivated brings it back; a simple project has none.
-- Run with `supabase test db`.
begin;
select plan(42);

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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
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
grant execute on function pg_temp.id_of(text) to authenticated, anon;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated, anon;
create function pg_temp.plan_of(p_title text) returns uuid language sql as $$
  select id from public.title_release_plans where title_id = pg_temp.id_of(p_title) $$;
grant execute on function pg_temp.plan_of(text) to authenticated, anon;
create function pg_temp.status_of(p_title text) returns text language sql as $$
  select status from public.title_release_plans where title_id = pg_temp.id_of(p_title) $$;
grant execute on function pg_temp.status_of(text) to authenticated, anon;
create function pg_temp.doc() returns jsonb language sql as $$
  select jsonb_build_object('kind', 'title_release_plan', 'title', 'Néons', 'phases', '[]'::jsonb,
                            'contents', '[]'::jsonb, 'timeline', '[]'::jsonb) $$;
grant execute on function pg_temp.doc() to authenticated, anon;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou'), ('Mia')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou'), ('mia', 'Mia')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A simple project and two collectives (« singles », « compilation »).
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm_simple', public.create_master(pg_temp.id_of('org'), 'Seul ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Single ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m_simple')], p_music_format => 'single',
  p_assignee_person_id => pg_temp.id_of('owner_person'));
insert into ids select v.name, public.create_collective_project(pg_temp.id_of('org'),
  v.name || ' ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou'), pg_temp.id_of('mia')])
  from (values ('c_singles'), ('c_compil')) as v (name);
reset role;
create function pg_temp.accept(p_project text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.id_of('owner'));
  perform public.respond_to_assignment(
    (select id from public.project_assignments where project_id = pg_temp.id_of(p_project)), 'accepted');
  execute 'reset role';
end $$;
select pg_temp.accept(n) from (values ('simple'), ('c_singles'), ('c_compil')) v (n);
insert into ids select p.name || '_t' || t.position, t.id
  from (values ('c_singles'), ('c_compil')) as p (name)
  join public.project_titles t on t.project_id = pg_temp.id_of(p.name);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('c_singles'), pg_temp.id_of('creative_person'));

-- 1. Born with the titles --------------------------------------------------------------
select is((select count(*)::int || ':' || count(*) filter (where status = 'draft')::int
             from public.title_release_plans where project_id = pg_temp.id_of('c_singles')),
  '3:3', 'each title of a collective has its plan, born « Brouillon »');
select is((select count(*)::int from public.title_release_plan_events e
             join public.title_release_plans p on p.id = e.plan_id
            where p.project_id = pg_temp.id_of('c_singles') and e.from_status is null
              and e.to_status = 'draft'),
  3, 'each birth is in the journal');
select is((select count(*)::int from public.title_release_plans where project_id = pg_temp.id_of('simple')),
  0, 'a simple project has no title plan');
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'c_singles_t4', public.add_project_title(pg_temp.id_of('c_singles'), 'Quatre');
reset role;
select is(pg_temp.status_of('c_singles_t4'), 'draft', 'a title added later gets its plan');

-- 2. The draft, by the owner alone -----------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '{"objective": "x"}') $$,
  '42501', 'forbidden', 'a member of the team does not write the plan');
select is((select count(*)::int from public.title_release_plans where project_id = pg_temp.id_of('c_singles')),
  4, 'but reads the plans of the project');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '{"objective": "x"}') $$,
  '42501', 'forbidden', 'nor does the direction (the owner writes it, as the project''s plan)');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '{"objective": "Faire découvrir Nadia", "priority": "high"}');
select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '{"platforms": ["Spotify"]}');
select is((select config ->> 'objective' || '|' || (config -> 'platforms' ->> 0) || '|' || (config ->> 'priority')
             from public.title_release_plans where id = pg_temp.plan_of('c_singles_t1')),
  'Faire découvrir Nadia|Spotify|high', 'each part saved keeps the others');
select throws_ok($$ select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '["x"]') $$,
  '22023', 'invalid_input', 'a draft is an object');
select throws_ok($$ update public.title_release_plans set status = 'active' where id = pg_temp.plan_of('c_singles_t1') $$,
  '42501', null, 'no one writes a plan but through its functions');

-- 3. Statuses before the release has a date --------------------------------------------
select throws_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'draft', 'provisional') $$,
  'P0001', 'no_target_date', 'no planning provisoire without a target date');
select throws_ok($$ select public.record_title_release_plan_version(pg_temp.plan_of('c_singles_t1'), 'draft', pg_temp.doc()) $$,
  'P0001', 'not_provisional', 'no version from a draft');
select throws_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'draft', 'active') $$,
  'P0001', 'invalid_transition', 'a status does not jump ahead');
reset role;

-- The plans launched, titles 1 and 2 in the Catalogue: their releases (lot 13).
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.ensure_project_title_master(pg_temp.id_of(p || '_t' || n))
  from (values ('c_singles'), ('c_compil')) v (p), (values (1), (2)) w (n);
select public.set_collective_release_mode(pg_temp.id_of('c_compil'), 'compilation');
reset role;
update public.projects set due_date = date '2027-03-01'
 where id in (pg_temp.id_of('c_singles'), pg_temp.id_of('c_compil'));
insert into public.project_plans (organization_id, project_id, launched_by)
select pg_temp.id_of('org'), pg_temp.id_of(n), pg_temp.id_of('owner_person')
  from (values ('c_singles'), ('c_compil')) v (n);
update public.releases set planned_release_date = date '2027-01-15'
 where project_title_id = pg_temp.id_of('c_singles_t1');

select is(public.title_release_plan_target_date(pg_temp.id_of('c_singles_t1')), date '2027-01-15',
  'the target date is the title''s release''s');
select is(public.title_release_plan_target_date(pg_temp.id_of('c_compil_t3')), date '2027-03-01',
  'in « compilation » mode, the compilation''s (a title without its own release)');

-- 4. From the provisional planning to the shared versions --------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t3'), 'draft', 'provisional') $$,
  'P0001', 'no_target_date', 'a title without its release has no target date yet (« singles »)');
select lives_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_compil_t3'), 'draft', 'provisional') $$,
  'with the compilation''s date, it does');
select throws_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'provisional', 'internal') $$,
  'P0001', 'status_changed', 'a status that changed in between is refused (two tabs)');
select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'draft', 'provisional');
select is(pg_temp.status_of('c_singles_t1'), 'provisional', 'planning provisoire');
insert into ids select 'v1', public.record_title_release_plan_version(pg_temp.plan_of('c_singles_t1'), 'provisional',
  pg_temp.doc(), '[{"key": "d:00000000-0000-0000-0000-000000000001", "label": "Clip", "fp": "a"}]',
  'Accord de principe');
select is((select v.version || ':' || v.status || ':' || p.status || ':' || (v.config ->> 'objective')
             from public.title_release_plan_versions v
             join public.title_release_plans p on p.id = v.plan_id where v.id = pg_temp.id_of('v1')),
  '1:internal:internal:Faire découvrir Nadia',
  'the internal version: number, status, the plan''s status, the draft it came from');
select is((select created_by from public.title_release_plan_versions where id = pg_temp.id_of('v1')),
  pg_temp.id_of('owner_person'), 'with its author');
select is((select count(*)::int from public.title_release_plan_events
            where version_id = pg_temp.id_of('v1') and from_status = 'provisional' and to_status = 'internal'
              and note = 'Accord de principe'),
  1, 'in the journal, with its note');
select throws_ok($$ select public.share_title_release_plan_version(pg_temp.id_of('v1')) $$,
  'P0001', 'not_shareable', 'an internal version is not shared');
select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'internal', 'ready_to_share');
insert into ids select 'link1', public.share_title_release_plan_version(pg_temp.id_of('v1'));
select is(public.share_title_release_plan_version(pg_temp.id_of('v1')), pg_temp.id_of('link1'),
  'a version''s link is created once, then reused');
reset role;

set local role anon;
select is((public.get_shared_title_release_plan(pg_temp.id_of('link1')) ->> 'version')::int, 1,
  'read without an account by its link');
select is(public.get_shared_title_release_plan(pg_temp.id_of('link1')) ?| array['config', 'sources'], false,
  'the link gives the document only: never the draft nor the sources');
select throws_ok($$ select count(*) from public.title_release_plan_versions $$,
  '42501', null, 'anon reads no table');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '{"objective": "Faire découvrir Nadia et Lou"}');
insert into ids select 'v2', public.record_title_release_plan_version(pg_temp.plan_of('c_singles_t1'), 'ready_to_share',
  jsonb_set(pg_temp.doc(), '{title}', '"Néons (révisé)"'));
select is((select status from public.title_release_plan_versions where id = pg_temp.id_of('v2'))
          || ':' || pg_temp.status_of('c_singles_t1'),
  'revised:revised', 'a version after sharing is a version révisée');
reset role;
set local role anon;
select is(public.get_shared_title_release_plan(pg_temp.id_of('link1')) -> 'content' ->> 'title', 'Néons',
  'the version already shared does not change');
reset role;
select is((select config ->> 'objective' from public.title_release_plan_versions where id = pg_temp.id_of('v1')),
  'Faire découvrir Nadia', 'nor does its draft');
select pg_temp.act_as(pg_temp.id_of('owner'));
select isnt(public.share_title_release_plan_version(pg_temp.id_of('v2')), pg_temp.id_of('link1'),
  'the new version has its own link');
select public.revoke_title_release_plan_link(pg_temp.id_of('v1'));
select throws_ok($$ select public.revoke_title_release_plan_link(pg_temp.id_of('v1')) $$,
  'P0001', 'no_link', 'a withdrawn link is withdrawn once');
reset role;
set local role anon;
select is(public.get_shared_title_release_plan(pg_temp.id_of('link1')), null,
  'a withdrawn link no longer opens');
reset role;

-- 5. Active, archived, reopened ----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'revised', 'active');
select throws_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'active', 'archived') $$,
  'P0001', 'note_required', 'archiving says the review');
select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'active', 'archived', 'Bilan fait');
select throws_ok($$ select public.save_title_release_plan(pg_temp.plan_of('c_singles_t1'), '{"objective": "y"}') $$,
  'P0001', 'plan_archived', 'an archived plan is read only');
select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'archived', 'active');
select is(pg_temp.status_of('c_singles_t1'), 'active', 'reopened, it gets its status back');

-- 6. The title abandoned, reactivated ------------------------------------------------------
select public.abandon_project_title(pg_temp.id_of('c_singles_t1'), 'Pas retenu');
select is((select status || ':' || archived_reason || ':' || status_before_archive
             from public.title_release_plans where id = pg_temp.plan_of('c_singles_t1')),
  'archived:title_abandoned:active', 'a title abandoned archives its plan');
select throws_ok($$ select public.set_title_release_plan_status(pg_temp.plan_of('c_singles_t1'), 'archived', 'active') $$,
  'P0001', 'title_abandoned', 'it is not reopened while the title is abandoned');
select public.reactivate_project_title(pg_temp.id_of('c_singles_t1'));
select is(pg_temp.status_of('c_singles_t1'), 'active', 'reactivated, the plan gets its status back');
reset role;
select is((select string_agg(reason, ',' order by created_at) from public.title_release_plan_events
            where plan_id = pg_temp.plan_of('c_singles_t1') and reason in ('title_abandoned', 'title_reactivated')),
  'title_abandoned,title_reactivated', 'both in the journal');

-- 7. Append only, emptied with the project ------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ update public.title_release_plan_versions set note = 'x' where id = pg_temp.id_of('v1') $$,
  '42501', null, 'a version is never rewritten');
reset role;
select public.delete_project_row(pg_temp.id_of('c_singles'));
select is((select count(*)::int from public.title_release_plans where project_id = pg_temp.id_of('c_singles'))
          + (select count(*)::int from public.title_release_plan_versions where project_id = pg_temp.id_of('c_singles'))
          + (select count(*)::int from public.title_release_plan_events where project_id = pg_temp.id_of('c_singles')),
  0, 'delete_project_row empties the plans, their versions and journal');

select * from finish();
rollback;
