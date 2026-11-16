-- Finance, fundings and engines (supabase/migrations/20261113500101_finance_fundings.sql):
-- the Finance keeps the Orchard rule, the formats and shows, the Pay Later
-- lines and draws; a draw never exceeds what the line allows; a spend paid
-- by a draw leaves the treasury by its installments, not on its day; the
-- others read nothing of it. Run with `supabase test db`.
begin;
select plan(9);

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
insert into ids select r.name, pg_temp.new_user('ff-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('glen')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('glen', 'business_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ insert into public.finance_engine_settings (organization_id, orchard_titles_counted)
                   values (pg_temp.id_of('org'), 7)
                   on conflict (organization_id) do update set orchard_titles_counted = 7 $$,
  'the Finance sets the Orchard counter');
select lives_ok($$ insert into public.finance_show_formats (organization_id, name, cost_cents, provisional_titles)
                   values (pg_temp.id_of('org'), 'PDS MIC ' || (select v from vars where k = 'tag'), 760000, 10) $$,
  'the Finance keeps a format');
insert into ids select 'mic', id from public.finance_show_formats
 where name = 'PDS MIC ' || (select v from vars where k = 'tag');
select lives_ok($$ insert into public.finance_shows (organization_id, format_id, label, planned_on)
                   values (pg_temp.id_of('org'), pg_temp.id_of('mic'), 'PDS MIC #7', '2027-03-12') $$,
  'and plans a show on a day');
select lives_ok($$ update public.finance_shows set planned_on = '2027-04-09'
                    where format_id = pg_temp.id_of('mic') $$,
  'and moves it');

insert into public.finance_credit_lines (organization_id, name, limit_cents)
values (pg_temp.id_of('org'), 'Pay Later ' || (select v from vars where k = 'tag'), 1000000);
insert into ids select 'pl', id from public.finance_credit_lines
 where name = 'Pay Later ' || (select v from vars where k = 'tag');
insert into public.finance_cost_centers (organization_id, name, budget_cents)
values (pg_temp.id_of('org'), 'Matériel ' || (select v from vars where k = 'tag'), 900000);
insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents, status, spent_on)
select pg_temp.id_of('org'), id, 'Console ' || (select v from vars where k = 'tag'), 600000, 'invoiced', '2030-01-15'
  from public.finance_cost_centers where name = 'Matériel ' || (select v from vars where k = 'tag');
insert into ids select 'console', id from public.budget_lines
 where label = 'Console ' || (select v from vars where k = 'tag');

select lives_ok($$ insert into public.finance_credit_draws (organization_id, credit_line_id, line_id, label,
                                                            amount_cents, drawn_on, installments, fee_bp)
                   values (pg_temp.id_of('org'), pg_temp.id_of('pl'), pg_temp.id_of('console'), 'Console',
                           600000, current_date, 6, 300) $$,
  'the Finance finances a spend with a Pay Later draw');
select throws_ok($$ insert into public.finance_credit_draws (organization_id, credit_line_id, label,
                                                             amount_cents, drawn_on, installments)
                    values (pg_temp.id_of('org'), pg_temp.id_of('pl'), 'Trop', 400001, current_date, 3) $$,
  'P0001', 'credit_over_limit', 'a draw never exceeds what the line allows');
select is((select count(*)::int from public.finance_lines('upcoming', null, '2030-12-31', 200)
            where line_id = pg_temp.id_of('console')), 0,
  'the spend it pays no longer leaves on its own day');
select is((select coalesce(sum(total_cents), 0)::bigint from public.finance_cash_out() where day = '2030-01-15'),
          0::bigint, 'nor in the totals');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.finance_credit_draws)
          + (select count(*)::int from public.finance_shows)
          + (select count(*)::int from public.finance_engine_settings), 0,
  'a project manager reads no funding, show nor engine');

select * from finish();
rollback;
