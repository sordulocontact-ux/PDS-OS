-- Production of the proto « Projet complet » (lot 5, docs/projet-complet/production.md):
-- « Changer qui produit », « Révoquer » a link (20261019050101), …
-- Run with `supabase test db`.
begin;
select plan(57);


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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('producer', pg_temp.new_user('producer-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('validator', pg_temp.new_user('validator-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director'),
               ('producer', 'project_manager'), ('validator', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');
insert into ids select 'producer_person', person_id from public.accounts where id = pg_temp.id_of('producer');
insert into ids select 'validator_person', person_id from public.accounts where id = pg_temp.id_of('validator');

reset role;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Piégée ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Piégée ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.levers (organization_id, project_id, label, family, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Session acoustique', 'creation_content', 'selected');
insert into ids select 'lever', id from public.levers where project_id = pg_temp.id_of('project');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('lever'), 'Session acoustique');
insert into ids select 'deliverable', id from public.strategy_deliverables where project_id = pg_temp.id_of('project');
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null
   and not exists (select 1 from public.project_stages s
                    where s.project_id = pg_temp.id_of('project') and s.stage_definition_id = d.id);
insert into public.design_versions (organization_id, project_id, deliverable_id, kind, url, status, reviewed_at, reviewed_by)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('deliverable'), 'link',
        'https://frame.example.com/fiche', 'approved', now(), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Thibo ' || (select v from vars where k = 'tag'), array['production_company']);
insert into ids select 'thibo', id from public.network_contacts where name = 'Thibo ' || (select v from vars where k = 'tag');

select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'sheet', public.open_production_sheet(pg_temp.id_of('deliverable'), 'call');


-- 1. « Qui produit ? », then « Changer qui produit » with its reason -------------------------
select lives_ok($$ select public.set_production_organization(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('thibo'), pg_temp.id_of('producer_person'), pg_temp.id_of('validator_person'), null, null) $$,
                'the owner chooses an external production');
reset role;
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Ressac ' || (select v from vars where k = 'tag'), array['production_company']);
insert into ids select 'ressac', id from public.network_contacts where name = 'Ressac ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('thibo'));
select throws_ok($$ select public.change_production_producer(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('ressac'), ' ', true, '{}', '{}') $$,
                 'P0001', 'reason_required', 'a change says why');
select throws_ok($$ select public.change_production_producer(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('thibo'), 'Rien', true, '{}', '{}') $$,
                 'P0001', 'same_producer', 'a change changes something');
reset role;
select pg_temp.act_as(pg_temp.id_of('producer'));
select throws_ok($$ select public.change_production_producer(pg_temp.id_of('sheet'), 'internal', null, 'Moi', false, '{}', '{}') $$,
                 '42501', null, 'only the owner changes who produces');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.change_production_producer(pg_temp.id_of('sheet'), 'external', pg_temp.id_of('ressac'), 'Thibo ne tient plus la date', true, array['Devis (V1 validé)'], array['Budget de référence : 16 400 €']) $$,
                'the owner changes the company with a reason');
select is((select company_contact_id from public.production_sheets where id = pg_temp.id_of('sheet')), pg_temp.id_of('ressac'),
          'the new company produces');
select is((select reason from public.production_organization_changes where sheet_id = pg_temp.id_of('sheet')),
          'Thibo ne tient plus la date', 'the previous choice is kept with its reason');
select ok((select link_revoked from public.production_organization_changes where sheet_id = pg_temp.id_of('sheet')),
          'the previous company''s link was revoked');
reset role;
set local role anon;
select is(public.get_production_link_journey((select v from vars where k = 'token')), null,
          'the revoked link shows nothing');
reset role;

-- 2. « Révoquer » a link on its own --------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token2', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('ressac'));
select lives_ok($$ select public.revoke_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('ressac')) $$,
                'the owner revokes the company''s link');
select throws_ok($$ select public.revoke_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('ressac')) $$,
                 'P0001', 'link_not_found', 'nothing left to revoke');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.production_organization_changes), 1,
          'the team reads the previous choices');
select throws_ok($$ insert into public.production_organization_changes (organization_id, project_id, sheet_id, from_kind, to_kind, reason) values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'internal', 'internal', 'x') $$,
                 '42501', null, 'never written directly');
reset role;

-- 3. A director proposed by the company, retained by PDS --------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token3', public.create_production_provider_link(pg_temp.id_of('sheet'), pg_temp.id_of('ressac'));
reset role;
set local role anon;
select throws_ok($$ select public.propose_production_director_by_link((select v from vars where k = 'token3'), 'Bastien', 'vimeo.com/x', null) $$,
                 '22023', null, 'a showreel is an https link');
select lives_ok($$ select public.propose_production_director_by_link((select v from vars where k = 'token3'), 'Bastien Roy', 'https://vimeo.com/bastien', 'A tourné de nuit') $$,
                'the company proposes a director');
select lives_ok($$ select public.propose_production_director_by_link((select v from vars where k = 'token3'), 'Inès Garnier', 'https://vimeo.com/ines', null) $$,
                'and another one');
select is(jsonb_array_length(public.get_production_link_journey((select v from vars where k = 'token3')) -> 'directorProposals'), 2,
          'the company sees its proposals');
reset role;
select is((select count(*)::int from public.notifications where kind = 'production_director_proposed'
            and recipient_person_id = pg_temp.id_of('manager_person')), 2, 'the owner is told each time');
insert into ids select 'proposal', id from public.production_director_proposals
 where name = 'Bastien Roy' and sheet_id = pg_temp.id_of('sheet');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.retain_production_director(pg_temp.id_of('proposal')) $$,
                 '42501', null, 'only whoever organises retains');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select ok(length(public.retain_production_director(pg_temp.id_of('proposal'))) = 64,
          'retaining gives the director his private link');
reset role;
select is((select c.name from public.production_sheets s join public.network_contacts c on c.id = s.director_contact_id
            where s.id = pg_temp.id_of('sheet')), 'Bastien Roy', 'he holds « Réalisation »');
select is((select status from public.production_director_proposals where name = 'Inès Garnier'
            and sheet_id = pg_temp.id_of('sheet')), 'declined',
          'the other is « Non retenu »');

-- 4. The quote in versions -----------------------------------------------------------------
set local role anon;
select throws_ok($$ select public.deposit_production_quote_by_link((select v from vars where k = 'token3'), '', 1640000, null, 'https://x.example/v1.pdf', null, 1700000) $$,
                 '23514', null, 'the places never cost more than the whole quote');
select lives_ok($$ select public.deposit_production_quote_by_link((select v from vars where k = 'token3'), '', 1640000, null, 'https://x.example/v1.pdf', 'Tout compris', 180000) $$,
                'the company deposits V1 with its places');
reset role;
insert into ids select 'q1', id from public.production_quotes where sheet_id = pg_temp.id_of('sheet') and number = 1;
select pg_temp.act_as(pg_temp.id_of('producer'));
select throws_ok($$ select public.request_production_quote_changes(pg_temp.id_of('q1'), ' ') $$,
                 'P0001', 'reason_required', 'a modification says what');
select lives_ok($$ select public.request_production_quote_changes(pg_temp.id_of('q1'), 'Détailler la régie') $$,
                'the line producer asks for a modification');
reset role;
set local role anon;
select is((public.get_production_link_journey((select v from vars where k = 'token3')) -> 'quotes' -> 0 ->> 'reason'),
          'Détailler la régie', 'the company reads what to change');
select lives_ok($$ select public.deposit_production_quote_by_link((select v from vars where k = 'token3'), '', 1690000, null, 'https://x.example/v2.pdf', null, 180000) $$,
                'and deposits V2');
reset role;
insert into ids select 'q2', id from public.production_quotes where sheet_id = pg_temp.id_of('sheet') and number = 2;
select is((select status from public.production_quotes where id = pg_temp.id_of('q1')), 'replaced', 'V1 is replaced');
select pg_temp.act_as(pg_temp.id_of('producer'));
select lives_ok($$ select public.submit_production_quote(pg_temp.id_of('q2'), '{"amount": true, "delay": true, "scope": true}'::jsonb, null) $$,
                'V2 checked and submitted');
reset role;
select pg_temp.act_as(pg_temp.id_of('validator'));
select lives_ok($$ select public.decide_production_quote(pg_temp.id_of('q2'), true, null) $$, 'V2 validated');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.request_production_quote_revision(pg_temp.id_of('sheet'), 'Régie en plus') $$,
                'a revision is asked on the validated quote');
reset role;
set local role anon;
select lives_ok($$ select public.deposit_production_quote_by_link((select v from vars where k = 'token3'), '', 1720000, null, 'https://x.example/v3.pdf', null, 150000) $$,
                'the company deposits V3');
reset role;
select is((select status from public.production_quotes where id = pg_temp.id_of('q2')), 'approved',
          'V2 stays the active reference meanwhile');

-- 5. The preproduction checklist -------------------------------------------------------------
select is((select count(*)::int from public.production_plan_actions
            where sheet_id = pg_temp.id_of('sheet') and template_key like 'checklist\_%'), 4,
          'the validated quote seeded the company''s checklist');
insert into ids select 'task', id from public.production_plan_actions
 where sheet_id = pg_temp.id_of('sheet') and template_key = 'checklist_gear';
set local role anon;
select lives_ok($$ select public.finish_production_action_by_link((select v from vars where k = 'token3'), pg_temp.id_of('task')) $$,
                'the company marks a task done on its link');
reset role;
select ok((select done_at is not null from public.production_plan_actions where id = pg_temp.id_of('task')),
          'it is done');
select pg_temp.act_as(pg_temp.id_of('manager'));
select ok(public.add_production_checklist_task(pg_temp.id_of('sheet'), 'Réserver 15 figurants', pg_temp.id_of('producer_person'), null, '2026-10-21') is not null,
          'PDS adds its own task');
reset role;
select alike((select origin from public.production_plan_actions where title = 'Réserver 15 figurants'
              and sheet_id = pg_temp.id_of('sheet')), 'Saisie par %', 'it says who wrote it');
insert into ids select 'mine', id from public.production_plan_actions where title = 'Réserver 15 figurants'
   and sheet_id = pg_temp.id_of('sheet');
select ok((select task_id is not null from public.production_plan_actions where id = pg_temp.id_of('mine')),
          'and it is in Travail');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.finish_production_action(pg_temp.id_of('mine')) $$, '42501', null,
                 'only its holder or whoever organises marks it done');
reset role;
select pg_temp.act_as(pg_temp.id_of('producer'));
select lives_ok($$ select public.finish_production_action(pg_temp.id_of('mine')) $$, 'its holder marks it done');
reset role;
select is((select t.status from public.tasks t join public.production_plan_actions a on a.task_id = t.id
            where a.id = pg_temp.id_of('mine')), 'done', 'the task in Travail follows');

-- 6. Replacing the place retained ------------------------------------------------------------
reset role;
insert into public.production_location_options (organization_id, project_id, sheet_id, name, verification, price_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Rooftop', 'verified', 140000),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('sheet'), 'Entrepôt', 'verified', 220000);
insert into ids select 'rooftop', id from public.production_location_options where sheet_id = pg_temp.id_of('sheet') and name = 'Rooftop';
insert into ids select 'entrepot', id from public.production_location_options where sheet_id = pg_temp.id_of('sheet') and name = 'Entrepôt';
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.choose_production_location(pg_temp.id_of('rooftop'), null) $$, 'a place is retained');
select throws_ok($$ select public.replace_production_location(pg_temp.id_of('entrepot'), ' ', '[]', false, false, '{}') $$,
                 'P0001', 'reason_required', 'a replacement says why');
select lives_ok($$ select public.replace_production_location(pg_temp.id_of('entrepot'), 'La copropriété refuse le toit',
                     jsonb_build_array(jsonb_build_object('title', 'Revoir le matériel', 'contact_id', pg_temp.id_of('ressac'))),
                     true, false, '{}') $$,
                'the owner replaces it with a reason and what to review');
reset role;
select is((select status from public.production_location_options where id = pg_temp.id_of('rooftop')), 'replaced',
          'the former place is « Remplacé », kept');
select is((select count(*)::int from public.production_location_decisions where sheet_id = pg_temp.id_of('sheet')), 2,
          'both decisions stay');
select ok((select review and origin like 'Changement de lieu du %' from public.production_plan_actions
            where sheet_id = pg_temp.id_of('sheet') and title = 'Revoir le matériel'),
          'what to review became a task, « À revoir », with its origin');
select ok((select quote_revision_at is not null from public.production_sheets where id = pg_temp.id_of('sheet')),
          'the quote''s revision is asked');

-- 7. The preparation confirmed, forced with a reason, kept --------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'),
                     '[{"key":"place","label":"Lieu retenu","value":"Entrepôt","ok":true},{"key":"crew","label":"Équipe confirmée","value":"Pas encore","ok":false}]'::jsonb, '') $$,
                 'P0001', 'reason_required', 'a line not ready needs a reason');
select lives_ok($$ select public.confirm_production_ready(pg_temp.id_of('sheet'),
                     '[{"key":"place","label":"Lieu retenu","value":"Entrepôt","ok":true},{"key":"crew","label":"Équipe confirmée","value":"Pas encore","ok":false}]'::jsonb, 'Équipe confirmée oralement') $$,
                'the owner confirms anyway, with a reason');
reset role;
select is((select ready_forced_reason from public.production_sheets where id = pg_temp.id_of('sheet')),
          'Équipe confirmée oralement', 'the reason is kept with the frozen synthesis');
set local role anon;
select ok(public.get_production_link_journey((select v from vars where k = 'token3')) ->> 'readyAt' is not null,
          'the company reads that the preparation is validated');
reset role;

-- 8. The rushes' link, after the shoot --------------------------------------------------------
set local role anon;
select throws_ok($$ select public.set_production_rushes_by_link((select v from vars where k = 'token3'), 'https://x.example/rushes') $$,
                 'P0001', 'shoot_not_done', 'no rushes before the shoot');
reset role;
insert into public.production_shoots (sheet_id, organization_id, project_id, state)
values (pg_temp.id_of('sheet'), pg_temp.id_of('org'), pg_temp.id_of('project'), 'done')
on conflict (sheet_id) do update set state = 'done';
set local role anon;
select lives_ok($$ select public.set_production_rushes_by_link((select v from vars where k = 'token3'), 'https://x.example/rushes') $$,
                'the company gives the rushes'' link');
select is(public.get_production_link_journey((select v from vars where k = 'token3')) ->> 'rushesUrl',
          'https://x.example/rushes', 'and reads it back');
reset role;

select * from finish();
rollback;
