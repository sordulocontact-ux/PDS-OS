-- Master workflow: the package sent to the mix engineer
-- (supabase/migrations/20261005011001_master_transmissions.sql): created by
-- the owner for the brief's engineer, opened and acknowledged by token, a
-- reminder replacing the previous link, never written directly.
-- Run with `supabase test db`.
begin;
select plan(24);

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

select throws_ok($$
  select public.create_master_transmission(pg_temp.id_of('project'), 'mix', '{}'::jsonb, null, now() + interval '30 days')
$$, 'P0001', 'no_engineer', 'no engineer in the brief: nothing to send');

insert into public.master_briefs (organization_id, project_id, mix_contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('engineer'));

select lives_ok($$
  insert into tokens select 'first', public.create_master_transmission(
    pg_temp.id_of('project'), 'mix', '{"titles": []}'::jsonb, '  Merci !  ', now() + interval '30 days')
$$, 'the owner sends the package to the brief''s engineer');
select is((select (contact_id, note, created_by)::text from public.master_transmissions
            where project_id = pg_temp.id_of('project')),
          (pg_temp.id_of('engineer'), 'Merci !', pg_temp.id_of('owner_person'))::text,
          'the recipient is the brief''s engineer; the note is trimmed; the sender is set');
select is((select token_hash = encode(sha256(convert_to(pg_temp.token_of('first'), 'UTF8')), 'hex')
             from public.master_transmissions where project_id = pg_temp.id_of('project')),
          true, 'only the token''s hash is stored');
select throws_ok($$
  update public.master_transmissions set acknowledged_at = now()
   where project_id = pg_temp.id_of('project')
$$, '42501', null, 'never written directly');
reset role;

-- The engineer, without an account -----------------------------------------
set local role anon;
select is((select public.get_master_transmission(pg_temp.token_of('first')) ->> 'state'),
          'open', 'the link opens the package');
select is(public.get_master_transmission(repeat('0', 64)), null, 'an unknown token shows nothing');
select is(public.acknowledge_master_transmission(pg_temp.token_of('first')), 'received',
          'the engineer confirms the reception');
select is(public.acknowledge_master_transmission(pg_temp.token_of('first')), 'received',
          'confirming twice changes nothing');
reset role;
select is((select count(*)::int from public.notifications
            where kind = 'master_transmission_received'
              and recipient_person_id = pg_temp.id_of('owner_person')
              and project_id = pg_temp.id_of('project')),
          1, 'the sender is notified once');

-- A reminder replaces the link ----------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into tokens select 'second', public.create_master_transmission(
  pg_temp.id_of('project'), 'mix', '{"titles": []}'::jsonb, null, now() + interval '30 days');
reset role;
set local role anon;
select is((select public.get_master_transmission(pg_temp.token_of('first')) ->> 'state'),
          'replaced', 'the previous link is replaced');
select is(public.acknowledge_master_transmission(pg_temp.token_of('first')), 'replaced',
          'a replaced link cannot be acknowledged');
reset role;

-- A sending's life (PROJ-UX-09) -------------------------------------------------
set local role anon;
select public.note_master_transmission_opened(pg_temp.token_of('second'));
reset role;
select ok((select opened_at is not null and acknowledged_at is null from public.master_transmissions
            where token_hash = encode(sha256(convert_to(pg_temp.token_of('second'), 'UTF8')), 'hex')),
          'opening the link is noted, and is not taking charge');
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into tokens select 'second_id', id::text from public.master_transmissions
 where token_hash = encode(sha256(convert_to(pg_temp.token_of('second'), 'UTF8')), 'hex');
select lives_ok($$ select public.mark_master_transmission_sent(pg_temp.token_of('second_id')::uuid) $$,
                'the owner says the link was sent');
select throws_ok($$ select public.revoke_master_transmission(pg_temp.token_of('second_id')::uuid, ' ') $$,
                 '23514', 'reason_required', 'revoking a link says why');
select lives_ok($$ select public.revoke_master_transmission(pg_temp.token_of('second_id')::uuid,
                    'Mauvais destinataire') $$, 'the owner revokes the link');
reset role;
set local role anon;
select is((select public.get_master_transmission(pg_temp.token_of('second')) ->> 'state'),
          'revoked', 'a revoked link says it was turned off');
reset role;

-- Mix then mastering (PROJ-BUG-09) ---------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into tokens select 'third', public.create_master_transmission(
  pg_temp.id_of('project'), 'mix', '{"titles": []}'::jsonb, null, now() + interval '30 days');
update public.master_briefs set mastering_same_engineer = true where project_id = pg_temp.id_of('project');
select is(public.create_master_transmission(pg_temp.id_of('project'), 'mastering',
            '{"role": "mastering", "titles": []}'::jsonb, null, now() + interval '90 days'),
          'continued', 'the same engineer keeps their link: the mastering is added to it');
reset role;
set local role anon;
select is((select (public.get_master_transmission(pg_temp.token_of('third')) ->> 'continued')
           || ' ' || (public.get_master_transmission(pg_temp.token_of('third')) -> 'package' ->> 'role')),
          'true mastering', 'the mix link now shows the mastering package');
select ok((select (public.get_master_transmission(pg_temp.token_of('third')) ->> 'expiresAt')::timestamptz
                  > now() + interval '80 days'),
          'the link lives as long as the mastering needs');
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Mixeur ' || (select v from vars where k = 'tag') || ' bis',
        array['engineer']);
update public.master_briefs set mastering_same_engineer = false,
       mastering_contact_id = (select id from public.network_contacts
                                where name = 'Mixeur ' || (select v from vars where k = 'tag') || ' bis')
 where project_id = pg_temp.id_of('project');
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok(public.create_master_transmission(pg_temp.id_of('project'), 'mastering',
            '{"role": "mastering", "titles": []}'::jsonb, null, now() + interval '90 days') ~ '^[0-9a-f]{64}$',
          'another engineer gets a link of their own, even with a look-alike name');
reset role;
set local role anon;
select is((select public.get_master_transmission(pg_temp.token_of('third')) -> 'package' ->> 'role'),
          null, 'the mix link no longer carries a mastering sent to someone else');
reset role;

-- Others ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$
  select public.create_master_transmission(pg_temp.id_of('project'), 'mix', '{}'::jsonb, null, now() + interval '30 days')
$$, '42501', null, 'the director does not send: only the owner writes');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.master_transmissions where project_id = pg_temp.id_of('project')),
          0, 'a project manager who does not see the project reads nothing');
reset role;

select * from finish();
rollback;
