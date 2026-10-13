-- Conception: starts after a validated Strategy; the owner writes the Dossier,
-- the owner and the creative team deposit versions, the owner reviews them;
-- frozen once submitted. Run with `supabase test db`.
begin;
select plan(29);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('other', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'other');

-- The director creates the project with its creative, the owner accepts.
select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'DS ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
select public.add_project_creative((select id from ids where name = 'project'),
  (select id from ids where name = 'creative_person'));
reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
reset role;
insert into ids select d.key, s.id
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project')
   and d.key in ('framing', 'launch_strategy', 'design');

create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.org(), pg_temp.prj(), pg_temp.id_of(text) to authenticated;

-- The Strategy is written (as postgres, its own rules are tested elsewhere).
with l as (
  insert into public.levers (organization_id, project_id, label, family, state)
  values (pg_temp.org(), pg_temp.prj(), 'Clip', 'creation_content', 'selected') returning id)
insert into ids select 'lever', id from l;
with d as (
  insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Cover') returning id)
insert into ids select 'deliverable', id from d;

-- Before the Strategy is validated --------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.start_stage(pg_temp.id_of('design')) $$,
                 'P0001', 'previous_stage_not_validated', 'the Conception waits for a validated Strategy');
reset role;
update public.project_stages set state = 'validated'
 where id in (pg_temp.id_of('framing'), pg_temp.id_of('launch_strategy'));

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$
  insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'https://example.com/cover')
$$, '42501', null, 'no version before the Conception starts');
reset role;

-- In progress ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.start_stage(pg_temp.id_of('design')) $$,
                'the owner starts the Conception once the Strategy is validated');
select lives_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'design_doc', 'creative_direction', '"Solaire, grain 16 mm"', 'confirmed', 'manual')
$$, 'the owner writes the creative direction');
reset role;

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'design_doc', 'creative_direction', '"Autre"', 'confirmed', 'manual')
$$, '42501', null, 'a creative does not write the Dossier text');
select lives_ok($$
  insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, note)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'https://example.com/cover-v1', 'Première piste')
$$, 'a creative of the team deposits a version');
select lives_ok($$
  with v as (insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
             values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'https://example.com/cover-v2')
             returning id)
  insert into ids select 'v2', id from v;
$$, 'and a second one');
select is((select array_agg(number order by number) from public.design_versions
            where deliverable_id = pg_temp.id_of('deliverable')), array[1, 2],
          'versions are numbered by the database');
select throws_ok($$
  insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'http://example.com/x')
$$, '23514', null, 'a link is https only');
select throws_ok($$
  insert into public.design_versions (organization_id, project_id, deliverable_id, kind, path, file_name, mime, bytes)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'file',
          'elsewhere/' || gen_random_uuid() || '.png', 'cover.png', 'image/png', 1000)
$$, '23514', null, 'a file lives under the project folder');
select lives_ok($$
  insert into public.design_versions (organization_id, project_id, kind, url)
  values (pg_temp.org(), pg_temp.prj(), 'link', 'https://example.com/moodboard')
$$, 'a creative deposits a board for the creative direction');
select throws_ok($$ select public.review_design_version(pg_temp.id_of('v2'), 'approved', null) $$,
                 '42501', null, 'a creative does not review');
reset role;

select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$
  insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'https://example.com/intrus')
$$, '42501', null, 'a creative outside the team deposits nothing');
select is((select count(*)::int from public.design_versions where project_id = pg_temp.prj()), 0,
          'nor sees the versions');
reset role;

select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('owner_person')
              and kind = 'design_version_submitted' and project_id = pg_temp.prj()), 3,
          'the owner is told of each deposit');

-- Review ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$
  select public.review_design_version((select id from public.design_versions
    where deliverable_id = pg_temp.id_of('deliverable') and number = 1), 'approved', null)
$$, 'P0001', 'version_superseded', 'only the latest version is reviewed');
select throws_ok($$ select public.review_design_version(pg_temp.id_of('v2'), 'changes_requested', ' ') $$,
                 'P0001', 'reason_required', 'asking for changes needs a comment');
select lives_ok($$ select public.review_design_version(pg_temp.id_of('v2'), 'changes_requested', 'Plus de contraste', 'Le titre') $$,
                'the owner asks for changes, on a precise zone');
select is((select review_scope || '/' || reviewed_role from public.design_versions where id = pg_temp.id_of('v2')),
          'Le titre/project_owner', 'the decision keeps its scope and the role that took it');
select throws_ok($$ select public.review_design_version(pg_temp.id_of('v2'), 'approved', null) $$,
                 'P0001', 'invalid_transition', 'a reviewed version is settled');
reset role;

select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('creative_person')
              and kind = 'design_version_changes_requested' and subject_id = pg_temp.id_of('v2')), 1,
          'the author is told of the review');
select is((select count(*)::int from public.tasks
            where design_version_id = pg_temp.id_of('v2') and status <> 'done'
              and assignee_person_id = pg_temp.id_of('creative_person')), 1,
          'asking for changes gives the author a retouche task, once');

select pg_temp.act_as(pg_temp.id_of('creative'));
delete from public.design_versions where id = pg_temp.id_of('v2');
select is((select count(*)::int from public.design_versions where id = pg_temp.id_of('v2')), 1,
          'a reviewed version cannot be withdrawn');
select lives_ok($$
  with v as (insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
             values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'https://example.com/cover-v3')
             returning id)
  insert into ids select 'v3', id from v;
$$, 'the creative deposits a new version');
reset role;
select is((select status from public.tasks where design_version_id = pg_temp.id_of('v2')), 'done',
          'the new version closes the retouche task of the older one');

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.review_design_version(pg_temp.id_of('v3'), 'discarded', null) $$,
                 'P0001', 'reason_required', 'setting a proposal aside says why');
select lives_ok($$ select public.review_design_version(pg_temp.id_of('v3'), 'approved', null) $$,
                'the owner approves it');

-- Submitted: frozen ------------------------------------------------------------
select public.request_validation(pg_temp.id_of('design'), null);
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values (pg_temp.org(), pg_temp.prj(), 'design_doc', 'references', '"x"', 'confirmed', 'manual')
$$, '42501', null, 'the submitted Dossier is frozen');
reset role;

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$
  insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('deliverable'), 'link', 'https://example.com/cover-v4')
$$, '42501', null, 'no version once the Conception is submitted');
reset role;

select * from finish();
rollback;
