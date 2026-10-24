-- Recette Juridique V1, JUR-01 (supabase/migrations/20261024000301_split_publishers.sql):
-- a split names its creators, who publishes each one's share, then the parts. Fixture
-- « Néons » (test data only, confirmations SIMULATED): Mona Lys, author and composer,
-- published by PDS Éditions; Sami Kader, composer, coedited by PDS Éditions and Lumen.
begin;
select plan(12);

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


insert into public.network_contacts (organization_id, name, kind, roles)
values (pg_temp.id_of('org'), 'Lumen ' || (select v from vars where k = 'tag'), 'organization', '{publisher}');
insert into ids select 'lumen', id from public.network_contacts
 where name = 'Lumen ' || (select v from vars where k = 'tag');

create temp table links (entry uuid, token text, pos int) on commit drop;
grant all on links to authenticated, anon;
create function pg_temp.entries(p_lumen jsonb) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('name', 'Mona Lys', 'role', 'author_composer', 'share', '50'),
    jsonb_build_object('name', 'Sami Kader', 'role', 'composer', 'share', '25'),
    jsonb_build_object('name', 'PDS Éditions', 'role', 'publisher', 'share', '15',
                       'house', true, 'represents', jsonb_build_array(1, 2)),
    p_lumen)
$$;
create function pg_temp.lumen(p_contact uuid, p_represents jsonb) returns jsonb language sql as $$
  select jsonb_build_object('name', 'Éditions Lumen', 'role', 'publisher', 'share', '10',
                            'contact_id', p_contact, 'represents', p_represents)
$$;

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.save_split_draft(%L, %L, pg_temp.entries(pg_temp.lumen(null, '[2]')), null) $$,
                        pg_temp.id_of('project'), pg_temp.id_of('master')),
                 'P0001', 'split_publisher_contact_required',
                 'a publisher other than the house is picked in the Réseau, never typed');
select throws_ok(format($$ select public.save_split_draft(%L, %L, pg_temp.entries(pg_temp.lumen(%L, '[]')), null) $$,
                        pg_temp.id_of('project'), pg_temp.id_of('master'), pg_temp.id_of('lumen')),
                 'P0001', 'split_publisher_unlinked', 'a publisher says which creators it represents');
select throws_ok(format($$ select public.save_split_draft(%L, %L, pg_temp.entries(pg_temp.lumen(%L, '[3]')), null) $$,
                        pg_temp.id_of('project'), pg_temp.id_of('master'), pg_temp.id_of('lumen')),
                 'P0001', 'split_publisher_unlinked', 'a publisher represents creators, not another publisher');
insert into ids select 'v1', public.save_split_draft(pg_temp.id_of('project'), pg_temp.id_of('master'),
  pg_temp.entries(pg_temp.lumen(pg_temp.id_of('lumen'), '[2]')), null);
select is((select represents from public.legal_split_entries
            where version_id = pg_temp.id_of('v1') and position = 4), array[2],
          'a publisher may represent one creator only');

insert into links select p.entry_id, p.token, e.position from public.propose_split_version(pg_temp.id_of('v1')) p
  join public.legal_split_entries e on e.id = p.entry_id;
select is((select array_agg(pos order by pos) from links), array[1, 2, 4],
          'every creator and every publisher outside the house gets a link');
select throws_ok(format($$ select public.new_split_confirmation(%L) $$,
                        (select id from public.legal_split_entries
                          where version_id = pg_temp.id_of('v1') and house)),
                 'P0001', 'split_version_closed', 'the house never gets a link: it is the team');

reset role;
set local role anon;
select is((public.get_split_confirmation((select token from links where pos = 4))
             #> '{content,entries,3,represents}'), '["Sami Kader"]'::jsonb,
          'the publisher confirms whom it represents');
select is((public.get_split_confirmation((select token from links where pos = 1))
             #> '{content,entries,2,house}'), 'true'::jsonb, 'the house line is shown as such');
create function pg_temp.answer(p_entry_pos int) returns text language sql as $$
  select public.respond_split_confirmation(l.token, 'confirm', null,
           public.get_split_confirmation(l.token) ->> 'hash')
    from links l where l.pos = p_entry_pos
$$;
grant execute on function pg_temp.answer(int) to anon;
select is(pg_temp.answer(1), 'partially_confirmed', 'one creator confirms');
select is(pg_temp.answer(2), 'partially_confirmed', 'the other creator confirms');
select is(pg_temp.answer(4), 'confirmed', 'confirmed once Lumen confirms: no answer awaited from the house');
reset role;

-- A version without publishers keeps exactly the content (and proof) it had.
select is(public.split_version_content(pg_temp.id_of('v1')) #> '{entries,0}',
          '{"name": "Mona Lys", "role": "author_composer", "share": "50.0000"}'::jsonb,
          'a creator''s line is unchanged in the confirmed content');

select * from finish();
rollback;
