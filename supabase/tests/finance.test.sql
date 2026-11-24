-- Finance (supabase/migrations/20261112150101_finance.sql): read_finance is
-- the direction's, the business managers' and « business »'s only; they read
-- every total of the organization through the finance_* functions, while the
-- rows keep their own rules (a project's lines read as the Finance since 20261124190101).
-- Run with `supabase test db`.
begin;
select plan(14);

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
insert into ids select r.name, pg_temp.new_user('fi-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('manager'), ('creative'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director'), ('glen', 'business_manager'),
               ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Morris ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'morris', id from public.artists
 where name = 'Morris ' || (select v from vars where k = 'tag');
insert into ids select 'm_morris', public.create_master(pg_temp.id_of('org'), 'Nuit',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('morris'))));

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'p_morris', public.create_project(pg_temp.id_of('org'), 'Nuit', 'music_release',
  array[pg_temp.id_of('m_morris')], p_music_format => 'single');
reset role;
update public.projects set budget_cents = 100000 where id = pg_temp.id_of('p_morris');
insert into public.artist_budgets (organization_id, artist_id, amount_cents, starts_on)
values (pg_temp.id_of('org'), pg_temp.id_of('morris'), 500000, '2026-01-01');

insert into public.budget_lines (organization_id, project_id, artist_id, label, amount_cents, family, status, spent_on)
values (pg_temp.id_of('org'), pg_temp.id_of('p_morris'), null, 'Studio', 120000, 'studio', 'invoiced', '2026-03-02'),
       (pg_temp.id_of('org'), pg_temp.id_of('p_morris'), null, 'Clip', 40000, 'photo_video', 'planned', '2026-04-10'),
       (pg_temp.id_of('org'), null, pg_temp.id_of('morris'), 'Train', 3000, 'transport', 'paid', '2026-03-15');

-- The permission ----------------------------------------------------------------------------
select ok('read_finance' = any (public.role_permissions('general_director'))
          and 'read_finance' = any (public.role_permissions('business_manager'))
          and 'read_finance' = any (public.role_permissions('business')),
  'the direction, the business managers and business read the finance');
select ok(not ('read_finance' = any (public.role_permissions('project_manager')))
          and not ('read_finance' = any (public.role_permissions('creative_director'))),
  'project managers and the creative director do not');

-- Business reads every total, not the rows ----------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select sum(total_cents)::bigint from public.finance_month_totals()
            where project_id = pg_temp.id_of('p_morris') or artist_id = pg_temp.id_of('morris')),
          163000::bigint, 'business sums every line of the organization');
select is((select no_proof_count from public.finance_month_totals()
            where project_id = pg_temp.id_of('p_morris') and status = 'invoiced'),
          1, 'an invoiced line with no proof is counted');
select is((select budget_cents from public.finance_projects() where project_id = pg_temp.id_of('p_morris')),
          100000::bigint, 'the project and its envelope');
select is((select artist_id from public.finance_projects() where project_id = pg_temp.id_of('p_morris')),
          pg_temp.id_of('morris'), 'the project''s artist by the common rule');
select is((select spent_cents from public.finance_artists() where artist_id = pg_temp.id_of('morris')),
          123000::bigint, 'the envelope consumed: the project''s engaged line and the direct spend');
select is((select pending_cents from public.finance_artists() where artist_id = pg_temp.id_of('morris')),
          40000::bigint, 'the estimate apart');
select is((select count(*)::int from public.finance_lines('to_pay', null, null, 50)
            where project_id = pg_temp.id_of('p_morris')),
          1, '« À payer »: the invoiced line');
select is((select label from public.finance_lines('largest', '2026-03-01', '2026-03-31', 50)
            where project_id = pg_temp.id_of('p_morris') or artist_id = pg_temp.id_of('morris')
            limit 1),
          'Studio', 'the largest engaged spend of the period');
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('p_morris')),
          2, 'business selects a project''s lines, as the Finance (20261124190101)');

-- Nothing for the others ----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.finance_month_totals()), 0,
          'a project manager reads no finance total');
select is((select count(*)::int from public.finance_artists()) + (select count(*)::int from public.finance_projects()),
          0, 'nor its projects and artists');
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.finance_lines('to_pay', null, null, 50)), 0,
          'the creative director reads no spend');

select * from finish();
rollback;
