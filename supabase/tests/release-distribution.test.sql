-- Projet collectif, lot 15 (20261114140101, § 3 bis point 7): the
-- Distribution per release. A simple project keeps its one dossier
-- (release_id null), as before; a collective has one per release (a title's
-- release, the compilation), never shared, never reached without its
-- release. A submission is refused for a provisional title, a contract not
-- signed without a release waiver (lot 12), an archived release or an
-- abandoned title; once covered, each release submits its own V1.
-- Run with `supabase test db`.
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
  from (values ('director'), ('owner')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou'), ('Mia')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou'), ('mia', 'Mia')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A simple project, and a collective of three titles (one per guest),
-- released title by title then as a compilation.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm_simple', public.create_master(pg_temp.id_of('org'), 'Seul ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Single ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m_simple')], p_music_format => 'single',
  p_assignee_person_id => pg_temp.id_of('owner_person'));
insert into ids select 'c', public.create_collective_project(pg_temp.id_of('org'),
  'Collectif ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou'), pg_temp.id_of('mia')]);
reset role;
create function pg_temp.accept(p_project text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.id_of('owner'));
  perform public.respond_to_assignment(
    (select id from public.project_assignments where project_id = pg_temp.id_of(p_project)), 'accepted');
  execute 'reset role';
end $$;
select pg_temp.accept(n) from (values ('simple'), ('c')) v (n);
insert into ids select 't' || t.position, t.id
  from public.project_titles t where t.project_id = pg_temp.id_of('c');
insert into ids select 'p' || t.position, tp.id
  from public.project_titles t join public.title_participations tp on tp.title_id = t.id
 where t.project_id = pg_temp.id_of('c');

-- Titles 1 and 2 named, title 3 keeps its provisional name; Lou confirmed
-- on title 2, without a contract.
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_collective_release_mode(pg_temp.id_of('c'), 'singles_then_compilation');
select public.ensure_project_title_master(pg_temp.id_of('t' || n)) from generate_series(1, 3) n;
select public.rename_project_title(pg_temp.id_of('t1'), 'Néons');
select public.rename_project_title(pg_temp.id_of('t2'), 'Marina');
select public.set_title_participation_status(pg_temp.id_of('p2'), 'confirmed');
reset role;
update public.projects set due_date = date '2027-03-01'
 where id in (pg_temp.id_of('simple'), pg_temp.id_of('c'));
insert into public.project_plans (organization_id, project_id, launched_by)
select pg_temp.id_of('org'), pg_temp.id_of(n), pg_temp.id_of('owner_person')
  from (values ('simple'), ('c')) v (n);
insert into ids select 'r' || t.position, r.id
  from public.releases r join public.project_titles t on t.id = r.project_title_id
 where r.project_id = pg_temp.id_of('c');
insert into ids select 'compil', id from public.releases
 where project_id = pg_temp.id_of('c') and project_title_id is null;
insert into ids select 'r_simple', id from public.releases where project_id = pg_temp.id_of('simple');
update public.releases set planned_release_date = date '2027-01-15' where id = pg_temp.id_of('r1');

-- Scope ----------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_distribution_validator(pg_temp.id_of('simple'),
                     pg_temp.id_of('director_person')) $$,
  'a simple project: its dossier, called as before');
reset role;
select is((select count(*)::int || ':' || count(release_id)::int from public.distribution_dossiers
            where project_id = pg_temp.id_of('simple')),
  '1:0', 'one dossier, without a release (unchanged)');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('simple'),
                      pg_temp.id_of('director_person'), pg_temp.id_of('r_simple')) $$,
  'P0001', 'release_not_found', 'a simple project has no release to aim at');
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('c'),
                      pg_temp.id_of('director_person')) $$,
  'P0001', 'release_required', 'a collective without its release is refused, never guessed');
select throws_ok($$ select public.set_distribution_validator(pg_temp.id_of('c'),
                      pg_temp.id_of('director_person'), pg_temp.id_of('r_simple')) $$,
  'P0001', 'release_not_found', 'another project''s release is refused');
select public.set_distribution_validator(pg_temp.id_of('c'), pg_temp.id_of('director_person'),
  pg_temp.id_of('r' || n)) from generate_series(1, 3) n;
select public.set_distribution_validator(pg_temp.id_of('c'), pg_temp.id_of('director_person'),
  pg_temp.id_of('compil'));
reset role;
select is((select count(distinct release_id)::int from public.distribution_dossiers
            where project_id = pg_temp.id_of('c')),
  4, 'a collective: one dossier per release (three titles, the compilation)');
select throws_ok($$ insert into public.distribution_dossiers (organization_id, project_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('c')) $$,
  '23514', 'release_required', 'no line of a collective''s Distribution without its release');
select throws_ok($$ insert into public.distribution_events (organization_id, project_id, release_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('c'), pg_temp.id_of('r_simple'), 'validator.set') $$,
  '23503', null, 'nor with a release of another project');
select throws_ok($$ insert into public.distribution_checks (organization_id, project_id, release_id, check_key)
                    values (pg_temp.id_of('org'), pg_temp.id_of('c'), pg_temp.id_of('r1'), 'audio'),
                           (pg_temp.id_of('org'), pg_temp.id_of('c'), pg_temp.id_of('r1'), 'audio') $$,
  '23505', null, 'one check per key and release');

-- Two releases never share a check -------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.record_distribution_check(pg_temp.id_of('c'), 'audio', 'compliant', null,
  pg_temp.id_of('r1'));
reset role;
select is((select count(*)::int from public.distribution_checks
            where release_id = pg_temp.id_of('r2') and result <> 'unchecked'),
  0, 'a check recorded for a title''s release is not the other''s');

-- The submission lock --------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('c'), '{}'::jsonb,
                      pg_temp.id_of('r3')) $$,
  'P0001', 'title_provisional', 'a provisional title is never submitted');
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('c'), '{}'::jsonb,
                      pg_temp.id_of('r2')) $$,
  'P0001', 'contract_missing', 'nor a title with a confirmed participation and no contract');
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('c'), '{}'::jsonb,
                      pg_temp.id_of('compil')) $$,
  'P0001', 'title_provisional', 'nor the compilation while one of its titles is');
select is((select array_agg(code order by code) from public.release_submission_blockers(pg_temp.id_of('compil'))),
  array['contract_missing', 'title_provisional'], 'the screens read every refusal of the compilation');
select is((select detail from public.release_submission_blockers(pg_temp.id_of('r2'))),
  'Lou ' || pg_temp.tag() || ' (Marina)', 'with the contract missing named');
select is((select count(*)::int from public.release_submission_blockers(pg_temp.id_of('r1'))),
  0, 'title 1 has nothing against it');
reset role;

-- A release waiver lifts the contract's refusal (lot 12).
select pg_temp.act_as(pg_temp.id_of('director'));
select public.grant_participation_waiver(pg_temp.id_of('p2'), 'release', 'Sortie calée', current_date + 7);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('c'), '{}'::jsonb,
                      pg_temp.id_of('r2')) $$,
  'P0001', 'params_not_confirmed', 'with the waiver, the contract no longer refuses (the dossier still waits)');

-- Two releases submit their own V1.
update public.distribution_dossiers set preorder = false, prelisten = false, price_tier = 'front'
 where release_id in (pg_temp.id_of('r1'), pg_temp.id_of('r2'));
update public.distribution_dossiers set prelisten = true, prelisten_on = date '2027-02-01'
 where release_id = pg_temp.id_of('r1');
select throws_ok($$ select public.confirm_distribution_params(pg_temp.id_of('c'), null, null, null,
                      pg_temp.id_of('r1')) $$,
  'P0001', 'date_after_release', 'a pre-listening after the title''s own release date is refused');
update public.distribution_dossiers set prelisten = false, prelisten_on = null
 where release_id = pg_temp.id_of('r1');
select public.confirm_distribution_params(pg_temp.id_of('c'), null, null, null, pg_temp.id_of('r' || n))
  from generate_series(1, 2) n;
select public.record_distribution_check(pg_temp.id_of('c'), k, 'compliant', null, pg_temp.id_of('r' || n))
  from unnest(array['audio', 'identity', 'identifiers', 'rights', 'visual', 'calendar']) k,
       generate_series(1, 2) n;
select is(public.submit_distribution_version(pg_temp.id_of('c'), '{"format": 1}'::jsonb,
            pg_temp.id_of('r1')), 1, 'title 1''s release submits its V1');
select is(public.submit_distribution_version(pg_temp.id_of('c'), '{"format": 1}'::jsonb,
            pg_temp.id_of('r2')), 1, 'title 2''s release its own V1');
reset role;
select is((select string_agg(version_number || ':' || version_status, ',' order by version_number)
             from public.release_distribution_states(pg_temp.id_of('c'))
            where release_id in (pg_temp.id_of('r1'), pg_temp.id_of('r2'))),
  '1:pending,1:pending', '« Titres et artistes » and « Sorties » read each release''s deposit');
select is((select count(*)::int from public.distribution_events
            where project_id = pg_temp.id_of('c') and release_id is null),
  0, 'every event of the collective is its release''s');
-- The owner writes a release's parameters directly (RLS): frozen while its
-- own version waits, free on another release.
select ok(has_column_privilege('authenticated', 'public.distribution_dossiers', 'release_id', 'INSERT'),
  'a release''s dossier is created with its release by the owner''s session');
select pg_temp.act_as(pg_temp.id_of('owner'));
with done as (update public.distribution_dossiers set notes = 'Gelé ?'
               where release_id = pg_temp.id_of('r1') returning id)
insert into vars select 'frozen', count(*)::text from done;
with done as (update public.distribution_dossiers set notes = 'Libre'
               where release_id = pg_temp.id_of('r3') returning id)
insert into vars select 'free', count(*)::text from done;
reset role;
select is((select v from vars where k = 'frozen'), '0',
  'a release''s dossier is frozen while its V1 waits');
select is((select v from vars where k = 'free'), '1',
  'another release''s dossier stays editable');

-- A title's release submitted is out: « compilation » would take it away.
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('c'), 'compilation') $$,
  'P0001', 'single_released', 'a title''s release submitted to the Distribution stays');

-- An abandoned title leaves the compilation, its own release is refused.
select public.abandon_project_title(pg_temp.id_of('t3'), 'Pas retenu');
select throws_ok($$ select public.submit_distribution_version(pg_temp.id_of('c'), '{}'::jsonb,
                      pg_temp.id_of('r3')) $$,
  'P0001', 'title_abandoned', 'an abandoned title''s release is not submitted');
reset role;
select is((select array_agg(code) from public.release_submission_blockers(pg_temp.id_of('compil'))),
  null, 'the compilation no longer counts the abandoned title');

select public.delete_project_row(pg_temp.id_of('c'));
select is((select count(*)::int from public.distribution_dossiers where project_id = pg_temp.id_of('c')),
  0, 'delete_project_row takes every release''s Distribution');

select * from finish();
rollback;
