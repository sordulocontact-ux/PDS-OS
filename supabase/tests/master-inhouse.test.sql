-- Master, the in-house engineer (supabase/migrations/20261020010601_master_inhouse_engineer.sql):
-- a member mixes; assigned by the owner, he sees the project and deposits his
-- versions in the app. Run with `supabase test db`.
begin;
select plan(8);

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
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('hugo', pg_temp.new_user('hugo-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('hugo', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'creative', 'hugo');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, anon;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MH ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
create function pg_temp.add_audio(p_name text, p_state text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.master_files (organization_id, master_id, category, audio_state,
                                   path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('title'), 'audio', p_state,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('title') || '/' || gen_random_uuid() || '.wav',
          p_name || '.wav', 'audio/wav', 1000)
  returning id into v_id;
  insert into ids values (p_name, v_id);
end $$;
reset role;
select pg_temp.act_as(pg_temp.id_of('hugo'));
select is(public.can_see_project(pg_temp.id_of('project')), false, 'a member out of the project does not see it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.master_briefs (organization_id, project_id, validator_person_id, mix_person_id,
                                  mastering_same_engineer)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'),
        pg_temp.id_of('hugo_person'), true);
reset role;
select pg_temp.act_as(pg_temp.id_of('hugo'));
select is(public.can_see_project(pg_temp.id_of('project')), true, 'the in-house engineer sees it');
select throws_ok(format($$ select public.open_master_member_delivery(%L, %L, 'mix', 'wav', 'Mix V1.wav') $$,
  pg_temp.id_of('project'), pg_temp.id_of('title')), '42501', null, 'not before the round is assigned');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.assign_master_round(%L, 'mix') $$, pg_temp.id_of('project')),
  '42501', null, 'only the owner assigns');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.assign_master_round(pg_temp.id_of('project'), 'mix');
reset role;
select is((select count(*)::int from public.notifications where kind = 'master_round_assigned'
            and recipient_person_id = pg_temp.id_of('hugo_person')), 1, 'he is told');
select pg_temp.act_as(pg_temp.id_of('hugo'));
insert into vars select 'slot', public.open_master_member_delivery(pg_temp.id_of('project'),
  pg_temp.id_of('title'), 'mix', 'wav', 'Mix V1.wav');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('master-files', (select v from vars where k = 'slot'), '{"size": 9000}'::jsonb);
select pg_temp.act_as(pg_temp.id_of('hugo'));
select lives_ok(format($$ select public.record_master_member_delivery(%L, 'Mix V1.wav', 'audio/wav', 9000) $$,
  (select v from vars where k = 'slot')), 'he deposits his version in the app');
reset role;
select is((select created_by from public.master_mix_versions where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('hugo_person'), 'a version of the title, by him');
select pg_temp.act_as(pg_temp.id_of('owner'));
update public.master_briefs set mix_person_id = null where project_id = pg_temp.id_of('project');
reset role;
select is((select mix_assigned_at from public.master_briefs where project_id = pg_temp.id_of('project')),
          null, 'another engineer: the round is to assign again');

select * from finish();
rollback;
