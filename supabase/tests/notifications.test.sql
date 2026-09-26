-- Notifications fed by the database, read by their recipient only, and
-- claimed for Web Push by the actor only. Run with `supabase test db`.
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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'manager');

-- The manager's browser is subscribed to Web Push.
select pg_temp.act_as((select id from ids where name = 'manager'));
select lives_ok($$ select public.save_push_subscription(
  'https://push.example.test/' || (select v from vars where k = 'tag'), 'key', 'secret') $$,
  'a person subscribes a browser');

-- Transmission ----------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'OP ' || (select v from vars where k = 'tag'), 'partnership');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'manager_person'));

select is((select count(*)::int from public.notifications), 0,
          'the director is not notified of their own transmission, nor sees others'' notifications');
select throws_ok($$ insert into public.notifications (organization_id, recipient_person_id, kind)
                    values ((select id from ids where name = 'org'), (select id from ids where name = 'director_person'), 'task_assigned') $$,
                 '42501', null, 'clients cannot write notifications');

select is((select count(*)::int from public.claim_push_deliveries()), 1,
          'the actor claims the push of what they just caused, for each subscribed browser');
select is((select count(*)::int from public.claim_push_deliveries()), 0, 'a push is claimed once');

reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
select pg_temp.act_as((select id from ids where name = 'manager'));
select is((select kind from public.notifications where subject_id = (select id from ids where name = 'a1')),
          'project_transmitted', 'the manager is notified of the transmission');
select is((select count(*)::int from public.claim_push_deliveries()), 0,
          'nobody claims pushes caused by someone else');
select lives_ok($$ select public.respond_to_assignment((select id from ids where name = 'a1'),
                   'clarification_requested', 'Quel budget ?') $$, 'the manager asks for a clarification');
select is(public.mark_notifications_read(), 1, 'the manager marks their notification read');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'nothing unread left');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select is((select kind from public.notifications where subject_id = (select id from ids where name = 'a1')),
          'project_clarification_requested', 'the director is notified of the question');
select is(public.mark_notifications_read(array[gen_random_uuid()]), 0,
          'marking someone else''s (or an unknown) notification does nothing');

-- Acceptance, then validations and tasks ---------------------------------------
insert into ids select 'a2', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'manager_person'));
reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select public.respond_to_assignment((select id from ids where name = 'a2'), 'accepted');
insert into ids select 'stage', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project') and d.key = 'framing';
select public.start_stage((select id from ids where name = 'stage'));
select public.request_validation((select id from ids where name = 'stage'),
  (select id from ids where name = 'director_person'), 'Brief prêt');
insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
        'Envoyer le brief', (select id from ids where name = 'director_person'), current_date + 7);
insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
        'Pour moi', (select id from ids where name = 'manager_person'), current_date + 7);

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select is((select array_agg(kind order by kind) from public.notifications
            where project_id = (select id from ids where name = 'project')
              and kind in ('project_accepted', 'validation_requested', 'task_assigned')),
          array['project_accepted', 'task_assigned', 'validation_requested'],
          'the director is notified of the acceptance, the validation request and the task');

select lives_ok($$ select public.decide_validation(
  (select v.id from public.validations v join public.project_stages s on s.id = v.project_stage_id
    where s.project_id = (select id from ids where name = 'project') and v.state = 'pending'), true, 'OK') $$,
  'the director approves');

reset role;
select pg_temp.act_as((select id from ids where name = 'manager'));
select ok(exists(select 1 from public.notifications where kind = 'validation_approved'
                 and project_id = (select id from ids where name = 'project')),
          'the requester is notified of the decision');
select ok(not exists(select 1 from public.notifications n join public.tasks t on t.id = n.subject_id
                     where t.title = 'Pour moi'),
          'assigning a task to oneself notifies nobody');

reset role;
select * from finish();
rollback;
