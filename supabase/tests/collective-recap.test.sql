-- Projet collectif, retours d'Ibé du 18/11/2026 (20261121200101_collective_recap):
-- a title's release decision and its journal; a participation's contact and
-- note; the project's owner told when a participation is confirmed or
-- declined (never the author); the Catalogue refusing a homonym; the label
-- of a title still to be named in SQL texts.
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
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('creative'), ('otherpm'), ('outsider')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into public.organizations (slug, name)
values ('recap-' || (select v from vars where k = 'tag'), 'Autre maison');
insert into ids select 'org2', id from public.organizations
 where slug = 'recap-' || (select v from vars where k = 'tag');
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('otherpm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
update public.memberships m set organization_id = (select id from ids where name = 'org2'),
                                status = 'approved', role = 'general_director'
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = 'outsider'));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'otherpm', 'outsider');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Jay'), ('Iris'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('jay', 'Jay'), ('iris', 'Iris'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag()
 where a.organization_id = pg_temp.id_of('org');

-- A collective run by « owner », its creative director on the team: Jay on
-- title 1, Iris on title 2; a third title, abandoned.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')],
  p_guest_artist_ids => array[pg_temp.id_of('jay'), pg_temp.id_of('iris')]);
reset role;
insert into ids select 'assignment', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
insert into ids select 'p_jay', id from public.title_participations
 where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('jay');
insert into ids select 'p_iris', id from public.title_participations
 where title_id = pg_temp.id_of('t2') and artist_id = pg_temp.id_of('iris');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('assignment'), 'accepted');
insert into ids select 't3', public.add_project_title(pg_temp.id_of('c1'));
select public.abandon_project_title(pg_temp.id_of('t3'), 'Pas retenu');
reset role;

-- An interlocutor of the organization, one of another house.
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Manager ' || pg_temp.tag(), array['manager']),
       (pg_temp.id_of('org2'), 'person', 'Ailleurs ' || pg_temp.tag(), array['manager']);
insert into ids select 'contact', id from public.network_contacts
 where name = 'Manager ' || pg_temp.tag();
insert into ids select 'contact2', id from public.network_contacts
 where name = 'Ailleurs ' || pg_temp.tag();

-- 1. Release decision ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), true) $$,
  'the owner says the title comes out');
select is((select release_decision from public.project_titles where id = pg_temp.id_of('t1')),
  true, 'the decision is kept on the title');
select is((select (detail -> 'from', detail -> 'to', actor_person_id) from public.project_title_events
            where title_id = pg_temp.id_of('t1') and kind = 'release_decided'),
  ('null'::jsonb, 'true'::jsonb, pg_temp.id_of('owner_person')),
  'the journal keeps from (null: not decided) and to, by its author');
select throws_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), true) $$,
  'P0001', 'release_unchanged', 'the same decision twice is refused');
select lives_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), false) $$,
  'then it does not come out');
select throws_ok($$ select public.set_project_title_release(pg_temp.id_of('t3'), true) $$,
  'P0001', 'title_abandoned', 'never on an abandoned title');
select is((select status from public.project_titles where id = pg_temp.id_of('t1')), 'planned',
  'nothing else moves: the title is not abandoned');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), true) $$,
  '42501', 'forbidden', 'a member of the team without the right cannot decide');
reset role;
select pg_temp.act_as(pg_temp.id_of('otherpm'));
select throws_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), true) $$,
  'P0002', 'title_not_found', 'a manager out of the project does not see the title');
reset role;
select pg_temp.act_as(pg_temp.id_of('outsider'));
select throws_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), true) $$,
  'P0002', 'title_not_found', 'nor another house');
reset role;

-- 2. Contact ----------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_title_participation_contact(pg_temp.id_of('p_jay'), pg_temp.id_of('contact')) $$,
  'the owner gives the participation its interlocutor');
select is((select contact_id from public.title_participations where id = pg_temp.id_of('p_jay')),
  pg_temp.id_of('contact'), 'kept on the participation');
select throws_ok($$ select public.set_title_participation_contact(pg_temp.id_of('p_jay'), pg_temp.id_of('contact2')) $$,
  '23503', 'contact_not_found', 'never a contact of another house');
select lives_ok($$ select public.set_title_participation_contact(pg_temp.id_of('p_jay'), null) $$,
  'the interlocutor removed');
select is((select contact_id from public.title_participations where id = pg_temp.id_of('p_jay')),
  null::uuid, 'none any more');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.set_title_participation_contact(pg_temp.id_of('p_jay'), pg_temp.id_of('contact')) $$,
  '42501', 'forbidden', 'a member of the team without the right cannot');
reset role;
select pg_temp.act_as(pg_temp.id_of('outsider'));
select throws_ok($$ select public.set_title_participation_contact(pg_temp.id_of('p_jay'), null) $$,
  'P0002', 'participation_not_found', 'nor another house');
reset role;

-- 3. Note -------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_note(pg_temp.id_of('p_jay'), '  Rappeler lundi  ');
select is((select note from public.title_participations where id = pg_temp.id_of('p_jay')),
  'Rappeler lundi', 'the note, trimmed');
select public.set_title_participation_note(pg_temp.id_of('p_jay'), '   ');
select is((select note from public.title_participations where id = pg_temp.id_of('p_jay')),
  null, 'blank: no note');
select throws_ok($$ select public.set_title_participation_note(pg_temp.id_of('p_jay'), repeat('x', 2001)) $$,
  '22023', 'note_too_long', '2000 characters at most');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.set_title_participation_note(pg_temp.id_of('p_jay'), 'x') $$,
  '42501', 'forbidden', 'a member of the team without the right cannot');
reset role;

-- 4. Notifications ----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_status(pg_temp.id_of('p_jay'), 'confirmed');
reset role;
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('p_jay') and kind = 'participation_confirmed'),
  0, 'the owner confirming: nobody told (never the author)');
-- Another hand (any path): the owner is told.
select set_config('request.jwt.claims',
  json_build_object('sub', pg_temp.id_of('director'), 'role', 'authenticated')::text, true);
update public.title_participations set status = 'declined' where id = pg_temp.id_of('p_iris');
select is((select (recipient_person_id, actor_person_id, project_id) from public.notifications
            where subject_id = pg_temp.id_of('p_iris') and kind = 'participation_declined'),
  (pg_temp.id_of('owner_person'), pg_temp.id_of('director_person'), pg_temp.id_of('c1')),
  'declined by another: the owner is told, the participation as subject');
update public.title_participations set status = 'invited' where id = pg_temp.id_of('p_iris');
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('p_iris')),
  1, 'invited: nothing more');
update public.title_participations set status = 'confirmed' where id = pg_temp.id_of('p_iris');
select is((select recipient_person_id from public.notifications
            where subject_id = pg_temp.id_of('p_iris') and kind = 'participation_confirmed'),
  pg_temp.id_of('owner_person'), 'confirmed by another: the owner is told');
update public.title_participations set note = 'Même statut' where id = pg_temp.id_of('p_iris');
update public.title_participations set status = 'confirmed' where id = pg_temp.id_of('p_iris');
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('p_iris')),
  2, 'the status unchanged: told once');
select set_config('request.jwt.claims', null, true);

-- 5. Homonyms in the Catalogue ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ insert into public.artists (organization_id, name, relation)
                           values (%L, %L, 'collaboration') $$,
                        pg_temp.id_of('org'), 'jay ' || pg_temp.tag()),
  '23505', 'artist_name_taken', 'an artist of the same name, another case, is refused');
select throws_ok(format($$ insert into public.artists (organization_id, name, relation)
                           values (%L, %L, 'collaboration') $$,
                        pg_temp.id_of('org'), '  JAY   ' || pg_temp.tag() || ' '),
  '23505', 'artist_name_taken', 'spaces around and inside do not make another name');
select throws_ok(format($$ update public.artists set name = %L where id = %L $$,
                        'IRIS ' || pg_temp.tag(), pg_temp.id_of('lou')),
  '23505', 'artist_name_taken', 'nor a rename to another artist''s name');
select lives_ok(format($$ update public.artists set name = %L where id = %L $$,
                       'LOU ' || pg_temp.tag(), pg_temp.id_of('lou')),
  'an artist renamed in another case keeps its name');
reset role;
select pg_temp.act_as(pg_temp.id_of('outsider'));
select lives_ok(format($$ insert into public.artists (organization_id, name, relation)
                          values (%L, %L, 'collaboration') $$,
                       pg_temp.id_of('org2'), 'Jay ' || pg_temp.tag()),
  'another house has its own Jay');
reset role;

-- 6. Labels of a title still to be named -------------------------------------------------------
-- The order of the guests: when they were added (set apart here, one transaction).
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('lou'));
select public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('iris'));
reset role;
update public.title_participations set created_at = created_at + interval '1 minute'
 where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('lou');
update public.title_participations set created_at = created_at + interval '2 minutes'
 where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('iris');
select is(public.project_title_label(pg_temp.id_of('t2')),
  'Titre d''Iris ' || pg_temp.tag() || ' (à nommer)', '« de » elides before a vowel');
select is(public.project_title_label(pg_temp.id_of('t1')),
  'Titre de Jay ' || pg_temp.tag() || ', LOU ' || pg_temp.tag() || ' & Iris ' || pg_temp.tag()
    || ' (à nommer)', 'three guests: « A, B & C », in their order');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_title_participation_status(
  (select id from public.title_participations
    where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('iris')), 'withdrawn');
reset role;
select is(public.project_title_label(pg_temp.id_of('t1')),
  'Titre de Jay ' || pg_temp.tag() || ' & LOU ' || pg_temp.tag() || ' (à nommer)',
  'two: « A & B », a guest withdrawn left out');
select is(public.project_title_label(pg_temp.id_of('t3')), 'Titre 3 (à nommer)',
  'no guest: its number');
select is(public.contract_gaps_text(pg_temp.id_of('c1'), 'release'),
  'Jay ' || pg_temp.tag() || ' (Titre de Jay ' || pg_temp.tag() || ' & LOU ' || pg_temp.tag()
    || ' (à nommer)), Iris ' || pg_temp.tag() || ' (Titre d''Iris ' || pg_temp.tag() || ' (à nommer))',
  'the missing contracts name the titles the same way');
select is(public.title_release_name(pg_temp.id_of('t2')), public.project_title_label(pg_temp.id_of('t2')),
  'a title''s release is named the same way');
-- Its provisional master in the Catalogue is never its name.
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.ensure_project_title_master(pg_temp.id_of('t2'));
reset role;
select is(public.project_title_label(pg_temp.id_of('t2')),
  'Titre d''Iris ' || pg_temp.tag() || ' (à nommer)', 'a provisional master does not name it');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.rename_project_title(pg_temp.id_of('t1'), 'Néons');
reset role;
select is(public.project_title_label(pg_temp.id_of('t1')), 'Néons', 'its working title, once given');
update public.project_titles set working_title = null where id = pg_temp.id_of('t2');
update public.masters set title = 'Velours'
 where id = (select master_id from public.project_titles where id = pg_temp.id_of('t2'));
select is(public.project_title_label(pg_temp.id_of('t2')), 'Velours',
  'else its master''s title once it is no longer provisional');

-- 7. A collective only -------------------------------------------------------------------------
update public.projects set collective = false where id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_project_title_release(pg_temp.id_of('t1'), true) $$,
  '23514', 'not_collective', 'a project that is not collective: no release decision');
select throws_ok($$ select public.set_title_participation_note(pg_temp.id_of('p_jay'), 'x') $$,
  '23514', 'not_collective', 'nor a participation''s note');
reset role;

select * from finish();
rollback;
