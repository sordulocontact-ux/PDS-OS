-- Security invariants of the data model, run with `supabase test db`.
-- Users are created in auth.users: the identity triggers link them to a
-- Person and a pending membership; the fixture admin is promoted directly.
begin;
select plan(28);

-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;

-- The framing opens once the project has a call report (run as postgres).
create function pg_temp.add_call_report(p_project uuid) returns void language sql as $$
  with c as (
    insert into public.calls (organization_id, project_id, title, consent)
    select organization_id, id, 'Call de cadrage', 'granted' from public.projects where id = p_project
    returning id, organization_id),
  t as (
    insert into public.transcripts (organization_id, call_id, text, provider, model)
    select organization_id, id, 'Transcription', 'test', 'test' from c
    returning id, organization_id, call_id)
  insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
  select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;
$$;
-- A call created with the defaults (as the owner, inside a test).
create function pg_temp.new_call_default() returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.calls (organization_id, project_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Défauts')
  returning id into v_id;
  return v_id;
end $$;
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon, service_role;
-- Unique per run: the suite must pass whatever the dev database contains.
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into vars select 'artist', 'Nova Kessel ' || v from vars where k = 'tag';
insert into vars select 'project', 'Lueur ' || v from vars where k = 'tag';
insert into vars select 'call', 'Cadrage ' || v from vars where k = 'tag';
insert into vars select 'isrc', 'FRZ03' || lpad(floor(random() * 1e7)::int::text, 7, '0');

insert into ids values
  ('admin', pg_temp.new_user('admin-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('member', pg_temp.new_user('member-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into ids select 'member_person', person_id from public.accounts where id = (select id from ids where name = 'member');
-- The fixture admin is promoted directly (as postgres), so the suite does not
-- depend on the one-shot bootstrap of the seed.
update public.memberships set status = 'approved', role = 'general_director'
 where person_id = (select person_id from public.accounts where id = (select id from ids where name = 'admin'));

-- Identity -------------------------------------------------------------------
select is((select status from public.memberships m
           join public.accounts a on a.person_id = m.person_id
           where a.id = (select id from ids where name = 'outsider')),
          'pending', 'a confirmed signup gets a pending membership');

-- The admin approves the member; the outsider stays pending.
select pg_temp.act_as((select id from ids where name = 'admin'));
update public.memberships set status = 'approved', role = 'project_manager'
 where person_id = (select id from ids where name = 'member_person');
select is((select status from public.memberships where person_id = (select id from ids where name = 'member_person')),
          'approved', 'an admin approves a membership');

-- Projects and stages ----------------------------------------------------------
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), (select v from vars where k = 'artist'), 'signed');
insert into ids select 'artist', id from public.artists where name = (select v from vars where k = 'artist');

select lives_ok($$
  select public.create_project((select id from ids where name = 'org'), (select v from vars where k = 'project'),
    'music_release',
    array[public.create_master((select id from ids where name = 'org'), 'Lueur',
      jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))))],
    null, null, null, null, p_music_format => 'single')
$$, 'the director creates a project around a master');
insert into ids select 'project', id from public.projects where title = (select v from vars where k = 'project');

select is((select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          0, 'creating a project instantiates no stage');
select isnt((select created_by from public.projects where title = (select v from vars where k = 'project')), null,
            'authorship is set by the database');

select throws_ok($$
  insert into public.artists (organization_id, name, created_by, relation)
  values ((select id from ids where name = 'org'), 'Faux', (select id from ids where name = 'member_person'), 'signed')
$$, '42501', null, 'clients cannot write authorship');

select throws_ok($$
  update public.project_stages set state = 'validated'
  where project_id = (select id from ids where name = 'project')
$$, '42501', null, 'clients cannot write a stage state directly');

-- State machine and validation -----------------------------------------------
-- Launched as postgres (the transmission is covered by transmission.test.sql):
-- the member, a project manager, owns it; the director validates.
reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select d.organization_id, (select id from ids where name = 'project'), d.id
from public.stage_definitions d
where d.organization_id = (select id from ids where name = 'org') and d.archived_at is null;
update public.projects set owner_person_id = (select id from ids where name = 'member_person')
 where id = (select id from ids where name = 'project');
insert into ids select 'admin_person', person_id from public.accounts where id = (select id from ids where name = 'admin');
insert into ids select 'stage', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project') and d.key = 'framing';

select pg_temp.act_as((select id from ids where name = 'admin'));
select throws_ok($$ select public.start_stage((select id from ids where name = 'stage')) $$,
                 '42501', null, 'the director does not work on the framing');

reset role;
select pg_temp.act_as((select id from ids where name = 'member'));
select throws_ok($$ select public.request_validation((select id from ids where name = 'stage')) $$,
                 'P0001', 'invalid_transition', 'cannot request validation of a stage not started');
select lives_ok($$ select public.start_stage((select id from ids where name = 'stage')) $$, 'the owner starts a stage');
-- The Brief is written while the framing is open (frozen once submitted).
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"x"', 'confirmed', 'manual');
  update public.field_values set value = '"y"'
$$, '42501', null, 'field values are append-only');

select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type, source_quote)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"x"', 'confirmed', 'voice', 'mets en objectif x')
$$, 'the owner records a dictated value');

select lives_ok($$
  insert into public.needs (organization_id, project_id, label, family, source_type, source_quote)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Clip', 'creation_content', 'voice', 'il nous faut un clip')
$$, 'the owner records a dictated need');

-- A framing validation is the validation of a Brief version (…20261006000101).
select public.create_framing_brief((select id from ids where name = 'project'), '{}'::jsonb);
select lives_ok($$ select public.request_validation((select id from ids where name = 'stage'), 'Brief prêt') $$,
                'the owner asks the director for a validation');
insert into ids select 'validation', id from public.validations
 where project_stage_id = (select id from ids where name = 'stage') and state = 'pending';

select throws_ok($$ select public.decide_validation((select id from ids where name = 'validation'), true) $$,
                 'P0001', 'not_the_validator', 'only the named validator decides');

reset role;
select pg_temp.act_as((select id from ids where name = 'admin'));
select throws_ok($$ select public.decide_validation((select id from ids where name = 'validation'), false) $$,
                 '23514', null, 'a rejection requires a reason');
select lives_ok($$ select public.decide_validation((select id from ids where name = 'validation'), true, 'OK') $$,
                'the director approves');
select is((select state from public.project_stages where id = (select id from ids where name = 'stage')),
          'validated', 'approval validates the stage');

reset role;
select pg_temp.act_as((select id from ids where name = 'member'));
-- Business invariants -----------------------------------------------------------
select throws_ok($$
  insert into public.calls (organization_id, project_id, title, consent)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), (select v from vars where k = 'call'), 'refused');
  update public.calls set audio_path = 'x/y/z.m4a' where title = (select v from vars where k = 'call')
$$, '23514', null, 'no audio when consent was refused');
insert into ids select 'default_call', pg_temp.new_call_default();
select is((select consent from public.calls where id = (select id from ids where name = 'default_call')),
          'granted', 'a new call is granted by contract');

select throws_ok($$
  insert into public.tasks (organization_id, project_id, title, due_date)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Sans responsable', current_date)
$$, '23502', null, 'a task always has an owner');

-- Outsider (pending) -----------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'outsider'));
select is((select count(*)::int from public.projects), 0, 'a pending account sees no project');
select throws_ok($$
  insert into public.projects (organization_id, title, type)
  values ((select id from ids where name = 'org'), 'Intrus', 'content')
$$, '42501', null, 'a pending account cannot create a project');
select is((select count(*)::int from public.people), 1, 'a pending account only sees itself');

-- Public smartlink -------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'member'));
insert into public.releases (organization_id, project_id, title, isrc)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Lueur', (select v from vars where k = 'isrc'));
insert into ids select 'token', smartlink_token from public.releases where isrc = (select v from vars where k = 'isrc');

reset role;
select pg_temp.act_as_anon();
select throws_ok($$ select count(*) from public.releases $$, '42501', null, 'anon cannot read tables');
select is(public.get_smartlink((select id from ids where name = 'token')), null,
          'a disabled smartlink returns nothing');

reset role;
update public.releases set smartlink_enabled = true where isrc = (select v from vars where k = 'isrc');
select pg_temp.act_as_anon();
select is(public.get_smartlink((select id from ids where name = 'token')) ->> 'artist', (select v from vars where k = 'artist'),
          'an enabled smartlink is readable by anyone holding the token');
select is(public.get_smartlink(gen_random_uuid()), null, 'an unknown token returns nothing');

reset role;
select * from finish();
rollback;
