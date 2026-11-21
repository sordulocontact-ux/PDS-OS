-- Projet collectif, lot 3 (…20261111140101, docs/pds-mic-plan.md § 3): the
-- participations of artists in the titles of a collective (role, status,
-- interlocutor, contract), an artist once per title, added at any time by
-- who writes the titles, never deleted; confirmed on a title with a master,
-- the missing credits are written (main artist in « main » at the head, the
-- artist with its role after), adding only, also when a master is linked
-- later; read under RLS; delete_project_row takes them. Any other project
-- unchanged.
-- Run with `supabase test db`.
begin;
select plan(64);

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
create function pg_temp.title(p_project text, p_position int) returns uuid
  language sql as $$ select id from public.project_titles
                      where project_id = pg_temp.id_of(p_project) and position = p_position $$;
grant execute on function pg_temp.title(text, int) to authenticated;
-- The credits of a master, « artist:role » in their order.
create function pg_temp.credits(p_master text) returns text[]
  language sql as $$
    select array_agg(ids.name || ':' || ma.role order by ma.position)
      from public.master_artists ma join ids on ids.id = ma.artist_id
     where ma.master_id = pg_temp.id_of(p_master) $$;
-- A participation by its title and artist.
create function pg_temp.part(p_title uuid, p_artist text) returns public.title_participations
  language sql as $$ select * from public.title_participations
                      where title_id = p_title and artist_id = pg_temp.id_of(p_artist) $$;
grant execute on function pg_temp.part(uuid, text) to authenticated;

-- Artists: the main one (PDS), two guests, a third artist already credited.
insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami'), ('Lyna'), ('Archivé')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('sami', 'Sami'), ('lyna', 'Lyna'),
               ('gone', 'Archivé')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();
update public.artists set archived_at = now() where id = pg_temp.id_of('gone');
with c as (insert into public.network_contacts (organization_id, kind, name, roles)
  values (pg_temp.id_of('org'), 'person', 'Manager ' || pg_temp.tag(), array['manager']) returning id)
insert into ids select 'manager', id from c;

select pg_temp.act_as(pg_temp.id_of('director'));
-- m1: credited to Lyna only; m2: already credited to PDS and Nadia; m3: for
-- the simple project.
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('lyna'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main'),
                    jsonb_build_object('artist_id', pg_temp.id_of('nadia'), 'role', 'featuring')));
insert into ids select 'm3', public.create_master(pg_temp.id_of('org'), 'Trois ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('lyna'), 'role', 'main')));
insert into ids select 'm4', public.create_master(pg_temp.id_of('org'), 'Quatre ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('lyna'), 'role', 'main')));
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Simple ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m3')], p_music_format => 'single');
insert into ids select 'collective', public.create_project(pg_temp.id_of('org'), 'Collectif ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1'), pg_temp.id_of('m2')], p_music_format => 'compilation');
insert into ids select 'a_collective', public.transmit_project(pg_temp.id_of('collective'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_collective'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id = pg_temp.id_of('collective');
-- Title 3: planned, no master yet.
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_project_title(pg_temp.id_of('collective'), 'Sans master');
reset role;
insert into ids values ('t1', pg_temp.title('collective', 1)), ('t2', pg_temp.title('collective', 2)),
                       ('t3', pg_temp.title('collective', 3));

-- A project that is not collective: no participation --------------------------------
select throws_ok($$ insert into public.title_participations (organization_id, project_id, title_id, artist_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('simple'), pg_temp.id_of('t1'),
                            pg_temp.id_of('nadia')) $$,
  '23514', 'not_collective', 'a simple project takes no participation, even written directly');

-- Who adds, and when (after the launch) ---------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('nadia')) $$,
  '42501', 'forbidden', 'once launched, the direction does not add a participation: only the owner');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('nadia')) $$,
  'P0002', 'title_not_found', 'a member who does not see the project does not reach its titles');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select * from public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('nadia')) $$,
  'after the launch, the owner adds an artist to a title');
-- Its id, kept to check it never changes (the Business module points at it).
insert into ids select 'p_nadia', (pg_temp.part(pg_temp.id_of('t1'), 'nadia')).id;
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).role, 'featuring', 'a guest is featured by default');
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).status, 'proposed', 'and proposed');
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).decided_by, pg_temp.id_of('owner_person'),
          'who gave its status');
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).project_id, pg_temp.id_of('collective'),
          'it names the title''s project');
select is(pg_temp.credits('m1'), array['lyna:main'], 'a proposed participation writes no credit');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('nadia')) $$,
  '23505', 'participation_exists', 'an artist takes part in a title once');
select lives_ok($$ select * from public.add_title_participation(pg_temp.id_of('t2'), pg_temp.id_of('nadia')) $$,
  'but in several titles');
select lives_ok($$ select * from public.add_title_participation(pg_temp.id_of('t1'), pg_temp.id_of('sami'), 'main',
                     p_contact_id => pg_temp.id_of('manager'), p_note => '  Via son label  ') $$,
  'several artists on one title, with a role, an interlocutor and a note');
select is((pg_temp.part(pg_temp.id_of('t1'), 'sami')).contact_id, pg_temp.id_of('manager'),
          'the interlocutor is kept');
select is((pg_temp.part(pg_temp.id_of('t1'), 'sami')).note, 'Via son label', 'the note, trimmed');
select lives_ok($$ select * from public.add_title_participation(pg_temp.id_of('t3'), pg_temp.id_of('sami')) $$,
  'a title without a master takes participations too');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t3'), pg_temp.id_of('pds')) $$,
  '23514', 'main_artist_not_participant', 'the main artist is not a participation');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t3'), pg_temp.id_of('gone')) $$,
  '23503', 'artist_not_found', 'an archived artist is not added');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t3'), pg_temp.id_of('lyna'), 'guest') $$,
  '22023', 'invalid_role', 'a role is main or featuring');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t3'), pg_temp.id_of('lyna'),
                     p_status => 'maybe') $$,
  '22023', 'invalid_status', 'a status is one of the five');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t3'), pg_temp.id_of('lyna'),
                     p_contact_id => gen_random_uuid()) $$,
  '23503', 'contact_not_found', 'an interlocutor is a contact of the organization');
select throws_ok($$ insert into public.title_participations (organization_id, project_id, title_id, artist_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('collective'), pg_temp.id_of('t3'),
                            pg_temp.id_of('lyna')) $$,
  '42501', null, 'no direct write');
reset role;

-- Read under RLS, by whoever sees the project ----------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.title_participations
            where project_id = pg_temp.id_of('collective')),
          0, 'a member who does not see the project does not see its participations');
select throws_ok($$ select public.set_title_participation_status(
                     (pg_temp.part(pg_temp.id_of('t1'), 'nadia')).id, 'confirmed') $$,
  'P0002', 'participation_not_found', 'nor changes them');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.title_participations
            where project_id = pg_temp.id_of('collective')),
          4, 'its owner sees them');
select is((select contact_id from public.title_participations
            where id = (pg_temp.part(pg_temp.id_of('t1'), 'sami')).id),
          pg_temp.id_of('manager'), 'with their interlocutor, read under RLS');
reset role;
select ok(not exists (
  select 1 from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and p.proname in ('add_title_participation', 'set_title_participation_status',
                       'credit_title_participations', 'title_participation_snapshot')
     and pg_get_functiondef(p.oid) ~ 'network_contacts|tp\.contact_id'),
  'no SECURITY DEFINER function of the lot reads the interlocutor');

-- Confirming: the missing credits, the main artist at the head -----------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.set_title_participation_status((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).id, 'confirmed'),
          2, 'confirming a guest on a title with a master writes the missing credits');
reset role;
select is(pg_temp.credits('m1'), array['pds:main', 'lyna:main', 'nadia:featuring'],
          'the main artist in main at the head, the others moved down, the guest featured after');
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).status, 'confirmed', 'the participation is confirmed');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.set_title_participation_status((pg_temp.part(pg_temp.id_of('t1'), 'sami')).id, 'confirmed'),
          1, 'a second confirmation writes only its own credit');
reset role;
select is(pg_temp.credits('m1'), array['pds:main', 'lyna:main', 'nadia:featuring', 'sami:main'],
          'with the participation''s role, after the others');
select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.set_title_participation_status((pg_temp.part(pg_temp.id_of('t2'), 'nadia')).id, 'confirmed'),
          0, 'credits already there are not written twice');
reset role;
select is(pg_temp.credits('m2'), array['pds:main', 'nadia:featuring'], 'nor changed');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_title_participation_status(
                     (pg_temp.part(pg_temp.id_of('t2'), 'nadia')).id, 'confirmed') $$,
  'P0001', 'status_unchanged', 'a status is changed to another one');
select is(public.set_title_participation_status((pg_temp.part(pg_temp.id_of('t3'), 'sami')).id, 'confirmed'),
          0, 'a title without a master: confirmed, nothing to credit yet');
-- Confirmed at once when added.
select is((select credited from public.add_title_participation(pg_temp.id_of('t2'), pg_temp.id_of('lyna'),
                                p_status => 'confirmed')),
          1, 'an artist added as confirmed is credited at once');
reset role;
select is(pg_temp.credits('m2'), array['pds:main', 'nadia:featuring', 'lyna:featuring'],
          'featured after the others');

-- Declined or withdrawn: kept, with its status, the credit never removed --------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_title_participation_status(
                     (pg_temp.part(pg_temp.id_of('t1'), 'nadia')).id, 'withdrawn', 'Calendrier') $$,
  'a confirmed artist withdraws');
reset role;
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).status, 'withdrawn', 'the participation is kept, withdrawn');
select is((pg_temp.part(pg_temp.id_of('t1'), 'nadia')).note, 'Calendrier', 'with its note');
select is(pg_temp.credits('m1'), array['pds:main', 'lyna:main', 'nadia:featuring', 'sami:main'],
          'a participation never removes a credit');
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.set_title_participation_status(
                     (pg_temp.part(pg_temp.id_of('t1'), 'nadia')).id, 'invited') $$,
  'and may be invited again');
reset role;
select is((select array_agg(id) from public.title_participations
            where title_id = pg_temp.id_of('t1') and artist_id = pg_temp.id_of('nadia')),
          array[pg_temp.id_of('p_nadia')],
          'through every status change, one row with the same id: never recreated');
select is((select array_agg(detail ->> 'to' order by seq) from public.project_title_events
            where kind = 'participation_status'
              and detail ->> 'participation_id' = (pg_temp.part(pg_temp.id_of('t1'), 'nadia')).id::text),
          array['confirmed', 'withdrawn', 'invited'], 'the history keeps each change');
select is((select detail ->> 'artist' from public.project_title_events
            where kind = 'participation_added'
              and detail ->> 'participation_id' = (pg_temp.part(pg_temp.id_of('t1'), 'sami')).id::text),
          'Sami ' || pg_temp.tag(), 'the history names the artist as it was');
select ok(not exists (select 1 from public.project_title_events
                       where kind like 'participation%' and detail ? 'contact_id'),
          'and never the interlocutor');

-- An abandoned title is not edited; its participations stay --------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.abandon_project_title(pg_temp.id_of('t2'), 'Pas retenu');
select throws_ok($$ select * from public.add_title_participation(pg_temp.id_of('t2'), pg_temp.id_of('sami')) $$,
  'P0001', 'title_abandoned', 'an abandoned title takes no new artist');
select throws_ok($$ select public.set_title_participation_status(
                     (pg_temp.part(pg_temp.id_of('t2'), 'nadia')).id, 'declined') $$,
  'P0001', 'title_abandoned', 'nor a status change');
reset role;
select is((select count(*)::int from public.title_participations where title_id = pg_temp.id_of('t2')),
          2, 'its participations are kept as they were');

-- A master linked later to a title with confirmed participations ---------------------
-- (lot 7 will write it; here, by hand, as add_project_title does: the title
-- first, then its link, which then makes no second title).
set constraints public.project_titles_link deferred;
update public.project_titles set master_id = pg_temp.id_of('m4'), status = 'active'
 where id = pg_temp.id_of('t3');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('collective'), pg_temp.id_of('m4'), 9);
set constraints public.project_titles_link immediate;
select is(pg_temp.credits('m4'), array['pds:main', 'lyna:main', 'sami:featuring'],
          'its confirmed participations are credited once it has a master');
select is((select count(*)::int from public.project_titles
            where project_id = pg_temp.id_of('collective') and master_id = pg_temp.id_of('m4')),
          1, 'the link did not make a second title');

-- A master shared with a simple project (plan § 6.7, décision 10): no automatic credit
-- m3 is the simple single's master (Lyna); it becomes a title of the collective too.
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 't5', public.add_project_title(pg_temp.id_of('collective'), null, pg_temp.id_of('m3'));
select is((select credited from public.add_title_participation(pg_temp.id_of('t5'), pg_temp.id_of('nadia'),
                                p_status => 'confirmed')),
          0, 'confirmed on a master a simple project shares: no credit is written');
-- The owner of the collective does not see the simple single (never handed to them).
select is((select array_agg(coalesce(other_project_title, '-'))
             from public.project_title_shared_projects(pg_temp.id_of('collective'))),
          array['-'], 'the shared title is counted for the warning, without the name of a project the viewer does not see');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select array_agg(other_project_title) from public.project_title_shared_projects(pg_temp.id_of('collective'))
            where title_id = pg_temp.id_of('t5')),
          array['Simple ' || pg_temp.tag()], 'and with its name for who sees it');
reset role;
select is(pg_temp.credits('m3'), array['lyna:main'], 'its credits stay as they were, to check by hand');
select is(public.project_artist_name(pg_temp.id_of('simple')), 'Lyna ' || pg_temp.tag(),
          'and the simple project still shows its own artist');
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.project_title_shared_projects(pg_temp.id_of('collective'))),
          0, 'who does not see the collective learns nothing of it');
reset role;

-- The artist page reads them (RLS): its collective projects ---------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok(exists (select 1 from public.title_participations tp
                   where tp.artist_id = pg_temp.id_of('sami')
                     and tp.project_id = pg_temp.id_of('collective')),
          'an artist''s participations are read from its page by who sees the project');
reset role;

-- Deleting: a contract, an artist, a contact, the project ----------------------------
with c as (
  insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
  values (pg_temp.id_of('org'), 'Contrat ' || pg_temp.tag(), 'service', 'sent',
          pg_temp.id_of('collective'), pg_temp.id_of('owner_person'))
  returning id)
insert into ids select 'contract', id from c;
-- The fixture links a contract without a deal (20261121210101 refuses it
-- before the accord, tested in collective-title-contracts.test.sql).
alter table public.title_participations disable trigger b_agreement_before_contract;
update public.title_participations set contract_id = pg_temp.id_of('contract')
 where id = (pg_temp.part(pg_temp.id_of('t1'), 'sami')).id;
alter table public.title_participations enable trigger b_agreement_before_contract;
select is((pg_temp.part(pg_temp.id_of('t1'), 'sami')).contract_id, pg_temp.id_of('contract'),
          'a participation holds its contract');
delete from public.contracts where id = pg_temp.id_of('contract');
select is((pg_temp.part(pg_temp.id_of('t1'), 'sami')).contract_id, null,
          'a deleted contract leaves the participation without one');
-- Karim: a participation, no credit (a credited artist is refused anyway).
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Karim ' || pg_temp.tag(), 'collaboration');
insert into ids select 'karim', id from public.artists where name = 'Karim ' || pg_temp.tag();
insert into public.title_participations (organization_id, project_id, title_id, artist_id)
values (pg_temp.id_of('org'), pg_temp.id_of('collective'), pg_temp.id_of('t1'), pg_temp.id_of('karim'));
select throws_ok($$ select public.delete_artist_row(pg_temp.id_of('karim')) $$,
  '23503', null, 'an artist with a participation is not deleted');
select throws_ok($$ select public.delete_contact_row(pg_temp.id_of('manager')) $$,
  '23503', null, 'nor the contact it names');
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('collective')) $$,
  'a collective with participations is deleted');
select is((select count(*)::int from public.title_participations where project_id = pg_temp.id_of('collective')),
          0, 'its participations with it');

select * from finish();
rollback;
