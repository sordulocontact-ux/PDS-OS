-- The week's summary of Finance (supabase/migrations/20261115770101_finance_briefs.sql):
-- whoever reads Finance writes today's wording once per set of figures and
-- reads it; nobody else reads or writes it; nothing is changed or deleted
-- by a client. Run with `supabase test db`.
begin;
select plan(11);

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
insert into ids select r.name, pg_temp.new_user('fb-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.print(p_seed text) returns text language sql as $$
  select encode(sha256(convert_to(p_seed || (select v from vars where k = 'tag'), 'utf8')), 'hex') $$;
grant execute on function pg_temp.print(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('thibault'));
select lives_ok($$
  insert into public.finance_briefs (organization_id, day, fingerprint, slots, text, model)
  values (pg_temp.id_of('org'), (now() at time zone 'Europe/Paris')::date, pg_temp.print('a'),
          '[{"key":"week","sentence":"Cette semaine : 1 200 € encaissés, 300 € payés.","figures":["1 200 €","300 €"]}]',
          'Cette semaine, 1 200 € sont entrés et 300 € sont sortis.', 'test') $$,
  'whoever reads Finance keeps today''s wording');
select is((select count(*)::int from public.finance_briefs where fingerprint = pg_temp.print('a')), 1,
  'and reads it back');
select is((select created_by from public.finance_briefs where fingerprint = pg_temp.print('a')),
  public.auth_person_id(), 'written under the member''s own name');
select throws_ok($$
  insert into public.finance_briefs (organization_id, day, fingerprint, slots, text)
  values (pg_temp.id_of('org'), (now() at time zone 'Europe/Paris')::date, pg_temp.print('a'),
          '[]', 'Une autre phrase pour les mêmes chiffres.') $$,
  '23505', null, 'one wording per set of figures and day');
select throws_ok($$
  insert into public.finance_briefs (organization_id, day, fingerprint, slots, text)
  values (pg_temp.id_of('org'), (now() at time zone 'Europe/Paris')::date - 1, pg_temp.print('b'),
          '[]', 'Une phrase datée d''hier.') $$,
  '42501', null, 'only today''s');

select throws_ok($$ update public.finance_briefs set text = 'Réécrite.' where fingerprint = pg_temp.print('a') $$,
  '42501', null, 'no client changes it');
select throws_ok($$ delete from public.finance_briefs where fingerprint = pg_temp.print('a') $$,
  '42501', null, 'no client deletes it');
select is((select text from public.finance_briefs where fingerprint = pg_temp.print('a')),
  'Cette semaine, 1 200 € sont entrés et 300 € sont sortis.',
  'never changed nor deleted by a client');

select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select count(*)::int from public.finance_briefs where fingerprint = pg_temp.print('a')), 0,
  'whoever does not read Finance does not read it');
select throws_ok($$
  insert into public.finance_briefs (organization_id, day, fingerprint, slots, text)
  values (pg_temp.id_of('org'), (now() at time zone 'Europe/Paris')::date, pg_temp.print('c'),
          '[]', 'Une phrase écrite sans lire la Finance.') $$,
  '42501', null, 'nor writes it');

select pg_temp.act_as(pg_temp.id_of('thibault'));
select throws_ok($$
  insert into public.finance_briefs (organization_id, day, fingerprint, slots, text)
  values (pg_temp.id_of('org'), (now() at time zone 'Europe/Paris')::date, 'pas une empreinte',
          '[]', 'Une phrase sans empreinte valable.') $$,
  '23514', null, 'the fingerprint is a sha256');

select * from finish();
rollback;
