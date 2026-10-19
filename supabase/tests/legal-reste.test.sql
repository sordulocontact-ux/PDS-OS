-- Juridique, « le reste » (supabase/migrations/20261020030101 and after): a template asked of
-- the direction in the Plan d'action, a clause revised in the person's step.
begin;
select plan(12);

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
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Néons ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Néons ' || (select v from vars where k = 'tag');

-- 1. A template asked of the direction from « Contrats à prévoir » --------------------------------
select pg_temp.act_as(pg_temp.id_of('other'));
insert into ids select 'foreign', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Modèle autre', 'service', array['musician'], null, 'Texte');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'tpl', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Contrat musicien', 'service', array['musician'], null, 'Texte du modèle');
select throws_ok(format($$ select public.request_contract_template(%L, %L, 'c-1', 'Yanis Morel') $$,
                        pg_temp.id_of('foreign'), pg_temp.id_of('project')),
                 '42501', null, 'only its author asks for a template');
select lives_ok(format($$ select public.request_contract_template(%L, %L, 'c-1', 'Yanis Morel') $$,
                       pg_temp.id_of('tpl'), pg_temp.id_of('project')),
                'its author asks the direction, for a person of the project');
select throws_ok(format($$ select public.request_contract_template(%L, %L, 'c-1', 'Yanis Morel') $$,
                        pg_temp.id_of('tpl'), pg_temp.id_of('project')),
                 'P0001', 'template_wrong_status', 'once');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('director_person')
              and kind = 'legal_template_to_validate' and subject_id = pg_temp.id_of('tpl')),
          1, 'the direction is told');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.set_contract_template_status(pg_temp.id_of('tpl'), 'retired', 'Durée trop longue.');
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('manager_person')
              and kind = 'legal_template_refused' and subject_id = pg_temp.id_of('tpl')),
          1, 'its author is told of the refusal');
select is((select requested_for from public.contract_templates where id = pg_temp.id_of('tpl')),
          'Yanis Morel', 'the person it was made for is kept');

-- 2. A clause revised: a new version that says which clause ---------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'tpl2', public.create_contract_template(
  pg_temp.id_of('org'), null, 'Contrat compositeur', 'publishing', array['composer'], null, 'Texte');
reset role;
update public.contract_templates set status = 'validated', validated_at = now()
 where id = pg_temp.id_of('tpl2');
insert into public.contracts (organization_id, title, type, status, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Cession ' || (select v from vars where k = 'tag'), 'publishing',
        'draft', pg_temp.id_of('project'), pg_temp.id_of('manager_person'));
insert into ids select 'contract', id from public.contracts
 where title = 'Cession ' || (select v from vars where k = 'tag');
insert into public.contract_documents
  (organization_id, contract_id, version, template_id, template_version, body)
values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 1, pg_temp.id_of('tpl2'), 1,
        E'Article 1. Objet.\nArticle 2. Crédit : « Sami ».');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select public.revise_contract_clause(%L, 'loyalty', 'x', 'Pourquoi') $$,
                        pg_temp.id_of('contract')),
                 '23514', null, 'an unknown clause is refused');
select throws_ok(format($$ select public.revise_contract_clause(%L, 'credit', %L, '') $$,
                        pg_temp.id_of('contract'), E'Article 1. Objet.\nArticle 2. Crédit : « co-composé par Sami ».'),
                 'P0001', 'contract_comment_required', 'a revision says why');
select lives_ok(format($$ select public.revise_contract_clause(%L, 'credit', %L, 'Demande de la direction.') $$,
                       pg_temp.id_of('contract'), E'Article 1. Objet.\nArticle 2. Crédit : « co-composé par Sami ».'),
                'the clause is revised');
reset role;
select is((select clause || ' · v' || version from public.contract_documents
            where contract_id = pg_temp.id_of('contract') order by version desc limit 1),
          'credit · v2', 'the new version names its clause');
select is((select comment from public.contract_documents
            where contract_id = pg_temp.id_of('contract') and version = 2),
          'Demande de la direction.', 'and why');
select throws_ok(format($$ update public.contract_documents set clause = 'credit'
                            where contract_id = %L and version = 1 $$, pg_temp.id_of('contract')),
                 '23514', null, 'the first version changes no clause');

select * from finish();
rollback;
