-- MKT-C2-05 (…20261013100201): starting the Conception without a creative
-- exchange says why, by its owner only; an action of a call report becomes
-- one task at most; a call of the project is attached as an exchange.
-- Run with `supabase test db`.
begin;
select plan(7);

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

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'EX ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;
-- Stratégie validated (set directly: not under test).
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.id_of('project')
   and d.key = 'launch_strategy';

-- Starting without an exchange ---------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.start_design_without_exchange(pg_temp.id_of('project'), '  ') $$,
  '23514', null, 'starting without an exchange says why');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select public.start_design_without_exchange(pg_temp.id_of('project'), 'Pas le temps') $$,
  '42501', null, 'another project manager does not start it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.start_design_without_exchange(pg_temp.id_of('project'), 'Brief déjà précis') $$,
  'its owner starts it with a reason');
select is((select no_exchange_reason from public.design_workspaces where project_id = pg_temp.id_of('project')),
          'Brief déjà précis', 'the reason is kept');

-- A call of the project attached as an exchange; one task per action --------------
with c as (insert into public.calls (organization_id, project_id, title)
           values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Call DA') returning id)
insert into ids select 'call', id from c;
select lives_ok($$
  insert into public.design_calls (organization_id, project_id, call_id, purpose, format)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('call'), 'Échange créatif', 'video')
$$, 'its owner attaches a call of the project as an exchange');
reset role;
with t as (insert into public.transcripts (organization_id, call_id, text, provider, model)
           values (pg_temp.id_of('org'), pg_temp.id_of('call'), 'T', 'test', 'test') returning id),
     r as (insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
           select pg_temp.id_of('org'), pg_temp.id_of('call'), id, 'R', 'test', 'test' from t returning id)
insert into ids select 'report', id from r;
with i as (insert into public.report_items (organization_id, report_id, kind, what, quote, position, located)
           values (pg_temp.id_of('org'), pg_temp.id_of('report'), 'next_action', 'Envoyer le moodboard', 'On envoie le moodboard', 1, 'missing')
           returning id)
insert into ids select 'item', id from i;
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date, source_report_item_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Envoyer le moodboard',
        pg_temp.id_of('owner_person'), current_date + 3, pg_temp.id_of('item'));
select throws_ok($$
  insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date, source_report_item_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Envoyer le moodboard',
          pg_temp.id_of('owner_person'), current_date + 3, pg_temp.id_of('item'))
$$, '23505', null, 'an action of a call becomes one task at most');
select is((select count(*)::int from public.tasks where source_report_item_id = pg_temp.id_of('item')), 1,
          'the first task stays alone');

select * from finish();
rollback;
