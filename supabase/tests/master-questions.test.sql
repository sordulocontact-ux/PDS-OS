-- Master workflow: asking the right people
-- (supabase/migrations/20261005016001_master_brief_questions.sql).
-- Run with `supabase test db`.
begin;
select plan(21);

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

-- A launched project with a title and its creative director, no brief yet;
-- a second project the creative director does not belong to.
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


create function pg_temp.question(p_dimension text) returns uuid language sql as $$
  select id from public.master_brief_questions
   where project_id = pg_temp.id_of('project') and dimension = p_dimension
$$;
grant execute on function pg_temp.question(text) to authenticated;

-- Asking ----------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.ask_master_brief_questions(pg_temp.id_of('project'),
    jsonb_build_array(jsonb_build_object('dimension', 'direction',
      'person_id', pg_temp.id_of('creative_person'), 'task_title', 'Direction'))) $$,
  '42501', null, 'only the owner asks');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.ask_master_brief_questions(pg_temp.id_of('project'),
    jsonb_build_array(jsonb_build_object('dimension', 'direction',
      'person_id', pg_temp.id_of('other_person'), 'task_title', 'Direction'))) $$,
  'P0001', 'not_responsible', 'only a creative director of the project is asked');
select is(public.ask_master_brief_questions(pg_temp.id_of('project'),
    jsonb_build_array(
      jsonb_build_object('dimension', 'direction', 'person_id', pg_temp.id_of('creative_person'),
                         'task_title', 'Brief : direction'),
      jsonb_build_object('dimension', 'deliverables', 'person_id', pg_temp.id_of('creative_person'),
                         'task_title', 'Brief : livrables'))),
  2, 'the owner asks the direction and the deliverables');
select is(public.ask_master_brief_questions(pg_temp.id_of('project'),
    jsonb_build_array(jsonb_build_object('dimension', 'direction',
      'person_id', pg_temp.id_of('creative_person'), 'task_title', 'Brief : direction'))),
  0, 'an open question is not asked twice');
reset role;
select is((select (title, assignee_person_id, status, due_date is not null)::text from public.tasks
            where master_question_id = pg_temp.question('direction')),
          ('Brief : direction', pg_temp.id_of('creative_person'), 'todo', true)::text,
          'each question is a dated task of the person asked');
select is((select count(*)::int from public.notifications
            where kind = 'task_assigned' and recipient_person_id = pg_temp.id_of('creative_person')
              and project_id = pg_temp.id_of('project')),
          2, 'the person asked is notified of each task');

-- Answering -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.answer_master_question(pg_temp.question('direction'), 'Chaud', null) $$,
  '42501', null, 'only the person asked answers');
select throws_ok($$ select public.apply_master_question(pg_temp.question('direction')) $$,
  'P0001', 'not_answered', 'nothing to apply before the answer');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.master_brief_questions where project_id = pg_temp.id_of('project')),
          2, 'the person asked reads the questions of the project');
select throws_ok($$ select public.answer_master_question(pg_temp.question('direction'), '   ', null) $$,
  'P0001', 'empty_answer', 'an empty answer is refused');
select lives_ok($$ select public.answer_master_question(pg_temp.question('direction'), '  Chaud, voix devant  ', null) $$,
  'the creative director answers the direction');
select lives_ok($$ select public.answer_master_question(pg_temp.question('deliverables'), null,
    array['instrumental', 'stems']) $$,
  'and the deliverables');
select throws_ok($$ select public.answer_master_question(pg_temp.question('direction'), 'Autre', null) $$,
  'P0001', 'already_answered', 'an answer is given once');
select is((select status from public.tasks where master_question_id = pg_temp.question('direction')),
          'done', 'answering ticks the task');
select throws_ok($$ select public.apply_master_question(pg_temp.question('direction')) $$,
  '42501', null, 'only the owner puts an answer into the brief');
select throws_ok($$ insert into public.master_brief_questions (organization_id, project_id, dimension, asked_to)
    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'direction', pg_temp.id_of('creative_person')) $$,
  '42501', null, 'questions are never written directly');

-- Applying --------------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.apply_master_question(pg_temp.question('direction')) $$,
  'the owner applies the direction: the brief is created with it');
select lives_ok($$ select public.apply_master_question(pg_temp.question('deliverables')) $$,
  'then the deliverables');
select is((select (direction, deliverables @> array['mix_final', 'master_final', 'instrumental', 'stems'],
                   validator_person_id)::text
             from public.master_briefs where project_id = pg_temp.id_of('project')),
          ('Chaud, voix devant', true, pg_temp.id_of('owner_person'))::text,
          'the brief holds the answers, the defaults kept, the owner validating');
select throws_ok($$ select public.apply_master_question(pg_temp.question('direction')) $$,
  'P0001', 'already_applied', 'an answer is applied once');

-- Someone who does not see the project ------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.master_brief_questions where project_id = pg_temp.id_of('project')),
          0, 'someone who does not see the project reads no question');

reset role;
select * from finish();
rollback;
