-- Finance on the home page (supabase/migrations/20261115100101_finance_home_alerts.sql):
-- finance_urgent_count() counts an envelope over its amount for whoever reads
-- Finance, and gives 0 to anyone else. Run with `supabase test db`.
begin;
select plan(3);

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
insert into ids select r.name, pg_temp.new_user('fh-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('thibault'));
insert into vars select 'before', public.finance_urgent_count()::text;
insert into public.finance_cost_centers (organization_id, name, budget_cents)
values (pg_temp.id_of('org'), 'PDS MIC #7 ' || (select v from vars where k = 'tag'), 100000);
insert into public.budget_lines (organization_id, cost_center_id, label, amount_cents, family, status, spent_on)
select pg_temp.id_of('org'), id, 'Plateau', 150000, 'studio', 'committed', '2026-12-01'
  from public.finance_cost_centers where name = 'PDS MIC #7 ' || (select v from vars where k = 'tag');
select is(public.finance_urgent_count(), (select v::int + 1 from vars where k = 'before'),
  'a cost center over its amount counts as an urgent alert');

update public.budget_lines set status = 'planned'
 where label = 'Plateau' and cost_center_id = (select id from public.finance_cost_centers
                                                 where name = 'PDS MIC #7 ' || (select v from vars where k = 'tag'));
select is(public.finance_urgent_count(), (select v::int from vars where k = 'before'),
  'a planned line does not make it over');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is(public.finance_urgent_count(), 0, 'whoever does not read Finance counts none');

select * from finish();
rollback;
