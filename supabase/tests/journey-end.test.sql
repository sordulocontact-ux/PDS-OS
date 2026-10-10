-- End of the journey: delivery and going online of a release, delivery of a
-- deliverable and the closing review
-- (supabase/migrations/20261010000201_release_delivery.sql,
-- 20261010000301_production_delivery_and_review.sql). Run with `supabase test db`.
begin;
select plan(18);

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
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts
 where id = pg_temp.id_of('creative');

-- A project owned by the manager, with one title, and another title outside it.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_master', public.create_master(
  pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);

-- Distribution ------------------------------------------------------------------
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Distrib ' || (select v from vars where k = 'tag'),
        array['distributor']);
insert into ids select 'distributor', id from public.network_contacts
 where name = 'Distrib ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.releases (organization_id, project_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Piégée');
insert into ids select 'release', id from public.releases where project_id = pg_temp.id_of('project');

select throws_ok($$ select public.confirm_release_online(pg_temp.id_of('release'), current_date, null) $$,
                 'P0001', 'release_not_delivered', 'a release goes online only once delivered');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.record_release_delivery(pg_temp.id_of('release'), pg_temp.id_of('distributor'), current_date, null) $$,
                 '42501', null, 'only the project''s owner records the delivery');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.record_release_delivery(pg_temp.id_of('release'), pg_temp.id_of('distributor'), current_date + 1, null) $$,
                 '23514', null, 'a delivery is not recorded in the future');
select lives_ok($$ select public.record_release_delivery(pg_temp.id_of('release'), pg_temp.id_of('distributor'), current_date, 'Livré sur leur portail') $$,
                'the owner records the delivery to a distributor of the Réseau');
select throws_ok($$ update public.releases set delivered_on = null where id = pg_temp.id_of('release') $$,
                 '42501', null, 'the delivery columns are written by the functions only');
select lives_ok($$ select public.confirm_release_online(pg_temp.id_of('release'), current_date, 'https://open.spotify.com/track/x') $$,
                'the owner confirms it is online');
select throws_ok($$ select public.reopen_release_delivery(pg_temp.id_of('release')) $$,
                 'P0001', 'release_online', 'a release online is not reopened');

-- Production --------------------------------------------------------------------
reset role;
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Session acoustique', 'creation_content', 'selected');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Vidéo 16:9');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');
-- The stages come with the acceptance of the project (respond_to_assignment).
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
insert into ids select 'production', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key = 'production';
insert into ids select 'review', s.id from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key = 'review';

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.set_deliverable_final(pg_temp.id_of('deliverable'), 'https://drive.example.com/v3', null) $$,
                 'P0001', 'stage_locked', 'nothing is delivered before the Production starts');
select public.start_stage(pg_temp.id_of('production'));
select throws_ok($$ select public.set_deliverable_final(pg_temp.id_of('deliverable'), 'http://drive.example.com/v3', null) $$,
                 '23514', null, 'the final file is an https link');
select public.set_deliverable_final(pg_temp.id_of('deliverable'), 'https://drive.example.com/v3', 'Exports 16:9');
select throws_ok($$ select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'check') $$,
                 'P0001', 'invalid_transition', 'no technical check before the creative validation');
select throws_ok($$ select public.request_validation(pg_temp.id_of('production'), null) $$,
                 'P0001', 'deliveries_open', 'the Production is not finished with a deliverable to deliver');
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$ select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'approve') $$,
                'a creative director of the project validates the final version');
select throws_ok($$ select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'check') $$,
                 '42501', null, 'but the check is the owner''s');
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'check');
select public.advance_deliverable_delivery(pg_temp.id_of('deliverable'), 'deliver');
select isnt((select delivered_at from public.deliverable_deliveries where deliverable_id = pg_temp.id_of('deliverable')),
            null, 'validated, checked, then delivered');
select public.set_deliverable_final(pg_temp.id_of('deliverable'), 'https://drive.example.com/v4', null);
select is((select approved_at from public.deliverable_deliveries where deliverable_id = pg_temp.id_of('deliverable')),
          null, 'a new final file clears the decisions taken on the previous one');

-- Bilan & clôture ---------------------------------------------------------------
select throws_ok($$ select public.save_project_review(pg_temp.id_of('project'), 'Bons chiffres', null, null) $$,
                 'P0001', 'stage_locked', 'the review is written once the closing has started');
select public.start_stage(pg_temp.id_of('review'));
select throws_ok($$ select public.request_validation(pg_temp.id_of('review'), null) $$,
                 'P0001', 'review_required', 'a project is not closed without its review');
select lives_ok($$ select public.save_project_review(pg_temp.id_of('project'), 'Bons chiffres', 'Le live', null) $$,
                'the owner writes the review');

reset role;
select * from finish();
rollback;
