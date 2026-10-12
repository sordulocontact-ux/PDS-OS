-- Master workflow: deciding on a version of the mix
-- (supabase/migrations/20261005014001_master_mix_decisions.sql).
-- Run with `supabase test db`.
begin;
select plan(19);

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
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));

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

create function pg_temp.version(p_number int) returns uuid language sql as $$
  select id from public.master_mix_versions
   where project_id = pg_temp.id_of('project') and master_id = pg_temp.id_of('title') and number = p_number
$$;
grant execute on function pg_temp.version(int) to authenticated;
select pg_temp.add_audio('v1', 'mix');
select pg_temp.add_audio('v2', 'mix');

-- The validator decides --------------------------------------------------------------
select throws_ok($$ select public.decide_mix_version(pg_temp.version(2), 'approved', null) $$,
  '42501', null, 'the owner does not decide when the brief names a validator');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_mix_version(pg_temp.version(1), 'approved', null) $$,
  'P0001', 'not_latest', 'only the latest version is decided');
select lives_ok($$ select public.decide_mix_version(pg_temp.version(2), 'changes_requested', '  Plus de basse  ') $$,
  'the validator asks for a change');
select is((select (decision, decision_note, decided_by)::text from public.master_mix_versions where id = pg_temp.version(2)),
          ('changes_requested', null, pg_temp.id_of('creative_person'))::text,
          'the decision and who decided are kept');
select is((select (feedback_summary, status)::text from public.master_mix_versions where id = pg_temp.version(2)),
          ('Plus de basse', 'feedback_sent')::text,
          'with nothing sent yet, the note is the feedback sent to the engineer, written once (PROJ-BUG-08)');
select throws_ok($$ select public.decide_mix_version(pg_temp.version(2), 'approved', null) $$,
  'P0001', 'already_decided', 'a decision is never changed');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'master_mix_changes_requested' and recipient_person_id = pg_temp.id_of('owner_person')),
          1, 'the owner is told a change is requested');

-- The Mix final ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select pg_temp.add_audio('v3', 'mix');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.decide_mix_version(pg_temp.version(3), 'approved', null) $$,
  'the validator approves V3: the Mix final');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'master_mix_approved' and recipient_person_id = pg_temp.id_of('owner_person')),
          1, 'the owner is told the Mix final is validated');
select pg_temp.act_as(pg_temp.id_of('owner'));
select pg_temp.add_audio('v4', 'mix');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.decide_mix_version(pg_temp.version(4), 'approved', null) $$,
  'P0001', 'already_final', 'a validated Mix final is never replaced');
reset role;
select is((select number from public.master_mix_versions
            where project_id = pg_temp.id_of('project') and decision = 'approved'),
          3, 'the Mix final stays V3');

-- Without a validator, the owner -----------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
update public.master_briefs set validator_person_id = null where project_id = pg_temp.id_of('project');
select throws_ok($$ select public.decide_mix_version(pg_temp.version(4), 'changes_requested', null) $$,
  '23514', 'note_required', 'a change request with nothing sent says what to change');
select lives_ok($$ select public.decide_mix_version(pg_temp.version(4), 'changes_requested', 'Moins de réverb') $$,
  'without a validator, the owner decides');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.decide_mix_version(pg_temp.version(4), 'approved', null) $$,
  '42501', null, 'nobody else decides');
reset role;

-- One flow of feedback (PROJ-BUG-08) -------------------------------------------------------
reset role;
insert into ids values ('key', gen_random_uuid());
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ insert into public.master_mix_comments
    (organization_id, project_id, version_id, body, timecode_seconds, client_key)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.version(4), 'Voix trop basse', 83,
          pg_temp.id_of('key')) $$, 'a comment keeps its timecode');
select throws_ok($$ insert into public.master_mix_comments
    (organization_id, project_id, version_id, body, client_key)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.version(4), 'Voix trop basse',
          pg_temp.id_of('key')) $$, '23505', null, 'the same request sent twice adds the comment once');
select throws_ok($$ insert into public.master_mix_comments
    (organization_id, project_id, version_id, body, timecode_seconds)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.version(4), 'x', -3) $$,
  '23514', null, 'a timecode is a position in the track');
select pg_temp.add_audio('v5', 'mix');
update public.master_mix_versions set feedback_summary = 'Synthèse de l''équipe' where id = pg_temp.version(5);
select public.send_mix_feedback(pg_temp.version(5));
select lives_ok($$ select public.decide_mix_version(pg_temp.version(5), 'changes_requested', 'Et la caisse claire') $$,
  'a change request after the synthesis was sent');
select is((select (feedback_summary, decision_note)::text from public.master_mix_versions where id = pg_temp.version(5)),
          ('Synthèse de l''équipe', 'Et la caisse claire')::text,
          'the synthesis stays as sent, the note completes it');
reset role;

select * from finish();
rollback;
