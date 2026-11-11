-- The envelope of an artist (BUD 2,
-- supabase/migrations/20261111210101_artist_budget_envelopes.sql): opened and
-- changed by the direction alone, split by poste never above the amount, one
-- open at a time (the former closed and kept), each change journaled; what it
-- consumed computed at each reading: direct spends plus the lines of the
-- artist's projects (a collective's main artist), dated in the period.
-- Run with `supabase test db`.
begin;
select plan(20);

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
insert into ids select r.name, pg_temp.new_user('ab-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('manager'), ('creative'), ('glen')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), n || ' ' || (select v from vars where k = 'tag'), 'signed'
  from unnest(array['Morris', 'Kalia', 'Seul']) n;
insert into ids select lower(split_part(name, ' ', 1)), id from public.artists
 where name like '% ' || (select v from vars where k = 'tag');
insert into ids select 'm_morris', public.create_master(pg_temp.id_of('org'), 'Nuit',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('morris'))));
insert into ids select 'm_kalia', public.create_master(pg_temp.id_of('org'), 'Jour',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('kalia'))));

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'p_morris', public.create_project(pg_temp.id_of('org'), 'Nuit', 'music_release',
  array[pg_temp.id_of('m_morris')], p_music_format => 'single');
insert into ids select 'p_collective', public.create_project(pg_temp.id_of('org'), 'PDS MIC', 'music_release',
  array[pg_temp.id_of('m_kalia')], p_music_format => 'ep');
insert into ids select 'p_kalia', public.create_project(pg_temp.id_of('org'), 'Jour', 'music_release',
  array[pg_temp.id_of('m_kalia')], p_music_format => 'single');
reset role;
-- A collective whose main artist is Morris; a project naming Morris whose
-- first title is Kalia's (Kalia's project).
update public.projects set collective = true, artist_id = pg_temp.id_of('morris')
 where id = pg_temp.id_of('p_collective');
update public.projects set artist_id = pg_temp.id_of('morris') where id = pg_temp.id_of('p_kalia');

create function pg_temp.spend(p_owner text, p_project boolean, p_cents bigint, p_family text,
                              p_status text, p_on date) returns void language sql as $$
  insert into public.budget_lines (organization_id, project_id, artist_id, label, amount_cents,
                                   family, status, spent_on)
  values (pg_temp.id_of('org'),
          case when p_project then pg_temp.id_of(p_owner) end,
          case when not p_project then pg_temp.id_of(p_owner) end,
          'Dépense', p_cents, p_family, p_status, p_on)
$$;
select pg_temp.spend('morris', false, 1850, 'food', 'paid', '2026-03-10');
select pg_temp.spend('morris', false, 777, 'food', 'paid', '2025-12-31');
select pg_temp.spend('morris', false, 1000, null, 'paid', '2026-03-11');
select pg_temp.spend('p_morris', true, 300000, 'studio', 'committed', '2026-02-01');
select pg_temp.spend('p_morris', true, 50000, 'studio', 'planned', '2026-02-02');
select pg_temp.spend('p_collective', true, 20000, 'transport', 'paid', '2026-04-01');
select pg_temp.spend('p_kalia', true, 99999, 'transport', 'paid', '2026-04-01');

create function pg_temp.open(p_from date, p_posts jsonb default
    '{"content_production": 3000000, "advertising": 2000000, "transport": 1000000}')
returns uuid language sql as $$
  select public.open_artist_budget(pg_temp.id_of('morris'), 6000000, p_from, null, p_posts)
$$;
grant execute on function pg_temp.open(date, jsonb) to authenticated;

-- 1. The direction alone opens -------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select pg_temp.open('2026-01-01') $$, '42501', null,
  'a project manager does not open an envelope');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select pg_temp.open('2026-01-01') $$, '42501', null,
  'a business manager does not open an envelope');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select pg_temp.open('2026-01-01', '{"transport": 7000000}') $$, '23514', null,
  'the postes never add up to more than the envelope');
select throws_ok($$ select pg_temp.open('2026-01-01', '{"voyage": 1000}') $$, '23514', null,
  'a poste is one of the sixteen');
select lives_ok($$ insert into ids select 'b1', pg_temp.open('2026-01-01') $$,
  'the direction opens Morris''s envelope (60 000 €, three postes, 10 000 € not allotted)');

-- 2. What it consumed ----------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select sum(spent_cents)::bigint from public.artist_budget_usage(pg_temp.id_of('b1'))),
  322850::bigint,
  'spent = direct spends + the lines of Morris''s projects, in the period, engaged or paid');
select is((select spent_cents from public.artist_budget_usage(pg_temp.id_of('b1')) where family = 'transport'),
  20000::bigint, 'a collective counts for its main artist; a project whose first title is another''s does not');
select is((select pending_cents from public.artist_budget_usage(pg_temp.id_of('b1')) where family = 'studio'),
  50000::bigint, 'an estimate is pending, not spent');
select ok((select allocated_cents = 0 and project_cents = 300000
             from public.artist_budget_usage(pg_temp.id_of('b1')) where family = 'studio'),
  'a poste spent without being allotted shows (its overrun is the code''s to say)');
select is((select direct_cents from public.artist_budget_usage(pg_temp.id_of('b1')) where family = 'food'),
  1850::bigint, 'a spend dated before the envelope is out of it');
select is((select spent_cents from public.artist_budget_usage(pg_temp.id_of('b1')) where family is null),
  1000::bigint, 'a spend without a poste is counted apart');
select is((select allocated_cents from public.artist_budget_usage(pg_temp.id_of('b1')) where family = 'advertising'),
  2000000::bigint, 'a poste allotted and not spent yet shows its amount');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.artist_budget_usage(pg_temp.id_of('b1'))), 0,
  'a creative director reads nothing of it');
select is((select count(*)::int from public.artist_budgets where artist_id = pg_temp.id_of('morris')), 0,
  'nor the envelope itself');

-- 3. The part of a project ---------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select project_spent_cents from public.project_artist_budget_share(pg_temp.id_of('p_morris'))),
  300000::bigint, 'a project''s Budget says what it takes from its artist''s envelope');

-- 4. Changing, reopening, the history ------------------------------------------------
select lives_ok(format($$ select public.update_artist_budget(%L, 6500000, '2026-01-01', null,
  '{"content_production": 3000000, "advertising": 2500000, "transport": 1000000}') $$, pg_temp.id_of('b1')),
  'the direction changes the open envelope');
select throws_ok($$ select pg_temp.open('2025-12-01') $$, '23514', null,
  'a new envelope starts after the open one');
select lives_ok($$ insert into ids select 'b2', pg_temp.open('2026-07-01') $$,
  'opening a new envelope closes the former');
select ok((select closed_at is not null and ends_on = '2026-06-30'
             from public.artist_budgets where id = pg_temp.id_of('b1')),
  'the former is closed the day before, kept as history');
select is((select array_agg(kind order by seq) from public.artist_budget_events
            where artist_id = pg_temp.id_of('morris')),
  array['opened', 'changed', 'closed', 'opened'], 'each change is journaled');

select * from finish();
rollback;
