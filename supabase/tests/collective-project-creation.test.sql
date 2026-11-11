-- Projet collectif, lot 5 (…20261111235101, docs/pds-mic-plan.md § 8, lot 5):
-- creating a collective project, from the form or from a selection of
-- artists — collective from its first row, its main artist, a selection's
-- live artists copied as one untitled title and one proposed participation
-- each (the main artist never a guest), no live link with the selection;
-- created by the direction (transmitted) or by the selection's holder who
-- manages the Catalogue (accepted at once, they run it), nobody else.
-- update_project no longer erases a collective's main artist, and the main
-- artist is never a guest of the project (set_project_main_artist refuses
-- it, a participation of the main artist is not brought back). Any other
-- project unchanged.
-- Run with `supabase test db`.
begin;
select plan(62);

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
  ('alize', pg_temp.new_user('alize-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('tom', pg_temp.new_user('tom-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('glen', pg_temp.new_user('glen-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('alize', 'project_manager'),
               ('tom', 'project_manager'), ('creative', 'creative_director'),
               ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'alize', 'tom', 'creative', 'glen');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
-- The guests of a project, « artist:role:status » in the order of its titles.
create function pg_temp.guests(p_project text) returns text[] language sql as $$
  select array_agg(ids.name || ':' || tp.role || ':' || tp.status order by t.position)
    from public.title_participations tp
    join public.project_titles t on t.id = tp.title_id
    join ids on ids.id = tp.artist_id
   where tp.project_id = pg_temp.id_of(p_project) $$;
-- Its titles, « position:status:name-or-none » in order.
create function pg_temp.titles(p_project text) returns text[] language sql as $$
  select array_agg(t.position || ':' || t.status || ':' || coalesce(t.working_title, m.title, '∅')
                   order by t.position)
    from public.project_titles t left join public.masters m on m.id = t.master_id
   where t.project_id = pg_temp.id_of(p_project) $$;

-- Artists: the main one (PDS), four guests and one more, one archived after joining the
-- selection; a content format.
insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami'), ('Ines'), ('Archive'), ('Lyna')) as v (label);
insert into ids
select lower(v.label), a.id
  from (values ('PDS'), ('Nadia'), ('Sami'), ('Ines'), ('Archive'), ('Lyna')) as v (label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();
insert into public.content_formats (organization_id, name)
values (pg_temp.id_of('org'), 'Mic ' || pg_temp.tag());
insert into ids select 'format', id from public.content_formats where name = 'Mic ' || pg_temp.tag();

-- The selection, made by the direction then handed to Alizé: Sami, PDS (the
-- main artist), Nadia, Archive (archived since), Ines.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'mic', public.create_artist_selection(pg_temp.id_of('org'), 'Mic 7 ' || pg_temp.tag(),
  array[pg_temp.id_of('sami'), pg_temp.id_of('pds'), pg_temp.id_of('nadia'),
        pg_temp.id_of('archive'), pg_temp.id_of('ines')]);
select public.transmit_artist_selection(pg_temp.id_of('mic'), pg_temp.id_of('alize_person'));
insert into ids select 'master', public.create_master(pg_temp.id_of('org'), 'Hiver ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
reset role;
update public.artists set archived_at = now() where id = pg_temp.id_of('archive');

-- Who creates -----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person'), pg_temp.id_of('mic')) $$,
  '42501', 'forbidden', 'a creative director creates no collective');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person'), pg_temp.id_of('mic')) $$,
  '42501', 'forbidden', 'nor does the business manager');
reset role;
select pg_temp.act_as(pg_temp.id_of('tom'));
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('tom_person'), pg_temp.id_of('mic')) $$,
  '42501', 'forbidden', 'a project manager who does not hold the selection does not convert it');
reset role;
select pg_temp.act_as(pg_temp.id_of('alize'));
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person')) $$,
  '42501', 'forbidden', 'without a selection, a project manager creates no project');
select throws_ok($$ select public.create_project(pg_temp.id_of('org'), 'X', 'content',
                     p_assignee_person_id => pg_temp.id_of('alize_person')) $$,
  '42501', null, 'and create_project stays closed to her');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('tom_person'), pg_temp.id_of('mic')) $$,
  '42501', 'assignee_not_self', 'the holder runs the project she converts: no one else as manager');
reset role;

-- What a collective needs -------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     null, pg_temp.id_of('alize_person')) $$,
  '23514', 'artist_required', 'a collective has a main artist');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('archive'), pg_temp.id_of('alize_person')) $$,
  '23503', 'artist_not_found', 'an archived artist is not its main artist');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), null) $$,
  'P0001', 'invalid_assignee', 'it starts with its manager');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('creative_person')) $$,
  'P0001', 'invalid_assignee', 'a manager who pilots projects');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'event',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person')) $$,
  'P0001', 'project_type_unavailable', 'no event');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'music_release',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person'), p_music_format => 'compilation') $$,
  'P0001', 'music_release_requires_master', 'a music collective follows the same shape rules');
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person'), gen_random_uuid()) $$,
  'P0002', 'selection_not_found', 'a selection that does not exist');
reset role;

-- The direction converts the selection: transmitted to Alizé ----------------------------
insert into vars select 'projects', count(*)::text from public.projects;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'p1', public.create_collective_project(pg_temp.id_of('org'),
  '  PDS Mic 7  ', 'content', pg_temp.id_of('pds'), pg_temp.id_of('alize_person'),
  pg_temp.id_of('mic'), p_content_format_id => pg_temp.id_of('format'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')]);
reset role;
select is((select count(*)::text from public.projects), (select (v::int + 1)::text from vars where k = 'projects'),
          'one project, never one per artist');
select is((select collective from public.projects where id = pg_temp.id_of('p1')), true,
          'collective from its first row');
select is((select artist_id from public.projects where id = pg_temp.id_of('p1')), pg_temp.id_of('pds'),
          'its main artist');
select is((select title || '|' || type || '|' || content_format_id::text from public.projects where id = pg_temp.id_of('p1')),
          'PDS Mic 7|content|' || pg_temp.id_of('format')::text, 'its name trimmed, the model PDS Mic (content, format)');
select is((select status from public.project_assignments where project_id = pg_temp.id_of('p1')), 'pending',
          'transmitted to its manager, who accepts it');
select is((select assignee_person_id from public.project_assignments where project_id = pg_temp.id_of('p1')),
          pg_temp.id_of('alize_person'), 'Alizé, the selection''s holder chosen');
select is((select count(*)::int from public.project_stages where project_id = pg_temp.id_of('p1')), 0,
          'not launched yet');
select is((select count(*)::int from public.project_creatives where project_id = pg_temp.id_of('p1')), 1,
          'its creative director');
select is(pg_temp.titles('p1'), array['1:planned:∅', '2:planned:∅', '3:planned:∅'],
          'one title without a name per live artist, planned, named later');
select is(pg_temp.guests('p1'), array['sami:featuring:proposed', 'nadia:featuring:proposed', 'ines:featuring:proposed'],
          'one proposed participation each, in the selection''s order; neither the main artist nor an archived one');
select is((select count(*)::int from public.project_title_events
            where project_id = pg_temp.id_of('p1') and kind = 'added'), 3, 'each title in the history');
select is((select count(*)::int from public.project_title_events
            where project_id = pg_temp.id_of('p1') and kind = 'participation_added'), 3,
          'each participation in the history');
select is((select count(*)::int from public.master_artists ma
            join public.project_masters pm on pm.master_id = ma.master_id
           where pm.project_id = pg_temp.id_of('p1')), 0, 'no credit: no master yet');
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('p1') and recipient_person_id = pg_temp.id_of('alize_person')
              and kind = 'project_transmitted'), 1, 'Alizé is told');

-- A copy, no live link ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
select public.remove_artist_from_selection(pg_temp.id_of('mic'), pg_temp.id_of('nadia'));
select public.rename_artist_selection(pg_temp.id_of('mic'), 'Autre ' || pg_temp.tag());
reset role;
select is(pg_temp.guests('p1'), array['sami:featuring:proposed', 'nadia:featuring:proposed', 'ines:featuring:proposed'],
          'changing the selection afterwards leaves the project as it was');
select is((select count(*)::int from public.artist_selection_items where selection_id = pg_temp.id_of('mic')), 4,
          'and the conversion left the selection as it was');

-- Alizé converts her selection: she runs it, launched at once --------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
insert into ids select 'p2', public.create_collective_project(pg_temp.id_of('org'),
  'PDS Mic 8', 'content', pg_temp.id_of('pds'), pg_temp.id_of('alize_person'),
  pg_temp.id_of('mic'), p_content_format_id => pg_temp.id_of('format'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')]);
select ok(pg_temp.id_of('p2') is not null, 'the holder who manages the Catalogue converts the selection');
select is((select owner_person_id from public.projects where id = pg_temp.id_of('p2')),
          pg_temp.id_of('alize_person'), 'she owns it');
select is((select count(*)::int from public.project_stages where project_id = pg_temp.id_of('p2')) > 0, true,
          'launched at once');
select is((select status || '|' || assigned_by::text from public.project_assignments where project_id = pg_temp.id_of('p2')),
          'accepted|' || pg_temp.id_of('alize_person')::text, 'the history says she took it');
select is(pg_temp.guests('p2'), array['sami:featuring:proposed', 'ines:featuring:proposed'],
          'the selection as it is now');
select is((select count(*)::int from public.project_creatives where project_id = pg_temp.id_of('p2')), 1,
          'its creative director, added by its owner');
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('p2') and recipient_person_id = pg_temp.id_of('alize_person')), 0,
          'she is not told what she did herself');
select is((select collective from public.projects where id = pg_temp.id_of('p2')), true, 'collective');
reset role;

-- The selection handed on: Alizé no longer converts it --------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
select public.transmit_artist_selection(pg_temp.id_of('mic'), pg_temp.id_of('tom_person'));
select throws_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'X', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('alize_person'), pg_temp.id_of('mic')) $$,
  '42501', 'forbidden', 'once handed on, the former holder no longer converts it');
reset role;
select pg_temp.act_as(pg_temp.id_of('tom'));
select lives_ok($$ select public.create_collective_project(pg_temp.id_of('org'), 'PDS Mic 9', 'content',
                     pg_temp.id_of('pds'), pg_temp.id_of('tom_person'), pg_temp.id_of('mic')) $$,
  'the new holder does');
reset role;

-- Without a selection; a music collective ---------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'p3', public.create_collective_project(pg_temp.id_of('org'),
  'Sans sélection', 'content', pg_temp.id_of('pds'), pg_temp.id_of('alize_person'));
insert into ids select 'p4', public.create_collective_project(pg_temp.id_of('org'),
  'Compilation', 'music_release', pg_temp.id_of('pds'), pg_temp.id_of('alize_person'),
  pg_temp.id_of('mic'), array[pg_temp.id_of('master')], p_music_format => 'compilation',
  p_master_validator_person_id => pg_temp.id_of('alize_person'));
reset role;
select is(pg_temp.titles('p3'), null, 'without a selection, no title: they come later');
select is((select artist_id from public.projects where id = pg_temp.id_of('p3')), pg_temp.id_of('pds'),
          'its main artist all the same');
select is(pg_temp.titles('p4'), array['1:active:Hiver ' || pg_temp.tag(), '2:planned:∅', '3:planned:∅'],
          'a music collective: its master is its first title, the guests'' titles after');
select is((select master_validator_person_id from public.projects where id = pg_temp.id_of('p4')),
          pg_temp.id_of('alize_person'), 'its Master validator');
select is((select music_format || '|' || coalesce(content_format_id::text, '-') from public.projects where id = pg_temp.id_of('p4')),
          'compilation|-', 'no content format on a music release');

-- Editing a collective before its launch: the main artist kept -------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.update_project(pg_temp.id_of('p1'), 'PDS Mic 7', 'content',
                     p_content_format_id => pg_temp.id_of('format'), p_artist_id => null) $$,
  'saved without an artist (the form asks for it; another caller may not send it)');
reset role;
select is((select artist_id from public.projects where id = pg_temp.id_of('p1')), pg_temp.id_of('pds'),
          'the main artist is no longer erased: kept');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.update_project(pg_temp.id_of('p1'), 'PDS Mic 7 bis', 'content',
                     p_content_format_id => pg_temp.id_of('format'), p_artist_id => pg_temp.id_of('lyna')) $$,
  'the main artist changes through the form');
reset role;
select is((select artist_id || '|' || title from public.projects where id = pg_temp.id_of('p1')),
          pg_temp.id_of('lyna')::text || '|PDS Mic 7 bis', 'by set_project_main_artist, with the rest');
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.update_project(pg_temp.id_of('p4'), 'Compilation', 'music_release',
                     array[pg_temp.id_of('master')], p_music_format => 'compilation', p_artist_id => null) $$,
  'a music collective edited without an artist');
select lives_ok($$ select public.update_project(pg_temp.id_of('p4'), 'Compilation', 'music_release',
                     array[pg_temp.id_of('master')], p_music_format => 'compilation',
                     p_artist_id => pg_temp.id_of('pds')) $$,
  'or with the same one: nothing else is asked');
reset role;
select is((select artist_id from public.projects where id = pg_temp.id_of('p4')), pg_temp.id_of('pds'),
          'keeps its main artist too');

-- The main artist is never a guest of the project ------------------------------------------
-- p1: main artist Lyna; Sami, Nadia, Ines proposed guests.
create function pg_temp.participation(p_project text, p_artist text) returns uuid language sql as $$
  select tp.id from public.title_participations tp
   where tp.project_id = pg_temp.id_of(p_project) and tp.artist_id = pg_temp.id_of(p_artist) $$;
grant execute on function pg_temp.participation(text, text) to authenticated;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('p1'), pg_temp.id_of('sami')) $$,
  '23514', 'main_artist_is_guest', 'a guest of a title is refused as the main artist');
select throws_ok($$ select public.update_project(pg_temp.id_of('p1'), 'PDS Mic 7 bis', 'content',
                     p_content_format_id => pg_temp.id_of('format'), p_artist_id => pg_temp.id_of('nadia')) $$,
  '23514', 'main_artist_is_guest', 'through the edit form too');
reset role;
select is((select artist_id from public.projects where id = pg_temp.id_of('p1')), pg_temp.id_of('lyna'),
          'the main artist stays as it was');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.abandon_project_title((select title_id from public.title_participations
                                      where id = pg_temp.participation('p1', 'ines')), 'Plus tard');
select throws_ok($$ select public.set_project_main_artist(pg_temp.id_of('p1'), pg_temp.id_of('ines')) $$,
  '23514', 'main_artist_is_guest', 'a guest of an abandoned title too: it can come back');
select public.set_title_participation_status(pg_temp.participation('p1', 'nadia'), 'withdrawn');
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('p1'), pg_temp.id_of('nadia')) $$,
  'once her participation is withdrawn, she can be the main artist');
reset role;
select is((select artist_id from public.projects where id = pg_temp.id_of('p1')), pg_temp.id_of('nadia'),
          'she is');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_title_participation_status(pg_temp.participation('p1', 'nadia'), 'proposed') $$,
  '23514', 'main_artist_not_participant', 'her withdrawn participation is not brought back while she is the main artist');
select lives_ok($$ select public.set_title_participation_status(pg_temp.participation('p1', 'nadia'), 'declined') $$,
  'it can still be marked declined');
select lives_ok($$ select public.set_project_main_artist(pg_temp.id_of('p3'), pg_temp.id_of('sami')) $$,
  'a guest of another project can be the main artist of this one');
reset role;

-- Any other project unchanged ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Simple ' || pg_temp.tag(),
  'content', p_artist_id => pg_temp.id_of('nadia'), p_assignee_person_id => pg_temp.id_of('alize_person'));
select lives_ok($$ select public.update_project(pg_temp.id_of('simple'), 'Simple', 'content',
                     p_artist_id => null) $$,
  'a simple content project still drops its artist when the field is emptied');
reset role;
select is((select collective::text || '|' || coalesce(artist_id::text, '-') from public.projects
            where id = pg_temp.id_of('simple')), 'false|-', 'not collective, its artist as before');

select * from finish();
rollback;
