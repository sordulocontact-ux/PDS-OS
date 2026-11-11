-- The business positions (…20261111183101, BIZ 1): business_manager and
-- business hold « negotiate », see no project by position, and can be
-- invited; an unknown position is still refused.
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
insert into ids select r.name, pg_temp.new_user('bp-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('glen', 'business_manager'),
               ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

select ok('negotiate' = any (public.role_permissions('business_manager')),
  'a business manager negotiates');
select ok('negotiate' = any (public.role_permissions('business')),
  'a business developer negotiates');
select ok(not ('negotiate' = any (public.role_permissions('project_manager'))),
  'a project manager does not negotiate by position');

select pg_temp.act_as(pg_temp.id_of('glen'));
select ok(public.has_permission(pg_temp.id_of('org'), 'negotiate'),
  'Glen holds negotiate');
select ok(not public.has_permission(pg_temp.id_of('org'), 'view_all_projects')
          and not public.has_permission(pg_temp.id_of('org'), 'pilot_projects'),
  'Glen neither sees every project nor pilots one');
select throws_ok(
  $$ select public.invite_member('bp-x-' || pg_temp.tag() || '@pds.test', 'X', null, 'business') $$,
  '42501', null, 'only an administrator invites');

reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok(
  $$ select public.invite_member('bp-new-' || pg_temp.tag() || '@pds.test', 'Nouveau', null, 'business_manager') $$,
  'the direction invites a business manager');
select throws_ok(
  $$ select public.invite_member('bp-bad-' || pg_temp.tag() || '@pds.test', 'X', null, 'manager') $$,
  'invalid_role', 'an unknown position is refused');

select * from finish();
rollback;
