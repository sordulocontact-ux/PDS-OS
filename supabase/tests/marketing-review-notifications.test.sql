-- Marketing › Suivi & bilan, lot 7 R5 (20261019070101): who is told what.
-- A version submitted → the direction; its decision → who submitted; the
-- closing asked → the direction; decided → who asked; reopened → the
-- project's responsible. Never the actor; each notification readable by its
-- recipient only. The direction is the organisation's validator as it is
-- (sole_validator refuses a second one). Everything rolls back.
begin;
select plan(12);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create function pg_temp.notified(p_kind text, p_to text) returns int language sql as $$
  select count(*)::int from public.notifications
   where kind = p_kind and project_id = pg_temp.id_of('project')
     and recipient_person_id = pg_temp.id_of(p_to)
$$;

insert into ids select 'org', id from public.organizations where slug = 'pds';
-- The direction as it is: the organisation's one holder of « validate ».
insert into ids select 'director', m.approved_account_id from public.memberships m
 where m.organization_id = pg_temp.id_of('org') and m.status = 'approved'
   and 'validate' = any (public.role_permissions(m.role))
 limit 1;
insert into ids select 'director_person', person_id from public.accounts where id = pg_temp.id_of('director');
insert into ids values ('manager', pg_temp.new_user('review-notify-' || substr(md5(random()::text), 1, 8) || '@pds.test'));
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('manager'));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Bilan notifié (test)', 'content', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects where title = 'Bilan notifié (test)';
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null;

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.marketing_activations (organization_id, project_id, title, kind)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Capsule notifiée', 'content');
insert into ids select 'activation', id from public.marketing_activations
 where project_id = pg_temp.id_of('project');
insert into ids select 'report', public.generate_marketing_report(
  pg_temp.id_of('project'), array[pg_temp.id_of('activation')], date '2026-10-01', date '2026-10-19',
  array['summary'], 'Résumé', '', '[]'::jsonb, 1);
select is(pg_temp.notified('marketing_report_submitted', 'director_person'), 0,
          'a version generated tells no one yet');
select public.submit_marketing_report(pg_temp.id_of('report'));
reset role;
select is(pg_temp.notified('marketing_report_submitted', 'director_person'), 1,
          'a version submitted tells the direction');
select is(pg_temp.notified('marketing_report_submitted', 'manager_person'), 0,
          'never the person who submitted it');

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.notifications
            where kind = 'marketing_report_submitted' and project_id = pg_temp.id_of('project')),
          1, 'the direction reads its notification');
select public.decide_marketing_report(pg_temp.id_of('report'), 1, 'approved_provisional', null);
reset role;
select is(pg_temp.notified('marketing_report_decided', 'manager_person'), 1,
          'the decision goes back to who submitted');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.notifications
            where kind = 'marketing_report_submitted' and project_id = pg_temp.id_of('project')),
          0, 'someone else''s notification stays unread by the manager (RLS)');
insert into ids select 'closure', public.request_marketing_closure(
  pg_temp.id_of('project'), pg_temp.id_of('report'), '');
reset role;
select is(pg_temp.notified('marketing_closure_requested', 'director_person'), 1,
          'the closing asked tells the direction');
select is(pg_temp.notified('marketing_closure_requested', 'manager_person'), 0,
          'never the person who asked');

select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_marketing_closure(pg_temp.id_of('closure'), 'closed_clean', null);
reset role;
select is(pg_temp.notified('marketing_closure_decided', 'manager_person'), 1,
          'the closing decided goes back to who asked');

select pg_temp.act_as(pg_temp.id_of('director'));
select public.reopen_marketing_closure(pg_temp.id_of('closure'), 'Retombées presse arrivées après');
reset role;
select is(pg_temp.notified('marketing_closure_reopened', 'manager_person'), 1,
          'the Marketing reopened tells the project''s responsible');
select is(pg_temp.notified('marketing_closure_reopened', 'director_person'), 0,
          'never the person who reopened it');
select ok(not exists (select 1 from public.notifications
                       where project_id = pg_temp.id_of('project')
                         and recipient_person_id = actor_person_id),
          'nobody is ever told of their own gesture');

select * from finish();
rollback;
