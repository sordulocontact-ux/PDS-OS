-- Fil et signalements de l'ingénieur (PROJ-AMEL-02,
-- supabase/migrations/20261012101801_engineer_messages.sql).
-- Run with `supabase test db`.
begin;
select plan(10);
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

-- A launched project of the owner, its brief naming an engineer.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MT ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Mixeur ' || (select v from vars where k = 'tag'), array['engineer']);
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Mixeur ' || (select v from vars where k = 'tag');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');

create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;
create function pg_temp.token_of(p text) returns text language sql as $$ select token from tokens where name = p $$;

insert into public.master_briefs (organization_id, project_id, mix_contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('engineer'));
insert into tokens select 'mix', public.create_master_transmission(
  pg_temp.id_of('project'), 'mix', '{"titles": []}'::jsonb, null, now() + interval '30 days');

-- The engineer, by the link, without an account.
reset role;
set local role anon;
select lives_ok($$ select public.post_master_engineer_message(pg_temp.token_of('mix'), 'question',
  'Les stems de batterie sont-ils les bons ?') $$, 'the engineer asks a question by the link');
select lives_ok($$ select public.post_master_engineer_message(pg_temp.token_of('mix'), 'delay',
  'Studio indisponible', 3) $$, 'signals a delay, with how many days');
select throws_ok($$ select public.post_master_engineer_message(pg_temp.token_of('mix'), 'delay',
  'Sans durée') $$, '23514', null, 'a delay says how many days');
select lives_ok($$ select public.post_master_engineer_message(pg_temp.token_of('mix'), 'missing_file',
  'Il manque la session du refrain') $$, 'signals a missing file');
select throws_ok($$ select public.post_master_engineer_message(repeat('0', 64), 'question', 'x') $$,
  'P0001', 'unknown', 'no thread without a valid link');
select is((select count(*)::int from public.get_master_engineer_messages(pg_temp.token_of('mix'))), 3,
          'the engineer reads the thread of their link, dated and staged');

reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('owner_person') and kind = 'master_engineer_signal'),
          1, 'the owner is told once until they read it (no spam)');

select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok(format($$ insert into public.master_engineer_messages (organization_id, project_id,
    transmission_id, stage, kind, author, body)
  values (%L, %L, (select id from public.master_transmissions where project_id = %L), 'mix', 'message',
          'team', 'Oui, ce sont les bons.') $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('project')),
  'the owner answers in the thread');
select lives_ok($$ update public.master_engineer_messages set status = 'handled'
  where kind = 'delay' and project_id = pg_temp.id_of('project') $$, 'and handles the delay');
select is((select handled_by from public.master_engineer_messages
            where kind = 'delay' and project_id = pg_temp.id_of('project')),
          pg_temp.id_of('owner_person'), 'who handled it is kept');

select * from finish();
rollback;
