-- Replies to an authorisation request filed from PO's mailbox
-- (supabase/migrations/20261108000101_clearance_email_replies.sql): by the
-- cron only, once per e-mail, never for a closed request, the responsible
-- told, the state left as it was.
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
grant all on ids to authenticated, service_role;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, service_role;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('manager'));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Lumière ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Lumière ' || (select v from vars where k = 'tag');
insert into public.legal_clearances (organization_id, project_id, element, work, status)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'topline', 'bir haikem', 'contacted'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'sample', 'Closed one', 'cleared');
insert into ids select 'open', id from public.legal_clearances
 where project_id = pg_temp.id_of('project') and work = 'bir haikem';
insert into ids select 'closed', id from public.legal_clearances
 where project_id = pg_temp.id_of('project') and work = 'Closed one';

-- A member cannot file a reply: only the cron.
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(
  $$ select public.receive_clearance_reply(pg_temp.id_of('open'), '<a@x>', 'ed@x.fr', 'Oui', now()) $$,
  '42501', null, 'members cannot file a reply');

reset role;
-- The cron has no member's session.
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select is(public.receive_clearance_reply(pg_temp.id_of('open'), '<m1@mail>', 'ed@editions.fr',
                                         'D''accord pour 600 €.', now()),
          true, 'the cron files a reply');
select is(public.receive_clearance_reply(pg_temp.id_of('open'), '<m1@mail>', 'ed@editions.fr',
                                         'D''accord pour 600 €.', now()),
          false, 'the same e-mail is filed once');
select is(public.receive_clearance_reply(pg_temp.id_of('closed'), '<m2@mail>', 'ed@editions.fr',
                                         'Merci', now()),
          false, 'never on a closed request');
select is(public.receive_clearance_reply(pg_temp.id_of('open'), '<m3@mail>', 'ed@editions.fr',
                                         '   ', now()),
          false, 'never an empty reply');

reset role;
select is((select kind || '|' || direction || '|' || from_address || '|' || body
             from public.legal_clearance_communications
            where external_id = '<m1@mail>'),
          'email|in|ed@editions.fr|D''accord pour 600 €.', 'kept as an e-mail received, with its sender');
select is((select count(*)::int from public.notifications
            where kind = 'clearance_reply_received' and subject_id = pg_temp.id_of('open')
              and recipient_person_id = pg_temp.id_of('manager_person')),
          1, 'the responsible (here the owner) is told once');
select is((select status from public.legal_clearances where id = pg_temp.id_of('open')),
          'contacted', 'the state does not move');

select * from finish();
rollback;
