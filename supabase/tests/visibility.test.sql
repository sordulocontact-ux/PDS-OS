-- Who sees a project: the director all of them, a project manager their own
-- (and those waiting for their answer), a creative director those whose team
-- they are in. Nobody else. Run with `supabase test db`.
begin;
select plan(16);

-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;

-- The framing opens once the project has a call report (run as postgres).
create function pg_temp.add_call_report(p_project uuid) returns void language sql as $$
  with c as (
    insert into public.calls (organization_id, project_id, title, consent)
    select organization_id, id, 'Call de cadrage', 'granted' from public.projects where id = p_project
    returning id, organization_id),
  t as (
    insert into public.transcripts (organization_id, call_id, text, provider, model)
    select organization_id, id, 'Transcription', 'test', 'test' from c
    returning id, organization_id, call_id)
  insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
  select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;
$$;
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
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other', 'creative');

select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'Secret ' || (select v from vars where k = 'tag'), 'partnership');

-- Before any transmission -------------------------------------------------------
reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
select pg_temp.act_as((select id from ids where name = 'owner'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          0, 'a project manager does not see a project that is not theirs');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          1, 'the director sees every project');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));

-- Transmitted, then accepted ----------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          1, 'the project manager sees a project waiting for their answer');
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
select is((select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          (select count(*)::int from public.stage_definitions
            where organization_id = (select id from ids where name = 'org') and archived_at is null),
          'the owner sees what is inside the project');
insert into public.calls (organization_id, project_id, title)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Call secret');
insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"x"', 'confirmed', 'manual');

-- Someone not attached -------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'other'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          0, 'another project manager does not see the project');
select is((select count(*)::int from public.calls where project_id = (select id from ids where name = 'project'))
        + (select count(*)::int from public.field_values where project_id = (select id from ids where name = 'project'))
        + (select count(*)::int from public.project_stages where project_id = (select id from ids where name = 'project')),
          0, 'nor anything inside it, even asked directly');
select throws_ok($$ select public.add_project_creative((select id from ids where name = 'project'),
                    (select id from ids where name = 'creative_person')) $$,
                 '42501', null, 'someone not in charge cannot add a creative director');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          0, 'a creative director does not see a project they are not in');
select ok((select count(*) from public.masters) >= 0 and exists (select 1 from public.stage_definitions),
          'the catalog and configuration stay readable');

-- Creative team ---------------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select throws_ok($$ select public.add_project_creative((select id from ids where name = 'project'),
                    (select id from ids where name = 'other_person')) $$,
                 'P0001', 'invalid_creative', 'only a creative director joins the creative team');
select lives_ok($$ select public.add_project_creative((select id from ids where name = 'project'),
                   (select id from ids where name = 'creative_person')) $$,
                'the owner adds a creative director');

reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          1, 'the creative director now sees the project');
select is((select count(*)::int from public.calls where project_id = (select id from ids where name = 'project')),
          2, 'and what is inside it (framing call and the owner''s call)');
select ok(exists(select 1 from public.notifications where kind = 'project_creative_added'
                 and project_id = (select id from ids where name = 'project')),
          'the creative director is notified');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select lives_ok($$ select public.remove_project_creative((select id from ids where name = 'project'),
                   (select id from ids where name = 'creative_person')) $$,
                'the director removes the creative director');
reset role;
select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from public.projects where id = (select id from ids where name = 'project')),
          0, 'removed, the creative director no longer sees the project');

reset role;
select * from finish();
rollback;
