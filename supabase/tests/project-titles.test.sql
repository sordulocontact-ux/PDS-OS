-- Projet collectif, lot 2 (…20261111120101, docs/pds-mic-plan.md § 3): the
-- titles of a collective (working title, master once in the Catalogue,
-- planned / active / abandoned), added after the launch for a collective
-- only, abandoned with a reason and reactivated without losing anything,
-- their link to the project held on delete restrict; update_project keeps
-- them; delete_project_row takes them. Any other project unchanged.
-- Run with `supabase test db`.
begin;
select plan(63);

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

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
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
create function pg_temp.title(p_project text, p_position int) returns public.project_titles
  language sql as $$ select * from public.project_titles
                      where project_id = pg_temp.id_of(p_project) and position = p_position $$;
grant execute on function pg_temp.title(text, int) to authenticated;

with a as (insert into public.artists (organization_id, name, relation)
  values (pg_temp.id_of('org'), 'Principal ' || pg_temp.tag(), 'signed') returning id)
insert into ids select 'main', id from a;

select pg_temp.act_as(pg_temp.id_of('director'));
-- m1, m2: masters; demo: a maquette in development; m3 for the content one.
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('main'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('main'), 'role', 'main')));
insert into ids select 'demo', public.create_master(pg_temp.id_of('org'), 'Maquette ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('main'), 'role', 'main')),
  p_demo_status => 'developing');
insert into ids select 'm3', public.create_master(pg_temp.id_of('org'), 'Trois ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('main'), 'role', 'main')));
-- A simple single, launched; the collective compilation, launched (both
-- owned by owner); a content project not launched, made collective.
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Simple ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'collective', public.create_project(pg_temp.id_of('org'), 'Collectif ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m2'), pg_temp.id_of('m1')], p_music_format => 'compilation');
insert into ids select 'mic', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(), 'content');
insert into ids select 'a_simple', public.transmit_project(pg_temp.id_of('simple'), pg_temp.id_of('owner_person'));
insert into ids select 'a_collective', public.transmit_project(pg_temp.id_of('collective'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_simple'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a_collective'), 'accepted');
reset role;

-- A project that is not collective: no title, nothing changes ----------------------
select is((select count(*)::int from public.project_titles
            where project_id in (pg_temp.id_of('simple'), pg_temp.id_of('collective'))),
          0, 'no project has titles before it is collective');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.add_project_title(pg_temp.id_of('simple'), 'Nouveau') $$,
  '23514', 'not_collective', 'a simple project takes no title, launched or not');
reset role;
select throws_ok($$ insert into public.project_titles (organization_id, project_id, position)
                    values (pg_temp.id_of('org'), pg_temp.id_of('simple'), 1) $$,
  '23514', 'not_collective', 'not even written directly');

-- Becoming collective: its links become its titles, in link order -------------------
update public.projects set collective = true, artist_id = pg_temp.id_of('main')
 where id in (pg_temp.id_of('collective'), pg_temp.id_of('mic'));
select is((select array_agg(master_id order by position) from public.project_titles
            where project_id = pg_temp.id_of('collective')),
          array[pg_temp.id_of('m2'), pg_temp.id_of('m1')], 'the collective''s links become its titles, in order');
select is((select array_agg(status order by position) from public.project_titles
            where project_id = pg_temp.id_of('collective')),
          array['active', 'active'], 'active, since they have a master');
select is((select count(*)::int from public.project_titles where project_id = pg_temp.id_of('mic')),
          0, 'a collective without a link has no title yet');

-- Who adds, and when ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.add_project_title(pg_temp.id_of('collective'), 'Trois') $$,
  '42501', 'forbidden', 'once launched, the direction does not add a title: only the owner');
select lives_ok($$ select public.add_project_title(pg_temp.id_of('mic')) $$,
  'before the launch, whoever creates projects adds a title, even without a name');
reset role;
select is((pg_temp.title('mic', 1)).status, 'planned', 'a title without a master is planned');
select is((pg_temp.title('mic', 1)).working_title, null, 'and has no name');

select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.add_project_title(pg_temp.id_of('collective'), '  Sans master  ') $$,
  'once launched, the owner adds a title to the collective');
select is((pg_temp.title('collective', 3)).working_title, 'Sans master',
          'numbered after the others, its working title trimmed');
select lives_ok($$ select public.add_project_title(pg_temp.id_of('collective'), 'La maquette', pg_temp.id_of('demo')) $$,
  'and a title with a master of the Catalogue');
select is((pg_temp.title('collective', 4)).status, 'active', 'a title with a master is active');
select ok(exists (select 1 from public.project_masters
                   where project_id = pg_temp.id_of('collective') and master_id = pg_temp.id_of('demo')),
          'its master is linked to the project, after the launch');
select is((select count(*)::int from public.project_titles
            where project_id = pg_temp.id_of('collective') and master_id = pg_temp.id_of('demo')),
          1, 'one title for that link, not two');
select throws_ok($$ select public.add_project_title(pg_temp.id_of('collective'), null, pg_temp.id_of('demo')) $$,
  '23505', 'title_already_in_project', 'a master is one title of the project only');
select throws_ok($$ select public.add_project_title(pg_temp.id_of('collective'), repeat('x', 201)) $$,
  '22023', 'working_title_too_long', 'a working title has 200 characters at most');
reset role;

-- The shape of the project still holds: a single keeps one master.
update public.projects set music_format = 'single' where id = pg_temp.id_of('collective');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.add_project_title(pg_temp.id_of('collective'), null, pg_temp.id_of('m3')) $$,
  'P0001', 'single_requires_one_master', 'a single collective does not take a second master');
reset role;
update public.projects set music_format = 'compilation' where id = pg_temp.id_of('collective');

-- A content collective takes titles with masters.
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.add_project_title(pg_temp.id_of('mic'), null, pg_temp.id_of('m3')) $$,
  'a content collective takes a title with a master');
reset role;

-- Read by whoever sees the project, written by the functions only -------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.project_titles where project_id = pg_temp.id_of('collective')),
          0, 'a member who does not see the project does not see its titles');
select throws_ok($$ select public.rename_project_title((pg_temp.title('collective', 3)).id, 'Volé') $$,
  'P0002', 'title_not_found', 'nor touches them');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.project_titles where project_id = pg_temp.id_of('collective')),
          4, 'its owner sees them');
select throws_ok($$ update public.project_titles set working_title = 'Direct'
                     where project_id = pg_temp.id_of('collective') $$,
  '42501', null, 'no direct write');

-- Renaming ------------------------------------------------------------------------
select lives_ok($$ select public.rename_project_title((pg_temp.title('collective', 3)).id, 'Nouveau nom') $$,
  'the owner renames a title');
select is((pg_temp.title('collective', 3)).working_title, 'Nouveau nom', 'renamed');
select lives_ok($$ select public.rename_project_title((pg_temp.title('collective', 3)).id, '   ') $$,
  'a blank name takes it back to « sans nom »');
select is((pg_temp.title('collective', 3)).working_title, null, 'no name any more');

-- Abandoning: reason required, the maquette abandoned, nothing else moves ------------
select throws_ok($$ select public.abandon_project_title((pg_temp.title('collective', 4)).id, '  ') $$,
  '23514', 'reason_required', 'abandoning asks for a reason');
select lives_ok($$ select public.abandon_project_title((pg_temp.title('collective', 4)).id, 'Pas retenu') $$,
  'the owner abandons a title with its reason');
reset role;
select is((pg_temp.title('collective', 4)).status, 'abandoned', 'the title is abandoned');
select is((pg_temp.title('collective', 4)).abandon_reason, 'Pas retenu', 'with its reason');
select is((pg_temp.title('collective', 4)).abandoned_by, pg_temp.id_of('owner_person'), 'who abandoned it');
select ok((pg_temp.title('collective', 4)).abandoned_at is not null, 'and when');
select is((select demo_status from public.masters where id = pg_temp.id_of('demo')), 'abandoned',
          'its master stays in the Catalogue, as an abandoned maquette');
select ok(exists (select 1 from public.project_masters
                   where project_id = pg_temp.id_of('collective') and master_id = pg_temp.id_of('demo')),
          'its link to the project is kept (its Master history with it)');
select throws_ok($$ delete from public.project_masters
                     where project_id = pg_temp.id_of('collective') and master_id = pg_temp.id_of('demo') $$,
  '23503', null, 'and cannot be deleted, by anyone: the title holds it');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.rename_project_title((pg_temp.title('collective', 4)).id, 'Encore') $$,
  'P0001', 'title_abandoned', 'an abandoned title is not edited');
select throws_ok($$ select public.abandon_project_title((pg_temp.title('collective', 4)).id, 'Deux fois') $$,
  'P0001', 'title_abandoned', 'nor abandoned twice');
-- A promoted master is not a maquette: left as it is.
select lives_ok($$ select public.abandon_project_title((pg_temp.title('collective', 1)).id, 'Plus tard') $$,
  'a title whose master is not a maquette is abandoned too');
reset role;
select is((select demo_status from public.masters where id = pg_temp.id_of('m2')), null,
          'its master is not turned into a maquette');
-- A validated maquette is never touched (décision 8): only the title is
-- abandoned, and reactivated.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'validated', public.create_master(pg_temp.id_of('org'), 'Validée ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('main'), 'role', 'main')),
  p_demo_status => 'developing');
select public.set_demo_status(pg_temp.id_of('validated'), 'validated');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.add_project_title(pg_temp.id_of('collective'), null, pg_temp.id_of('validated')) $$,
  'a title whose master is a validated maquette');
select lives_ok($$ select public.abandon_project_title((pg_temp.title('collective', 5)).id, 'Hors sujet') $$,
  'is abandoned like any other');
reset role;
select is((select demo_status from public.masters where id = pg_temp.id_of('validated')), 'validated',
          'its maquette stays validated: only the title of the project is abandoned');
select is((pg_temp.title('collective', 5)).demo_status_before_abandon, null,
          'so there is nothing to restore');
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.reactivate_project_title((pg_temp.title('collective', 5)).id) $$,
  'the title is reactivated');
reset role;
select is((select demo_status from public.masters where id = pg_temp.id_of('validated')), 'validated',
          'and its maquette is still validated');
select is((pg_temp.title('collective', 5)).status, 'active', 'the title is active again');

-- Reactivating: everything as it was ------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.reactivate_project_title((pg_temp.title('collective', 2)).id) $$,
  'P0001', 'title_not_abandoned', 'only an abandoned title is reactivated');
select lives_ok($$ select public.reactivate_project_title((pg_temp.title('collective', 4)).id) $$,
  'the owner reactivates the title');
reset role;
select is((pg_temp.title('collective', 4)).status, 'active', 'it is active again');
select is((pg_temp.title('collective', 4)).abandon_reason, null, 'its abandonment is closed');
select is((select demo_status from public.masters where id = pg_temp.id_of('demo')), 'developing',
          'its maquette comes back to its former status');
select is((select array_agg(kind order by seq) from public.project_title_events
            where title_id = (pg_temp.title('collective', 4)).id),
          array['added', 'abandoned', 'reactivated'], 'the history keeps each gesture');
select is((select detail ->> 'reason' from public.project_title_events
            where title_id = (pg_temp.title('collective', 4)).id and kind = 'abandoned'),
          'Pas retenu', 'the reason stays in the history after the reactivation');
select is((select detail ->> 'to' from public.project_title_events
            where title_id = (pg_temp.title('collective', 3)).id and kind = 'renamed'
            order by seq limit 1),
          'Nouveau nom', 'a renaming says the new name');

-- update_project keeps a collective's titles (before the launch) --------------------
-- A content collective: its edit form has no list of titles, they stay.
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.update_project(pg_temp.id_of('mic'), 'Mic ' || pg_temp.tag(), 'content') $$,
  'a content collective is edited as before');
reset role;
select ok(exists (select 1 from public.project_masters
                   where project_id = pg_temp.id_of('mic') and master_id = pg_temp.id_of('m3')),
          'and keeps the link its title holds, although its form sends no master');
update public.projects set type = 'music_release', music_format = 'compilation'
 where id = pg_temp.id_of('mic');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.update_project(pg_temp.id_of('mic'), 'Mic ' || pg_temp.tag(), 'music_release',
                     array[pg_temp.id_of('m1')], p_music_format => 'compilation') $$,
  'P0001', 'collective_title_kept', 'editing the project does not unlink a title: it is abandoned instead');
select lives_ok($$ select public.update_project(pg_temp.id_of('mic'), 'Mic ' || pg_temp.tag(), 'music_release',
                     array[pg_temp.id_of('m3'), pg_temp.id_of('m1')], p_music_format => 'compilation') $$,
  'editing it with its titles and a new master works');
reset role;
select is((select array_agg(coalesce(master_id::text, '-') order by position) from public.project_titles
            where project_id = pg_temp.id_of('mic')),
          array['-', pg_temp.id_of('m3')::text, pg_temp.id_of('m1')::text],
          'the new master is a new title, after the others');

-- delete_project_row takes the titles with the project -------------------------------
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('collective')) $$,
  'a collective with titles is deleted');
select is((select count(*)::int from public.project_titles where project_id = pg_temp.id_of('collective')),
          0, 'its titles with it');

select * from finish();
rollback;
