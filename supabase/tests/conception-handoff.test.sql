-- MKT-C2-13 (…20261013100801): the closing references the validated Brief;
-- « Passer en Production » hands over the validated sheets once, against
-- that Brief, with exclusions and their reason, turns reserves into tasks
-- and starts Production; reopening is the direction's, with a reason, and
-- rewrites nothing approved. Accounts: director (validator), owner, da
-- (responsible). Run with `supabase test db`.
begin;
select plan(15);

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
  ('da', pg_temp.new_user('da-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('da', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'da');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
grant execute on function pg_temp.id_of(text), pg_temp.org(), pg_temp.prj() to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.org(),
  'HO ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.prj(), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;
with x as (insert into public.levers (organization_id, project_id, label, family, state)
           values (pg_temp.org(), pg_temp.prj(), 'Création', 'creation_content', 'selected') returning id)
insert into ids select 'lever', id from x;
with x as (insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, quantity)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Capsules TikTok', 5) returning id)
insert into ids select 'sd_caps', id from x;
with x as (insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, quantity)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Clip', 1),
                  (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Vinyle', 1) returning id, title)
insert into ids select 'sd_' || lower(title), id from x;
insert into ids select 'caps', d.id from public.design_deliverables d
 where d.strategy_deliverable_id = pg_temp.id_of('sd_caps');
insert into ids select 'clip', d.id from public.design_deliverables d
 where d.strategy_deliverable_id = pg_temp.id_of('sd_clip');
insert into ids select 'vinyle', d.id from public.design_deliverables d
 where d.strategy_deliverable_id = pg_temp.id_of('sd_vinyle');
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.prj()
   and d.key in ('framing', 'launch_strategy');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.start_design(pg_temp.prj());
-- Sheets are now created by the database from the validated Stratégie
-- (20261019040301_design_sheets_auto): this test builds its own.
delete from public.design_sheets where project_id = pg_temp.prj();
with s as (insert into public.design_sheets (organization_id, project_id, design_deliverable_id, kind, title)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('caps'), 'series', 'Capsules') returning id)
insert into ids select 'series', id from s;
with i as (insert into public.design_sheet_items (organization_id, project_id, sheet_id, number, title)
           select pg_temp.org(), pg_temp.prj(), pg_temp.id_of('series'), n, 'Capsule ' || n
             from generate_series(1, 2) n returning id, number)
insert into ids select 'item' || number, id from i;

update public.design_sheets set tracking = 'global' where id = pg_temp.id_of('series');
select public.assign_design_responsible(pg_temp.prj(), 'sheet', pg_temp.id_of('series'), pg_temp.id_of('da_person'));
select public.set_design_validators(pg_temp.prj(), 'sheet', pg_temp.id_of('series'),
                                    array[pg_temp.id_of('director_person')]);
with s as (insert into public.design_sheets (organization_id, project_id, design_deliverable_id, kind, title)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('clip'), 'single', 'Clip') returning id)
insert into ids select 'clip_sheet', id from s;
reset role;

select pg_temp.act_as(pg_temp.id_of('da'));
insert into ids select 'v1', public.submit_design_sheet(pg_temp.id_of('series'), null, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_design_submission(pg_temp.id_of('v1'), '', 'approved', null, 'Sous-titres à vérifier');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.create_design_brief(pg_temp.prj(), '{"context": {}}'::jsonb);
reset role;
insert into ids select 'brief', id from public.design_briefs where project_id = pg_temp.prj();

-- The Conception validated: the closing references that Brief.
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.prj() and d.key = 'design';
select is((select closed_brief_id from public.design_workspaces where project_id = pg_temp.prj()),
          pg_temp.id_of('brief'), 'the closing references the Brief créatif validated');

select pg_temp.act_as(pg_temp.id_of('da'));
select throws_ok($$ select public.pass_to_production(pg_temp.prj()) $$,
  '42501', null, 'only the project owner passes to Production');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.pass_to_production(pg_temp.prj(),
    jsonb_build_array(jsonb_build_object('deliverable_id', pg_temp.id_of('vinyle'), 'reason', ' '))) $$,
  '23514', 'exclusion_reason_required', 'an exclusion needs its reason');
select is((public.pass_to_production(pg_temp.prj(),
    jsonb_build_array(jsonb_build_object('deliverable_id', pg_temp.id_of('vinyle'), 'reason', 'Budget pas arbitré')))
    ->> 'handed')::int, 1, 'the validated sheet is handed over');
reset role;
select is((select brief_id from public.design_handoffs where sheet_id = pg_temp.id_of('series')),
          pg_temp.id_of('brief'), 'the handoff points to the validated Brief');
select is((select assignee_person_id from public.tasks
            where design_decision_id = (select id from public.design_decisions
                                         where submission_id = pg_temp.id_of('v1'))),
          pg_temp.id_of('da_person'), 'a reserve becomes a task of the sheet''s responsible');
select is((select s.state from public.project_stages s join public.stage_definitions d
            on d.id = s.stage_definition_id
           where s.project_id = pg_temp.prj() and d.key = 'production'), 'in_progress',
          'Production is started');
select is((select reason from public.design_handoff_exclusions where design_deliverable_id = pg_temp.id_of('vinyle')),
          'Budget pas arbitré', 'the exclusion keeps its reason');
select is((select count(*)::int from public.design_handoffs where sheet_id = pg_temp.id_of('clip_sheet')), 0,
          'a sheet not validated stays in Conception');

select pg_temp.act_as(pg_temp.id_of('owner'));
select is(public.pass_to_production(pg_temp.prj(),
    jsonb_build_array(jsonb_build_object('deliverable_id', pg_temp.id_of('vinyle'), 'reason', 'Budget pas arbitré'))),
  '{"handed": 0, "tasks": 0, "started": false}'::jsonb, 'run again, nothing is created twice');
select throws_ok($$ select public.reopen_design(pg_temp.prj(), 'Changer le clip') $$,
  '42501', null, 'only the direction reopens the Conception');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.reopen_design(pg_temp.prj(), '  ') $$,
  '23514', 'reason_required', 'a reopening needs its reason');
select lives_ok($$ select public.reopen_design(pg_temp.prj(), 'Le clip change de réalisateur') $$,
  'the direction reopens with a reason');
reset role;
select is((select jsonb_array_length(impact) || '/' || (brief_id = pg_temp.id_of('brief'))::text
             from public.design_reopenings where project_id = pg_temp.prj()), '1/true',
          'the reopening keeps the impact and the Brief it reopened');
select is((select count(*)::int from public.design_handoffs where project_id = pg_temp.prj())
          + (select count(*)::int from public.design_briefs where project_id = pg_temp.prj()), 2,
          'nothing approved is rewritten: the handoff and the Brief stay');

select * from finish();
rollback;
