-- PROJ-BUG-01: a call recorded in the app is saved while it happens, in takes
-- and pieces (supabase/migrations/20261011400101_call_recording_takes.sql).
-- Run with `supabase test db`.
begin;
select plan(13);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('creator', pg_temp.new_user('rec-creator-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('rec-other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id in (select person_id from public.accounts
                        where id in (pg_temp.id_of('creator'), pg_temp.id_of('other')));

select pg_temp.act_as(pg_temp.id_of('creator'));
insert into public.calls (organization_id, title, occurred_at, consent)
values (pg_temp.id_of('org'), 'Enregistré ' || (select v from vars where k = 'tag'), now(), 'granted');
insert into ids select 'call', id from public.calls
 where title = 'Enregistré ' || (select v from vars where k = 'tag');

-- Takes ------------------------------------------------------------------------
insert into ids select 'take1', id from public.begin_recording_take(pg_temp.id_of('call'), 'audio/webm', 'webm');
insert into ids select 'take2', id from public.begin_recording_take(pg_temp.id_of('call'), 'audio/webm', 'webm');
select is((select array_agg(take order by take)::int[] from public.call_recording_takes
            where call_id = pg_temp.id_of('call')),
          array[1, 2], 'each start opens the next take, numbered by the database');

select throws_ok($$ select public.begin_recording_take(pg_temp.id_of('call'), 'audio/ogg', 'ogg') $$,
                 '23514', null, 'only the recorder''s own formats are accepted');

-- Pieces -----------------------------------------------------------------------
select lives_ok($$
  insert into public.call_recording_pieces (take_id, call_id, organization_id, seq, path, bytes, end_ms)
  values (pg_temp.id_of('take1'), pg_temp.id_of('call'), pg_temp.id_of('org'), 0,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('call') || '/takes/' || pg_temp.id_of('take1') || '/0.webm',
          1000, 20000)
$$, 'the one who works on the call saves a piece of its take');

select throws_ok($$
  insert into public.call_recording_pieces (take_id, call_id, organization_id, seq, path, bytes, end_ms)
  values (pg_temp.id_of('take1'), pg_temp.id_of('call'), pg_temp.id_of('org'), 0,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('call') || '/takes/' || pg_temp.id_of('take1') || '/0.webm',
          1000, 20000)
$$, '23505', null, 'a piece is saved once: a retry never doubles it');

select lives_ok($$
  insert into public.call_recording_pieces (take_id, call_id, organization_id, seq, path, bytes, end_ms)
  values (pg_temp.id_of('take1'), pg_temp.id_of('call'), pg_temp.id_of('org'), 0,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('call') || '/takes/' || pg_temp.id_of('take1') || '/0.webm',
          1000, 20000)
  on conflict (take_id, seq) do nothing
$$, 'and the retry the recorder sends is accepted without a second row');

select throws_ok($$
  insert into public.call_recording_pieces (take_id, call_id, organization_id, seq, path, bytes, end_ms)
  values (pg_temp.id_of('take1'), pg_temp.id_of('call'), pg_temp.id_of('org'), 1,
          pg_temp.id_of('org') || '/autre-call/takes/x/1.webm', 1000, 40000)
$$, '23514', null, 'a piece lives in its own take''s folder');

-- Someone else ---------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.call_recording_pieces where call_id = pg_temp.id_of('call')),
          0, 'a member who does not see the meeting does not see its recording');
select throws_ok($$ select public.begin_recording_take(pg_temp.id_of('call'), 'audio/webm', 'webm') $$,
                 'P0002', null, 'nor records it');

-- Assembled, then the call has its audio --------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creator'));
update public.call_recording_takes
   set path = pg_temp.id_of('org') || '/' || pg_temp.id_of('call') || '/take1.webm', bytes = 1000
 where id = pg_temp.id_of('take1');
select throws_ok($$
  insert into public.call_recording_pieces (take_id, call_id, organization_id, seq, path, bytes, end_ms)
  values (pg_temp.id_of('take1'), pg_temp.id_of('call'), pg_temp.id_of('org'), 1,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('call') || '/takes/' || pg_temp.id_of('take1') || '/1.webm',
          1000, 40000)
$$, '42501', null, 'an assembled take takes no more pieces');

update public.call_recording_takes set discarded_at = now() where id = pg_temp.id_of('take2');
select is((select discarded_at is not null from public.call_recording_takes where id = pg_temp.id_of('take2')),
          true, '« Supprimer » sets a take aside without erasing it');

update public.calls
   set audio_path = pg_temp.id_of('org') || '/' || pg_temp.id_of('call') || '/take1.webm',
       audio_mime = 'audio/webm', audio_bytes = 1000, status = 'uploaded'
 where id = pg_temp.id_of('call');
select throws_ok($$ select public.begin_recording_take(pg_temp.id_of('call'), 'audio/webm', 'webm') $$,
                 'P0002', null, 'once the call has its audio, no new take');
update public.call_recording_takes set discarded_at = now() where id = pg_temp.id_of('take1');
select is((select discarded_at from public.call_recording_takes where id = pg_temp.id_of('take1')),
          null, 'and the sent recording can no longer be set aside');

-- Gone with the call ----------------------------------------------------------------
reset role;
delete from public.calls where id = pg_temp.id_of('call');
select is((select count(*)::int from public.call_recording_takes where call_id = pg_temp.id_of('call')),
          0, 'a deleted call takes its recording rows with it');

select * from finish();
rollback;
