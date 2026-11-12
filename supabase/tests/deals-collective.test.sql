-- Business × projets collectifs (…20261112120101, audit du 12/11/2026): a
-- guest of a collective gets a deal through his participation only; a
-- participation out of play gets none; a contract linked to a deal no
-- longer blocks its project's deletion; personal_tasks stays without
-- zz_project_live.
-- Run with `supabase test db`.
begin;
select plan(8);

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
select r.name, pg_temp.new_user('dc-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('glen')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'glen');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('sami', 'Sami')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective run by « owner », Nadia invited on its title.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'a_c1', public.transmit_project(pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id = pg_temp.id_of('c1');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('nadia'));
reset role;
insert into ids select 'p1', id from public.title_participations where project_id = pg_temp.id_of('c1');

-- A guest goes through his participation -------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.create_deal(p_project_id => pg_temp.id_of('c1'),
                                              p_artist_id => pg_temp.id_of('nadia')) $$,
  'P0001', 'use_participation', 'an artist taking part in the collective goes through his participation');
select lives_ok($$ insert into ids select 'd_sami', public.create_deal(
                     p_project_id => pg_temp.id_of('c1'), p_artist_id => pg_temp.id_of('sami')) $$,
  'an artist outside the collective''s titles still gets a deal on the project');

-- A participation out of play ----------------------------------------------------------------
select public.set_title_participation_status(pg_temp.id_of('p1'), 'declined', 'Pas disponible');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p1')) $$,
  'P0001', 'participation_not_in_play', 'a declined participation gets no deal');
select lives_ok($$ select public.create_deal(p_project_id => pg_temp.id_of('c1'),
                                             p_artist_id => pg_temp.id_of('nadia')) $$,
  'once declined, the artist is no longer held to his participation');
reset role;

-- A contract linked to a deal --------------------------------------------------------------
insert into public.contracts (organization_id, title, type, project_id, artist_id, owner_person_id)
values (pg_temp.id_of('org'), 'Contrat Sami ' || pg_temp.tag(), 'artist', pg_temp.id_of('c1'),
        pg_temp.id_of('sami'), pg_temp.id_of('owner_person'));
insert into ids select 'k1', id from public.contracts where title = 'Contrat Sami ' || pg_temp.tag();
update public.deals set contract_id = pg_temp.id_of('k1') where id = pg_temp.id_of('d_sami');
delete from public.contracts where id = pg_temp.id_of('k1');
select is((select contract_id from public.deals where id = pg_temp.id_of('d_sami')), null::uuid,
  'a contract deleted clears the deal''s link');

insert into public.contracts (organization_id, title, type, project_id, artist_id, owner_person_id)
values (pg_temp.id_of('org'), 'Contrat Sami bis ' || pg_temp.tag(), 'artist', pg_temp.id_of('c1'),
        pg_temp.id_of('sami'), pg_temp.id_of('owner_person'));
update public.deals set contract_id = (select id from public.contracts
                                        where title = 'Contrat Sami bis ' || pg_temp.tag())
 where id = pg_temp.id_of('d_sami');
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('c1')) $$,
  'a project whose contract is linked to a deal is deleted');
select is((select count(*) from public.deals where project_id = pg_temp.id_of('c1')), 0::bigint,
  'its deals go with it');

-- personal_tasks without zz_project_live (Maël, 20261111120101) ----------------------------
select ok(not exists (select 1 from pg_trigger
                       where tgrelid = 'public.personal_tasks'::regclass and tgname = 'zz_project_live'),
  'personal_tasks keeps no zz_project_live');

select * from finish();
rollback;
