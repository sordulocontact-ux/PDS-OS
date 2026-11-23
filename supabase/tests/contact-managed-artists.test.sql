-- The artists a Réseau contact manages, set from the contact (20261124100101).
-- Run with `supabase test db`.
begin;
select plan(11);

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
grant all on ids to authenticated, service_role;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, service_role;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('glen'), ('other_pm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('glen', 'business_manager'),
               ('other_pm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'glen', 'other_pm');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, service_role;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated, service_role;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Jay ' || pg_temp.tag(), 'collaboration'),
       (pg_temp.id_of('org'), 'Lou ' || pg_temp.tag(), 'collaboration');
insert into ids select 'jay', id from public.artists where name = 'Jay ' || pg_temp.tag();
insert into ids select 'lou', id from public.artists where name = 'Lou ' || pg_temp.tag();
insert into public.artist_contacts (organization_id, artist_id, role, name, is_primary)
values (pg_temp.id_of('org'), pg_temp.id_of('lou'), 'booker', 'Booker', true);
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Eben ' || pg_temp.tag(), array['manager']::text[], 'eben@mgmt.test');
insert into ids select 'eben', id from public.network_contacts where name = 'Eben ' || pg_temp.tag();

create function pg_temp.managers(p text) returns integer language sql as $$
  select count(*)::int from public.artist_contacts
   where artist_id = pg_temp.id_of(p) and role = 'manager' and contact_id = pg_temp.id_of('eben') $$;

-- Who may --------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.set_contact_managed_artists(pg_temp.id_of('eben'), array[pg_temp.id_of('jay')]) $$,
  '42501', null, 'a business manager does not write the artists'' contacts');
reset role;

-- Linking ---------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.set_contact_managed_artists(pg_temp.id_of('eben'),
    array[pg_temp.id_of('jay'), pg_temp.id_of('lou')]) $$, 'the direction links two artists to their manager');
reset role;
select is(pg_temp.managers('jay') + pg_temp.managers('lou'), 2, 'each artist gets a « manager » row for the contact');
select is((select name || '/' || coalesce(email, '') from public.artist_contacts
            where artist_id = pg_temp.id_of('jay') and contact_id = pg_temp.id_of('eben')),
  'Eben ' || pg_temp.tag() || '/eben@mgmt.test', 'with the contact''s name and address');
select is((select is_primary from public.artist_contacts
            where artist_id = pg_temp.id_of('lou') and contact_id = pg_temp.id_of('eben')), false,
  'the artist''s primary contact stays');

select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.set_contact_managed_artists(pg_temp.id_of('eben'),
    array[pg_temp.id_of('jay'), pg_temp.id_of('jay')]) $$, 'saving again…');
reset role;
select is(pg_temp.managers('jay'), 1, '…never doubles a row');
select is(pg_temp.managers('lou'), 0, 'an artist no longer chosen loses the manager');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_contact_managed_artists(pg_temp.id_of('eben'), array[gen_random_uuid()]) $$,
  'P0002', null, 'an unknown artist is refused');
select lives_ok($$ select public.set_contact_managed_artists(pg_temp.id_of('eben'), '{}') $$,
  'an empty choice…');
reset role;
select is(pg_temp.managers('jay'), 0, '…unlinks every artist');

select * from finish();
rollback;
