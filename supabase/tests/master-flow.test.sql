-- Master workflow: the confirmed source of a title's mix
-- (supabase/migrations/20261004002001_master_flow_sources.sql): read by
-- whoever sees the project, confirmed by its owner only, an audio version of
-- that title and never its master final, never rewritten.
-- Run with `supabase test db`.
begin;
select plan(12);

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
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Two titles, the project carries the first; the director launches it with
-- the owner.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_title', public.create_master(pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MF ' || (select v from vars where k = 'tag'), 'content');
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1);

-- Audio versions: a rough mix and a master final of the title, a rough mix
-- of the other title.
create function pg_temp.add_audio(p_name text, p_title text, p_state text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.master_files (organization_id, master_id, category, audio_state,
                                   path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of(p_title), 'audio', p_state,
          pg_temp.id_of('org') || '/' || pg_temp.id_of(p_title) || '/' || gen_random_uuid() || '.wav',
          p_name || '.wav', 'audio/wav', 1000)
  returning id into v_id;
  insert into ids values (p_name, v_id);
end $$;
select pg_temp.add_audio('rough', 'title', 'rough_mix');
select pg_temp.add_audio('final', 'title', 'final_master');
select pg_temp.add_audio('elsewhere', 'other_title', 'rough_mix');

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');

-- Owner confirms ----------------------------------------------------------------
select lives_ok($$
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('rough'))
$$, 'the owner confirms an audio version of the title as its source');
select is((select created_by from public.master_flow_sources where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('owner_person'), 'who confirmed is set by the database');
select throws_ok($$
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('final'))
$$, 'P0001', 'source_not_an_audio_version_of_title', 'a master final is never a mix source');
select throws_ok($$
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('elsewhere'))
$$, 'P0001', 'source_not_an_audio_version_of_title', 'the file is a version of that same title');
select throws_ok($$
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('other_title'), pg_temp.id_of('elsewhere'))
$$, '23503', null, 'the title belongs to the project');

-- Never rewritten -------------------------------------------------------------
select throws_ok($$
  update public.master_flow_sources set file_id = pg_temp.id_of('final')
   where project_id = pg_temp.id_of('project')
$$, '42501', null, 'a confirmation is never updated, even by the owner');
select throws_ok($$
  delete from public.master_flow_sources where project_id = pg_temp.id_of('project')
$$, '42501', null, 'nor deleted: changing the source is a new confirmation');
reset role;
select is((select file_id from public.master_flow_sources where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('rough'), 'the first confirmation stays in the history');

-- Others ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.master_flow_sources where project_id = pg_temp.id_of('project')),
          1, 'the director reads the source');
select throws_ok($$
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('rough'))
$$, '42501', null, 'the director does not confirm: only the owner writes in a launched project');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.master_flow_sources where project_id = pg_temp.id_of('project')),
          0, 'a project manager who does not see the project reads nothing');
select throws_ok($$
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), pg_temp.id_of('rough'))
$$, '42501', null, 'nor confirms');
reset role;

select * from finish();
rollback;
