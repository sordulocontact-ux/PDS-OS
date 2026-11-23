-- Retours d'Ibé du 18/11/2026, lots C and D (…20261124140101): the business
-- manager is told when someone else plans a call of his deal
-- (deal_call_planned), never its author; a participation's deal opened by
-- « Caler le call » still takes no contract before its accord.
-- Run with `supabase test db`.
begin;
select plan(13);

-- Fixtures (as deal-negotiation-call.test.sql) ------------------------------------------------
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
create function pg_temp.at(p_hours integer) returns timestamptz language sql as $$
  select date_trunc('hour', now()) + make_interval(days => 40, hours => p_hours) $$;
grant execute on function pg_temp.at(integer) to authenticated;
-- The call notices a person received (as postgres: the recipient's rows).
create function pg_temp.notices(p_person text, p_kind text default 'deal_call_planned')
returns integer language sql as $$
  select count(*)::int from public.notifications
   where recipient_person_id = pg_temp.id_of(p_person) and kind = p_kind $$;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Lou')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('lou', 'Lou')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- A collective run by « owner », two guests; Nadia's deal given to Glen.
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
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('lou'));
insert into ids select 'p1', id from public.title_participations
 where project_id = pg_temp.id_of('c1') and artist_id = pg_temp.id_of('nadia');
insert into ids select 'p2', id from public.title_participations
 where project_id = pg_temp.id_of('c1') and artist_id = pg_temp.id_of('lou');
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;

-- 1. The project's owner plans the call: Glen is told ------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'k1', public.plan_deal_negotiation_call(
  'Call · Nadia', pg_temp.at(1), pg_temp.at(1) + interval '30 minutes',
  p_deal_id => pg_temp.id_of('d1'));
reset role;
select is(pg_temp.notices('glen_person'), 1, 'the negotiator is told a call is planned for him');
select is((select (actor_person_id, project_id, subject_id) from public.notifications
            where recipient_person_id = pg_temp.id_of('glen_person') and kind = 'deal_call_planned'),
  (pg_temp.id_of('owner_person'), pg_temp.id_of('c1'), pg_temp.id_of('k1')),
  'by whom, on the deal''s project, the call as its subject');
select is(pg_temp.notices('owner_person'), 0, 'never its author');

select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select count(*)::int from public.notifications where kind = 'deal_call_planned'), 1,
  'the negotiator reads it');
reset role;

-- 2. The negotiator plans his own call: nobody is told ---------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ insert into public.calls (organization_id, deal_id, title)
  values (pg_temp.id_of('org'), pg_temp.id_of('d1'), 'Rappel Nadia') $$,
  'the negotiator prepares a call himself');
reset role;
select is(pg_temp.notices('glen_person'), 1, 'not told of his own call');

-- 3. The direction prepares one (« Préparer un call »): told again -----------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.calls (organization_id, deal_id, title, occurred_at)
values (pg_temp.id_of('org'), pg_temp.id_of('d1'), 'Point Nadia', pg_temp.at(5));
reset role;
select is(pg_temp.notices('glen_person'), 2, 'a call prepared by the direction is told too');
select is(pg_temp.notices('director_person'), 0, 'the direction is not told of its own call');

-- 4. On a participation without deal: the deal given and the call planned ---------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into ids select 'k2', public.plan_deal_negotiation_call(
  'Call · Lou', pg_temp.at(3), pg_temp.at(4),
  p_participation_id => pg_temp.id_of('p2'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;
insert into ids select 'd2', deal_id from public.calls where id = pg_temp.id_of('k2');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('glen_person')
              and ((kind = 'deal_assigned' and subject_id = pg_temp.id_of('d2'))
                   or (kind = 'deal_call_planned' and subject_id = pg_temp.id_of('k2')))),
  2, 'the deal given, then its call: both told');

-- 5. A call without deal: no such notice ------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.calls (organization_id, project_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('c1'), 'Point projet');
reset role;
select is((select count(*)::int from public.notifications where kind = 'deal_call_planned'
            and recipient_person_id in (pg_temp.id_of('glen_person'), pg_temp.id_of('owner_person'),
                                        pg_temp.id_of('director_person'))),
  3, 'a project''s call tells nobody of a deal');

-- 6. No contract before the accord, on the deal « Caler le call » opened ------------------------
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Lien ' || pg_temp.tag(), 'artist', 'draft', pg_temp.id_of('c1'),
        pg_temp.id_of('owner_person'));
insert into ids select 'ct', id from public.contracts where title = 'Lien ' || pg_temp.tag();
select is((select agreement_status from public.deals where id = pg_temp.id_of('d2')), null,
  'the deal opened by the call has no accord yet');
select throws_ok($$ update public.title_participations set contract_id = pg_temp.id_of('ct')
                     where id = pg_temp.id_of('p2') $$,
  'P0001', 'agreement_not_validated', 'its participation takes no contract before the accord');
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.link_deal_contract(pg_temp.id_of('d2'), pg_temp.id_of('ct')) $$,
  'P0001', 'participation_contract', 'nor through its deal');
reset role;

select * from finish();
rollback;
