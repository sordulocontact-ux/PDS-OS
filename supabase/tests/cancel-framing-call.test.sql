-- « Annuler l'échange » (…20261028000301_cancel_framing_call): only the
-- project's owner removes a framing exchange, only before anything was
-- recorded, and its invitations go with it.
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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into ids values
  ('director', pg_temp.new_user('cf-director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('cf-owner-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'CF ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'),
  pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
insert into ids select 'call', public.create_framing_call(pg_temp.id_of('project'),
  'Échange de cadrage', now() + interval '1 day', '', '[]'::jsonb, 'Cadrer le projet',
  '[]'::jsonb, '{}');
insert into ids select 'held', public.create_framing_call(pg_temp.id_of('project'),
  'Échange de cadrage', now() + interval '2 days', '', '[]'::jsonb, 'Cadrer le projet',
  '[]'::jsonb, '{}');
reset role;

-- An invitation in the app, as the trigger writes it.
insert into public.notifications (organization_id, recipient_person_id, actor_person_id, kind,
                                  project_id, subject_id)
values (pg_temp.id_of('org'), pg_temp.id_of('director_person'), pg_temp.id_of('owner_person'),
        'call_invited', pg_temp.id_of('project'), pg_temp.id_of('call'));
-- The other exchange was recorded.
update public.calls set status = 'uploaded' where id = pg_temp.id_of('held');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.cancel_framing_call(pg_temp.id_of('call')) $$,
                 '42501', null, 'only the project''s owner cancels its exchange');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.cancel_framing_call(pg_temp.id_of('held')) $$,
                 '23514', null, 'an exchange already recorded is never cancelled');
select is(public.cancel_framing_call(pg_temp.id_of('call')), null,
          'the owner cancels it; no Google event to cancel');
reset role;

select is((select count(*)::int from public.calls where id = pg_temp.id_of('call')), 0,
          'the call is gone');
select is((select count(*)::int from public.framing_calls where call_id = pg_temp.id_of('call')), 0,
          'its framing details go with it');
select is((select count(*)::int from public.notifications
            where kind = 'call_invited' and subject_id = pg_temp.id_of('call')), 0,
          'its invitations in the app go too');
select is((select count(*)::int from public.calls where id = pg_temp.id_of('held')), 1,
          'the recorded exchange stays');

select * from finish();
rollback;
