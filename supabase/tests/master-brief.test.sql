-- Master workflow: the Brief Mix/Master of a project
-- (supabase/migrations/20261005000101_master_briefs.sql): read by whoever
-- sees the project, written by its owner only, the validator in the
-- project, the calendar in order, never deleted.
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

-- The director creates and transmits, the owner accepts: launched. One
-- engineer in the Réseau.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MB ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Mixeur ' || (select v from vars where k = 'tag'), array['engineer']);
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Mixeur ' || (select v from vars where k = 'tag');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');

-- Owner writes ----------------------------------------------------------------
select lives_ok($$
  insert into public.master_briefs (organization_id, project_id, mix_contact_id,
    mastering_same_engineer, mix_rate_cents, revisions, validator_person_id,
    mix_v1_due, mix_final_due, mastering_due, master_final_due)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('engineer'),
    true, 80000, 2, pg_temp.id_of('owner_person'),
    '2026-10-04', '2026-10-07', '2026-10-09', '2026-10-10')
$$, 'the owner writes the brief (same engineer for the mastering)');
select is((select (created_by, updated_by)::text from public.master_briefs
            where project_id = pg_temp.id_of('project')),
          (pg_temp.id_of('owner_person'), pg_temp.id_of('owner_person'))::text,
          'authorship is set by the database');
select lives_ok($$
  update public.master_briefs set direction = 'Chaud, voix devant', deliverables = array['mix_final', 'master_final', 'instrumental']
   where project_id = pg_temp.id_of('project')
$$, 'the owner completes it');
select throws_ok($$
  update public.master_briefs set mix_final_due = '2026-10-12'
   where project_id = pg_temp.id_of('project')
$$, '23514', null, 'the calendar stays in order (mix final after the master final refused)');
select throws_ok($$
  update public.master_briefs set mastering_contact_id = pg_temp.id_of('engineer')
   where project_id = pg_temp.id_of('project')
$$, '23514', null, '"same engineer" leaves the mastering contact empty');
select throws_ok($$
  update public.master_briefs set deliverables = array['dvd']
   where project_id = pg_temp.id_of('project')
$$, '23514', null, 'deliverables come from a closed list');
select throws_ok($$
  update public.master_briefs set validator_person_id = pg_temp.id_of('other_person')
   where project_id = pg_temp.id_of('project')
$$, 'P0001', 'validator_not_in_project', 'the validator is the owner or a creative director of the project');
select throws_ok($$
  insert into public.master_briefs (organization_id, project_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'))
$$, '23505', null, 'one brief per project');
select throws_ok($$
  delete from public.master_briefs where project_id = pg_temp.id_of('project')
$$, '42501', null, 'a brief is never deleted');
reset role;

-- Others ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
update public.master_briefs set revisions = 9 where project_id = pg_temp.id_of('project');
reset role;
select is((select revisions::int from public.master_briefs where project_id = pg_temp.id_of('project')),
          2, 'the director reads but does not write: only the owner writes in a launched project');
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.master_briefs where project_id = pg_temp.id_of('project')),
          0, 'a project manager who does not see the project reads nothing');
reset role;

select * from finish();
rollback;
