-- Projet collectif, lot 7 (20261113180101, docs/pds-mic-plan.md § 3.3,
-- décision 3): a title without a name gets its title in the Catalogue at
-- its first audio or session, a maquette under a provisional name, credited
-- to the main artist (main) and its confirmed guests (featuring), linked to
-- the project; naming the title names its master; a title of the Catalogue
-- for a title that has none; who may do what.
-- Run with `supabase test db`.
begin;
select plan(31);

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
  from (values ('director'), ('owner'), ('other'), ('creative')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other', 'creative');

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

-- A content collective with two guests (a title without a name each), its
-- creative director on the team, accepted (launched) by « owner ».
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')],
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou')]);
insert into ids select 'm_cat', public.create_master(pg_temp.id_of('org'), 'Catalogue ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
reset role;
insert into ids select 'assignment', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
insert into ids select 'p_' || a.name, tp.id from public.title_participations tp
  join public.artists a2 on a2.id = tp.artist_id
  join (values ('nadia'), ('lou')) as a (name) on a2.id = pg_temp.id_of(a.name)
 where tp.project_id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('assignment'), 'accepted');
select public.set_title_participation_status(pg_temp.id_of('p_nadia'), 'confirmed');
reset role;

select is((select title_is_provisional from public.masters where id = pg_temp.id_of('m_cat')),
  false, 'a title of the Catalogue is not provisional');
select is((select count(*)::int from public.project_titles
            where project_id = pg_temp.id_of('c1') and master_id is null),
  2, 'two titles without a master yet');

-- Who starts a title's work ---------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.ensure_project_title_master(pg_temp.id_of('t1')) $$,
  '42501', 'forbidden', 'a creative director of the team does not create it');
reset role;

-- The first audio of « Titre 1 · sans nom » ------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'm1', public.ensure_project_title_master(pg_temp.id_of('t1'));
select isnt(pg_temp.id_of('m1'), null, 'the owner gets the title''s master');
select is(public.ensure_project_title_master(pg_temp.id_of('t1')), pg_temp.id_of('m1'),
  'the same master the second time, none created');
reset role;
select is((select title from public.masters where id = pg_temp.id_of('m1')),
  'Sans titre · Nadia ' || pg_temp.tag() || ' · Mic ' || pg_temp.tag(),
  'a readable provisional name: its first artist and the project');
select is((select title_is_provisional from public.masters where id = pg_temp.id_of('m1')),
  true, 'marked provisional');
select is((select demo_status from public.masters where id = pg_temp.id_of('m1')),
  'draft', 'a maquette in draft');
select is((select array_agg(artist_id::text || ':' || role order by position)
             from public.master_artists where master_id = pg_temp.id_of('m1')),
  array[pg_temp.id_of('pds')::text || ':main', pg_temp.id_of('nadia')::text || ':featuring'],
  'credited to the main artist (main, first) and the confirmed guest (featuring)');
select is((select master_id from public.project_titles where id = pg_temp.id_of('t1')),
  pg_temp.id_of('m1'), 'the title holds it');
select is((select status from public.project_titles where id = pg_temp.id_of('t1')),
  'active', 'and is active');
select is((select count(*)::int from public.project_masters
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('m1')),
  1, 'linked to the project (its Master history is kept)');
select is((select count(*)::int from public.project_titles where project_id = pg_temp.id_of('c1')),
  2, 'no title added by the link');
select is((select detail->>'master_provisional' from public.project_title_events
            where title_id = pg_temp.id_of('t1') and kind = 'cataloged'),
  'true', 'the history says it, the provisional name marked as such');

-- Studio sessions: who runs them may start it too, on a project they see.
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.ensure_project_title_master(pg_temp.id_of('t2')) $$,
  'P0002', 'title_not_found', 'a project manager who does not see the project does not');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm2', public.ensure_project_title_master(pg_temp.id_of('t2'));
reset role;
select is((select title from public.masters where id = pg_temp.id_of('m2')),
  'Sans titre · Lou ' || pg_temp.tag() || ' · Mic ' || pg_temp.tag(),
  'the direction (sessions, launched project) starts « Titre 2 »; a proposed guest names it');
select is((select array_agg(role order by position) from public.master_artists
            where master_id = pg_temp.id_of('m2')),
  array['main'], 'a guest not confirmed is not credited');

-- Naming the title names its master -------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.rename_project_title(pg_temp.id_of('t1'), 'Néons');
reset role;
select is((select title || '|' || title_is_provisional::text from public.masters where id = pg_temp.id_of('m1')),
  'Néons|false', 'the master takes the name, no longer provisional');
select is((select detail->>'master_named' from public.project_title_events
            where title_id = pg_temp.id_of('t1') and kind = 'renamed'),
  'true', 'the renaming says it named the master');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.rename_project_title(pg_temp.id_of('t1'), 'Néons bis');
reset role;
select is((select title from public.masters where id = pg_temp.id_of('m1')),
  'Néons', 'a master already named keeps its name (the working title changes alone)');

-- Renamed in the Catalogue: no longer provisional either.
update public.masters set title = 'Marée' where id = pg_temp.id_of('m2');
select is((select title_is_provisional from public.masters where id = pg_temp.id_of('m2')),
  false, 'any rename of the master ends the provisional name');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ update public.masters set title_is_provisional = true where id = pg_temp.id_of('m2') $$,
  '42501', null, 'the browser never writes the mark');
reset role;

-- A title of the Catalogue for a title that has none ----------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 't3', public.add_project_title(pg_temp.id_of('c1'), null, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.attach_master_to_project_title(pg_temp.id_of('t3'), pg_temp.id_of('m_cat')) $$,
  '42501', 'forbidden', 'a creative director does not attach a title');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.attach_master_to_project_title(pg_temp.id_of('t3'), pg_temp.id_of('m1')) $$,
  '23505', 'title_already_in_project', 'a title already in the project is refused');
select lives_ok($$ select public.attach_master_to_project_title(pg_temp.id_of('t3'), pg_temp.id_of('m_cat')) $$,
  'the owner attaches a title of the Catalogue to « Titre 3 · sans nom »');
select throws_ok($$ select public.attach_master_to_project_title(pg_temp.id_of('t3'), pg_temp.id_of('m_cat')) $$,
  'P0001', 'title_has_master', 'never a title that has its master');
reset role;
select is((select master_id::text || '|' || status from public.project_titles where id = pg_temp.id_of('t3')),
  pg_temp.id_of('m_cat')::text || '|active', 'the title holds it, active');
select is((select count(*)::int from public.project_masters
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('m_cat')),
  1, 'linked to the project');
select is((select count(*)::int from public.project_title_events
            where title_id = pg_temp.id_of('t3') and kind = 'master_attached'),
  1, 'in the history');

-- An abandoned title waits for its reactivation.
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 't4', public.add_project_title(pg_temp.id_of('c1'), 'Vieille idée', null);
select public.abandon_project_title(pg_temp.id_of('t4'), 'Pas retenu');
select throws_ok($$ select public.ensure_project_title_master(pg_temp.id_of('t4')) $$,
  'P0001', 'title_abandoned', 'an abandoned title gets no master');
select throws_ok($$ select public.attach_master_to_project_title(pg_temp.id_of('t4'), pg_temp.id_of('m_cat')) $$,
  'P0001', 'title_abandoned', 'nor a title of the Catalogue');
reset role;

select * from finish();
rollback;
