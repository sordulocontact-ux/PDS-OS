-- Contract templates and contracts validated by the business manager, templates in a
-- language (20261120130101_contract_templates_business.sql, Ibé's meeting of 18/11/2026).
-- Run with `supabase test db`.
begin;
select plan(19);

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
insert into ids select r.name, pg_temp.new_user('ctb-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('bm'), ('manager'), ('biz')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('bm', 'business_manager'),
               ('manager', 'project_manager'), ('biz', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select r.name || '_person', a.person_id from public.accounts a
  join ids r on r.id = a.id where r.name in ('director', 'bm', 'manager');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- The permission, by position.
select ok('validate_contracts' = any (public.role_permissions('business_manager'))
          and 'validate_contracts' = any (public.role_permissions('general_director')),
  'the business manager and the director validate contracts');
select ok(not ('validate_contracts' = any (public.role_permissions('project_manager')))
          and not ('validate_contracts' = any (public.role_permissions('business'))),
  'neither a project manager nor « business » does');
select ok(not ('validate' = any (public.role_permissions('business_manager'))),
  'the business manager does not get the director''s general « validate »');

-- A template has a language.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'fr_tpl', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Cession FR', 'publishing', array['composer'], null, 'Texte FR');
insert into ids select 'en_tpl', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Assignment EN', 'publishing', array['composer'], null, 'Text EN',
  null, null, 'en');
insert into ids select 'refused_tpl', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Cession à refuser', 'publishing', array['composer'], null, 'Texte');
select is((select language from public.contract_templates where id = pg_temp.id_of('fr_tpl')),
  'fr', 'French by default');
select is((select language from public.contract_templates where id = pg_temp.id_of('en_tpl')),
  'en', 'an English template keeps its language');
select throws_ok($$ select public.create_contract_template(
  pg_temp.id_of('org'), null, 'X', 'publishing', array['composer'], null, 'X', null, null, 'de') $$,
  '23514', null, 'only French or English');
select throws_ok(format($$ select public.set_contract_template_status(%L, 'validated') $$,
                        pg_temp.id_of('fr_tpl')),
  '42501', null, 'a project manager does not validate a template');

-- The business manager reads, validates and refuses templates.
reset role;
select pg_temp.act_as(pg_temp.id_of('bm'));
select is((select count(*)::int from public.contract_templates
            where id in (pg_temp.id_of('fr_tpl'), pg_temp.id_of('en_tpl'))),
  2, 'the business manager reads the templates');
select lives_ok(format($$ select public.set_contract_template_status(%L, 'validated') $$,
                       pg_temp.id_of('en_tpl')), 'the business manager validates a template');
select lives_ok(format($$ select public.set_contract_template_status(%L, 'retired', 'Clause 3 floue') $$,
                       pg_temp.id_of('refused_tpl')), 'and refuses one with its reason');
select throws_ok(format($$ select public.set_contract_template_status(%L, 'retired') $$,
                        pg_temp.id_of('en_tpl')),
  '42501', null, 'retiring a validated template stays the library''s (manage_legal)');
select throws_ok($$ select public.create_contract_template(
  pg_temp.id_of('org'), null, 'X', 'publishing', array['composer'], null, 'X') $$,
  '42501', null, 'the business manager does not write templates');

-- « Business » validates nothing.
reset role;
select pg_temp.act_as(pg_temp.id_of('biz'));
select throws_ok(format($$ select public.set_contract_template_status(%L, 'validated') $$,
                        pg_temp.id_of('fr_tpl')),
  'P0001', 'template_not_found', '« business » neither reads nor validates templates');

-- A contract submitted: the business manager is asked, and approves it.
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.contracts (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Cession ' || (select v from vars where k = 'tag'), 'publishing',
        pg_temp.id_of('manager_person'));
insert into ids select 'contract', id from public.contracts
 where title = 'Cession ' || (select v from vars where k = 'tag');
select public.advance_contract(pg_temp.id_of('contract'), 'submit');
reset role;
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('contract') and kind = 'contract_review_requested'
              and recipient_person_id in (pg_temp.id_of('bm_person'), pg_temp.id_of('director_person'))),
  2, 'the business manager is asked, the director too (she supervises)');
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('contract') and kind = 'contract_review_requested'
              and recipient_person_id = pg_temp.id_of('manager_person')),
  0, 'not its owner');

select pg_temp.act_as(pg_temp.id_of('bm'));
select is((select count(*)::int from public.contracts where id = pg_temp.id_of('contract')),
  1, 'the business manager sees the contract to validate');
select lives_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'approve', 'OK') $$,
  'the business manager approves it');
select throws_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'countersign') $$,
  '42501', null, 'signing for PDS stays the direction''s');

reset role;
select pg_temp.act_as(pg_temp.id_of('biz'));
select is((select count(*)::int from public.contracts where id = pg_temp.id_of('contract')),
  0, '« business » does not see it');

select * from finish();
rollback;
