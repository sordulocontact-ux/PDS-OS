-- Production › the provider's own space (PROD-026, PROD-028, PROD-031,
-- PROD-032, PROD-036; supabase/migrations/20261014000201_production_provider_links.sql).
-- Fixture « Piégée »: Lina, editor from the Réseau, holds the edit; she
-- opens her link, reads her corrections, deposits her V2 and an export.
-- Run with `supabase test db`.
begin;
select plan(22);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Session acoustique', 'creation_content', 'selected');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Session acoustique');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, status, reviewed_at, reviewed_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'link',
        'https://frame.example.com/fiche', 'approved', now(), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Thibo ' || (select v from vars where k = 'tag'), array['production_company']);
insert into ids select 'thibo', id from public.network_contacts where name = 'Thibo ' || (select v from vars where k = 'tag');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'sheet', public.open_production_sheet(pg_temp.id_of('deliverable'), 'call');


create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end $$;
reset role;
grant all on vars, ids to anon;
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Lina ' || (select v from vars where k = 'tag'), array['videographer']);
insert into ids select 'lina', id from public.network_contacts where name = 'Lina ' || (select v from vars where k = 'tag');

-- 1. The link: the owner, for a provider of the sheet ---------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('lina')) $$,
                 'P0001', 'not_a_provider', 'a link only for someone who holds a step or a request');
insert into public.production_post_steps (organization_id, project_id, sheet_id, step_key, contact_id, ends_on)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'edit', pg_temp.id_of('lina'), current_date + 10);
insert into vars select 'token', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('lina'));
select ok((select v from vars where k = 'token') ~ '^[0-9a-f]{64}$', 'the token is returned once');
select is((select count(*)::int from public.production_provider_links
            where token_hash = (select v from vars where k = 'token')), 0, 'only its hash is stored');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('lina')) $$,
                 '42501', null, 'only the owner gives a link');

-- A V1 with corrections sent to Lina.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.production_versions (organization_id, project_id, sheet_id, url, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'https://frame.example.com/v1', pg_temp.id_of('lina'));
insert into ids select 'v1', id from public.production_versions where sheet_id = pg_temp.id_of('sheet') and number = 1;
select public.submit_production_version(pg_temp.id_of('v1'), 'review');
insert into public.production_version_comments (organization_id, project_id, sheet_id, version_id, timecode_ms, category, body)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), pg_temp.id_of('v1'), 5000, 'edit', 'Raccourcir l''intro');
insert into ids select 'req', public.request_production_corrections(pg_temp.id_of('v1'),
  array(select id from public.production_version_comments where version_id = pg_temp.id_of('v1')),
  null, pg_temp.id_of('lina'), current_date + 4, 'Merci');
select public.send_production_corrections(pg_temp.id_of('req'));

-- 2. Lina's page, without an account ---------------------------------------------------
select pg_temp.as_anon();
select is(public.get_production_provider_space('0000') , null, 'an unknown token shows nothing');
select is((public.get_production_provider_space((select v from vars where k = 'token')) ->> 'state'),
          'open', 'the link opens her page');
select is(jsonb_array_length(public.get_production_provider_space((select v from vars where k = 'token')) -> 'steps'),
          1, 'her mission: the step she holds');
select is((public.get_production_provider_space((select v from vars where k = 'token')) -> 'requests' -> 0 -> 'comments' -> 0 ->> 'body'),
          'Raccourcir l''intro', 'the corrections addressed to her');
select public.note_production_provider_opened((select v from vars where k = 'token'));
reset role;
select is((select status from public.production_correction_requests where id = pg_temp.id_of('req')),
          'viewed', 'opening her page marks the request « consultée »');

-- 3. Deposits ------------------------------------------------------------------------
select pg_temp.as_anon();
select throws_ok($$ select public.deposit_production_version((select v from vars where k = 'token'), 'http://insecure.example.com', null, null, null) $$,
                 'P0001', 'invalid_url', 'a link is https');
select throws_ok($$ select public.deposit_production_version((select v from vars where k = 'token'), null, 'x/y', 'v2.mp4', null) $$,
                 'P0001', 'file_mismatch', 'a file comes from one of her open slots');
select is(public.deposit_production_version((select v from vars where k = 'token'), 'https://frame.example.com/v2', null, null, 'Intro raccourcie'),
          2, 'she deposits the V2 herself, numbered by the database');
reset role;
select is((select (status, contact_id, previous_version_id)::text from public.production_versions
            where sheet_id = pg_temp.id_of('sheet') and number = 2),
          (select ('in_review', pg_temp.id_of('lina'), pg_temp.id_of('v1'))::text),
          'submitted to the feedback at once, authored by her, after the V1');
select is((select status from public.production_correction_requests where id = pg_temp.id_of('req')),
          'treated', 'her V2 treats the corrections');
select ok((select count(*) from public.notifications where kind = 'production_version_submitted'
            and recipient_person_id = pg_temp.id_of('manager_person') and actor_person_id is null) >= 1,
          'the owner is told, with no actor');
select pg_temp.as_anon();
select ok(public.open_production_provider_slot((select v from vars where k = 'token'), 'V3 final.mov')
          ~ ('^' || pg_temp.id_of('org')::text || '/' || pg_temp.id_of('project')::text || '/[0-9a-f-]{36}\.mov$'),
          'a file goes to a one-time path of the project');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.production_export_checks (organization_id, project_id, sheet_id, label)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), '16:9 master');
insert into ids select 'line', id from public.production_export_checks where sheet_id = pg_temp.id_of('sheet');
select pg_temp.as_anon();
select lives_ok($$ select public.deposit_production_export((select v from vars where k = 'token'), pg_temp.id_of('line'), 'https://drive.example.com/169') $$,
                'she deposits an expected export');
reset role;
select is((select url from public.production_export_checks where id = pg_temp.id_of('line')),
          'https://drive.example.com/169', 'the export waits for its check');

-- 4. A new link replaces the old one ------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select ok(public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('lina')) is not null, 'a new link');
select pg_temp.as_anon();
select is((public.get_production_provider_space((select v from vars where k = 'token')) ->> 'state'),
          'replaced', 'the previous link says it was replaced');
select throws_ok($$ select public.deposit_production_version((select v from vars where k = 'token'), 'https://frame.example.com/v9', null, null, null) $$,
                 'P0001', 'link_closed', 'a replaced link deposits nothing');
select throws_ok($$ select * from public.production_provider_links $$,
                 '42501', null, 'the links are never read without an account');

select * from finish();
rollback;
