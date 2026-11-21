-- Projet collectif, lot 6 (docs/pds-mic-plan.md): what « Titres et
-- artistes » relies on, read with each viewer's session. A member who sees
-- the project reads its titles and participations, a participation's
-- contract_id but not the contract, and none of its deals (the view hides
-- the Négociation column then, never « Pas de dossier »); the owner and the
-- direction read the deal and the contract; the assignee reads his own deal.
-- The view's gestures: « Changer l'artiste principal » (set_project_main_
-- artist, owner once launched, a guest refused until withdrawn), « Retirer
-- du titre » and « Rattacher au titre » (set_title_participation_status,
-- the main artist never brought back as a guest); a simple project is
-- refused. The change of main artist goes to the Activité (20261113170101:
-- an event of the collective's journal without a title, old → new, its
-- author; none when nothing changed). No table added: delete_project_row
-- unchanged.
-- Run with `supabase test db`.
begin;
select plan(25);

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
  from (values ('director'), ('owner'), ('creative'), ('glen')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'glen');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective launched and run by « owner », the creative director on its
-- team; a simple project beside it.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Single ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m2')], p_music_format => 'single');
insert into ids select 'a_c1', public.transmit_project(pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
insert into ids select 'a_simple', public.transmit_project(pg_temp.id_of('simple'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a_simple'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id = pg_temp.id_of('c1');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('c1'), pg_temp.id_of('creative_person'));

insert into ids select 't1', id from public.project_titles where project_id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('nadia'),
  p_status => 'confirmed');
reset role;
insert into ids select 'p1', id from public.title_participations where title_id = pg_temp.id_of('t1');

-- Its contract, linked by hand (lot 11 will link it), and its deal.
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Participation ' || pg_temp.tag(), 'other', 'sent',
        pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
insert into ids select 'k1', id from public.contracts where title = 'Participation ' || pg_temp.tag();
-- The fixture links a contract without a deal (20261121210101 refuses it
-- before the accord, tested in collective-title-contracts.test.sql).
alter table public.title_participations disable trigger b_agreement_before_contract;
update public.title_participations set contract_id = pg_temp.id_of('k1') where id = pg_temp.id_of('p1');
alter table public.title_participations enable trigger b_agreement_before_contract;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;

-- What each viewer reads ------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.title_participations where project_id = pg_temp.id_of('c1')),
  1, 'a member of the project reads its participations');
select is((select contract_id from public.title_participations where id = pg_temp.id_of('p1')),
  pg_temp.id_of('k1'), 'and that a contract is linked');
select is((select count(*)::int from public.contracts where id = pg_temp.id_of('k1')),
  0, 'but not the contract itself (« Lié », never « À faire »)');
select is((select count(*)::int from public.deals where project_id = pg_temp.id_of('c1')),
  0, 'nor any deal of the project (the Négociation column is hidden)');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select array_agg(id) from public.deals
            where project_id = pg_temp.id_of('c1') and participation_id is not null),
  array[pg_temp.id_of('d1')], 'the owner reads the participation''s deal');
select is((select status from public.contracts where id = pg_temp.id_of('k1')),
  'sent', 'and its contract');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.deals where participation_id = pg_temp.id_of('p1')),
  1, 'the direction reads it too');
reset role;

select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select count(*)::int from public.deals where participation_id = pg_temp.id_of('p1')),
  1, 'its assignee reads his own deal');
reset role;

-- « Changer l'artiste principal » ----------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('c1'), pg_temp.id_of('nadia')) $$,
  '42501', 'forbidden', 'a member who is not the owner does not change the main artist');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('c1'), pg_temp.id_of('nadia')) $$,
  '23514', 'main_artist_is_guest', 'a guest of a title is not made the main artist');
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('simple'), pg_temp.id_of('nadia')) $$,
  '23514', 'not_collective', 'a simple project has no main artist to change');

-- « Retirer du titre », then the artist may become the main one.
select is(public.set_title_participation_status(pg_temp.id_of('p1'), 'withdrawn'),
  0, 'withdrawing writes no credit');
select is((select status from public.title_participations where id = pg_temp.id_of('p1')),
  'withdrawn', 'the participation is withdrawn, still there');
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('c1'), pg_temp.id_of('nadia')) $$,
  'the owner changes the main artist of the launched collective');
select is((select artist_id from public.projects where id = pg_temp.id_of('c1')),
  pg_temp.id_of('nadia'), 'it is now the main artist');

-- The Activité: one event of the project, the artists named, its author.
select is((select count(*)::int from public.project_title_events
            where project_id = pg_temp.id_of('c1') and kind = 'main_artist_changed'),
  1, 'the change is in the collective''s journal, once (the refusals wrote nothing)');
select is((select jsonb_build_object('title', title_id, 'from', detail->>'from', 'to', detail->>'to',
                                     'actor', actor_person_id)
             from public.project_title_events
            where project_id = pg_temp.id_of('c1') and kind = 'main_artist_changed'),
  jsonb_build_object('title', null, 'from', 'PDS ' || pg_temp.tag(), 'to', 'Nadia ' || pg_temp.tag(),
                     'actor', pg_temp.id_of('owner_person')),
  'an event of the project, not of a title: old → new, by the owner');
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('c1'), pg_temp.id_of('nadia')) $$,
  'the same artist again is accepted');
select is((select count(*)::int from public.project_title_events
            where project_id = pg_temp.id_of('c1') and kind = 'main_artist_changed'),
  1, 'but writes nothing: nothing changed');
select throws_ok($$ insert into public.project_title_events (organization_id, project_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 'renamed') $$,
  '42501', null, 'the journal is written by its functions only');
reset role;
select throws_ok($$ insert into public.project_title_events (organization_id, project_id, kind)
                    values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 'renamed') $$,
  '23514', null, 'a title''s event without its title is refused');
select pg_temp.act_as(pg_temp.id_of('owner'));

-- « Rattacher au titre »: never the main artist.
select throws_ok($$ select public.set_title_participation_status(pg_temp.id_of('p1'), 'proposed') $$,
  '23514', 'main_artist_not_participant', 'the main artist is not brought back as a guest');
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('c1'), pg_temp.id_of('pds')) $$,
  'the main artist changed back');
select lives_ok($$ select public.set_title_participation_status(pg_temp.id_of('p1'), 'proposed') $$,
  'the withdrawn participation is brought back');
select is((select status from public.title_participations where id = pg_temp.id_of('p1')),
  'proposed', 'proposed again, the same participation (its deal still points at it)');
reset role;

select * from finish();
rollback;
