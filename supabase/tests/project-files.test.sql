-- Files of a project (supabase/migrations/20260927013001_project_files.sql):
-- read by whoever sees the project, contracts by its owner and the direction
-- only, written by the owner alone. Run with `supabase test db`.
begin;
select plan(13);

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
  from ids join public.accounts a on a.id = ids.id
 where name in ('owner', 'creative');

select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'Fichiers ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));

reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
select public.add_project_creative((select id from ids where name = 'project'),
  (select id from ids where name = 'creative_person'));

-- The owner writes ----------------------------------------------------------
select lives_ok($$
  insert into public.project_files (organization_id, project_id, category, description, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief',
          'Brief créatif V1',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'project') || '/'
            || gen_random_uuid() || '.pdf',
          'brief.pdf', 'application/pdf', 1024)
$$, 'the owner adds a file with its category and precision');

select lives_ok($$
  insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'contract',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'project') || '/'
            || gen_random_uuid() || '.pdf',
          'contrat-realisateur.pdf', 'application/pdf', 1024)
$$, 'the owner adds a contract');
insert into ids select 'contract', id from public.project_files
 where project_id = (select id from ids where name = 'project') and category = 'contract';

select throws_ok($$
  insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'stems',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'project') || '/'
            || gen_random_uuid() || '.zip',
          'stems.zip', 'application/zip', 10)
$$, '23514', null, 'a project file has one of the project categories');

-- Readers ----------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.project_files
            where project_id = (select id from ids where name = 'project')),
          1, 'the creative team reads the files, never a contract (not even among all of them)');

select throws_ok($$
  insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'visual',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'project') || '/'
            || gen_random_uuid() || '.jpg',
          'moodboard.jpg', 'image/jpeg', 10)
$$, '42501', null, 'a creative director cannot add a file');

update public.project_files set description = 'Piraté'
 where project_id = (select id from ids where name = 'project');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select is((select count(*)::int from public.project_files
            where project_id = (select id from ids where name = 'project')),
          2, 'the direction reads every file, contracts included');

select is((select description from public.project_files
            where project_id = (select id from ids where name = 'project') and category = 'brief'),
          'Brief créatif V1', 'a creative director cannot edit a file');

select throws_ok($$
  insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'press',
          (select id from ids where name = 'org') || '/' || (select id from ids where name = 'project') || '/'
            || gen_random_uuid() || '.pdf',
          'cp.pdf', 'application/pdf', 10)
$$, '42501', null, 'the director reads but does not write inside a launched project');

reset role;
select pg_temp.act_as((select id from ids where name = 'other'));
select is((select count(*)::int from public.project_files
            where project_id = (select id from ids where name = 'project')),
          0, 'a project manager who does not see the project reads none of its files');

-- The owner reclassifies and deletes ------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select throws_ok($$
  update public.project_files set path = 'x' where id = (select id from ids where name = 'contract')
$$, '42501', null, 'the path of a file is never rewritten');

update public.project_files set category = 'press', description = 'Accord de diffusion'
 where id = (select id from ids where name = 'contract');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.project_files
            where project_id = (select id from ids where name = 'project')),
          2, 'reclassified out of contracts, the same single file becomes readable');

reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select lives_ok($$
  delete from public.project_files where id = (select id from ids where name = 'contract')
$$, 'the owner deletes a file');
select is((select count(*)::int from public.project_files
            where project_id = (select id from ids where name = 'project')),
          1, 'the file is gone');

select * from finish();
rollback;
