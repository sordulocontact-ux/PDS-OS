-- Projet collectif, lot 9 bis (20261114100101): « Demander des fichiers ». The
-- owner of a collective asks a member of the team for the source of several
-- titles; one line per title, received by the first audio file of that title
-- only (principle 1), whoever deposits it; the person asked deposits in the
-- app even without writing in the Catalogue. Run with `supabase test db`.
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
  from (values ('director'), ('owner'), ('creative'), ('outsider')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('outsider', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'outsider');

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

-- A collective with three titles (two in the Catalogue), its creative
-- director on the team; a simple project beside it.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_creative_person_ids => array[pg_temp.id_of('creative_person')],
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou'), pg_temp.id_of('mia')]);
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Contenu ' || pg_temp.tag(),
  'content', p_assignee_person_id => pg_temp.id_of('owner_person'));
reset role;
insert into ids select 'a_c1', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 'a_simple', id from public.project_assignments where project_id = pg_temp.id_of('simple');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
select public.respond_to_assignment(pg_temp.id_of('a_simple'), 'accepted');
insert into ids select 'mA', public.ensure_project_title_master(pg_temp.id_of('t1'));
insert into ids select 'mB', public.ensure_project_title_master(pg_temp.id_of('t2'));
reset role;

create function pg_temp.add_file(p_master text, p_category text, p_state text) returns void
language sql as $$
  insert into public.master_files (organization_id, master_id, category, audio_state,
                                   path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of(p_master), p_category, p_state,
          pg_temp.id_of('org') || '/' || pg_temp.id_of(p_master) || '/' || gen_random_uuid() || '.wav',
          'prise.wav', 'audio/wav', 1000);
$$;
grant execute on function pg_temp.add_file(text, text, text) to authenticated;

-- Who asks, of whom, for what ----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t1')], pg_temp.id_of('director_person')) $$,
  '42501', 'forbidden', 'a member of the team who is not the owner does not ask');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.request_master_files(pg_temp.id_of('simple'), array[gen_random_uuid()], pg_temp.id_of('creative_person')) $$,
  '23514', 'not_collective', 'a simple project has no file request');
select throws_ok($$ select public.request_master_files(pg_temp.id_of('c1'), '{}', pg_temp.id_of('creative_person')) $$,
  '23514', 'titles_required', 'a title at least');
select throws_ok($$ select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t1')], pg_temp.id_of('outsider_person')) $$,
  '23514', 'recipient_not_allowed', 'never someone out of the project');
select throws_ok($$ select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t1')], pg_temp.id_of('owner_person')) $$,
  '23514', 'recipient_not_allowed', 'never oneself');
select throws_ok($$ select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t3')], pg_temp.id_of('creative_person')) $$,
  'P0001', 'title_not_in_master', 'a title not in the Catalogue yet is not in the Master');
select ok((select array_agg(person_id) from public.list_file_request_recipients(pg_temp.id_of('c1')))
            @> array[pg_temp.id_of('creative_person'), pg_temp.id_of('director_person')]
          and not (select array_agg(person_id) from public.list_file_request_recipients(pg_temp.id_of('c1')))
            @> array[pg_temp.id_of('owner_person')],
  'the team and the direction may be asked, the requester never');

select is(public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t1'), pg_temp.id_of('t2'), pg_temp.id_of('t1')],
                                      pg_temp.id_of('creative_person'), 'Les sessions de mardi'),
  2, 'one request for two titles');
reset role;
select is((select count(distinct title_id)::int from public.master_file_requests
            where project_id = pg_temp.id_of('c1') and cancelled_at is null),
  2, 'one line per title');
select is((select count(*)::int from public.notifications
            where kind = 'master_files_requested' and recipient_person_id = pg_temp.id_of('creative_person')),
  1, 'the person asked is told once');

select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t1')], pg_temp.id_of('creative_person')),
  0, 'asked again of the same person: unchanged');
select is(public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t2')], pg_temp.id_of('director_person')),
  1, 'asked of someone else: a new line');
reset role;
select is((select array_agg(requested_to::text || ':' || replaced::text order by replaced desc)
             from public.master_file_requests where title_id = pg_temp.id_of('t2')),
  array[pg_temp.id_of('creative_person') || ':true', pg_temp.id_of('director_person') || ':false'],
  'the first line is replaced, kept');

-- Received by an audio file of its title only (deposited by the direction) ------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select pg_temp.add_file('mA', 'audio', 'rough_mix');
reset role;
select is((select received_file_id is not null from public.master_file_requests
            where title_id = pg_temp.id_of('t1') and cancelled_at is null),
  true, 'an audio file of title A receives its line');
select is((select count(*)::int from public.master_file_requests
            where title_id = pg_temp.id_of('t2') and received_at is null and cancelled_at is null),
  1, 'title B still waits (principle 1)');
select pg_temp.add_file('mB', 'other', null);
select is((select count(*)::int from public.master_file_requests
            where title_id = pg_temp.id_of('t2') and received_at is null and cancelled_at is null),
  1, 'a file that is not audio receives nothing');
select is((select count(*)::int from public.notifications
            where kind = 'master_files_received' and recipient_person_id = pg_temp.id_of('owner_person')),
  1, 'the requester is told the file arrived');

-- The person asked deposits in the app (a creative director: no Catalogue) ---------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t2')], pg_temp.id_of('creative_person'));
reset role;
insert into ids select 'req_b', id from public.master_file_requests
 where title_id = pg_temp.id_of('t2') and received_at is null and cancelled_at is null;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.open_file_request_delivery(pg_temp.id_of('req_b'), 'wav', 'Session B.wav') $$,
  '42501', 'forbidden', 'only the person asked deposits on the line');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
insert into vars select 'slot', public.open_file_request_delivery(pg_temp.id_of('req_b'), 'wav', 'Session B.wav');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('master-files', (select v from vars where k = 'slot'), '{"size": 9000}'::jsonb);
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok(format($$ select public.record_file_request_delivery(%L, 'Session B.wav', 'audio/wav', 9000, 'rough_mix') $$,
  (select v from vars where k = 'slot')), 'the creative director deposits the file of title B');
reset role;
select is((select f.master_id::text || ':' || f.audio_state || ':' || (f.created_by = pg_temp.id_of('creative_person'))::text
             from public.master_file_requests r join public.master_files f on f.id = r.received_file_id
            where r.id = pg_temp.id_of('req_b')),
  pg_temp.id_of('mB') || ':rough_mix:true', 'a Mise à plat of title B, by her, and the line received');

-- Cancelled by its author or the owner ------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t1')], pg_temp.id_of('creative_person'));
reset role;
insert into ids select 'req_a', id from public.master_file_requests
 where title_id = pg_temp.id_of('t1') and received_at is null and cancelled_at is null;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.cancel_master_file_request(pg_temp.id_of('req_a')) $$,
  '42501', 'forbidden', 'the person asked does not cancel it');
select is((select count(*)::int from public.master_file_requests where project_id = pg_temp.id_of('c1')),
  5, 'the team reads the lines');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.cancel_master_file_request(pg_temp.id_of('req_a'));
select throws_ok($$ select public.cancel_master_file_request(pg_temp.id_of('req_a')) $$,
  'P0001', 'request_closed', 'once');
select public.abandon_project_title(pg_temp.id_of('t2'), 'Pas retenu');
select throws_ok($$ select public.request_master_files(pg_temp.id_of('c1'), array[pg_temp.id_of('t2')], pg_temp.id_of('creative_person')) $$,
  'P0001', 'title_abandoned', 'an abandoned title is not asked for');
reset role;

-- The project deleted: its requests go with it.
select public.delete_project_row(pg_temp.id_of('c1'));
select is((select count(*)::int from public.master_file_requests where project_id = pg_temp.id_of('c1')),
  0, 'delete_project_row empties it');

select * from finish();
rollback;
