-- Réseau: relation types apart from roles, roles optional, dated observations
-- kept when a contact would be deleted (supabase/migrations/20261011200101,
-- ticket « Retour PO / Réseau » of 11/10/2026). Run with `supabase test db`.
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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

insert into ids values
  ('director', pg_temp.new_user('director-' || substr(md5(random()::text), 1, 8) || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'general_director'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('director'));

select pg_temp.act_as(pg_temp.id_of('director'));

select lives_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles, relations)
  values (pg_temp.id_of('org'), 'organization', 'Agence Onde', array['agency'],
          array['provider', 'partner'])
$$, 'an organization has activities and several relation types');
insert into ids select 'agency', id from public.network_contacts
 where name = 'Agence Onde' order by created_at desc limit 1;

select lives_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles)
  values (pg_temp.id_of('org'), 'person', 'Inès Morel', '{}')
$$, 'only the kind and the name are required: no role needed');
insert into ids select 'ines', id from public.network_contacts
 where name = 'Inès Morel' order by created_at desc limit 1;

select throws_ok($$
  update public.network_contacts set relations = array['friend'] where id = pg_temp.id_of('agency')
$$, '23514', null, 'a relation type comes from the closed list');

select throws_ok($$
  update public.network_contacts set roles = array['provider'] where id = pg_temp.id_of('agency')
$$, '23514', null, '« Prestataire » is a relation type, no longer a role');

select lives_ok($$
  update public.network_contacts set roles = array['production_company', 'company', 'studio']
   where id = pg_temp.id_of('agency')
$$, 'the new activities of an organization are accepted');

insert into public.network_observations (organization_id, contact_id, kind, value, unit,
                                         observed_on, source)
values (pg_temp.id_of('org'), pg_temp.id_of('ines'), 'followers', 12000, 'count',
        '2026-10-01', 'internal');

select is(
  (select error from public.delete_records('contact', array[pg_temp.id_of('ines')])),
  'contact_in_use',
  'a contact with dated observations is not deleted (archive it instead)');

select is(
  (select count(*)::int from public.network_observations where contact_id = pg_temp.id_of('ines')),
  1,
  'its observations are kept');

select is(
  (select error from public.delete_records('contact', array[pg_temp.id_of('agency')])),
  null,
  'a contact used nowhere is still deleted');

select * from finish();
rollback;
