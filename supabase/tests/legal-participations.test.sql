-- Projet collectif, lot 11 (docs/pds-mic-plan.md § 8): « Participations et
-- contrats » in a collective's Juridique reads the Business module's deals
-- (20261111230101 and after), never recreates them. What the view relies
-- on, read with each viewer's session: the owner and the direction read
-- every deal of the project with its stage, assignee, next action and
-- follow-up; the same artist on two titles has two participations and two
-- distinct deals; « Ouvrir un dossier » is create_deal with the
-- participation (in negotiation once the artist confirmed), refused for a
-- participation out of play, possible again after an abandoned deal. No
-- leak: a member of the team reads no deal, the business manager reads only
-- the deals given to him and neither the project nor its participations, a
-- project manager out of the project reads nothing. No table added.
-- Run with `supabase test db`.
begin;
select plan(16);

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
  from (values ('director'), ('owner'), ('creative'), ('glen'), ('thibault'), ('otherpm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager'),
               ('thibault', 'business'), ('otherpm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'glen', 'thibault', 'otherpm');

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

-- A collective run by « owner », its creative director on the team: Nadia on
-- title 1, Lou on title 2, then Nadia on title 2 as well (confirmed on both).
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')],
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou')]);
reset role;
insert into ids select 'assignment', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('assignment'), 'accepted');
select public.add_title_participation(pg_temp.id_of('t2'), pg_temp.id_of('nadia'), p_status => 'confirmed');
reset role;
insert into ids select 'p_nadia1', id from public.title_participations
 where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('nadia');
insert into ids select 'p_nadia2', id from public.title_participations
 where title_id = pg_temp.id_of('t2') and artist_id = pg_temp.id_of('nadia');
insert into ids select 'p_lou', id from public.title_participations
 where title_id = pg_temp.id_of('t2') and artist_id = pg_temp.id_of('lou');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_status(pg_temp.id_of('p_nadia1'), 'confirmed');
reset role;

-- « Ouvrir un dossier »: create_deal with the participation --------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'd1', public.create_deal(p_participation_id => pg_temp.id_of('p_nadia1'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
insert into ids select 'd2', public.create_deal(p_participation_id => pg_temp.id_of('p_nadia2'),
  p_assignee_person_id => pg_temp.id_of('thibault_person'));
reset role;
select is((select stage from public.deals where id = pg_temp.id_of('d1')),
  'negotiation', 'the artist confirmed: the deal opens in negotiation');
select isnt(pg_temp.id_of('d1'), pg_temp.id_of('d2'),
  'the same artist on two titles: two participations, two distinct deals');

select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_next_action(pg_temp.id_of('d1'), 'Appeler son manager',
  current_date + 2, current_date - 1);
reset role;

-- What each viewer reads ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select array_agg(participation_id order by participation_id) from public.deals
            where project_id = pg_temp.id_of('c1')),
  (select array_agg(u order by u) from unnest(array[pg_temp.id_of('p_nadia1'), pg_temp.id_of('p_nadia2')]) u),
  'the owner reads every deal of the project');
select is((select next_action || ' · ' || (next_action_on - current_date) || ' · ' || (follow_up_on - current_date)
             from public.deals where id = pg_temp.id_of('d1')),
  'Appeler son manager · 2 · -1', 'with its next action, its date and its follow-up');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.deals where project_id = pg_temp.id_of('c1')),
  2, 'the direction reads them too');
reset role;

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.deals where project_id = pg_temp.id_of('c1')),
  0, 'a member of the team reads no deal');
reset role;

select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select array_agg(id) from public.deals where project_id = pg_temp.id_of('c1')),
  array[pg_temp.id_of('d1')], 'the business manager reads only the deal given to him');
select is(public.can_see_project(pg_temp.id_of('c1')), false,
  'and not the project (no page of it)');
select is((select count(*)::int from public.title_participations where project_id = pg_temp.id_of('c1')),
  0, 'nor its participations');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p_lou')) $$,
  'P0002', 'participation_not_found', 'nor opens a deal on one of them');
reset role;

select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select array_agg(id) from public.deals where project_id = pg_temp.id_of('c1')),
  array[pg_temp.id_of('d2')], 'another negotiator reads only his own');
reset role;

select pg_temp.act_as(pg_temp.id_of('otherpm'));
select is((select count(*)::int from public.deals where project_id = pg_temp.id_of('c1'))
          + (select count(*)::int from public.title_participations where project_id = pg_temp.id_of('c1')),
  0, 'a project manager out of the project reads neither deals nor participations');
reset role;

-- Out of play, then again ----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_status(pg_temp.id_of('p_lou'), 'declined');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p_lou')) $$,
  'P0001', 'participation_not_in_play', 'a declined participation gets no deal');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p_nadia2')) $$,
  '23505', 'deal_exists', 'one live deal per participation');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.abandon_deal(pg_temp.id_of('d2'), 'Pas d''accord sur les parts');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p_nadia2')) $$,
  '« Ouvrir un nouveau dossier » after an abandoned deal');
select public.abandon_project_title(pg_temp.id_of('t1'), 'Pas retenu');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.abandon_deal(pg_temp.id_of('d1'), 'Titre abandonné');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p_nadia1')) $$,
  'P0001', 'participation_not_in_play', 'an abandoned title gets no new deal');
reset role;

select * from finish();
rollback;
