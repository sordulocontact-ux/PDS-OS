-- Juridique: a credit linked to its contact of the Réseau
-- (supabase/migrations/20261004000201_contributor_contact.sql). Run with
-- `supabase test db`.
begin;
select plan(5);

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

-- A title with one credit, and a contact of the Réseau ------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into public.master_contributors (organization_id, master_id, name, role)
values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'Ever', 'composer');
insert into ids select 'credit', id from public.master_contributors
 where master_id = pg_temp.id_of('master');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Ever', array['songwriter']);
insert into ids select 'contact', id from public.network_contacts
 where name = 'Ever' order by created_at desc limit 1;

-- Link ------------------------------------------------------------------------
select lives_ok($$
  update public.master_contributors set contact_id = pg_temp.id_of('contact')
   where id = pg_temp.id_of('credit')
$$, 'a project manager links a credit to its contact (manage_catalog)');
select is((select contact_id from public.master_contributors where id = pg_temp.id_of('credit')),
          pg_temp.id_of('contact'), 'the credit points to the contact');

select throws_ok($$
  update public.master_contributors set contact_id = gen_random_uuid()
   where id = pg_temp.id_of('credit')
$$, '23503', null, 'a credit cannot point to a contact that does not exist (or of another organization)');

select lives_ok($$
  insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('master'), 'Ever', 'arranger', pg_temp.id_of('contact'))
$$, 'a credit can be created already linked');

reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
update public.master_contributors set contact_id = null where id = pg_temp.id_of('credit');
reset role;
select is((select contact_id from public.master_contributors where id = pg_temp.id_of('credit')),
          pg_temp.id_of('contact'), 'a creative director cannot change the link (no manage_catalog)');

select * from finish();
rollback;
