-- Déclarations et droits ℗ d'un titre (retours Catalogue 14, 54 à 63,
-- supabase/migrations/20261012100801_master_declarations_rights.sql).
-- Run with `supabase test db`.
begin;
select plan(8);

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
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

select pg_temp.act_as((select id from ids where name = 'manager'));
insert into public.artists (organization_id, name, relation)
values ((select id from ids where name = 'org'), 'Kalia ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Kalia ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  (select id from ids where name = 'org'), 'Soleil',
  jsonb_build_array(jsonb_build_object('artist_id', (select id from ids where name = 'artist'))));


create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

-- Declarations: the final list of statuses (retour 63) ---------------------
select lives_ok($$
  insert into public.master_declarations (organization_id, master_id, organism, status)
  values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'sacem', 'to_do')
$$, '« À effectuer » is a real status');
select lives_ok($$
  insert into public.master_declarations (organization_id, master_id, organism, status, third_party)
  values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'adami', 'not_applicable', null)
$$, '« Non applicable » takes a declaration out of the file');

-- A proof is a file of the same title (retour 60).
reset role;
insert into public.master_files (organization_id, master_id, category, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'other',
        pg_temp.id_of('org')::text || '/' || pg_temp.id_of('master')::text || '/' || gen_random_uuid()::text || '.pdf',
        'recu.pdf', 'application/pdf', 10);
insert into ids select 'file', id from public.master_files where master_id = pg_temp.id_of('master');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$
  update public.master_declarations set status = 'confirmed', reference = 'S-1', proof_file_id = %L
   where master_id = %L and organism = 'sacem'
$$, pg_temp.id_of('file'), pg_temp.id_of('master')), 'a confirmation takes its proof from the title''s files');

-- History (retour 62).
reset role;
select is((select count(*)::int from public.master_declaration_events
            where master_id = pg_temp.id_of('master') and organism = 'sacem'), 2,
          'each change of a declaration is kept');
select is((select changes -> 'status' from public.master_declaration_events
            where master_id = pg_temp.id_of('master') and organism = 'sacem'
            order by created_at desc limit 1), '["to_do", "confirmed"]'::jsonb,
          'with the old and the new value');

-- Rights ℗: proposed, confirmed, taken back on change (retours 54 and 58).
update public.masters set rights_holder = 'PDS Records', rights_year = 2025
 where id = pg_temp.id_of('master');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.confirm_master_rights(%L) $$, pg_temp.id_of('master')),
                 '42501', null, 'only who writes the catalog confirms the ℗');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.confirm_master_rights(pg_temp.id_of('master'));
reset role;
select isnt((select rights_confirmed_at from public.masters where id = pg_temp.id_of('master')), null,
            'the holder is confirmed, with who and when');
update public.masters set rights_holder = 'Bermud' where id = pg_temp.id_of('master');
select is((select rights_confirmed_at from public.masters where id = pg_temp.id_of('master')), null,
          'changing the holder takes the confirmation back');

select * from finish();
rollback;
