-- Conception on the journey of the proto « Projet complet »
-- (20261019040101 to 040601): the sheets are created by the database once
-- the Stratégie is validated (a series as many items as its quantity), the
-- direction validates by default, the way in is chosen by the owner
-- (« Changer » until an exchange exists), a late addition says why, the
-- transfer of a sheet opens the Production, a later version transferred
-- tells it, and the Conception is done once every sheet is transferred.
-- Accounts: director (validator), owner, da. Run with `supabase test db`.
begin;
select plan(17);

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
  'JR ' || (select v from vars where k = 'tag'), 'content');
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

-- Sheets from the validated Stratégie ---------------------------------------
select is((select count(*)::int from public.design_sheets where project_id = pg_temp.prj()), 3,
          'one sheet per committed deliverable, created by the database');
select is((select kind from public.design_sheets where design_deliverable_id = pg_temp.id_of('caps')),
          'series', 'a quantity above one makes a series');
select is((select count(*)::int from public.design_sheet_items i
             join public.design_sheets s on s.id = i.sheet_id
            where s.design_deliverable_id = pg_temp.id_of('caps')), 5,
          'as many elements as the Stratégie committed');
insert into ids select 'clip_sheet', id from public.design_sheets
 where design_deliverable_id = pg_temp.id_of('clip');
insert into ids select 'vinyle_sheet', id from public.design_sheets
 where design_deliverable_id = pg_temp.id_of('vinyle');
insert into ids select 'caps_sheet', id from public.design_sheets
 where design_deliverable_id = pg_temp.id_of('caps');
select ok(exists (select 1 from public.design_validators
                   where sheet_id = pg_temp.id_of('clip_sheet')
                     and person_id = pg_temp.id_of('director_person')),
          'the direction validates every sheet by default');

-- The way in -----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('da'));
select throws_ok($$ select public.choose_design_start(pg_temp.prj(), 'direct') $$,
                 '42501', null, 'only the owner chooses how the Conception starts');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.choose_design_start(pg_temp.prj(), 'call') $$,
                'the owner prepares a creative exchange');
select is((select start_path from public.design_workspaces where project_id = pg_temp.prj()),
          'call', 'the way chosen is recorded');
select ok(exists (select 1 from public.design_validators
                   where project_id = pg_temp.prj() and scope = 'direction'
                     and person_id = pg_temp.id_of('director_person')),
          'the direction validates the artistic direction by default');
select lives_ok($$ select public.choose_design_start(pg_temp.prj(), null) $$,
                '« Changer » goes back to the choice');
select lives_ok($$ select public.choose_design_start(pg_temp.prj(), 'direct') $$,
                '« Commencer directement » asks no reason');
select is((select validation_mode from public.design_workspaces where project_id = pg_temp.prj()),
          'global', 'one decision on what is submitted');

-- A late addition -------------------------------------------------------------
select throws_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin)
                    values (pg_temp.org(), pg_temp.prj(), 'Session', 'manual') $$,
                 '23514', null, 'a late addition needs its reason');
select lives_ok($$ insert into public.design_deliverables (organization_id, project_id, title, origin, note, format)
                   values (pg_temp.org(), pg_temp.prj(), 'Session', 'manual', 'Demandée par l''artiste', '16:9') $$,
                'a late addition with its reason and format');
select is((select count(*)::int from public.design_sheets s
             join public.design_deliverables d on d.id = s.design_deliverable_id
            where d.project_id = pg_temp.prj() and d.title = 'Session'), 1,
          'a late addition gets its sheet at once');

-- Transfer --------------------------------------------------------------------
reset role;
delete from public.design_sheets s using public.design_deliverables d
 where d.id = s.design_deliverable_id and d.project_id = pg_temp.prj() and d.title = 'Session';
insert into public.design_submissions (organization_id, project_id, kind, sheet_id, number, sections,
                                       snapshot, mode, status, submitted_by, closed_at)
select pg_temp.org(), pg_temp.prj(), 'sheet', s.id, 1, array['sheet'], '{}'::jsonb, 'global', 'approved',
       pg_temp.id_of('da_person'), now()
  from public.design_sheets s where s.project_id = pg_temp.prj();
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.handoff_design_sheet(pg_temp.id_of('clip_sheet')) $$,
                'the owner transfers one sheet');
select is((select s.state from public.project_stages s join public.stage_definitions d
            on d.id = s.stage_definition_id
           where s.project_id = pg_temp.prj() and d.key = 'production'),
          'in_progress', 'the first transfer opens the Production');
select public.handoff_design_sheet(pg_temp.id_of('vinyle_sheet'));
select public.handoff_design_sheet(pg_temp.id_of('caps_sheet'));
select ok(public.design_is_done(pg_temp.prj()), 'every sheet transferred: the Conception is done');

select * from finish();
rollback;
