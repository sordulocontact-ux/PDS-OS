-- Master, Source step (supabase/migrations/20261019080101_master_source_vocals.sql):
-- the vocals declared at the confirmation, waiting or anticipating, a mix of a
-- working version never the Mix final, the reason of an existing mix, the
-- owner told when newer vocals arrive. Run with `supabase test db`.
begin;
select plan(9);

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
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- A launched project with a title, its creative director, a brief; a second
-- project with the same title and no brief.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'EM ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'bare', public.create_project(pg_temp.id_of('org'),
  'EM2 ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1),
       (pg_temp.id_of('org'), pg_temp.id_of('bare'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
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
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
-- A mix done before the workflow: in the Catalogue, no version of the round.
select pg_temp.add_audio('done', 'mix');
select pg_temp.add_audio('demo', 'demo');
insert into public.master_briefs (organization_id, project_id, validator_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));

-- 1. Not final without a plan is refused; with « anticipate » it is kept.
select throws_ok(format($$ insert into public.master_flow_sources
  (organization_id, project_id, master_id, file_id, vocals_final)
  values (%L, %L, %L, %L, false) $$, pg_temp.id_of('org'), pg_temp.id_of('project'),
  pg_temp.id_of('title'), pg_temp.id_of('demo')), '23514', null,
  'vocals not final need a plan');
select lives_ok(format($$ insert into public.master_flow_sources
  (organization_id, project_id, master_id, file_id, vocals_final, vocals_pending, plan)
  values (%L, %L, %L, %L, false, 'le 2e couplet', 'anticipate') $$, pg_temp.id_of('org'),
  pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('demo')),
  'the owner anticipates with a working version');
select throws_ok(format($$ insert into public.master_flow_sources
  (organization_id, project_id, master_id, file_id, vocals_final, plan)
  values (%L, %L, %L, %L, true, 'wait') $$, pg_temp.id_of('org'), pg_temp.id_of('project'),
  pg_temp.id_of('title'), pg_temp.id_of('demo')), '23514', null,
  'final vocals take no plan');

-- 2. A mix arrives on the working version: it remembers its source and the
-- validator cannot make it the Mix final.
select pg_temp.add_audio('mixv1', 'mix');
reset role;
select is((select source_file_id from public.master_mix_versions
            where file_id = pg_temp.id_of('mixv1')), pg_temp.id_of('demo'),
          'the version remembers the source in force');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.decide_mix_version(%L, 'approved', null) $$,
  (select id from public.master_mix_versions where file_id = pg_temp.id_of('mixv1'))),
  '23514', 'working_source', 'a mix of a working version is never the Mix final');
reset role;

-- 3. Newer vocals arrive: the owner is told.
select pg_temp.act_as(pg_temp.id_of('director'));
select pg_temp.add_audio('demo4', 'demo');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'master_source_newer'
              and recipient_person_id = pg_temp.id_of('owner_person')
              and project_id = pg_temp.id_of('project')), 1,
          'the owner is told a newer version arrived');

-- 4. An existing mix is declared Mix final only with its reason; the
-- replaced source with final vocals lets a new mix be validated.
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ select public.declare_mix_final(%L, %L, %L, '  ') $$,
  pg_temp.id_of('bare'), pg_temp.id_of('title'), pg_temp.id_of('done')), '42501', null,
  'not the owner of the second project');
select lives_ok(format($$ insert into public.master_flow_sources
  (organization_id, project_id, master_id, file_id, vocals_final)
  values (%L, %L, %L, %L, true) $$, pg_temp.id_of('org'), pg_temp.id_of('project'),
  pg_temp.id_of('title'), pg_temp.id_of('demo4')), 'the source is replaced');
select throws_ok(format($$ select public.declare_mix_final(%L, %L, %L, null) $$,
  pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('done')), '23514',
  'reason_required', 'an existing mix says why it is the right one');

select * from finish();
rollback;
