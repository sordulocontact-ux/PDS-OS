-- Business module (20261122140101): the deal's long contract generated from a validated
-- template, its fields from the deal, checked by a person; the deal's contract at once.
-- Run with `supabase test db`.
begin;
select plan(8);

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
grant all on ids to authenticated, service_role;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, service_role;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('glen'), ('other_pm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('glen', 'business_manager'),
               ('other_pm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'glen', 'other_pm');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, service_role;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated, service_role;
create function pg_temp.memo(p integer) returns uuid language sql as $$
  select id from public.deal_memos where deal_id = pg_temp.id_of('deal') and number = p $$;
grant execute on function pg_temp.memo(integer) to authenticated, service_role;
create function pg_temp.told(p_who text, p_kind text) returns integer language sql as $$
  select count(*)::int from public.notifications
   where recipient_person_id = pg_temp.id_of(p_who || '_person') and kind = p_kind
     and subject_id = pg_temp.id_of('deal') $$;
create function pg_temp.files(p text) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'path', pg_temp.id_of('org')::text || '/' || pg_temp.id_of('deal')::text || '/' || p || '.pdf',
    'name', 'Deal memo Jay.pdf', 'size', 1200)) $$;
grant execute on function pg_temp.files(text) to service_role;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Jay ' || pg_temp.tag(), 'collaboration');
insert into ids select 'jay', id from public.artists where name = 'Jay ' || pg_temp.tag();
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Eben ' || pg_temp.tag(), array[]::text[]);
insert into ids select 'eben', id from public.network_contacts where name = 'Eben ' || pg_temp.tag();

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'deal', public.create_deal(
  p_artist_id => pg_temp.id_of('jay'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;

-- A validated template whose fields are a deal's.
insert into public.contract_templates (organization_id, series_id, version, name, type, roles, body, fields, status, validated_at)
select pg_temp.id_of('org'), gen_random_uuid(), 1, 'Licence ' || pg_temp.tag(), 'license', array['label'],
       'Durée : {{deal.duration}}. Royalties : {{deal.royalties}}.', array['deal.duration', 'deal.royalties'], 'validated', now();
insert into ids select 'template', id from public.contract_templates where name = 'Licence ' || pg_temp.tag();
insert into public.contract_templates (organization_id, series_id, version, name, type, roles, body, fields, status)
select pg_temp.id_of('org'), gen_random_uuid(), 1, 'Brouillon ' || pg_temp.tag(), 'license', array['label'],
       'x {{deal.duration}}', array['deal.duration'], 'draft';
insert into ids select 'draft_template', id from public.contract_templates where name = 'Brouillon ' || pg_temp.tag();
create function pg_temp.fields() returns jsonb language sql as $$
  select '{"deal.duration": {"value": "7 ans", "source": "Deal memo n°1"},
           "deal.royalties": {"value": "30 %", "source": "Deal memo n°1"}}'::jsonb $$;
grant execute on function pg_temp.fields() to authenticated;

select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.generate_deal_contract(pg_temp.id_of('deal'), pg_temp.id_of('template'), pg_temp.fields()) $$,
  'P0001', 'agreement_not_validated', 'no contract before the accord is validated');
reset role;
update public.deals set stage = 'contracting', agreement_status = 'validated' where id = pg_temp.id_of('deal');

select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ select public.generate_deal_contract(pg_temp.id_of('deal'), pg_temp.id_of('template'), pg_temp.fields()) $$,
  'P0002', null, 'whoever does not write the deal generates nothing');
reset role;

select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.generate_deal_contract(pg_temp.id_of('deal'), pg_temp.id_of('draft_template'), pg_temp.fields()) $$,
  'P0001', 'template_not_validated', 'a validated template only');
select throws_ok($$ select public.generate_deal_contract(pg_temp.id_of('deal'), pg_temp.id_of('template'),
    '{"deal.duration": {"value": "7 ans"}}'::jsonb) $$,
  'P0001', 'contract_fields_missing', 'every field filled');
insert into ids select 'contract', public.generate_deal_contract(pg_temp.id_of('deal'), pg_temp.id_of('template'), pg_temp.fields());
select throws_ok($$ select public.generate_deal_contract(pg_temp.id_of('deal'), pg_temp.id_of('template'), pg_temp.fields()) $$,
  'P0001', 'deal_contract_generated', 'once');
reset role;

select is((select contract_id from public.deals where id = pg_temp.id_of('deal')), pg_temp.id_of('contract'),
  'the generated contract is the deal''s at once');
select is((select body from public.contract_documents where contract_id = pg_temp.id_of('contract')),
  'Durée : 7 ans. Royalties : 30 %.', 'its document, the fields filled');
select is((select owner_person_id || '/' || status from public.contracts where id = pg_temp.id_of('contract')),
  pg_temp.id_of('glen_person') || '/draft', 'a draft, followed by whoever generated it');

select * from finish();
rollback;
