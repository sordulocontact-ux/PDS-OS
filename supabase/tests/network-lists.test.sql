-- Réseau : listes de personnes (…20261120160101, réunion avec Ibé du
-- 18/11/2026): a private list is read and written by its author alone, the
-- direction included; a shared list is read by the team and kept up by every
-- member who manages the Réseau, « À valider » until the direction validates
-- it; each person carries a reply (waiting / replied); a list never reveals a
-- private contact's coordinates and never protects a contact from deletion.
-- Run with `supabase test db`.
begin;
select plan(45);

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
  ('alize', pg_temp.new_user('alize-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('waiting', pg_temp.new_user('waiting-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('alize', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'alize', 'creative', 'waiting');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
-- The people of a list, by fixture name, sorted.
create function pg_temp.people(p_list uuid) returns text[] language sql as $$
  select array_agg(ids.name order by ids.name)
    from public.network_list_contacts c join ids on ids.id = c.contact_id
   where c.list_id = p_list $$;
grant execute on function pg_temp.people(uuid) to authenticated;
create function pg_temp.list(p text) returns public.network_lists language sql as $$
  select * from public.network_lists where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.list(text) to authenticated;

insert into public.network_contacts (organization_id, kind, name, roles, email)
select pg_temp.id_of('org'), 'person', v.label || ' ' || pg_temp.tag(), array['artist'],
       lower(v.label) || '-' || pg_temp.tag() || '@exemple.fr'
  from (values ('Jay'), ('Nadia'), ('Sami'), ('Media'), ('Archive')) as v (label);
insert into ids
select lower(v.label), c.id
  from (values ('Jay'), ('Nadia'), ('Sami'), ('Media'), ('Archive')) as v (label)
  join public.network_contacts c on c.name = v.label || ' ' || pg_temp.tag();
update public.network_contacts set archived_at = now() where id = pg_temp.id_of('archive');

-- Creating ------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('waiting'));
select throws_ok($$ select public.create_network_list(pg_temp.id_of('org'), 'Mic') $$,
  '42501', 'forbidden', 'a member not approved yet creates no list');
reset role;

select pg_temp.act_as(pg_temp.id_of('alize'));
select throws_ok($$ select public.create_network_list(pg_temp.id_of('org'), '  ') $$,
  '23514', 'name_required', 'a list has a name');
select throws_ok($$ select public.create_network_list(pg_temp.id_of('org'), repeat('x', 121)) $$,
  '22023', 'name_too_long', 'of 120 characters at most');
select throws_ok($$ select public.create_network_list(pg_temp.id_of('org'), 'Mic', false,
                     array[pg_temp.id_of('archive')]) $$,
  '23503', 'contact_not_found', 'an archived contact is not added');
insert into ids select 'mine', public.create_network_list(pg_temp.id_of('org'), '  Artistes Mic  ',
  false, array[pg_temp.id_of('jay'), pg_temp.id_of('nadia'), pg_temp.id_of('jay')]);
select ok(pg_temp.id_of('mine') is not null, 'a project manager creates a list for herself');
select is((pg_temp.list('mine')).name, 'Artistes Mic', 'its name, trimmed');
select is(pg_temp.people(pg_temp.id_of('mine')), array['jay', 'nadia'], 'its people, each once');
select is((select array_agg(reply) from public.network_list_contacts where list_id = pg_temp.id_of('mine')),
  array['waiting', 'waiting'], 'nobody has replied yet: the hourglass');
insert into ids select 'team', public.create_network_list(pg_temp.id_of('org'), 'Médias de Jay', true,
  array[pg_temp.id_of('media')]);
select ok((pg_temp.list('team')).shared, 'a list is shared with the team at its creation');
select is((pg_temp.list('team')).validated_at, null, 'shared by a project manager: to validate');
reset role;

-- Reading -------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.network_lists where id = pg_temp.id_of('mine')), 0,
  'a private list is read by its author alone, not even the direction');
select is((select count(*)::int from public.network_list_contacts where list_id = pg_temp.id_of('mine')), 0,
  'nor its people');
select throws_ok($$ select public.add_contacts_to_network_list(pg_temp.id_of('mine'), array[pg_temp.id_of('sami')]) $$,
  'P0002', 'list_not_found', 'a private list of another is not found');
select is((select count(*)::int from public.network_lists where id = pg_temp.id_of('team')), 1,
  'a shared list is read by the team');
select is(pg_temp.people(pg_temp.id_of('team')), array['media'], 'and its people');
reset role;
select pg_temp.act_as(pg_temp.id_of('waiting'));
select is((select count(*)::int from public.network_lists where id = pg_temp.id_of('team')), 0,
  'a member not approved yet reads none');
reset role;

-- Only through the functions ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
select throws_ok($$ insert into public.network_list_contacts (organization_id, list_id, contact_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('mine'), pg_temp.id_of('sami')) $$,
  '42501', null, 'no direct write on its people');
select throws_ok($$ update public.network_lists set name = 'Volé' where id = pg_temp.id_of('mine') $$,
  '42501', null, 'nor on the list');
reset role;

-- Keeping it up -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('alize'));
select is(public.add_contacts_to_network_list(pg_temp.id_of('mine'),
            array[pg_temp.id_of('sami'), pg_temp.id_of('jay')]), 1,
  'adding skips who is already in it');
select lives_ok($$ select public.set_network_list_reply(pg_temp.id_of('mine'), pg_temp.id_of('jay'), 'replied') $$,
  'Jay has replied: the green tick, in one gesture');
select is((select reply from public.network_list_contacts
            where list_id = pg_temp.id_of('mine') and contact_id = pg_temp.id_of('jay')), 'replied',
  'his reply is kept');
select is((select reply_changed_by from public.network_list_contacts
            where list_id = pg_temp.id_of('mine') and contact_id = pg_temp.id_of('jay')),
  pg_temp.id_of('alize_person'), 'with who changed it');
select throws_ok($$ select public.set_network_list_reply(pg_temp.id_of('mine'), pg_temp.id_of('jay'), 'maybe') $$,
  '22023', 'invalid_reply', 'a reply is waiting or replied');
select is(public.add_contacts_to_network_list(pg_temp.id_of('mine'), array[pg_temp.id_of('jay')]), 0,
  'added again, Jay keeps his reply');
select lives_ok($$ select public.remove_contact_from_network_list(pg_temp.id_of('mine'), pg_temp.id_of('sami')) $$,
  'a person leaves the list');
select throws_ok($$ select public.remove_contact_from_network_list(pg_temp.id_of('mine'), pg_temp.id_of('sami')) $$,
  'P0002', 'contact_not_in_list', 'once');
select lives_ok($$ select public.rename_network_list(pg_temp.id_of('mine'), 'PDS Mic 8') $$,
  'its author renames it');
reset role;

select pg_temp.act_as(pg_temp.id_of('creative'));
select is(public.add_contacts_to_network_list(pg_temp.id_of('team'), array[pg_temp.id_of('nadia')]), 1,
  'any member who manages the Réseau keeps a shared list up');
select lives_ok($$ select public.set_network_list_reply(pg_temp.id_of('team'), pg_temp.id_of('media'), 'replied') $$,
  'and changes a reply');
select throws_ok($$ select public.rename_network_list(pg_temp.id_of('team'), 'Volé') $$,
  '42501', 'forbidden', 'but only its author renames it');
select throws_ok($$ select public.delete_network_list(pg_temp.id_of('team')) $$,
  '42501', 'forbidden', 'or deletes it');
select throws_ok($$ select public.set_network_list_validated(pg_temp.id_of('team'), true) $$,
  '42501', 'forbidden', 'and only the direction validates it');
reset role;

-- Validating ------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.set_network_list_validated(pg_temp.id_of('team'), true) $$,
  'the direction validates a shared list');
select is((pg_temp.list('team')).validated_by, pg_temp.id_of('director_person'), 'validated by her');
insert into ids select 'dg', public.create_network_list(pg_temp.id_of('org'), 'Influence', true);
select ok((pg_temp.list('dg')).validated_at is not null, 'a list the direction shares is validated at once');
reset role;

select pg_temp.act_as(pg_temp.id_of('alize'));
select lives_ok($$ select public.set_network_list_shared(pg_temp.id_of('team'), false) $$,
  'its author keeps it for herself again');
select is((pg_temp.list('team')).validated_at, null, 'its validation goes with the sharing');
select lives_ok($$ select public.set_network_list_shared(pg_temp.id_of('mine'), true) $$,
  'she shares her own list');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_network_list_validated(pg_temp.id_of('team'), true) $$,
  'P0002', 'list_not_found', 'a list kept private is no longer seen to validate');
reset role;

-- A private contact in a shared list --------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.make_contact_private(pg_temp.id_of('jay')) $$,
  'the direction makes Jay private');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is(pg_temp.people(pg_temp.id_of('mine')), array['jay', 'nadia'], 'the team still sees him in the shared list');
select is((select count(*)::int from public.network_contact_private_details
            where contact_id = pg_temp.id_of('jay')), 0, 'but never his coordinates through it');
reset role;

-- A contact deleted leaves the lists ----------------------------------------------------
delete from public.network_contacts where id = pg_temp.id_of('nadia');
select pg_temp.act_as(pg_temp.id_of('alize'));
select is(pg_temp.people(pg_temp.id_of('mine')), array['jay'], 'a deleted contact leaves the lists');
select lives_ok($$ select public.delete_network_list(pg_temp.id_of('mine')) $$,
  'its author deletes a list');
reset role;
select is((select count(*)::int from public.network_contacts where id = pg_temp.id_of('jay')), 1,
  'its people stay in the Réseau');

select * from finish();
rollback;
