-- Clôture et partage du compte rendu d'un call (PROJ-AMEL-01,
-- supabase/migrations/20261012101701_call_closure_sharing.sql).
-- Run with `supabase test db`.
begin;
select plan(9);

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

create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
insert into ids select 'p_creative', person_id from public.accounts where id = pg_temp.id_of('creative');

-- An internal meeting of the manager, the creative not invited.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.calls (organization_id, title) values (pg_temp.id_of('org'), 'Point mix');
reset role;
insert into ids select 'call', id from public.calls where title = 'Point mix'
  and organization_id = pg_temp.id_of('org') order by created_at desc limit 1;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ insert into public.call_closures (organization_id, call_id, version, content)
  values (%L, %L, 1, '{"summary": "x"}') $$, pg_temp.id_of('org'), pg_temp.id_of('call')),
  '42501', null, 'only whoever owns the call closes it');

select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ insert into public.call_closures (organization_id, call_id, version, content, unreviewed)
  values (%L, %L, 1, '{"summary": "On garde le mix V2", "decisions": [], "actions": []}',
          '{"actions": 1}') $$, pg_temp.id_of('org'), pg_temp.id_of('call')),
  'the owner closes the call: its report is frozen as version 1');
select lives_ok(format($$ insert into public.call_closures (organization_id, call_id, version, content)
  values (%L, %L, 2, '{"summary": "On garde le mix V2, corrigé"}') $$, pg_temp.id_of('org'), pg_temp.id_of('call')),
  'a correction is a new version');
select is((select count(*)::int from public.call_closures where call_id = pg_temp.id_of('call')), 2,
          'the first version is kept');
select is((select closed_by from public.call_closures where call_id = pg_temp.id_of('call') and version = 1),
          (select person_id from public.accounts where id = pg_temp.id_of('manager')),
          'who closed is the session''s person');

select throws_ok(format($$ insert into public.call_report_shares (organization_id, call_id, closure_id, scope, recipients)
  values (%L, %L, (select id from public.call_closures where call_id = %L and version = 2), 'transcript',
          '[{"name": "Lou"}]') $$, pg_temp.id_of('org'), pg_temp.id_of('call'), pg_temp.id_of('call')),
  '23514', null, 'a report is shared in full or as a summary, never its transcription');
select lives_ok(format($$ insert into public.call_report_shares (organization_id, call_id, closure_id, scope,
    recipients, recipient_person_ids)
  values (%L, %L, (select id from public.call_closures where call_id = %L and version = 2), 'summary',
          jsonb_build_array(jsonb_build_object('name', 'Créa', 'person_id', %L)), array[%L]::uuid[]) $$,
  pg_temp.id_of('org'), pg_temp.id_of('call'), pg_temp.id_of('call'),
  pg_temp.id_of('p_creative'), pg_temp.id_of('p_creative')),
  'shared with a member, scope and recipients kept');

reset role;
select is((select count(*)::int from public.notifications
            where kind = 'call_report_shared' and recipient_person_id = pg_temp.id_of('p_creative')
              and subject_id = pg_temp.id_of('call')), 1, 'the member is told');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.call_closures where call_id = pg_temp.id_of('call')), 1,
          'the member reads the version shared with them, not the call nor the others');

select * from finish();
rollback;
