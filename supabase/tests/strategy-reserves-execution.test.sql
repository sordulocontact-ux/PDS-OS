-- Validation avec réserves, alertes critiques et plan d'exécution (MKT-S1-16,
-- supabase/migrations/20261012101501_strategy_reserves_execution.sql).
-- Run with `supabase test db`.
begin;
select plan(14);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Kalia ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Kalia ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));


create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;


reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'), 'Soleil', 'music_release',
  array[pg_temp.id_of('master')], p_music_format => 'ep');
reset role;
create function pg_temp.person_of(p_name text) returns uuid language sql as $$
  select person_id from public.accounts where id = pg_temp.id_of(p_name)
$$;
insert into ids select 'p_manager', pg_temp.person_of('manager');
insert into ids select 'p_director', pg_temp.person_of('director');
update public.projects set owner_person_id = pg_temp.person_of('manager')
 where id = pg_temp.id_of('project');
insert into public.levers (organization_id, project_id, label, family, state, review_status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Relations presse', 'promotion_distribution',
        'selected', 'confirmed');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title,
                                          assignee_person_id, due_date)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Dossier de presse',
        pg_temp.person_of('manager'), current_date + 20);
insert into ids select 'deliverable', id from public.strategy_deliverables
 where project_id = pg_temp.id_of('project');
-- A sent Brief with a critical alert, the director to review it.
insert into public.strategy_documents (organization_id, project_id, kind, version, content, state, sent_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'brief', 1,
        '{"format": 1, "toDecide": [{"key": "late-x", "dimension": "calendar", "text": "En retard", "critical": true},
                                    {"key": "lever-y", "dimension": "levers", "text": "À décider"}]}',
        'sent', now());
insert into ids select 'doc', id from public.strategy_documents where project_id = pg_temp.id_of('project');
insert into public.strategy_document_reviews (organization_id, document_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('doc'), pg_temp.person_of('director'));

select is(public.strategy_critical_alerts((select content from public.strategy_documents
                                            where id = pg_temp.id_of('doc'))),
          array['late-x'], 'the critical alerts are the ones the code flagged');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.decide_strategy_document(%L, true, 'OK') $$, pg_temp.id_of('doc')),
  'P0001', 'critical_alert_unaccepted', 'a critical alert is accepted by name before approving');
select throws_ok(format($$ select public.decide_strategy_document(%L, true, null, array['late-x'],
  jsonb_build_array(jsonb_build_object('text', 'Revoir le teaser', 'owner_person_id', %L,
                                       'due_on', current_date - 1))) $$,
  pg_temp.id_of('doc'), pg_temp.id_of('p_manager')),
  '23514', 'invalid_reserve', 'a reserve has an owner and a due date to come');
select lives_ok(format($$ select public.decide_strategy_document(%L, true, 'Avec réserves', array['late-x'],
  jsonb_build_array(jsonb_build_object('text', 'Revoir le teaser', 'owner_person_id', %L,
                                       'due_on', current_date + 7))) $$,
  pg_temp.id_of('doc'), pg_temp.id_of('p_manager')),
  'approving with a reserve, the alert accepted');
select is((select state from public.strategy_documents where id = pg_temp.id_of('doc')), 'approved',
          'the version is approved once every review is');
select is((select accepted_alerts || array[with_reserves::text] from public.strategy_document_reviews
            where document_id = pg_temp.id_of('doc')), array['late-x', 'true'],
          'the review keeps the alerts accepted and says it was with reserves');
reset role;
select is((select count(*)::int from public.tasks t
            join public.strategy_document_reserves r on r.id = t.strategy_reserve_id
           where r.document_id = pg_temp.id_of('doc') and t.assignee_person_id = r.owner_person_id
             and t.due_date = r.due_on and t.status = 'todo'), 1,
          'each reserve is a task of its owner, due on its date');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.lift_strategy_reserve(
  (select id from public.strategy_document_reserves where document_id = %L), 'Fait') $$, pg_temp.id_of('doc')),
  null, null, 'nobody else lifts a reserve');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.lift_strategy_reserve(
  (select id from public.strategy_document_reserves where document_id = %L), 'Teaser refait') $$,
  pg_temp.id_of('doc')), 'its owner lifts it, with how');
reset role;
select is((select r.status || '/' || t.status from public.strategy_document_reserves r
            join public.tasks t on t.strategy_reserve_id = r.id
           where r.document_id = pg_temp.id_of('doc')), 'lifted/done',
          'lifted, its task is ticked');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is(public.apply_strategy_execution(pg_temp.id_of('doc'), jsonb_build_array(
  jsonb_build_object('kind', 'activation', 'lever_id', pg_temp.id_of('lever'), 'activation_kind', 'press'),
  jsonb_build_object('kind', 'task', 'deliverable_id', pg_temp.id_of('deliverable')))), 2,
  'the owner confirms the plan: an activation and a task are created');
select is(public.apply_strategy_execution(pg_temp.id_of('doc'), jsonb_build_array(
  jsonb_build_object('kind', 'activation', 'lever_id', pg_temp.id_of('lever'), 'activation_kind', 'press'),
  jsonb_build_object('kind', 'task', 'deliverable_id', pg_temp.id_of('deliverable')))), 0,
  'replayed, nothing is created twice');
reset role;
select is((select count(*)::int from public.strategy_execution_items i
            join public.marketing_activations a on a.id = i.activation_id
           where i.document_id = pg_temp.id_of('doc') and a.lever_id = pg_temp.id_of('lever')
             and a.mode = 'internal'), 1,
          'the activation keeps its lever and the Brief version it comes from');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.apply_strategy_execution(%L, '[]') $$, pg_temp.id_of('doc')),
  '42501', null, 'only the project owner confirms the plan');

select * from finish();
rollback;
