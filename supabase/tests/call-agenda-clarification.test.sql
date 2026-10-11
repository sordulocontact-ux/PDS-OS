-- PROJ-UX-02 and UX-03: a clarification carries its subject; a call's agenda
-- edited after creation says who changed it and when
-- (…20261011400401_clarification_subject, …400501_call_agenda_edited).
-- Run with `supabase test db`.
begin;
select plan(5);

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
  ('director', pg_temp.new_user('ca-director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('ca-owner-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- A clarification and its subject -------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'CA ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.respond_to_assignment(pg_temp.id_of('a1'), 'clarification_requested',
                   'Quelle enveloppe ?', 'budget') $$,
                'the project manager asks about the budget');
-- Read back as the director: once asked, the project is no longer the
-- manager's to see (RLS), until it is transmitted again.
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select clarification_subject from public.project_assignments where id = pg_temp.id_of('a1')),
          'budget', 'the request says what it is about');
reset role;
select throws_ok($$ update public.project_assignments set clarification_subject = 'budget',
                   status = 'refused' where id = pg_temp.id_of('a1') $$,
                 '23514', null, 'only a clarification carries a subject');

-- An agenda edited after creation --------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.calls (organization_id, title, occurred_at, consent, agenda)
values (pg_temp.id_of('org'), 'Réunion ' || (select v from vars where k = 'tag'), now() + interval '1 day',
        'granted', '[{"topic": "Budget", "minutes": 10}]');
insert into ids select 'call', id from public.calls where title = 'Réunion ' || (select v from vars where k = 'tag');
select is((select agenda_edited_at from public.calls where id = pg_temp.id_of('call')),
          null, 'a new call has no change yet');
update public.calls set agenda = '[{"topic": "Budget", "minutes": 15, "questions": ["Quelle enveloppe ?"]}]'
 where id = pg_temp.id_of('call');
select is((select agenda_edited_by from public.calls where id = pg_temp.id_of('call')),
          pg_temp.id_of('owner_person'), 'the change says who made it');

select * from finish();
rollback;
