-- Business, retours d'Ibé du 12/11/2026 (…20261112140101): the business
-- manager opens a deal on an artist, his own; « business » does not; a
-- participation's deal starts in negotiation once the artist accepted, and
-- an earlier one moves there when the participation is confirmed.
-- Run with `supabase test db`.
begin;
select plan(10);

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
select r.name, pg_temp.new_user('bo-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('glen', 'business_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'glen', 'thibault');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
create function pg_temp.deal(p text) returns public.deals
  language sql as $$ select * from public.deals where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.deal(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('sami', 'Sami'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- The business manager opens an artist's deal --------------------------------------------
select ok('open_deals' = any (public.role_permissions('business_manager'))
          and not ('open_deals' = any (public.role_permissions('business'))),
  'the business manager opens deals, business does not');
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ insert into ids select 'd_lou', public.create_deal(p_artist_id => pg_temp.id_of('lou')) $$,
  'the business manager opens a deal on an artist');
select is((pg_temp.deal('d_lou')).assignee_person_id, pg_temp.id_of('glen_person'),
  'it is his own, so he reads it');
select is((pg_temp.deal('d_lou')).stage, 'to_contact', 'it starts « à contacter »');
select throws_ok($$ select public.create_deal(p_artist_id => pg_temp.id_of('sami'),
                                              p_assignee_person_id => pg_temp.id_of('thibault_person')) $$,
  '42501', 'assignee_not_self', 'he does not give the deal he opens to someone else');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select throws_ok($$ select public.create_deal(p_artist_id => pg_temp.id_of('sami')) $$,
  '42501', 'forbidden', 'business does not open a deal');
reset role;

-- A collective: the participation accepted, the deal in negotiation ------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_collective_project(
  p_organization_id => pg_temp.id_of('org'), p_title => 'Mic ' || pg_temp.tag(),
  p_type => 'music_release', p_main_artist_id => pg_temp.id_of('pds'),
  p_assignee_person_id => pg_temp.id_of('owner_person'), p_master_ids => array[pg_temp.id_of('m1')],
  p_music_format => 'ep', p_guest_artist_ids => array[pg_temp.id_of('nadia'), pg_temp.id_of('sami')]);
insert into ids select 'p_nadia', id from public.title_participations
 where project_id = pg_temp.id_of('c1') and artist_id = pg_temp.id_of('nadia');
insert into ids select 'p_sami', id from public.title_participations
 where project_id = pg_temp.id_of('c1') and artist_id = pg_temp.id_of('sami');
select public.set_title_participation_status(pg_temp.id_of('p_nadia'), 'confirmed', null);
insert into ids select 'd_nadia', public.create_deal(p_participation_id => pg_temp.id_of('p_nadia'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
select is((pg_temp.deal('d_nadia')).stage, 'negotiation',
  'a participation accepted: the deal the business manager receives is in negotiation');
insert into ids select 'd_sami', public.create_deal(p_participation_id => pg_temp.id_of('p_sami'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
select is((pg_temp.deal('d_sami')).stage, 'to_contact', 'a participation only proposed: « à contacter »');
select public.set_title_participation_status(pg_temp.id_of('p_sami'), 'confirmed', null);
select is((pg_temp.deal('d_sami')).stage, 'negotiation', 'confirmed later, its deal moves to negotiation');
reset role;
select ok(exists (select 1 from public.deal_events
                   where deal_id = pg_temp.id_of('d_sami') and kind = 'stage'
                     and from_stage = 'to_contact' and to_stage = 'negotiation'
                     and actor_person_id = pg_temp.id_of('director_person')),
  'with its journal line, by whoever confirmed');

select * from finish();
rollback;
