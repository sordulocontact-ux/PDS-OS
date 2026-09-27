-- A project created with its team (transmitted, creative directors attached),
-- event projects, and no framing without a call report
-- (docs/CONTEXTE-PROJET.md § 12), run with `supabase test db`.
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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative2', pg_temp.new_user('creative2-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director'), ('creative2', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'manager', 'creative', 'creative2');

-- Creation with the team --------------------------------------------------------
select pg_temp.act_as((select id from ids where name = 'director'));

select throws_ok($$ select public.create_project((select id from ids where name = 'org'),
                    'Mauvais CP', 'content', p_assignee_person_id => (select id from ids where name = 'creative_person')) $$,
                 'P0001', 'invalid_assignee', 'the project manager must be one');
select is((select count(*)::int from public.projects where title = 'Mauvais CP'),
          0, 'a failed transmission creates nothing');

select throws_ok($$ select public.create_project((select id from ids where name = 'org'),
                    'Mauvais DC', 'content',
                    p_assignee_person_id => (select id from ids where name = 'manager_person'),
                    p_creative_person_ids => array[(select id from ids where name = 'manager_person')]) $$,
                 'P0001', 'invalid_creative', 'a creative must be a creative director');

select lives_ok($$ insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
                   'Soirée ' || (select v from vars where k = 'tag'), 'content',
                   p_assignee_person_id => (select id from ids where name = 'manager_person'),
                   p_creative_person_ids => array[(select id from ids where name = 'creative_person'),
                                                  (select id from ids where name = 'creative2_person')]) $$,
                'the director creates a content project with its team, without master');
select is((select assignee_person_id from public.project_assignments
            where project_id = (select id from ids where name = 'project') and status = 'pending'),
          (select id from ids where name = 'manager_person'), 'the project is transmitted at creation');
select is((select count(*)::int from public.project_creatives where project_id = (select id from ids where name = 'project')),
          2, 'the creative directors are attached');
select is((select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          0, 'not launched before the manager accepts');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select public.respond_to_assignment(
  (select id from public.project_assignments where project_id = (select id from ids where name = 'project')),
  'accepted');
insert into ids select 'framing', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project') and d.key = 'framing';

-- No framing without a call -------------------------------------------------------
select ok(not public.framing_is_open((select id from ids where name = 'project')),
          'a launched project without call report cannot be framed');
select throws_ok($$ select public.start_stage((select id from ids where name = 'framing')) $$,
                 'P0001', 'framing_requires_call', 'the framing does not start without a call');
select throws_ok($$ insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
                    values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
                            'brief', 'objective', '"x"', 'confirmed', 'manual') $$,
                 '42501', null, 'nor is the Brief written');

-- A call that only exists (planned, no report) is not enough.
insert into public.calls (organization_id, project_id, title, occurred_at)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
        'Call prévu', now() + interval '2 days');
select ok(not public.framing_is_open((select id from ids where name = 'project')),
          'a planned call does not open the framing');

reset role;
with c as (select id, organization_id from public.calls where project_id = (select id from ids where name = 'project')),
t as (
  insert into public.transcripts (organization_id, call_id, text, provider, model)
  select organization_id, id, 'Transcription', 'test', 'test' from c returning id, organization_id, call_id)
insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;

select pg_temp.act_as((select id from ids where name = 'manager'));
select ok(public.framing_is_open((select id from ids where name = 'project')),
          'a call report opens the framing');
select lives_ok($$ select public.start_stage((select id from ids where name = 'framing')) $$,
                'the owner starts the framing');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select ok(exists(select 1 from public.projects where id = (select id from ids where name = 'project')),
          'a creative director chosen at creation sees the project');

reset role;
select * from finish();
rollback;
