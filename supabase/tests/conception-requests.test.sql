-- MKT-C2-11 (…20261013100701): a request carries a message and a due date;
-- its validators are notified; it is never decided once what was sent has
-- changed; withdrawn and sent again; approved with reserves, the role kept;
-- its author is told. Accounts: director (validator), owner, da
-- (responsible). Run with `supabase test db`.
begin;
select plan(10);

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
  'RQ ' || (select v from vars where k = 'tag'), 'content');
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
reset role;

select pg_temp.act_as(pg_temp.id_of('da'));
insert into ids select 'v1', public.submit_design_sheet(pg_temp.id_of('series'), 'Deux capsules, dites-moi vite', current_date + 3);
select is((select message || '/' || (due_on = current_date + 3)::text from public.design_submissions
            where id = pg_temp.id_of('v1')), 'Deux capsules, dites-moi vite/true',
          'the request keeps its message and the date a decision is expected');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'design_submission_requested' and subject_id = pg_temp.id_of('v1')
              and recipient_person_id = pg_temp.id_of('director_person')), 1,
          'the validator is notified of the request');

-- What was sent changes: never decided silently.
select pg_temp.act_as(pg_temp.id_of('owner'));
with r as (insert into public.design_references (organization_id, project_id, kind, url, type)
           values (pg_temp.org(), pg_temp.prj(), 'link', 'https://example.com/new', 'reference')
           returning id)
insert into ids select 'ref', id from r;
insert into public.design_reference_links (organization_id, project_id, reference_id, target, design_deliverable_id)
values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('ref'), 'deliverable', pg_temp.id_of('caps'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('v1'), '', 'approved', null) $$,
  '23514', 'submission_outdated', 'a request whose content changed is not decided');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.withdraw_design_submission(gen_random_uuid()) $$,
  '42501', null, 'only an existing request is withdrawn');
reset role;
select pg_temp.act_as(pg_temp.id_of('da'));
select lives_ok($$ select public.withdraw_design_submission(pg_temp.id_of('v1')) $$,
  'its author withdraws it');
insert into ids select 'v2', public.submit_design_sheet(pg_temp.id_of('series'), 'Avec la nouvelle référence', null);
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_design_submission(pg_temp.id_of('v2'), '', 'changes_requested', 'Revoir', 'Une réserve') $$,
  '23514', null, 'reserves go with an approval only');
select lives_ok($$ select public.decide_design_submission(pg_temp.id_of('v2'), '', 'approved', null, 'Sous-titres à vérifier') $$,
  'the validator approves with reserves');
select is((select reserves || '/' || decided_role from public.design_decisions
            where submission_id = pg_temp.id_of('v2')), 'Sous-titres à vérifier/validator',
          'the decision keeps its reserves and the role it was taken as');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'design_submission_decided' and subject_id = pg_temp.id_of('v2')
              and recipient_person_id = pg_temp.id_of('da_person')), 1,
          'its author is told of the decision');
select is((select status from public.design_submissions where id = pg_temp.id_of('v1')), 'withdrawn',
          'the withdrawn version stays, withdrawn');

select * from finish();
rollback;
