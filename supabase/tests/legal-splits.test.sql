-- Juridique, branch 04: versioned split sheets confirmed by each contributor
-- (supabase/migrations/20261005005001_legal_splits.sql). Run with
-- `supabase test db`. Fixture of the ticket (« Piégée », test data only: the
-- confirmations here are SIMULATED): an equal split between Ever, Samy, Le J.
begin;
select plan(18);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');
insert into ids select 'creative_person', person_id from public.accounts
 where id = pg_temp.id_of('creative');

-- A project owned by the manager, with one title, and another title outside it.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_master', public.create_master(
  pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);


-- A plan whose « Répartir l'édition » waits for the split (its task too).
insert into public.legal_plans (organization_id, project_id, status, launched_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'active', now());
insert into public.legal_plan_items (organization_id, plan_id, project_id, item_key, kind,
                                     master_id, label, status, responsible_person_id)
select pg_temp.id_of('org'), id, pg_temp.id_of('project'), 'splits:' || pg_temp.id_of('master'),
       'splits', pg_temp.id_of('master'), 'Répartir', 'action_now', pg_temp.id_of('manager_person')
  from public.legal_plans where project_id = pg_temp.id_of('project');
select public.legal_plan_item_task((select id from public.legal_plan_items
                                     where project_id = pg_temp.id_of('project')));

create temp table links (entry uuid, token text, pos int) on commit drop;
grant all on links to authenticated, anon;
create function pg_temp.entries(p_shares text[]) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('name', 'Ever', 'role', 'composer', 'share', p_shares[1]),
    jsonb_build_object('name', 'Samy', 'role', 'composer', 'share', p_shares[2]),
    jsonb_build_object('name', 'Le J', 'role', 'author', 'share', p_shares[3]))
$$;

-- A proposal, exactly 100 % ------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'v1', public.save_split_draft(pg_temp.id_of('project'), pg_temp.id_of('master'),
  pg_temp.entries(array['33.33', '33.33', '33.33']), null);
select throws_ok(format($$ select * from public.propose_split_version(%L) $$, pg_temp.id_of('v1')),
                 'P0001', 'split_total_not_100', 'a split that does not total exactly 100 % is not proposed');
select is(public.save_split_draft(pg_temp.id_of('project'), pg_temp.id_of('master'),
            pg_temp.entries(array['33.3334', '33.3333', '33.3333']), null),
          pg_temp.id_of('v1'), 'a draft is rewritten, not versioned');
insert into links select p.entry_id, p.token, e.position from public.propose_split_version(pg_temp.id_of('v1')) p
  join public.legal_split_entries e on e.id = p.entry_id;
select is((select count(*)::int from links where token ~ '^[0-9a-f]{64}$'), 3, 'one link per person');
select is((select sum(share) from public.legal_split_entries where version_id = pg_temp.id_of('v1')),
          100.0000::numeric, 'the stored sum is exactly 100 %');
select is((select count(distinct version_id)::int from public.legal_split_confirmations c
            join links l on l.entry = c.entry_id), 1, 'the three links target the same version');

-- Each person answers, without an account ------------------------------------------
reset role;
set local role anon;
select is((public.get_split_confirmation((select token from links limit 1)) ->> 'state'), 'open',
          'a contributor opens the proposal without an account');
select throws_ok(format($$ select public.respond_split_confirmation(%L, 'confirm', null, %L) $$,
                        (select token from links limit 1), repeat('0', 64)),
                 'P0001', 'split_content_changed', 'an answer counts only for the exact content shown');
create function pg_temp.answer(p_entry_pos int, p_decision text, p_comment text) returns text language sql as $$
  select public.respond_split_confirmation(l.token, p_decision, p_comment,
           public.get_split_confirmation(l.token) ->> 'hash')
    from links l where l.pos = p_entry_pos
$$;
grant execute on function pg_temp.answer(int, text, text) to anon;
select is(pg_temp.answer(1, 'confirm', null), 'partially_confirmed', 'one confirmation of three');
select is(pg_temp.answer(2, 'confirm', null), 'partially_confirmed', 'two of three');
reset role;
select is((select t.status from public.tasks t join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.project_id = pg_temp.id_of('project')), 'todo', 'the plan waits for every confirmation');
set local role anon;
select is(pg_temp.answer(3, 'confirm', null), 'confirmed', 'confirmed after the three confirmations');
reset role;
select is((select t.status from public.tasks t join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.project_id = pg_temp.id_of('project')), 'done', 'a confirmed split ticks the plan''s task');
select isnt((select evidence ->> 'content_hash' from public.legal_split_confirmations
              where version_id = pg_temp.id_of('v1') limit 1), null, 'each answer keeps its proof');

-- A correction is a new version, with new confirmations -------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'v2', public.save_split_draft(pg_temp.id_of('project'), pg_temp.id_of('master'),
  pg_temp.entries(array['40', '30', '30']), 'Le J apporte moins');
delete from links;
insert into links select p.entry_id, p.token, e.position from public.propose_split_version(pg_temp.id_of('v2')) p
  join public.legal_split_entries e on e.id = p.entry_id;
select is((select status from public.legal_split_versions where id = pg_temp.id_of('v1')), 'superseded',
          'a new version supersedes the previous one');
select is((select status from public.legal_split_versions where id = pg_temp.id_of('v2')), 'proposed',
          'and needs its own confirmations');

reset role;
set local role anon;
select throws_ok($$ select pg_temp.answer(3, 'dispute', null) $$, 'P0001', 'split_comment_required',
                 'a dispute says why');
select is(pg_temp.answer(3, 'dispute', 'Je voulais 33 %'), 'disputed', 'a dispute makes the version DISPUTED');
reset role;
select is((select count(*)::int from public.legal_split_entries where version_id = pg_temp.id_of('v2')), 3,
          'without erasing the proposal');

select * from finish();
rollback;
