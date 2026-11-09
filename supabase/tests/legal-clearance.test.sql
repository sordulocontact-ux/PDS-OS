-- Juridique, branch 05: a generic clearance, from the qualification to the
-- proof (supabase/migrations/20261005006001_legal_clearance.sql). Run with
-- `supabase test db`. Fixture of the ticket (« Humanisme » in « Piégée »,
-- test data only: the authorization, its conditions and proof are SIMULATED).
begin;
select plan(24);

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
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');
insert into ids select 'director_person', person_id from public.accounts
 where id = pg_temp.id_of('director');
insert into ids select 'creative_person', person_id from public.accounts
 where id = pg_temp.id_of('creative');

-- A project owned by the manager, with one title, and another title outside it.
reset role;
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Dioo ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists
 where name = 'Dioo ' || (select v from vars where k = 'tag');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'master', public.create_master(
  pg_temp.id_of('org'), 'Piégée',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'other_master', public.create_master(
  pg_temp.id_of('org'), 'Ailleurs',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
reset role;
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Projet ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Projet ' || (select v from vars where k = 'tag');
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 1);


insert into public.legal_clearances (organization_id, project_id, master_id, element, work, author)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 'topline',
        'Humanisme', 'Fally Ipupa (à vérifier)'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('master'), 'interpolation',
        'Für Elise', 'Beethoven');
insert into ids select 'humanisme', id from public.legal_clearances
 where project_id = pg_temp.id_of('project') and work = 'Humanisme';
insert into ids select 'elise', id from public.legal_clearances
 where project_id = pg_temp.id_of('project') and work = 'Für Elise';
-- The plan's « Obtenir l'accord » and its task.
insert into public.legal_plans (organization_id, project_id, status, launched_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'active', now());
insert into public.legal_plan_items (organization_id, plan_id, project_id, item_key, kind, label,
                                     status, responsible_person_id)
select pg_temp.id_of('org'), id, pg_temp.id_of('project'), 'clearance:' || pg_temp.id_of('humanisme'),
       'clearance', 'Accord Humanisme', 'action_now', pg_temp.id_of('manager_person')
  from public.legal_plans where project_id = pg_temp.id_of('project');
select public.legal_plan_item_task((select id from public.legal_plan_items
                                     where project_id = pg_temp.id_of('project')));

create function pg_temp.advance(p_id uuid, p_status text, p_note text default null) returns text
language plpgsql as $$
begin
  perform public.advance_clearance(p_id, p_status, p_note);
  return (select status from public.legal_clearances where id = p_id);
end $$;

-- Qualification -----------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select pg_temp.advance(%L, 'rightsholders_identified') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'nothing moves before the usage is qualified');
select throws_ok(format($$ select public.qualify_clearance(%L, 'Topline', 'none', null, null) $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_reason_required', 'nothing to secure says why');
select public.qualify_clearance(pg_temp.id_of('humanisme'), 'Reprise de la topline de « Humanisme »', 'work',
                                null, pg_temp.id_of('manager_person'));
select throws_ok(format($$ select pg_temp.advance(%L, 'rightsholders_identified') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'the rights holders of each concerned right come first');
select public.add_clearance_rightsholder(pg_temp.id_of('humanisme'), 'work', 'Éditeur de Fally Ipupa (à vérifier)',
                                         'publisher', null);
select is(pg_temp.advance(pg_temp.id_of('humanisme'), 'rightsholders_identified'), 'rightsholders_identified',
          'rights holders identified');

-- Contact found is not an authorization ------------------------------------------------
select throws_ok(format($$ select pg_temp.advance(%L, 'contacted') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'contacted needs an outgoing exchange in the journal');
select public.log_clearance_communication(pg_temp.id_of('humanisme'), 'email', 'out',
                                          'Demande d''autorisation envoyée à l''éditeur (SIMULÉ).', null);
select is(pg_temp.advance(pg_temp.id_of('humanisme'), 'contacted'), 'contacted', 'contacted');
select throws_ok(format($$ select pg_temp.advance(%L, 'cleared') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'a contact found never produces CLEARED');

-- Conditions stay proposed until PDS validates them ---------------------------------------
insert into ids select 'terms', public.propose_clearance_terms(pg_temp.id_of('humanisme'),
  '{"right": "work", "amount_cents": 50000, "share": "10 %"}'::jsonb, null);
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('director_person')
              and kind = 'clearance_terms_proposed'
              and subject_id = pg_temp.id_of('humanisme')), 1,
          'the direction is told the conditions wait for it');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select pg_temp.advance(%L, 'agreement_reached') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'an agreement needs validated conditions');
select throws_ok(format($$ select public.decide_clearance_terms(%L, true) $$, pg_temp.id_of('terms')),
                 '42501', 'clearance_terms_not_allowed', 'a project manager does not validate the conditions');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_clearance_terms(pg_temp.id_of('terms'), true);
reset role;
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('manager_person')
              and kind = 'clearance_terms_validated'
              and subject_id = pg_temp.id_of('humanisme')), 1,
          'the responsible is told the conditions are validated');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is(pg_temp.advance(pg_temp.id_of('humanisme'), 'agreement_reached'), 'agreement_reached',
          'agreement reached on validated conditions');

-- Document, signature, proof -----------------------------------------------------------------
reset role;
insert into public.contracts (organization_id, title, type, project_id, owner_person_id)
values (pg_temp.id_of('org'), 'Autorisation Humanisme', 'license', pg_temp.id_of('project'),
        pg_temp.id_of('manager_person'));
insert into ids select 'contract', id from public.contracts where title = 'Autorisation Humanisme'
   and project_id = pg_temp.id_of('project');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select pg_temp.advance(%L, 'document_pending') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'a document is pending once a contract carries the right');
select public.link_clearance_contract(pg_temp.id_of('humanisme'), 'work', pg_temp.id_of('contract'));
select is(pg_temp.advance(pg_temp.id_of('humanisme'), 'document_pending'), 'document_pending', 'document pending');
-- The contract of validated conditions is approved by the direction, never
-- submitted in its owner's name (20261109120101).
select throws_ok(format($$ select public.approve_clearance_contract(%L) $$, pg_temp.id_of('contract')),
                 '42501', 'contract_not_allowed', 'a project manager does not approve the contract');
select pg_temp.act_as(pg_temp.id_of('director'));
select public.approve_clearance_contract(pg_temp.id_of('contract'));
reset role;
select is((select status from public.contracts where id = pg_temp.id_of('contract')), 'approved',
          'validated conditions make the contract ready to send');
select is((select count(*)::int from public.notifications
            where recipient_person_id = pg_temp.id_of('manager_person')
              and kind = 'contract_approved' and subject_id = pg_temp.id_of('contract')), 1,
          'its owner is told it can be sent');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ select pg_temp.advance(%L, 'signed') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'signed needs the contract signed');
reset role;
update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('contract');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is(pg_temp.advance(pg_temp.id_of('humanisme'), 'signed'), 'signed', 'signed');
select throws_ok(format($$ select pg_temp.advance(%L, 'cleared') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_missing', 'CLEARED needs the signed copy and its proof');
reset role;
insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
select pg_temp.id_of('org'), pg_temp.id_of('contract'), c,
       pg_temp.id_of('org') || '/' || pg_temp.id_of('contract') || '/' || gen_random_uuid() || '.pdf',
       c || '.pdf', 'application/pdf', 1000
  from unnest(array['signed', 'evidence']) c;
select pg_temp.act_as(pg_temp.id_of('manager'));
select is(pg_temp.advance(pg_temp.id_of('humanisme'), 'cleared'), 'cleared', 'cleared with its proof');
reset role;
select is((select t.status from public.tasks t join public.legal_plan_items i on i.id = t.legal_plan_item_id
            where i.project_id = pg_temp.id_of('project')), 'done', 'the plan''s task is ticked');

-- Nothing to secure, a refusal ---------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select public.qualify_clearance(pg_temp.id_of('elise'), 'Mélodie de « Für Elise » rejouée en studio', 'none',
  'Composition dans le domaine public (Beethoven, mort en 1827) et aucun enregistrement existant repris (à confirmer par le juridique).', null);
select is(pg_temp.advance(pg_temp.id_of('elise'), 'cleared'), 'cleared', 'nothing to secure is cleared with its reason');
select throws_ok(format($$ select pg_temp.advance(%L, 'refused') $$, pg_temp.id_of('humanisme')),
                 'P0001', 'clearance_closed', 'a cleared clearance is closed');

select * from finish();
rollback;
