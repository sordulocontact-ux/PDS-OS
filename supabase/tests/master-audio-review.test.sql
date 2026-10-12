-- Versions audio d'un titre : examen, validation, commentaires (retours
-- Catalogue 01, 07, 13, 18, 19, 24 à 26,
-- supabase/migrations/20261012100901_master_audio_review.sql).
-- Run with `supabase test db`.
begin;
select plan(15);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Kalia ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Kalia ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));


create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;


create function pg_temp.audio_path() returns text language sql as $$
  select pg_temp.id_of('org')::text || '/' || pg_temp.id_of('master')::text || '/'
         || gen_random_uuid()::text || '.wav'
$$;

-- A deposit is not a validation (retours 07, 13, 18) ------------------------
insert into public.master_files (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'audio', 'mix', pg_temp.audio_path(),
        'mix-v1.wav', 'audio/wav', 10);
insert into ids select 'mix1', id from public.master_files
 where master_id = pg_temp.id_of('master') and file_name = 'mix-v1.wav';
select is((select review_status from public.master_files where id = pg_temp.id_of('mix1')), null,
          'a deposited version waits to be examined');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.review_master_audio(%L, 'approved') $$, pg_temp.id_of('mix1')),
                 '42501', null, 'without manage_catalog, nobody validates');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.review_master_audio(%L, 'changes_requested', '  ') $$,
                 pg_temp.id_of('mix1')), '23514', null, 'a change request says what to change');
select lives_ok(format($$ select public.review_master_audio(%L, 'changes_requested', 'Voix plus devant') $$,
                pg_temp.id_of('mix1')), 'corrections are requested on this exact version');
select throws_ok(format($$ select public.review_master_audio(%L, 'approved') $$, pg_temp.id_of('mix1')),
                 'P0001', 'already_reviewed', 'a decision is never rewritten');

-- Timecoded comments, append-only (retour 26) ------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok(format($$
  insert into public.master_file_comments (organization_id, master_id, file_id, at_seconds, body)
  values (%L, %L, %L, 42, 'Le refrain sature')
$$, pg_temp.id_of('org'), pg_temp.id_of('master'), pg_temp.id_of('mix1')),
  'every member comments a version at an instant');
select throws_ok($$ update public.master_file_comments set body = 'autre' $$, '42501', null,
                 'a comment is never rewritten');

-- The Master final: deposited, then validated (retour 01) -------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.master_files (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'audio', 'final_master', pg_temp.audio_path(),
        'final.wav', 'audio/wav', 10);
insert into ids select 'final', id from public.master_files
 where master_id = pg_temp.id_of('master') and file_name = 'final.wav';
select is((select (audio_state, final_validated_at is null)::text from public.masters
            where id = pg_temp.id_of('master')), '(final_master,t)',
          'a deposited Master final moves the state, not the validation');
select public.review_master_audio(pg_temp.id_of('final'), 'approved');
select isnt((select final_validated_at from public.masters where id = pg_temp.id_of('master')), null,
            'an approved Master final finalises the title');

-- Protected deletion (retour 24) --------------------------------------------
delete from public.master_files where id = pg_temp.id_of('final');
select is((select count(*)::int from public.master_files where id = pg_temp.id_of('final')), 1,
          'an approved version cannot be deleted');

-- Reclassifying (retour 19) --------------------------------------------------
select throws_ok(format($$ select public.reclassify_master_audio(%L, 'master') $$, pg_temp.id_of('mix1')),
                 'P0001', 'audio_locked', 'an examined version keeps its state');
insert into public.master_files (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'audio', 'master', pg_temp.audio_path(),
        'erreur.wav', 'audio/wav', 10);
insert into ids select 'wrong', id from public.master_files
 where master_id = pg_temp.id_of('master') and file_name = 'erreur.wav';
select lives_ok(format($$ select public.reclassify_master_audio(%L, 'demo') $$, pg_temp.id_of('wrong')),
                'a version deposited at the wrong state is reclassified');
select is((select audio_state from public.masters where id = pg_temp.id_of('master')), 'final_master',
          'the title keeps its most advanced state');
delete from public.master_files where id = pg_temp.id_of('wrong');
select is((select count(*)::int from public.master_files where id = pg_temp.id_of('wrong')), 0,
          'an unexamined, unused version can still be deleted');

reset role;
select is((select count(*)::int from public.activity_events
            where master_id = pg_temp.id_of('master') and kind = 'audio_reviewed'), 2,
          'each decision is in the title''s journal');

select * from finish();
rollback;
