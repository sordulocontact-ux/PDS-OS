-- Projet collectif, lot 13 (20261114120101, décision 7, § 3 bis): a simple
-- project keeps one release dated by its due date; a collective releases by
-- its mode: « singles » (one per live title with a master), « compilation »
-- (one release of the project), « singles_then_compilation » (both). A
-- title's release keeps its own date; changing mode archives what it no
-- longer uses and brings it back, refused once that release is out; the
-- release lock of lot 12 holds for a title's release and the compilation.
-- Run with `supabase test db`.
begin;
select plan(30);

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
  from (values ('PDS'), ('Nadia'), ('Lou'), ('Mia')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou'), ('mia', 'Mia')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A simple project and three collectives (one per mode), each with titles.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm_simple', public.create_master(pg_temp.id_of('org'), 'Seul ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Single ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m_simple')], p_music_format => 'single',
  p_assignee_person_id => pg_temp.id_of('owner_person'));
insert into ids select v.name, public.create_collective_project(pg_temp.id_of('org'),
  v.name || ' ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou'), pg_temp.id_of('mia')])
  from (values ('c_singles'), ('c_compil'), ('c_both')) as v (name);
reset role;
create function pg_temp.accept(p_project text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(pg_temp.id_of('owner'));
  perform public.respond_to_assignment(
    (select id from public.project_assignments where project_id = pg_temp.id_of(p_project)), 'accepted');
  execute 'reset role';
end $$;
select pg_temp.accept(n) from (values ('simple'), ('c_singles'), ('c_compil'), ('c_both')) v (n);
insert into ids select p.name || '_t' || t.position, t.id
  from (values ('c_singles'), ('c_compil'), ('c_both')) as p (name)
  join public.project_titles t on t.project_id = pg_temp.id_of(p.name);
-- Titles 1 and 2 in the Catalogue (title 3 waits for its first audio).
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.ensure_project_title_master(pg_temp.id_of(p || '_t' || n))
  from (values ('c_singles'), ('c_compil'), ('c_both')) v (p), (values (1), (2)) w (n);
reset role;
update public.projects set due_date = date '2027-03-01'
 where id in (pg_temp.id_of('simple'), pg_temp.id_of('c_singles'), pg_temp.id_of('c_compil'),
              pg_temp.id_of('c_both'));

-- The distributor a release is delivered to.
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Orchard ' || pg_temp.tag(), array['distributor']);
insert into ids select 'orchard', id from public.network_contacts where name = 'Orchard ' || pg_temp.tag();
create function pg_temp.deliver(p_title text) returns void language sql as $$
  update public.releases
     set delivered_on = current_date, delivery_recorded_at = now(),
         delivered_to_contact_id = pg_temp.id_of('orchard')
   where project_title_id = pg_temp.id_of(p_title);
$$;
grant execute on function pg_temp.deliver(text) to authenticated;
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('c_compil'), pg_temp.id_of('creative_person'));

-- The modes, set before the plan by who writes the titles.
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('c_compil'), 'compilation') $$,
  '42501', 'forbidden', 'a member of the team does not set the mode');
reset role;
select is((select collective_release_mode from public.projects where id = pg_temp.id_of('c_singles')),
  'singles', 'a collective releases title by title by default');
select is((select collective_release_mode from public.projects where id = pg_temp.id_of('simple')),
  null, 'a simple project has no mode');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_collective_release_mode(pg_temp.id_of('c_compil'), 'compilation');
select public.set_collective_release_mode(pg_temp.id_of('c_both'), 'singles_then_compilation');
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('c_both'), 'singles_then_compilation') $$,
  'P0001', 'mode_unchanged', 'the same mode again is refused');
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('c_both'), 'albums') $$,
  '22023', 'invalid_mode', 'an unknown mode is refused');
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('simple'), 'singles') $$,
  '23514', 'not_collective', 'a simple project has no mode to set');
reset role;
select is((select count(*)::int from public.releases
            where project_id in (pg_temp.id_of('c_singles'), pg_temp.id_of('c_compil'), pg_temp.id_of('c_both'))),
  0, 'no release before the plan is launched');

-- The plans launched -------------------------------------------------------------------
insert into public.project_plans (organization_id, project_id, launched_by)
select pg_temp.id_of('org'), pg_temp.id_of(n), pg_temp.id_of('owner_person')
  from (values ('simple'), ('c_singles'), ('c_compil'), ('c_both')) v (n);

select is((select count(*)::int || ':' || min(planned_release_date)::text from public.releases
            where project_id = pg_temp.id_of('simple')),
  '1:2027-03-01', 'a simple project: one release, dated by its due date (unchanged)');
select is((select count(*)::int from public.releases
            where project_id = pg_temp.id_of('simple') and project_title_id is not null),
  0, 'and no release of a title');
select is((select count(*)::int || ':' || count(*) filter (where project_title_id is null)::int
             from public.releases where project_id = pg_temp.id_of('c_singles')),
  '2:0', '« singles »: one release per live title with a master, no release of the project');
select is((select count(*)::int || ':' || count(*) filter (where project_title_id is null)::int
             from public.releases where project_id = pg_temp.id_of('c_compil')),
  '1:1', '« compilation »: one release of the project only');
select is((select count(*)::int || ':' || count(*) filter (where project_title_id is null)::int
             from public.releases where project_id = pg_temp.id_of('c_both')),
  '3:1', '« singles_then_compilation »: N + 1');
select is((select planned_release_date from public.releases
            where project_id = pg_temp.id_of('c_both') and project_title_id is null),
  date '2027-03-01', 'the compilation is dated by the project''s due date');

-- A title's own date ---------------------------------------------------------------------
update public.releases set planned_release_date = date '2026-12-04'
 where project_title_id = pg_temp.id_of('c_both_t1');
update public.releases set planned_release_date = date '2027-01-15'
 where project_title_id = pg_temp.id_of('c_both_t2');
update public.projects set due_date = date '2027-04-02' where id = pg_temp.id_of('c_both');
update public.projects set due_date = date '2027-04-02' where id = pg_temp.id_of('simple');
select is((select array_agg(planned_release_date order by planned_release_date) from public.releases
            where project_id = pg_temp.id_of('c_both') and project_title_id is not null),
  array[date '2026-12-04', date '2027-01-15'], 'each title keeps its own date when the due date moves');
select is((select planned_release_date from public.releases
            where project_id = pg_temp.id_of('c_both') and project_title_id is null),
  date '2027-04-02', 'the compilation follows the due date');
select is((select planned_release_date from public.releases where project_id = pg_temp.id_of('simple')),
  date '2027-04-02', 'a simple project''s release follows its due date (unchanged)');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.next_release_date(pg_temp.id_of('c_both')), date '2026-12-04',
  '« the » release date of a collective: its earliest release');
reset role;

-- A title reaches the Catalogue later, one is abandoned ------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.ensure_project_title_master(pg_temp.id_of('c_both_t3'));
select public.abandon_project_title(pg_temp.id_of('c_both_t1'), 'Pas retenu');
reset role;
select is((select count(*)::int from public.releases where project_title_id = pg_temp.id_of('c_both_t3')),
  1, 'a title in the Catalogue later gets its release');
select is((select count(*)::int from public.releases
            where project_title_id = pg_temp.id_of('c_both_t1') and archived_at is null),
  1, 'an abandoned title keeps its release (history)');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.next_release_date(pg_temp.id_of('c_both')), date '2027-01-15',
  'but leaves the counts');
reset role;

-- One UPC per release (the owner writes it on the release itself).
select pg_temp.act_as(pg_temp.id_of('owner'));
update public.releases set upc = '3700187680113'
 where project_id = pg_temp.id_of('c_both') and project_title_id is null;
reset role;
select is((select count(*)::int from public.releases
            where project_id = pg_temp.id_of('c_both') and upc is not null),
  1, 'the compilation''s UPC is its own, never the titles''');

-- Changing mode: archived, brought back, refused once out --------------------------------------
insert into ids select 'compil', id from public.releases
 where project_id = pg_temp.id_of('c_both') and project_title_id is null;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_collective_release_mode(pg_temp.id_of('c_both'), 'singles');
reset role;
select is((select archived_at is not null from public.releases where id = pg_temp.id_of('compil')),
  true, 'to « singles »: the compilation is archived, not deleted');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_collective_release_mode(pg_temp.id_of('c_both'), 'singles_then_compilation');
reset role;
select is((select archived_at from public.releases where id = pg_temp.id_of('compil')),
  null, 'back: the same compilation comes back');
select is((select count(*)::int from public.project_title_events
            where project_id = pg_temp.id_of('c_both') and kind = 'release_mode_changed'),
  3, 'each change is in the collective''s journal');

-- A title's release delivered: « compilation » would take it away.
select pg_temp.deliver('c_both_t2');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('c_both'), 'compilation') $$,
  'P0001', 'single_released', 'a title''s release already out stays');
reset role;
-- The compilation submitted to the Distribution: « singles » would take it away.
insert into public.distribution_versions (organization_id, project_id, number, snapshot, submitted_by,
                                          validator_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('c_compil'), 1, '{}'::jsonb, pg_temp.id_of('owner_person'),
        pg_temp.id_of('director_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_collective_release_mode(pg_temp.id_of('c_compil'), 'singles') $$,
  'P0001', 'compilation_submitted', 'a compilation submitted stays');
reset role;

-- The release lock of lot 12, per release ---------------------------------------------------
insert into ids select 'p_lou', id from public.title_participations
 where title_id = pg_temp.id_of('c_singles_t2');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_status(pg_temp.id_of('p_lou'), 'confirmed');
reset role;
select throws_like($$ select pg_temp.deliver('c_singles_t2') $$,
  '%contract_missing%', 'a title''s release with a contract not signed is not delivered');
select lives_ok($$ select pg_temp.deliver('c_singles_t1') $$,
  'another title''s release is (its title has no confirmed participation)');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.grant_participation_waiver(pg_temp.id_of('p_lou'), 'release', 'Sortie calée', current_date + 7);
reset role;
select lives_ok($$ select pg_temp.deliver('c_singles_t2') $$,
  'with a waiver of the release, it goes out');

-- The project deleted: its releases go with it.
select public.delete_project_row(pg_temp.id_of('c_both'));
select is((select count(*)::int from public.releases where project_id = pg_temp.id_of('c_both')),
  0, 'delete_project_row takes the titles'' releases too');

select * from finish();
rollback;
