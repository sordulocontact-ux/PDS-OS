-- Master workflow: versions of the mix and their feedback
-- (supabase/migrations/20261005013001_master_mix_versions.sql).
-- Run with `supabase test db`.
begin;
select plan(16);

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
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- A launched project with a title, its creative director, a brief; a second
-- project with the same title and no brief.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MV ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'bare', public.create_project(pg_temp.id_of('org'),
  'MV2 ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1),
       (pg_temp.id_of('org'), pg_temp.id_of('bare'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into public.master_briefs (organization_id, project_id, validator_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('owner_person'));

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

-- Received ----------------------------------------------------------------------
select lives_ok($$ select pg_temp.add_audio('v1', 'mix') $$,
  'the owner adds an audio file at the new "mix" state');
select is((select (number, status, created_by)::text from public.master_mix_versions
            where file_id = pg_temp.id_of('v1')),
          (1, 'received', pg_temp.id_of('owner_person'))::text,
          'the version is created by the database: V1, received, by its uploader');
select is((select count(*)::int from public.master_mix_versions where file_id = pg_temp.id_of('v1')),
          1, 'only in the project that has a Brief Mix/Master');
select is((select audio_state from public.masters where id = pg_temp.id_of('title')),
          'mix', 'the title moves to the "mix" state');
select pg_temp.add_audio('rough', 'rough_mix');
select pg_temp.add_audio('v2', 'mix');
select is((select string_agg(number::text, ',' order by number) from public.master_mix_versions
            where project_id = pg_temp.id_of('project')),
          '1,2', 'another mix file is V2; a rough mix is not a version');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'master_mix_version_received' and project_id = pg_temp.id_of('project')
              and recipient_person_id = pg_temp.id_of('creative_person')),
          2, 'the creative director is notified of each version (not the uploader)');
insert into ids select 'version', id from public.master_mix_versions
 where file_id = pg_temp.id_of('v1');

-- Comments ----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$
  insert into public.master_mix_comments (organization_id, project_id, version_id, body)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('version'), 'Voix trop basse au refrain')
$$, 'a member of the project comments a version');
update public.master_mix_versions set feedback_summary = 'Non' where id = pg_temp.id_of('version');
reset role;
select is((select feedback_summary from public.master_mix_versions where id = pg_temp.id_of('version')),
          null, 'only the owner writes the synthesis');
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$
  insert into public.master_mix_comments (organization_id, project_id, version_id, body)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('version'), 'Intrus')
$$, '42501', null, 'someone who does not see the project cannot comment');
reset role;

-- Synthesis, then sent ------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.send_mix_feedback(pg_temp.id_of('version')) $$,
  'P0001', 'no_summary', 'nothing to send without a synthesis');
update public.master_mix_versions set feedback_summary = 'Remonter la voix au refrain.'
 where id = pg_temp.id_of('version');
select lives_ok($$ select public.send_mix_feedback(pg_temp.id_of('version')) $$,
  'the owner sends the feedback');
select is((select (status, feedback_sent_by)::text from public.master_mix_versions where id = pg_temp.id_of('version')),
          ('feedback_sent', pg_temp.id_of('owner_person'))::text, 'the version says it was sent, and by whom');
update public.master_mix_versions set feedback_summary = 'Autre chose' where id = pg_temp.id_of('version');
select is((select feedback_summary from public.master_mix_versions where id = pg_temp.id_of('version')),
          'Remonter la voix au refrain.', 'a sent synthesis is never rewritten');
select throws_ok($$ select public.send_mix_feedback(pg_temp.id_of('version')) $$,
  'P0001', 'already_sent', 'sent once');

-- The engineer's page ---------------------------------------------------------------
update public.master_briefs set mix_contact_id = null where project_id = pg_temp.id_of('project');
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Mixeur ' || (select v from vars where k = 'tag'), array['engineer']);
update public.master_briefs set mix_contact_id = (select id from public.network_contacts
  where name = 'Mixeur ' || (select v from vars where k = 'tag'))
 where project_id = pg_temp.id_of('project');
select pg_temp.act_as(pg_temp.id_of('owner'));
create temp table tokens (t text) on commit drop;
grant all on tokens to authenticated, anon;
insert into tokens select public.create_master_transmission(pg_temp.id_of('project'), 'mix', '{}'::jsonb, null, now() + interval '30 days');
reset role;
set local role anon;
select ok((select exists (select 1 from jsonb_array_elements(
             public.get_master_transmission((select t from tokens)) -> 'versions') v
            where v ->> 'summary' = 'Remonter la voix au refrain.')),
          'the engineer reads the feedback sent, on its version');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.send_mix_feedback(pg_temp.id_of('version')) $$,
  '42501', null, 'the director does not send feedback');
reset role;

select * from finish();
rollback;
