-- MKT-C2-08 (…20261013100401): approval apart from creation — nobody
-- approves what they submitted or deposited unless the governance allows it,
-- set by a validator; delegations hand a responsible's or a validator's
-- role for a while, revocable, audited. Accounts: director (DG), owner
-- (project manager), da (creative director, responsible), other (creative
-- director, not on the project). Run with `supabase test db`.
begin;
select plan(11);

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
  ('da', pg_temp.new_user('da-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('da', 'creative_director'), ('other', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'da', 'other');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
grant execute on function pg_temp.id_of(text), pg_temp.org(), pg_temp.prj() to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.org(),
  'RO ' || (select v from vars where k = 'tag'), 'content');
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
insert into ids select 'caps', d.id from public.design_deliverables d
 where d.strategy_deliverable_id = pg_temp.id_of('sd_caps');
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.prj()
   and d.key in ('framing', 'launch_strategy');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.start_design(pg_temp.prj());
with s as (insert into public.design_sheets (organization_id, project_id, design_deliverable_id, kind, title)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('caps'), 'series', 'Capsules') returning id)
insert into ids select 'series', id from s;
with i as (insert into public.design_sheet_items (organization_id, project_id, sheet_id, number, title)
           select pg_temp.org(), pg_temp.prj(), pg_temp.id_of('series'), n, 'Capsule ' || n
             from generate_series(1, 2) n returning id, number)
insert into ids select 'item' || number, id from i;

-- The DA is responsible and also named validator: still not their own approver.
update public.design_sheets set tracking = 'global' where id = pg_temp.id_of('series');
select public.assign_design_responsible(pg_temp.prj(), 'sheet', pg_temp.id_of('series'), pg_temp.id_of('da_person'));
select public.set_design_validators(pg_temp.prj(), 'sheet', pg_temp.id_of('series'),
                                    array[pg_temp.id_of('da_person'), pg_temp.id_of('director_person')]);
reset role;
select pg_temp.act_as(pg_temp.id_of('da'));
insert into ids select 'v1', public.submit_design_sheet(pg_temp.id_of('series'));
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('v1'), '', 'approved', null) $$,
  '42501', null, 'the responsible never approves what they submitted');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.set_design_self_approval(pg_temp.prj(), true, 'Petite équipe') $$,
  '42501', null, 'the project manager does not change the governance');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_design_self_approval(pg_temp.prj(), true, '') $$,
  '23514', null, 'allowing self-approval says why');
select public.set_design_self_approval(pg_temp.prj(), true, 'Petite équipe sur cette sortie');
reset role;
select pg_temp.act_as(pg_temp.id_of('da'));
select lives_ok($$ select public.decide_design_submission(pg_temp.id_of('v1'), '', 'changes_requested', 'Revoir le plan 2') $$,
  'once the governance allows it, explicitly, the responsible may decide');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_design_self_approval(pg_temp.prj(), false, 'Retour à la règle');
reset role;

-- Delegations ----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('da'));
insert into ids select 'v2', public.submit_design_sheet(pg_temp.id_of('series'));
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('v2'), '', 'approved', null) $$,
  'P0001', 'submission_not_found', 'a person outside the project does not even see the version');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.delegate_design_role(pg_temp.prj(), 'sheet', pg_temp.id_of('series'), 'validator',
  pg_temp.id_of('owner_person'), pg_temp.id_of('other_person'), 'Absence', current_date, current_date + 7) $$,
  '23514', null, 'only a role someone holds is delegated');
insert into ids select 'dlg', public.delegate_design_role(pg_temp.prj(), 'sheet', pg_temp.id_of('series'), 'validator',
  pg_temp.id_of('director_person'), pg_temp.id_of('other_person'), 'DG en déplacement', current_date, current_date + 7);
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is(public.design_delegated(pg_temp.prj(), 'sheet', pg_temp.id_of('series'), 'validator'), true,
          'the delegate holds the validator''s role while it is active');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.revoke_design_delegation(pg_temp.id_of('dlg'));
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('v2'), '', 'approved', null) $$,
  '42501', null, 'a revoked delegation gives nothing');
reset role;
select is((select count(*)::int from public.design_events
            where project_id = pg_temp.prj() and kind in ('delegation.given', 'delegation.revoked')), 2,
          'delegations are audited');

-- Old design versions: the owner never reviews their own deposit ------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
with v as (insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('sd_caps'), 'link', 'https://example.com/v1')
           returning id)
insert into ids select 'dv', id from v;
select throws_ok($$ select public.review_design_version(pg_temp.id_of('dv'), 'approved', null) $$,
  '42501', null, 'the owner does not approve a version they deposited');
select is((select count(*)::int from public.design_events
            where project_id = pg_temp.prj() and kind = 'design_version.deposited'), 1,
          'a deposit is audited');

select * from finish();
rollback;
