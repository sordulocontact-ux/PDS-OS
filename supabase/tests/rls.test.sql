-- Security invariants of the data model, run with `supabase test db`.
-- Users are created in auth.users: the identity triggers link them to a
-- Person and a pending membership; the fixture admin is promoted directly.
begin;
select plan(26);

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
update public.memberships set status = 'approved', role = 'admin'
 where person_id = (select person_id from public.accounts where id = (select id from ids where name = 'admin'));

-- Identity -------------------------------------------------------------------
select is((select status from public.memberships m
           join public.accounts a on a.person_id = m.person_id
           where a.id = (select id from ids where name = 'outsider')),
          'pending', 'a confirmed signup gets a pending membership');

-- The admin approves the member; the outsider stays pending.
select pg_temp.act_as((select id from ids where name = 'admin'));
update public.memberships set status = 'approved'
 where person_id = (select id from ids where name = 'member_person');
select is((select status from public.memberships where person_id = (select id from ids where name = 'member_person')),
          'approved', 'an admin approves a membership');

-- Projects and stages ----------------------------------------------------------
insert into public.artists (organization_id, name)
values ((select id from ids where name = 'org'), (select v from vars where k = 'artist'));
insert into ids select 'artist', id from public.artists where name = (select v from vars where k = 'artist');

select lives_ok($$
  insert into public.projects (organization_id, artist_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), (select v from vars where k = 'project'))
$$, 'an active member creates a project');
insert into ids select 'project', id from public.projects where title = (select v from vars where k = 'project');

select is((select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          7, 'a new project gets one instance per configured stage');
select isnt((select created_by from public.projects where title = (select v from vars where k = 'project')), null,
            'authorship is set by the database');

select throws_ok($$
  insert into public.artists (organization_id, name, created_by)
  values ((select id from ids where name = 'org'), 'Faux', (select id from ids where name = 'member_person'))
$$, '42501', null, 'clients cannot write authorship');

select throws_ok($$
  update public.project_stages set state = 'validated'
  where project_id = (select id from ids where name = 'project')
$$, '42501', null, 'clients cannot write a stage state directly');

-- State machine and validation -----------------------------------------------
insert into ids select 'stage', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project') and d.key = 'framing';

select throws_ok($$ select public.request_validation((select id from ids where name = 'stage'),
                    (select id from ids where name = 'member_person')) $$,
                 'P0001', 'invalid_transition', 'cannot request validation of a stage not started');
select lives_ok($$ select public.start_stage((select id from ids where name = 'stage')) $$, 'a member starts a stage');
select lives_ok($$ select public.request_validation((select id from ids where name = 'stage'),
                   (select id from ids where name = 'member_person'), 'Brief prêt') $$,
                'a member requests validation from a named validator');
insert into ids select 'validation', id from public.validations where state = 'pending';

select throws_ok($$ select public.decide_validation((select id from ids where name = 'validation'), true) $$,
                 'P0001', 'not_the_validator', 'only the named validator decides');

reset role;
select pg_temp.act_as((select id from ids where name = 'member'));
select throws_ok($$ select public.decide_validation((select id from ids where name = 'validation'), false) $$,
                 '23514', null, 'a rejection requires a reason');
select lives_ok($$ select public.decide_validation((select id from ids where name = 'validation'), true, 'OK') $$,
                'the validator approves');
select is((select state from public.project_stages where id = (select id from ids where name = 'stage')),
          'validated', 'approval validates the stage');

-- Business invariants -----------------------------------------------------------
select throws_ok($$
  insert into public.calls (organization_id, project_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), (select v from vars where k = 'call'));
  update public.calls set audio_path = 'x/y/z.m4a' where title = (select v from vars where k = 'call')
$$, '23514', null, 'no audio without recording consent');

select throws_ok($$
  insert into public.tasks (organization_id, project_id, title, due_date)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Sans responsable', current_date)
$$, '23502', null, 'a task always has an owner');

select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"x"', 'confirmed', 'manual');
  update public.field_values set value = '"y"'
$$, '42501', null, 'field values are append-only');

select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type, source_quote)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"x"', 'confirmed', 'voice', 'mets en objectif x')
$$, 'a member records a dictated value');

select lives_ok($$
  insert into public.needs (organization_id, project_id, label, family, source_type, source_quote)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Clip', 'creation_content', 'voice', 'il nous faut un clip')
$$, 'a member records a dictated need');

-- Outsider (pending) -----------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'outsider'));
select is((select count(*)::int from public.projects), 0, 'a pending account sees no project');
select throws_ok($$
  insert into public.projects (organization_id, artist_id, title)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'artist'), 'Intrus')
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
