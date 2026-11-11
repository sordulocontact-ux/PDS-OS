-- Business module, BIZ 8 (…20261112030101): private contacts. The identity
-- stays shared; the coordinates of a private contact leave network_contacts
-- (so no SECURITY DEFINER function reading them can leak them), read by its
-- owner, the direction and the readers of a deal it is shared with. Shares,
-- take-backs and refusals are written. Existing paths: a member still reads
-- the identity; project_link_contacts returns no private address; a
-- coordinate written by someone without the right never overwrites.
-- Run with `supabase test db`.
begin;
select plan(34);

-- Fixtures (as deals.test.sql) ----------------------------------------------

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
  from (values ('director'), ('owner'), ('other_pm'), ('glen'), ('thibault'), ('creative')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other_pm', 'project_manager'), ('glen', 'business_manager'),
               ('thibault', 'business'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other_pm', 'glen', 'thibault', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
create function pg_temp.deal(p text) returns public.deals
  language sql as $$ select * from public.deals where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.deal(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('sami', 'Sami')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- Two collectives: c1 launched and run by « owner », c2 not launched.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'c2', public.create_project(pg_temp.id_of('org'), 'Mic bis ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m2')], p_music_format => 'single');
insert into ids select 'a_c1', public.transmit_project(pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id in (pg_temp.id_of('c1'), pg_temp.id_of('c2'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('nadia'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c2')), pg_temp.id_of('sami'));
reset role;
insert into ids select 'p1', id from public.title_participations where project_id = pg_temp.id_of('c1');
insert into ids select 'p2', id from public.title_participations where project_id = pg_temp.id_of('c2');

select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;

create function pg_temp.contact(p text) returns public.network_contacts
  language sql as $$ select * from public.network_contacts where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.contact(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('glen'));
insert into public.network_contacts (organization_id, kind, name, roles, email, phone, city)
values (pg_temp.id_of('org'), 'person', 'Manager ' || pg_temp.tag(), array['manager'],
        'manager-' || pg_temp.tag() || '@exemple.fr', '0600000000', 'Paris');
reset role;
insert into ids select 'manager', id from public.network_contacts where name = 'Manager ' || pg_temp.tag();
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Avocate ' || pg_temp.tag(), array['lawyer'],
        'avocate-' || pg_temp.tag() || '@exemple.fr');
reset role;
insert into ids select 'lawyer', id from public.network_contacts where name = 'Avocate ' || pg_temp.tag();

-- Making it private ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.make_contact_private(pg_temp.id_of('manager')) $$,
  '42501', 'forbidden', 'a member who did not create the contact does not make it private');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.make_contact_private(pg_temp.id_of('manager')) $$,
  'its creator makes it private');
select throws_ok($$ select public.make_contact_private(pg_temp.id_of('manager')) $$,
  'P0001', 'contact_already_private', 'once');
select is((pg_temp.contact('manager')).email, null,
  'its e-mail left network_contacts (no definer function can read it there)');
select is((select email from public.network_contact_private_details where contact_id = pg_temp.id_of('manager')),
  'manager-' || pg_temp.tag() || '@exemple.fr', 'its owner reads it');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.make_contact_private(pg_temp.id_of('lawyer')) $$,
  'the direction makes its contact private');
select is((select count(*)::int from public.network_contact_private_details
            where contact_id = pg_temp.id_of('manager')), 1, 'the direction reads every private contact');
reset role;

-- Who reads -----------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((pg_temp.contact('manager')).name, 'Manager ' || pg_temp.tag(),
  'its identity stays shared (PersonPickerField)');
select ok((pg_temp.contact('manager')).private_owner_person_id is not null, 'and says it is private');
select is((select count(*)::int from public.network_contact_private_details
            where contact_id = pg_temp.id_of('manager')), 0, 'its coordinates are not read');
select ok(not public.can_read_contact_details(pg_temp.id_of('manager')), 'can_read_contact_details says no');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok(not public.can_read_contact_details(pg_temp.id_of('manager')),
  'nor the owner of the deal''s project before it is shared');
reset role;

-- Sharing deal by deal --------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select is(public.link_deal_contact(pg_temp.id_of('d1'), pg_temp.id_of('manager')), 'linked',
  'its owner shares it with his deal');
select is(public.link_deal_contact(pg_temp.id_of('d1'), pg_temp.id_of('manager')), 'unchanged', 'once');
select is(public.link_deal_contact(pg_temp.id_of('d1'), pg_temp.id_of('lawyer')), 'refused',
  'someone else''s private contact is refused');
select is((select count(*)::int from public.deal_contacts where contact_id = pg_temp.id_of('lawyer')), 0,
  'and not linked');
reset role;
select is((select count(*)::int from public.network_contact_privacy_events
            where contact_id = pg_temp.id_of('lawyer') and kind = 'share_refused'), 1,
  'the refusal is written');
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok(public.can_read_contact_details(pg_temp.id_of('manager')),
  'the deal''s readers read it once shared');
select is((select phone from public.network_contact_private_details where contact_id = pg_temp.id_of('manager')),
  '0600000000', 'its phone too');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.network_contact_private_details
            where contact_id = pg_temp.id_of('manager')), 0, 'not someone outside the deal');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select count(*)::int from public.deal_contacts), 0, 'nor another negotiator');
reset role;

-- Existing paths ---------------------------------------------------------------------------------
-- A project call inviting the private contact: the link pages' list
-- (SECURITY DEFINER, reads network_contacts.email) returns no address.
select pg_temp.act_as(pg_temp.id_of('owner'));
with k as (
  insert into public.calls (organization_id, project_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 'Call projet') returning id)
insert into ids select 'k1', id from k;
insert into public.call_guests (organization_id, call_id, email, name, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('k1'), 'autre@exemple.fr', 'Manager',
        pg_temp.id_of('manager'));
select is((select x ->> 'email' from jsonb_array_elements(public.project_link_contacts(pg_temp.id_of('c1'))) x
            where x ->> 'contactId' = pg_temp.id_of('manager')::text), null,
  'project_link_contacts gives no private address, even to a reader of its deal');
reset role;
-- A coordinate written by someone without the right never overwrites.
select pg_temp.act_as(pg_temp.id_of('creative'));
update public.network_contacts set email = 'pirate@exemple.fr' where id = pg_temp.id_of('manager');
reset role;
select is((select email from public.network_contact_private_details where contact_id = pg_temp.id_of('manager')),
  'manager-' || pg_temp.tag() || '@exemple.fr', 'a member without the right does not overwrite the e-mail');
select is((pg_temp.contact('manager')).email, null, 'and it never lands in network_contacts');
-- Its owner changes it through the same form.
select pg_temp.act_as(pg_temp.id_of('glen'));
update public.network_contacts set phone = '0611111111' where id = pg_temp.id_of('manager');
select is((select phone from public.network_contact_private_details where contact_id = pg_temp.id_of('manager')),
  '0611111111', 'whoever reads the details changes them');
select lives_ok($$ select public.set_private_contact_details(pg_temp.id_of('manager'),
  'manager-' || pg_temp.tag() || '@exemple.fr', null, 'Paris', null) $$, 'and clears one');
select is((select phone from public.network_contact_private_details where contact_id = pg_temp.id_of('manager')),
  null, 'cleared');
reset role;
-- Only the functions of BIZ 8 touch the private table.
select is((select array_agg(proname::text order by proname) from pg_proc
            where pronamespace = 'public'::regnamespace
              and prosrc ilike '%network_contact_private_details%'),
  array['make_contact_private', 'make_contact_shared', 'network_contacts_keep_private',
        'set_private_contact_details'],
  'no other SQL function reads the private coordinates');

-- Taking back -------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.unlink_deal_contact(pg_temp.id_of('d1'), pg_temp.id_of('manager')) $$,
  'its owner takes it back from the deal');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok(not public.can_read_contact_details(pg_temp.id_of('manager')),
  'the deal''s readers no longer read it');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select array_agg(kind order by created_at, kind) from public.network_contact_privacy_events
            where contact_id = pg_temp.id_of('manager') and kind in ('deal_shared', 'deal_unshared')),
  array['deal_shared', 'deal_unshared'], 'its owner reads the shares and take-backs');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.network_contact_privacy_events), 0,
  'another member reads no privacy journal');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.make_contact_shared(pg_temp.id_of('manager')) $$, 'its owner shares it again');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((pg_temp.contact('manager')).email, 'manager-' || pg_temp.tag() || '@exemple.fr',
  'its coordinates are back in the Réseau for everyone');
reset role;

select * from finish();
rollback;
