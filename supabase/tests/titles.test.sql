-- Titles: audio state, variant and successive audio versions
-- (supabase/migrations/20260927004001_titles_audio_state.sql), run with
-- `supabase test db`.
begin;
select plan(14);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');

-- Minimal creation ----------------------------------------------------------
insert into ids select 'title', public.create_master(
  (select id from ids where name = 'org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));

select is((select (variant, audio_state, isrc, duration_seconds)::text from public.masters
            where id = (select id from ids where name = 'title')),
          '(original,,,)', 'a title and its artist are enough: original, no audio state, ISRC or duration');

select lives_ok($$
  insert into ids select 'instru', public.create_master(
    (select id from ids where name = 'org'), 'Sauvéé',
    jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))),
    'instrumental', 'FR-Z03-26-00077', 190, null, 'final_master')
$$, 'a finished title is created with everything known at once');

select is((select (variant, audio_state, isrc)::text from public.masters
            where id = (select id from ids where name = 'instru')),
          '(instrumental,final_master,FRZ032600077)', 'variant and audio state are two separate fields');

select throws_ok($$
  select public.create_master((select id from ids where name = 'org'), 'Faux',
    jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))),
    p_audio_state => 'mastered')
$$, '23514', null, 'an unknown audio state is refused');

insert into ids select 'live', public.create_master(
  (select id from ids where name = 'org'), 'Live',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))),
  'other', p_variant_label => '  Version live ');
select is((select variant_label from public.masters where id = (select id from ids where name = 'live')),
          'Version live', '"Autre" keeps its own words');

select throws_ok($$
  update public.masters set variant_label = 'Radio' where id = (select id from ids where name = 'title')
$$, '23514', null, 'only "Autre" carries a label');

-- Successive audio versions -------------------------------------------------
select throws_ok($$
  insert into public.master_files (organization_id, master_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'audio',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
            || '/' || gen_random_uuid() || '.wav', 'sauvee.wav', 'audio/wav', 1000)
$$, '23514', null, 'an audio version always says its audio state');

insert into public.master_files (organization_id, master_id, category, audio_state, duration_seconds,
                                 path, file_name, mime, bytes)
values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'audio', 'demo', 171,
        (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
          || '/' || gen_random_uuid() || '.wav', 'sauvee_demo.wav', 'audio/wav', 1000);

select is((select (audio_state, duration_seconds)::text from public.masters
            where id = (select id from ids where name = 'title')),
          '(demo,171)', 'the first audio version gives the title its state and duration');

insert into public.master_files (organization_id, master_id, category, audio_state, duration_seconds,
                                 path, file_name, mime, bytes)
values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'audio', 'master', 184,
        (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
          || '/' || gen_random_uuid() || '.wav', 'sauvee_master_v1.wav', 'audio/wav', 1000);

select is((select (audio_state, duration_seconds)::text from public.masters
            where id = (select id from ids where name = 'title')),
          '(master,184)', 'a later audio version moves the title forward');

insert into public.master_files (organization_id, master_id, category, audio_state, duration_seconds,
                                 path, file_name, mime, bytes)
values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'audio', 'rough_mix', 175,
        (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
          || '/' || gen_random_uuid() || '.wav', 'sauvee_map_v1.wav', 'audio/wav', 1000);

select is((select (audio_state, duration_seconds)::text from public.masters
            where id = (select id from ids where name = 'title')),
          '(master,184)', 'an earlier audio version filed late never moves the title back');

select is((select count(*)::int from public.masters where title = 'Sauvéé'
             and id in ((select id from ids where name = 'title'), (select id from ids where name = 'instru'))),
          2, 'audio files never create a title');

select is((select detail ->> 'audio_state' from public.activity_events
            where master_id = (select id from ids where name = 'title') and kind = 'file_added'
            order by created_at desc, seq desc limit 1),
          'rough_mix', 'the file event says which state the audio version stands for');

select throws_ok($$
  insert into public.master_files (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'artwork', 'demo',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
            || '/' || gen_random_uuid() || '.png', 'cover.png', 'image/png', 1000)
$$, '23514', null, 'only an audio file has an audio state');

-- A creative director reads but never writes the title.
select pg_temp.act_as((select id from ids where name = 'creative'));
select throws_ok($$
  insert into public.master_files (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'title'), 'audio', 'final_master',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'title')
            || '/' || gen_random_uuid() || '.wav', 'pirate.wav', 'audio/wav', 1000)
$$, '42501', null, 'without manage_catalog, no audio version');

select * from finish();
rollback;
