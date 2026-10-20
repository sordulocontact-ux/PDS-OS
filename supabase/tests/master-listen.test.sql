-- Master, the artist listens (supabase/migrations/20261020010201_master_artist_listen.sql):
-- through their page by project, the versions in listening, their feedback
-- kept in the team, the validator told. Run with `supabase test db`.
begin;
select plan(9);

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
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
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
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, anon;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'ML ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
create function pg_temp.add_audio(p_name text, p_state text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.master_files (organization_id, master_id, category, audio_state,
                                   path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('title'), 'audio', p_state,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('title') || '/' || gen_random_uuid() || '.wav',
          p_name || '.wav', 'audio/wav', 1000)
  returning id into v_id;
  insert into ids values (p_name, v_id);
end $$;
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Ingé ' || (select v from vars where k = 'tag'), '{engineer}', 'inge@test.test');
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Ingé ' || (select v from vars where k = 'tag');
insert into public.master_briefs (organization_id, project_id, validator_person_id,
                                  mix_contact_id, mastering_same_engineer, mix_rate_cents,
                                  mastering_rate_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'),
        pg_temp.id_of('engineer'), true, 80000, 30000);
insert into public.network_contacts (organization_id, kind, name, roles, artist_id)
values (pg_temp.id_of('org'), 'person', 'Nova ' || (select v from vars where k = 'tag'), '{artist}', pg_temp.id_of('artist'));
insert into ids select 'artist_contact', id from public.network_contacts
 where artist_id = pg_temp.id_of('artist') and name = 'Nova ' || (select v from vars where k = 'tag');
create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;
insert into tokens select 'artist', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('artist_contact'));
insert into tokens select 'engineer', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('engineer'));
select pg_temp.add_audio('mix1', 'mix');
reset role;
insert into ids select 'v1', id from public.master_mix_versions where file_id = pg_temp.id_of('mix1');

select pg_temp.as_anon();
select is(jsonb_array_length(public.get_master_listen((select token from tokens where name = 'artist')) -> 'versions'),
          1, 'the artist sees the version in listening');
select is(public.get_master_listen((select token from tokens where name = 'engineer')), null,
          'the engineer does not listen as the artist');
select throws_ok(format($$ select public.post_master_listen_comment(%L, %L, 42, '  ', null) $$,
  (select token from tokens where name = 'artist'), pg_temp.id_of('v1')), '23514', 'body_required',
  'a feedback says something');
select lives_ok(format($$ select public.post_master_listen_comment(%L, %L, 42, 'La voix est trop basse', gen_random_uuid()) $$,
  (select token from tokens where name = 'artist'), pg_temp.id_of('v1')), 'the artist sends their feedback');
select is((public.get_master_listen((select token from tokens where name = 'artist')) -> 'versions' -> 0 -> 'mine' -> 0 ->> 'timecode')::int,
          42, 'with its timecode');
reset role;
select is((select contact_id from public.master_mix_comments where version_id = pg_temp.id_of('v1')),
          pg_temp.id_of('artist_contact'), 'kept as a comment of the version, from the artist');
select is((select count(*)::int from public.notifications
            where kind = 'master_listen_feedback' and recipient_person_id = pg_temp.id_of('creative_person')),
          1, 'the validator is told');
select is((select x ->> 'state' from jsonb_array_elements(
             public.contact_page_items(pg_temp.id_of('project'), pg_temp.id_of('artist_contact'))) x
            where x ->> 'kind' = 'listen'), 'done', 'the artist''s page: « Avis envoyé »');
select is((select feedback_summary from public.master_mix_versions where id = pg_temp.id_of('v1')),
          null, 'the engineer receives nothing until the validator sends it');

select * from finish();
rollback;
