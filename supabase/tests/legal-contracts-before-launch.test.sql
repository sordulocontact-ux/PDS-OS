-- Juridique, lot 9 J3 (supabase/migrations/20261019090101_legal_contracts_before_launch.sql):
-- « Pas d'accord nécessaire » needs its reason, kept and readable by the
-- Juridique only; a démarche handed over or moved keeps its reason.
begin;
select plan(13);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Sami ' || (select v from vars where k = 'tag'),
        array['songwriter']);
insert into ids select 'sami', id from public.network_contacts
 where name = 'Sami ' || (select v from vars where k = 'tag');

-- « Pas d'accord nécessaire » -------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.approve_contract_mapping(%L, %L::jsonb) $$,
  pg_temp.id_of('project'),
  jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('sami'), 'needed', false))),
  'P0001', 'mapping_reason_required', 'no agreement is said with its reason');
select throws_ok(format($$ select public.approve_contract_mapping(%L, %L::jsonb) $$,
  pg_temp.id_of('project'),
  jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('sami'), 'needed', false,
                                       'reason', '   '))),
  'P0001', 'mapping_reason_required', 'a blank reason is no reason');
select throws_ok(format($$ select public.approve_contract_mapping(%L, %L::jsonb) $$,
  pg_temp.id_of('project'),
  jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('sami'), 'needed', false,
                                       'reason', 'Déjà payé.'))),
  'P0001', 'mapping_reason_only_paid', 'a payment alone assigns no right (JUR-12), in SQL too');
select throws_ok(format($$ select public.approve_contract_mapping(%L, %L::jsonb) $$,
  pg_temp.id_of('project'),
  jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('sami'), 'needed', false,
                                       'reason', 'Pas de contrat, déjà réglé.'))),
  'P0001', 'mapping_reason_only_paid', '« pas de contrat » names no agreement');
select lives_ok(format($$ select public.approve_contract_mapping(%L, %L::jsonb) $$,
  pg_temp.id_of('project'),
  jsonb_build_array(jsonb_build_object('contact_id', pg_temp.id_of('sami'), 'needed', false,
                                       'reason', 'Il cède ses droits par son contrat d''artiste.'))),
  'no agreement, with its reason');
select is((select reason from public.legal_no_agreement_reasons
            where project_id = pg_temp.id_of('project')),
          'Il cède ses droits par son contrat d''artiste.', 'the reason is kept');
select is((select decided_by from public.legal_no_agreement_reasons
            where project_id = pg_temp.id_of('project')),
          pg_temp.id_of('manager_person'), 'with who decided it');
select throws_ok($$ insert into public.legal_no_agreement_reasons
    (organization_id, project_id, contact_id, reason, decided_by)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sami'), 'x',
          pg_temp.id_of('manager_person')) $$,
  '42501', null, 'nobody writes a reason but the mapping');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.legal_no_agreement_reasons
            where project_id = pg_temp.id_of('project')),
          0, 'only the Juridique reads it');

select pg_temp.act_as(pg_temp.id_of('manager'));
select public.approve_contract_mapping(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('contact_id', pg_temp.id_of('sami'), 'needed', true,
                     'roles', jsonb_build_array('composer'), 'contract_type', 'publishing')));
select is((select count(*)::int from public.legal_no_agreement_reasons
            where project_id = pg_temp.id_of('project')),
          0, 'an agreement needed again drops the reason');

-- A démarche handed over, with its reason ------------------------------------------------------
select public.record_legal_answer(
  pg_temp.id_of('project'), 'agreements', null, 'Aucun accord.',
  '[{"kind": "none", "value": {}, "quote": "Aucun accord"}]'::jsonb);
select public.confirm_legal_intake(pg_temp.id_of('project'));
select public.launch_legal_plan(pg_temp.id_of('project'), jsonb_build_array(
  jsonb_build_object('key', 'onboarding', 'kind', 'onboarding', 'label', 'Fiches',
    'status', 'action_now', 'depends_on', '[]'::jsonb,
    'responsible_person_id', pg_temp.id_of('manager_person'))));
insert into ids select 'item', id from public.legal_plan_items
 where project_id = pg_temp.id_of('project') and item_key = 'onboarding';

select throws_ok($$ select public.change_legal_plan_item(pg_temp.id_of('item'),
    pg_temp.id_of('manager_person'), '2026-11-05', '') $$,
  'P0001', 'legal_plan_reason_required', 'a change says why');
select public.change_legal_plan_item(pg_temp.id_of('item'), pg_temp.id_of('manager_person'),
  '2026-11-05', 'La sortie a été décalée.');
select is((select reason from public.legal_plan_events
            where item_id = pg_temp.id_of('item') and kind = 'due_changed'),
          'La sortie a été décalée.', 'the reason stays in the plan''s journal');
select is((select due_on from public.legal_plan_items where id = pg_temp.id_of('item')),
          '2026-11-05'::date, 'the due date moved');

select * from finish();
rollback;
