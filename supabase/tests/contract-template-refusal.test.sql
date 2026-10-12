-- Refus motivé d'un modèle de contrat (JUR-19,
-- supabase/migrations/20261012100501_contract_template_refusal.sql).
-- Run with `supabase test db`.
begin;
select plan(7);

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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');


select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'a', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Modèle A', 'publishing', array['composer'], null, 'Texte A');
insert into ids select 'b', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Modèle B', 'publishing', array['composer'], null, 'Texte B');

-- Refusing a draft is the director's decision, with its reason.
select throws_ok(format($$ select public.set_contract_template_status(%L, 'retired', 'Clause 4 floue') $$,
                        pg_temp.id_of('a')),
                 '42501', null, 'only the director refuses a draft with a reason');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok(format($$ select public.set_contract_template_status(%L, 'retired', 'Clause 4 floue') $$,
                       pg_temp.id_of('a')), 'the director refuses a draft');
reset role;
select is((select retired_reason from public.contract_templates where id = pg_temp.id_of('a')),
          'Clause 4 floue', 'the reason is kept with the version');
select is((select status from public.contract_templates where id = pg_temp.id_of('a')),
          'retired', 'a refused template is never proposed');
select isnt((select retired_by from public.contract_templates where id = pg_temp.id_of('a')),
            null, 'who refused it is written by the database');

-- The two-argument form still retires without a reason.
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.set_contract_template_status(%L, 'retired') $$,
                       pg_temp.id_of('b')), 'retiring without a reason still works');
reset role;
select is((select retired_reason from public.contract_templates where id = pg_temp.id_of('b')),
          null, 'no reason when none is given');

select * from finish();
rollback;
