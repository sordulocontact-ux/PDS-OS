-- Projet collectif, lot 10 (20261113200101, docs/pds-mic-plan.md § 3.1,
-- principle 3): the titles a marketing action targets. No row = the whole
-- project (as today); « all_titles », « titles » (one row per title),
-- « none ». Set by the project's owner, a collective only, rows replaced at
-- once, never duplicated nor created per title; read by whoever sees the
-- project; delete_project_row empties it.
-- Run with `supabase test db`.
begin;
select plan(19);

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

-- A collective with two titles, its creative director on the team; a simple
-- project beside it.
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
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a_simple'), 'accepted');
reset role;

-- A deliverable « hors levier » (allowed) and an activation of each project.
insert into public.strategy_deliverables (organization_id, project_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 'Teaser');
insert into ids select 'teaser', id from public.strategy_deliverables where project_id = pg_temp.id_of('c1');
insert into public.marketing_activations (organization_id, project_id, kind, title)
values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 'event', 'Soirée d''écoute'),
       (pg_temp.id_of('org'), pg_temp.id_of('simple'), 'event', 'Lancement');
insert into ids select 'event', id from public.marketing_activations where project_id = pg_temp.id_of('c1');
insert into ids select 'launch', id from public.marketing_activations where project_id = pg_temp.id_of('simple');

-- No row: the whole project ----------------------------------------------------
select is((select count(*)::int from public.deliverable_titles where project_id = pg_temp.id_of('c1')),
  0, 'an action targets the whole project until said otherwise (no row)');

-- Who sets it ----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.set_marketing_title_scope('all_titles', null, pg_temp.id_of('teaser'), null) $$,
  '42501', 'forbidden', 'a member of the team who is not the owner does not set it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_marketing_title_scope('none', null, pg_temp.id_of('launch'), null) $$,
  'P0002', 'action_not_found', 'an activation given as a deliverable is not found');
select throws_ok($$ select public.set_marketing_title_scope('none', null, null, pg_temp.id_of('launch')) $$,
  '23514', 'not_collective', 'a simple project has no title to target');
select throws_ok($$ select public.set_marketing_title_scope('none', null, pg_temp.id_of('teaser'), pg_temp.id_of('event')) $$,
  '22023', 'action_required', 'one action at a time');
select throws_ok($$ select public.set_marketing_title_scope('some', null, pg_temp.id_of('teaser'), null) $$,
  '22023', 'invalid_scope', 'an unknown scope is refused');
select throws_ok($$ select public.set_marketing_title_scope('titles', '{}', pg_temp.id_of('teaser'), null) $$,
  '23514', 'titles_required', '« Certains titres » needs a title');
select throws_ok($$ select public.set_marketing_title_scope('titles', array[gen_random_uuid()], pg_temp.id_of('teaser'), null) $$,
  'P0002', 'title_not_found', 'a title of another project is refused');

-- The scopes ---------------------------------------------------------------------
select lives_ok($$ select public.set_marketing_title_scope('titles', array[pg_temp.id_of('t1'), pg_temp.id_of('t2'), pg_temp.id_of('t1')], pg_temp.id_of('teaser'), null) $$,
  'the owner targets two titles with one teaser');
reset role;
select is((select count(*)::int from public.deliverable_titles where strategy_deliverable_id = pg_temp.id_of('teaser')),
  2, 'one row per title, each once');
select is((select count(*)::int from public.strategy_deliverables where project_id = pg_temp.id_of('c1')),
  1, 'the teaser is not duplicated');

select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_marketing_title_scope('all_titles', null, pg_temp.id_of('teaser'), null);
reset role;
select is((select array_agg(scope || ':' || coalesce(title_id::text, '-'))
             from public.deliverable_titles where strategy_deliverable_id = pg_temp.id_of('teaser')),
  array['all_titles:-'], '« Tous les titres »: one row, no title (the titles added later count too)');

select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_marketing_title_scope('none', null, null, pg_temp.id_of('event'));
select public.set_marketing_title_scope('project', null, pg_temp.id_of('teaser'), null);
reset role;
select is((select scope from public.deliverable_titles where activation_id = pg_temp.id_of('event')),
  'none', '« Aucun titre » for an activation');
select is((select count(*)::int from public.deliverable_titles where strategy_deliverable_id = pg_temp.id_of('teaser')),
  0, 'back to the whole project: no row');

-- An abandoned title: kept when already targeted, never newly targeted.
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_marketing_title_scope('titles', array[pg_temp.id_of('t1')], null, pg_temp.id_of('event'));
select public.abandon_project_title(pg_temp.id_of('t1'), 'Pas retenu');
select lives_ok($$ select public.set_marketing_title_scope('titles', array[pg_temp.id_of('t1'), pg_temp.id_of('t2')], null, pg_temp.id_of('event')) $$,
  'an abandoned title already targeted may stay');
select throws_ok($$ select public.set_marketing_title_scope('titles', array[pg_temp.id_of('t1')], pg_temp.id_of('teaser'), null) $$,
  'P0001', 'title_abandoned', 'but is never newly targeted');
reset role;

-- Read by the team, never written by it.
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.deliverable_titles where project_id = pg_temp.id_of('c1')),
  2, 'a member who sees the project reads the scopes');
select throws_ok($$ insert into public.deliverable_titles (organization_id, project_id, activation_id, scope)
                    values (pg_temp.id_of('org'), pg_temp.id_of('c1'), pg_temp.id_of('event'), 'none') $$,
  '42501', null, 'written by the function only');
reset role;

-- The project deleted: its scopes go with it.
select public.delete_project_row(pg_temp.id_of('c1'));
select is((select count(*)::int from public.deliverable_titles where project_id = pg_temp.id_of('c1')),
  0, 'delete_project_row empties it');

select * from finish();
rollback;
