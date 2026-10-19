-- Blockers and noted information of a step (sub-lot C6;
-- supabase/migrations/20261018400201_step_blockers_notes.sql).
-- Run with `supabase test db`.
begin;
select plan(27);

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
  ('manager', pg_temp.new_user('sb-manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('sb-creative-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('outsider', pg_temp.new_user('sb-outsider-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director'),
               ('outsider', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'creative_person', person_id from public.accounts where id = pg_temp.id_of('creative');

insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Blocages ' || (select v from vars where k = 'tag'), 'content',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects
 where title = 'Blocages ' || (select v from vars where k = 'tag');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Mairie ' || (select v from vars where k = 'tag'), array['other']);
insert into ids select 'mairie', id from public.network_contacts where name = 'Mairie ' || (select v from vars where k = 'tag');

-- 1. Not before the launch, not outside the project --------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.report_step_blocker(pg_temp.id_of('project'), 'production', 'locs', null, 'Pas de lieu', null, null, 'La mairie', 'Relancer') $$,
                 '42501', null, 'nothing is reported before the launch');
reset role;
insert into public.project_stages (organization_id, project_id, stage_definition_id)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id from public.stage_definitions d
 where d.organization_id = pg_temp.id_of('org') and d.archived_at is null;
select pg_temp.act_as(pg_temp.id_of('outsider'));
select throws_ok($$ select public.report_step_blocker(pg_temp.id_of('project'), 'production', 'locs', null, 'Pas de lieu', null, null, 'La mairie', 'Relancer') $$,
                 '42501', null, 'a member who does not see the project reports nothing');
select throws_ok($$ insert into public.step_blockers (organization_id, project_id, module, step_key, description, unblocker_name, next_action, reported_by)
                    values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'production', 'locs', 'x', 'y', 'z', pg_temp.id_of('creative_person')) $$,
                 '42501', null, 'the table is never written directly');

-- 2. A blocker: reported by the team, told, lifted with its explanation -----------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.report_step_blocker(pg_temp.id_of('project'), 'production', 'locs', null, 'Pas de lieu', null, null, null, 'Relancer') $$,
                 'P0001', 'unblocker_required', 'someone unblocks');
select throws_ok($$ select public.report_step_blocker(pg_temp.id_of('project'), 'production', 'locs', null, '  ', null, null, 'La mairie', 'Relancer') $$,
                 'P0001', 'invalid_input', 'what blocks is said');
insert into ids select 'b1', public.report_step_blocker(pg_temp.id_of('project'), 'production', 'locs', null,
  'Autorisation de stationnement pas arrivée', null, pg_temp.id_of('mairie'), null, 'Relancer la mairie');
insert into ids select 'b2', public.report_step_blocker(pg_temp.id_of('project'), 'master', 'mix', null,
  'Stems manquants', pg_temp.id_of('manager_person'), null, null, 'Demander les stems');
reset role;
select is((select unblocker_name from public.step_blockers where id = pg_temp.id_of('b1')),
          'Mairie ' || (select v from vars where k = 'tag'), 'the contact who unblocks is named');
select is((select reported_by from public.step_blockers where id = pg_temp.id_of('b1')),
          pg_temp.id_of('creative_person'), 'the reporter is the session');
select is((select count(*)::int from public.notifications where kind = 'step_blocker_reported'
            and subject_id = pg_temp.id_of('b1') and recipient_person_id = pg_temp.id_of('manager_person')), 1,
          'the owner is told of a blocker');
select is((select count(*)::int from public.notifications where kind = 'step_blocker_reported'
            and subject_id = pg_temp.id_of('b2')), 1,
          'the member who unblocks is told once, even when also the owner');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.step_blockers where project_id = pg_temp.id_of('project')), 2,
          'the team reads the blockers');
select throws_ok($$ select public.lift_step_blocker(pg_temp.id_of('b1'), 'Reçue') $$,
                 '42501', null, 'the reporter does not lift a blocker that is not theirs to unblock');
reset role;
select pg_temp.act_as(pg_temp.id_of('outsider'));
select is((select count(*)::int from public.step_blockers where project_id = pg_temp.id_of('project')), 0,
          'nobody outside the project reads them');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok($$ select public.lift_step_blocker(pg_temp.id_of('b1'), ' ') $$,
                 'P0001', 'lift_note_required', 'lifting needs what solved it');
select lives_ok($$ select public.lift_step_blocker(pg_temp.id_of('b1'), 'Autorisation reçue le 22/10') $$,
                'the owner lifts it with its explanation');
select throws_ok($$ select public.lift_step_blocker(pg_temp.id_of('b1'), 'Encore') $$,
                 'P0001', 'blocker_lifted', 'a lifted blocker stays lifted');
reset role;
select is((select count(*)::int from public.notifications where kind = 'step_blocker_lifted'
            and subject_id = pg_temp.id_of('b1') and recipient_person_id = pg_temp.id_of('creative_person')), 1,
          'the reporter is told it is lifted');

-- 3. Noted information, contradictions, decisions --------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
insert into ids select 'n1', public.note_step_information(pg_temp.id_of('project'), 'production', 'shoot', null,
  'Mona Lys disponible jusqu''à 15 h le 23/10', 'call', 'to_confirm', null);
insert into ids select 'n2', public.note_step_information(pg_temp.id_of('project'), 'production', 'shoot', null,
  'Mona Lys disponible toute la journée du 23/10', 'whatsapp', 'information', pg_temp.id_of('n1'));
select throws_ok($$ select public.note_step_information(pg_temp.id_of('project'), 'production', 'shoot', null, 'x', 'pigeon', 'information', null) $$,
                 '23514', null, 'the source is one of the list');
select throws_ok($$ select public.decide_step_note(pg_temp.id_of('n1'), 'decide') $$,
                 '42501', null, 'only the owner decides');
reset role;
select is((select count(distinct contradiction_group)::int from public.step_notes
            where id in (pg_temp.id_of('n1'), pg_temp.id_of('n2'))), 1,
          'two contradicting notes share their group');
select is((select count(*)::int from public.notifications where kind = 'step_note_to_decide'
            and recipient_person_id = pg_temp.id_of('manager_person')
            and subject_id in (pg_temp.id_of('n1'), pg_temp.id_of('n2'))), 2,
          'the owner is told of a note to confirm and of a contradiction');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ select public.decide_step_note(pg_temp.id_of('n2'), 'authoritative') $$,
                'the owner chooses what is authoritative');
reset role;
select ok((select authoritative and status = 'decided' from public.step_notes where id = pg_temp.id_of('n2')),
          'the chosen one is decided and authoritative');
select is((select replaced_by_id from public.step_notes where id = pg_temp.id_of('n1') and discarded_at is not null),
          pg_temp.id_of('n2'), 'the other is discarded, replaced, kept');
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'n3', public.note_step_information(pg_temp.id_of('project'), 'legal', 'contracts', null,
  'Le label attend le contrat', 'email', 'pending_decision', null);
select lives_ok($$ select public.decide_step_note(pg_temp.id_of('n3'), 'decide') $$, 'the owner decides a pending note');
select throws_ok($$ select public.decide_step_note(pg_temp.id_of('n3'), 'decide') $$,
                 'P0001', 'note_not_open', 'a decided note is not decided again');
reset role;

-- 4. Deleting the project takes them along ----------------------------------------------------
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('project')) $$,
                'the project is deleted with its blockers and notes');
select is((select count(*)::int from public.step_notes where project_id = pg_temp.id_of('project'))
          + (select count(*)::int from public.step_blockers where project_id = pg_temp.id_of('project')), 0,
          'nothing is left');

select * from finish();
rollback;
