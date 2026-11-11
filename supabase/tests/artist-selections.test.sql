-- Projet collectif, lot 4 (…20261111200101, docs/pds-mic-plan.md § 3.1): the
-- selections of artists in the Catalogue — created, renamed, artists added
-- and removed by who manages the Catalogue (direction, project managers),
-- read by every active member, handed to a member who finds it in her
-- selections and is notified; no project is created.
-- Run with `supabase test db`.
begin;
select plan(40);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('glen', pg_temp.new_user('glen-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('waiting', pg_temp.new_user('waiting-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('alize', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'alize', 'creative', 'glen', 'waiting');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
-- The artists of a selection, by fixture name, in their order.
create function pg_temp.items(p_selection uuid) returns text[] language sql as $$
  select array_agg(ids.name order by i.position)
    from public.artist_selection_items i join ids on ids.id = i.artist_id
   where i.selection_id = p_selection $$;
grant execute on function pg_temp.items(uuid) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('Nadia'), ('Sami'), ('Ines'), ('Archive')) as v (label);
insert into ids
select lower(v.label), a.id
  from (values ('Nadia'), ('Sami'), ('Ines'), ('Archive')) as v (label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();
update public.artists set archived_at = now() where id = pg_temp.id_of('archive');
insert into vars select 'projects', count(*)::text from public.projects;

-- Who creates ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.create_artist_selection(pg_temp.id_of('org'), 'Mic 7') $$,
  '42501', 'forbidden', 'a creative director does not create a selection');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.create_artist_selection(pg_temp.id_of('org'), 'Mic 7') $$,
  '42501', 'forbidden', 'nor does the business manager');
reset role;
select pg_temp.act_as(pg_temp.id_of('waiting'));
select throws_ok($$ select public.create_artist_selection(pg_temp.id_of('org'), 'Mic 7') $$,
  '42501', 'forbidden', 'nor a member not approved yet');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.create_artist_selection(pg_temp.id_of('org'), '   ') $$,
  '23514', 'name_required', 'a selection has a name');
select throws_ok($$ select public.create_artist_selection(pg_temp.id_of('org'), repeat('x', 121)) $$,
  '22023', 'name_too_long', 'of 120 characters at most');
select throws_ok($$ select public.create_artist_selection(pg_temp.id_of('org'), 'Mic 7',
                     array[pg_temp.id_of('archive')]) $$,
  '23503', 'artist_not_found', 'an archived artist is not added');
insert into ids select 'mic7', public.create_artist_selection(pg_temp.id_of('org'), '  PDS Mic 7  ',
  array[pg_temp.id_of('sami'), pg_temp.id_of('nadia'), pg_temp.id_of('sami')]);
select ok(pg_temp.id_of('mic7') is not null, 'the direction creates a selection with several artists');
reset role;
select is((select name from public.artist_selections where id = pg_temp.id_of('mic7')), 'PDS Mic 7',
          'its name, trimmed');
select is(pg_temp.items(pg_temp.id_of('mic7')), array['sami', 'nadia'],
          'its artists in the order given, each once');
select is((select owner_person_id from public.artist_selections where id = pg_temp.id_of('mic7')),
          pg_temp.id_of('director_person'), 'held by its creator');
select is((select created_by from public.artist_selections where id = pg_temp.id_of('mic7')),
          pg_temp.id_of('director_person'), 'who created it');

select pg_temp.act_as(pg_temp.id_of('alize'));
insert into ids select 'empty', public.create_artist_selection(pg_temp.id_of('org'), 'Pistes');
select ok(pg_temp.id_of('empty') is not null, 'a project manager creates one too, even empty');
reset role;
select is(pg_temp.items(pg_temp.id_of('empty')), null, 'it has no artist yet');

-- Who reads ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.artist_selections
            where id in (pg_temp.id_of('mic7'), pg_temp.id_of('empty'))),
          2, 'the whole team reads the selections, like the artists');
select is(pg_temp.items(pg_temp.id_of('mic7')), array['sami', 'nadia'], 'and their artists');
select throws_ok($$ select public.rename_artist_selection(pg_temp.id_of('mic7'), 'Volé') $$,
  '42501', 'forbidden', 'without managing the Catalogue, nothing is changed');
select throws_ok($$ insert into public.artist_selection_items (organization_id, selection_id, artist_id, position)
                    values (pg_temp.id_of('org'), pg_temp.id_of('mic7'), pg_temp.id_of('ines'), 9) $$,
  '42501', null, 'not even directly');
reset role;
select pg_temp.act_as(pg_temp.id_of('waiting'));
select is((select count(*)::int from public.artist_selections where id = pg_temp.id_of('mic7')),
          0, 'a member not approved yet reads none');
reset role;

-- Renaming, adding, removing ---------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
select lives_ok($$ select public.rename_artist_selection(pg_temp.id_of('mic7'), 'PDS MIC #7') $$,
  'a project manager renames a selection she does not hold');
select throws_ok($$ select public.rename_artist_selection(pg_temp.id_of('mic7'), '') $$,
  '23514', 'name_required', 'never to nothing');
select is(public.add_artists_to_selection(pg_temp.id_of('mic7'),
            array[pg_temp.id_of('ines'), pg_temp.id_of('nadia')]),
          1, 'adding artists skips those already in it');
select throws_ok($$ select public.add_artists_to_selection(pg_temp.id_of('mic7'), array[pg_temp.id_of('archive')]) $$,
  '23503', 'artist_not_found', 'an archived artist is not added');
select lives_ok($$ select public.remove_artist_from_selection(pg_temp.id_of('mic7'), pg_temp.id_of('sami')) $$,
  'an artist is removed from the selection');
select throws_ok($$ select public.remove_artist_from_selection(pg_temp.id_of('mic7'), pg_temp.id_of('sami')) $$,
  'P0002', 'artist_not_in_selection', 'once');
reset role;
select is((select name from public.artist_selections where id = pg_temp.id_of('mic7')), 'PDS MIC #7', 'renamed');
select is(pg_temp.items(pg_temp.id_of('mic7')), array['nadia', 'ines'], 'its artists, the new one at the end');
select ok(exists (select 1 from public.artists where id = pg_temp.id_of('sami') and archived_at is null),
          'the removed artist''s fiche is untouched');

-- Handing it over ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select array_agg(person_id order by person_id) from public.list_selection_recipients(pg_temp.id_of('org'))
            where person_id in (select id from ids where name like '%_person')),
          (select array_agg(id order by id) from ids where name in ('director_person', 'alize_person')),
          'it can be handed to the direction and the project managers, not to the others');
select throws_ok($$ select public.transmit_artist_selection(pg_temp.id_of('mic7'), pg_temp.id_of('creative_person')) $$,
  '23514', 'recipient_not_allowed', 'not to a member who does not manage the Catalogue');
select throws_ok($$ select public.transmit_artist_selection(pg_temp.id_of('mic7'), pg_temp.id_of('director_person')) $$,
  'P0001', 'already_holder', 'not to its holder');
select lives_ok($$ select public.transmit_artist_selection(pg_temp.id_of('mic7'), pg_temp.id_of('alize_person')) $$,
  'the direction hands the selection to Alizé');
reset role;
select is((select owner_person_id from public.artist_selections where id = pg_temp.id_of('mic7')),
          pg_temp.id_of('alize_person'), 'Alizé holds it now');
select is((select transmitted_by from public.artist_selections where id = pg_temp.id_of('mic7')),
          pg_temp.id_of('director_person'), 'handed by the direction');
select pg_temp.act_as(pg_temp.id_of('alize'));
select is((select array_agg(id order by id) from public.artist_selections
            where owner_person_id = pg_temp.id_of('alize_person')),
          (select array_agg(id order by id) from ids where name in ('mic7', 'empty')),
          'she finds it in her selections, beside her own');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('alize_person')
              and kind = 'selection_transmitted' and subject_id = pg_temp.id_of('mic7')
              and actor_person_id = pg_temp.id_of('director_person') and project_id is null),
          1, 'and is notified, on the selection, by the direction');
select lives_ok($$ select public.transmit_artist_selection(pg_temp.id_of('mic7'), pg_temp.id_of('director_person')) $$,
  'she can hand it back');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('director_person') and kind = 'selection_transmitted'),
          1, 'the direction is notified in turn');
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.list_selection_recipients(pg_temp.id_of('org'))),
          0, 'who does not manage the Catalogue gets no list of recipients');
reset role;

-- No project, and an artist deleted leaves its selections ----------------------------
select is((select count(*)::text from public.projects), (select v from vars where k = 'projects'),
          'a selection creates no project');
select public.delete_artist_row(pg_temp.id_of('nadia'));
select is(pg_temp.items(pg_temp.id_of('mic7')), array['ines'], 'an artist deleted from the Catalogue leaves its selections');

select * from finish();
rollback;
