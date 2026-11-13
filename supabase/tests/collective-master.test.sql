-- Projet collectif, lot 8 (docs/pds-mic-plan.md § 8, principle 1): the
-- Master of a collective, a content one included, is worked title by title.
-- Its data are already per (project, title): a mix of title A makes a
-- version of A in this project only, never of B; deciding on A leaves B as
-- it was. The page shows one title at a time (lib/master-workflow/
-- title-scope.ts); this test holds what it relies on. No schema change.
-- Run with `supabase test db`.
begin;
select plan(8);

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

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A content collective with two guests, accepted by « owner »; each title
-- gets its title in the Catalogue (lot 7), the project its Brief.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'c1', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('lou')]);
reset role;
insert into ids select 'assignment', id from public.project_assignments where project_id = pg_temp.id_of('c1');
insert into ids select 't' || position, id from public.project_titles where project_id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('assignment'), 'accepted');
insert into ids select 'mA', public.ensure_project_title_master(pg_temp.id_of('t1'));
insert into ids select 'mB', public.ensure_project_title_master(pg_temp.id_of('t2'));
reset role;
insert into public.master_briefs (organization_id, project_id)
values (pg_temp.id_of('org'), pg_temp.id_of('c1'));

select is((select type from public.projects where id = pg_temp.id_of('c1')),
  'content', 'a content collective');
select is((select count(*)::int from public.project_masters where project_id = pg_temp.id_of('c1')),
  2, 'its two titles are in its Master (the workflow applies: it has titles)');

-- A mix of title A ---------------------------------------------------------------
insert into public.master_files (organization_id, master_id, category, path, file_name, mime, bytes,
                                 audio_state, version)
values (pg_temp.id_of('org'), pg_temp.id_of('mA'), 'audio',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('mA') || '/' || gen_random_uuid() || '.wav',
        'a-mix-v1.wav', 'audio/wav', 1000, 'mix', 1);

select is((select count(*)::int from public.master_mix_versions
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('mA') and stage = 'mix'),
  1, 'a version of title A in this project');
select is((select count(*)::int from public.master_mix_versions
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('mB')),
  0, 'none of title B');

-- The decision on A leaves B alone.
update public.master_mix_versions set decision = 'approved', decided_at = now(),
       decided_by = pg_temp.id_of('owner_person')
 where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('mA');
select is((select count(*)::int from public.master_mix_versions
            where project_id = pg_temp.id_of('c1') and decision = 'approved'),
  1, 'one decision, on one title');

insert into public.master_files (organization_id, master_id, category, path, file_name, mime, bytes,
                                 audio_state, version)
values (pg_temp.id_of('org'), pg_temp.id_of('mB'), 'audio',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('mB') || '/' || gen_random_uuid() || '.wav',
        'b-mix-v1.wav', 'audio/wav', 1000, 'mix', 1);
select is((select number from public.master_mix_versions
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('mB')),
  1, 'title B numbers its versions on its own (V1)');
select is((select decision from public.master_mix_versions
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('mB')),
  null, 'and waits for its own decision');
select is((select count(*)::int from public.master_mix_versions
            where project_id = pg_temp.id_of('c1') and master_id = pg_temp.id_of('mA')),
  1, 'title A unchanged by B''s file');

select * from finish();
rollback;
