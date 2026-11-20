-- Business module, BIZ 4 (…20261111232101): the deals' notifications go to
-- the assignee and the direction only — assigned, accord de principe to
-- validate, validated or refused, follow-up due (once per date, daily job).
-- Run with `supabase test db`.
begin;
select plan(9);

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

create function pg_temp.told(p_person text, p_kind text) returns integer
  language sql as $$ select count(*)::int from public.notifications
                      where recipient_person_id = pg_temp.id_of(p_person) and kind = p_kind $$;

select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;
select is(pg_temp.told('glen_person', 'deal_assigned'), 1, 'the assignee is told his new deal');

select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_term(pg_temp.id_of('d1'), 'royalties', '{"units": 200000}', 'confirmed');
select public.set_deal_stage(pg_temp.id_of('d1'), 'agreement');
reset role;
select is(pg_temp.told('director_person', 'deal_agreement_proposed'), 1,
  'the direction is asked to validate the accord de principe');
select is(pg_temp.told('owner_person', 'deal_agreement_proposed'), 0, 'not the project''s owner');

select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_deal_agreement(pg_temp.id_of('d1'), false, 'Trop cher');
reset role;
select is(pg_temp.told('glen_person', 'deal_agreement_refused'), 1, 'the assignee is told the refusal');

select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_next_action(pg_temp.id_of('d1'), 'Rappeler', null,
  (now() at time zone 'Europe/Paris')::date - 1);
reset role;
select is(public.flag_due_deal_follow_ups() >= 1, true, 'the daily job finds the follow-up due');
select is(pg_temp.told('glen_person', 'deal_follow_up_due'), 1, 'the assignee is told to follow up');
select public.flag_due_deal_follow_ups();
select is(pg_temp.told('glen_person', 'deal_follow_up_due'), 1, 'once per date');

select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.flag_due_deal_follow_ups() $$, '42501', null,
  'a member does not run the daily job');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('thibault_person') and kind like 'deal_%'), 0,
  'another negotiator is told nothing');

select * from finish();
rollback;
