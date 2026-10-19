-- UX test of 09/10/2026, section 5 (« les autres rôles n'ont pas leur
-- outil »): the creative team's notifications and deposits, a task's
-- deliverable, the engineer's deposit through the link, the fiche's
-- requester, the privacy of a transmission's words and of the budget, the
-- welcome card. Run with `supabase test db`.
begin;
select plan(44);

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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role, decided_at = now()
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, anon;

-- A project with a title and its creative director, transmitted then refused
-- by `other`, then accepted by `owner`.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Miniature',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'UX ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a0', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('other_person'),
  'Budget serré : 8 000 €');
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('other'));
select public.respond_to_assignment(pg_temp.id_of('a0'), 'refused', 'Pas le temps avant novembre');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;

-- 1. The creative team is told ------------------------------------------------
select is((select count(*)::int from public.notifications
            where kind = 'project_launched' and project_id = pg_temp.id_of('project')
              and recipient_person_id = pg_temp.id_of('creative_person')),
          1, 'the creative director is told the project is launched');
select is((select actor_person_id from public.notifications
            where kind = 'project_launched' and project_id = pg_temp.id_of('project')),
          pg_temp.id_of('owner_person'), 'the launch names who accepted it');

-- The Brief approved (a validation and a Brief version, written here).
insert into public.validations (organization_id, project_stage_id, requested_by, validator_person_id)
select pg_temp.id_of('org'), s.id, pg_temp.id_of('owner_person'), pg_temp.id_of('director_person')
  from public.project_stages s join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = pg_temp.id_of('project') and d.key = 'framing';
insert into ids select 'validation', v.id from public.validations v
  join public.project_stages s on s.id = v.project_stage_id
 where s.project_id = pg_temp.id_of('project');
insert into public.framing_briefs (organization_id, project_id, version, content, state, validation_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 1, '{}'::jsonb, 'sent', pg_temp.id_of('validation'));
select pg_temp.act_as(pg_temp.id_of('director'));
reset role;
update public.framing_briefs set state = 'approved', decided_at = now()
 where project_id = pg_temp.id_of('project');
select is((select count(*)::int from public.notifications
            where kind = 'brief_approved' and project_id = pg_temp.id_of('project')
              and recipient_person_id = pg_temp.id_of('creative_person')),
          1, 'the creative director is told the Brief is approved');

-- A project call with its team.
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.calls (organization_id, project_id, title, occurred_at, consent)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Point créa', now() + interval '1 day', 'granted');
insert into ids select 'call', id from public.calls where project_id = pg_temp.id_of('project');
select lives_ok($$
  insert into public.call_attendees (call_id, organization_id, person_id)
  values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('creative_person'))
$$, 'the owner invites the creative director to a project call');
select throws_ok($$
  insert into public.call_attendees (call_id, organization_id, person_id)
  values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('other_person'))
$$, '23514', 'attendee_not_in_team', 'someone outside the team is never invited to a project call');
reset role;
select is((select (kind, project_id, subject_id)::text from public.notifications
            where recipient_person_id = pg_temp.id_of('creative_person') and kind like '%invited'),
          ('call_invited', pg_temp.id_of('project'), pg_temp.id_of('call'))::text,
          'the invitation is a call of the project, not an internal meeting');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$
  insert into public.call_attendees (call_id, organization_id, person_id)
  values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('owner_person'))
$$, '42501', null, 'only the call''s owner invites');
reset role;

-- 2. The creative team deposits in the project's files -----------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$
  insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'visual',
          pg_temp.id_of('org') || '/' || pg_temp.id_of('project') || '/' || gen_random_uuid() || '.jpg',
          'moodboard.jpg', 'image/jpeg', 10)
$$, 'the creative director adds a visual before the Conception');
insert into ids select 'board', id from public.project_files
 where project_id = pg_temp.id_of('project') and file_name = 'moodboard.jpg';
select throws_ok($$
  insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'press',
          pg_temp.id_of('org') || '/' || pg_temp.id_of('project') || '/' || gen_random_uuid() || '.pdf',
          'cp.pdf', 'application/pdf', 10)
$$, '42501', null, 'but not in Presse');
select lives_ok($$ update public.project_files set description = 'Pistes V1' where id = pg_temp.id_of('board') $$,
  'she edits her own file');
select throws_ok($$ update public.project_files set category = 'contract' where id = pg_temp.id_of('board') $$,
  '42501', null, 'she cannot move it into a category of the owner');
reset role;
select is((select (category, description)::text from public.project_files where id = pg_temp.id_of('board')),
          ('visual', 'Pistes V1')::text, 'never into a category of the owner');
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'other',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('project') || '/' || gen_random_uuid() || '.pdf',
        'notes.pdf', 'application/pdf', 10);
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
delete from public.project_files where file_name = 'notes.pdf' and project_id = pg_temp.id_of('project');
reset role;
select is((select count(*)::int from public.project_files
            where file_name = 'notes.pdf' and project_id = pg_temp.id_of('project')),
          1, 'she cannot delete the owner''s file');

-- 3. A task names its deliverable ---------------------------------------------
insert into public.levers (organization_id, project_id, family, label, state)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'creation_content', 'Clip', 'selected');
insert into public.strategy_deliverables (organization_id, project_id, lever_id, title)
select pg_temp.id_of('org'), pg_temp.id_of('project'), id, 'Miniature YouTube'
  from public.levers where project_id = pg_temp.id_of('project');
insert into ids select 'deliverable', id from public.strategy_deliverables
 where project_id = pg_temp.id_of('project');
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'elsewhere', public.create_project(pg_temp.id_of('org'),
  'UX2 ' || (select v from vars where k = 'tag'), 'content');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$
  insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date, deliverable_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Livrer la miniature',
          pg_temp.id_of('creative_person'), current_date + 7, pg_temp.id_of('deliverable'))
$$, 'a task names the deliverable it is about');
reset role;
select throws_ok($$
  insert into public.tasks (organization_id, project_id, title, assignee_person_id, due_date, deliverable_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('elsewhere'), 'Intrus',
          pg_temp.id_of('creative_person'), current_date + 7, pg_temp.id_of('deliverable'))
$$, 'P0001', 'task_deliverable_other_project', 'never a deliverable of another project');

-- 4. The engineer deposits through the link -----------------------------------
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Mixeur ' || (select v from vars where k = 'tag'), array['engineer']);
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Mixeur ' || (select v from vars where k = 'tag');
insert into public.master_briefs (organization_id, project_id, mix_contact_id, validator_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('engineer'), pg_temp.id_of('owner_person'));
create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;
create function pg_temp.token_of(p text) returns text language sql as $$ select token from tokens where name = p $$;
grant execute on function pg_temp.token_of(text) to anon;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$
  select public.create_master_transmission(pg_temp.id_of('project'), 'mix', '{}'::jsonb, null,
    now() + interval '2 years')
$$, 'P0001', 'invalid_expiry', 'a link lives 180 days at most');
select throws_ok($$
  select public.create_master_transmission(pg_temp.id_of('project'), 'mix',
    jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', pg_temp.id_of('title'),
                                                                      'title', 'Titre'))),
    null, now() + interval '60 days')
$$, '23514', 'stems_missing', 'a title without stems goes only on purpose (PROJ-UX-09)');
insert into tokens select 'link', public.create_master_transmission(pg_temp.id_of('project'), 'mix',
  jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', pg_temp.id_of('title'),
                                                                    'title', 'Titre'))),
  null, now() + interval '60 days',
  '{"withoutStems": ["Titre"], "withoutStemsReason": "Pistes envoyées à part"}'::jsonb);
reset role;
select is((select expires_at::date from public.master_transmissions where project_id = pg_temp.id_of('project')),
          (now() + interval '60 days')::date, 'the link lives as long as code decided');

-- The engineer: no account, no claims left from the people above.
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select throws_ok($$ select public.open_master_delivery(pg_temp.token_of('link'), pg_temp.id_of('artist'), 'wav') $$,
  'P0001', 'title_not_in_package', 'only a title of the package receives a deposit');
select throws_ok($$ select public.open_master_delivery(repeat('0', 64), pg_temp.id_of('title'), 'wav') $$,
  'P0001', 'unknown', 'an unknown token opens nothing');
select throws_ok($$ select public.open_master_delivery(pg_temp.token_of('link'), pg_temp.id_of('title'), 'pdf', 'Contrat.pdf') $$,
  'P0001', 'invalid_extension', 'a file that is not audio is refused (PROJ-BUG-08)');
select throws_ok($$ select public.open_master_delivery(pg_temp.token_of('link'), pg_temp.id_of('title'), 'wav', '../../x.wav') $$,
  'P0001', 'invalid_file_name', 'a name that reads as a path is refused');
insert into tokens select 'path', public.open_master_delivery(pg_temp.token_of('link'), pg_temp.id_of('title'), 'wav', 'Mix V2.wav');
select ok(pg_temp.token_of('path') like pg_temp.id_of('org') || '/' || pg_temp.id_of('title') || '/%.wav',
          'the slot is a path of the title in master-files');
select lives_ok($$
  insert into storage.objects (bucket_id, name, metadata)
  values ('master-files', pg_temp.token_of('path'), '{"size": 2048}'::jsonb)
$$, 'anyone with the link uploads to that exact path');
select throws_ok($$
  insert into storage.objects (bucket_id, name, metadata)
  values ('master-files', pg_temp.id_of('org') || '/' || pg_temp.id_of('title') || '/' || gen_random_uuid() || '.wav',
          '{"size": 2048}'::jsonb)
$$, '42501', null, 'and nowhere else');
select lives_ok($$
  select public.record_master_delivery(pg_temp.token_of('link'), pg_temp.token_of('path'), 'Mix V2.wav', 'audio/wav')
$$, 'the deposit is recorded');
select throws_ok($$
  select public.record_master_delivery(pg_temp.token_of('link'), pg_temp.token_of('path'), 'Mix V2.wav', 'audio/wav')
$$, 'P0001', 'slot_unknown', 'a slot is used once');
select is((public.get_master_transmission(pg_temp.token_of('link')) -> 'deliveries' -> 0 ->> 'fileName'),
          'Mix V2.wav', 'the engineer''s page lists the deposit');
reset role;
select is((select (category, audio_state, bytes, created_by)::text from public.master_files
            where path = pg_temp.token_of('path')),
          ('audio', 'mix', 2048, null)::text,
          'it is an audio version at the Mix state, its size read from Storage');
select is((select count(*)::int from public.master_mix_versions v
             join public.master_files f on f.id = v.file_id
            where f.path = pg_temp.token_of('path') and v.project_id = pg_temp.id_of('project')),
          1, 'the version of the project follows');
select is((select count(*)::int from public.notifications
            where kind = 'master_delivery_received' and recipient_person_id = pg_temp.id_of('owner_person')
              and project_id = pg_temp.id_of('project')),
          1, 'the sender of the link is told');

-- 5. The fiche says who asks --------------------------------------------------
create function pg_temp.fiche_token() returns text language sql as $$ select repeat('ab', 32) $$;
insert into public.legal_forms (organization_id, project_id, contact_id, status, token_hash, expires_at,
                                definition_version)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('engineer'), 'link_generated',
        encode(sha256(convert_to(pg_temp.fiche_token(), 'UTF8')), 'hex'), now() + interval '30 days', 1);
update public.people set email = 'owner@pds.test' where id = pg_temp.id_of('owner_person');
set local role anon;
select is((public.get_legal_form(pg_temp.fiche_token()) -> 'requester' ->> 'email'),
          'owner@pds.test', 'the fiche names whom to write to: the project''s owner');
select ok((public.get_legal_form(pg_temp.fiche_token()) -> 'requester' ->> 'organization') is not null,
          'and which organization asks');
reset role;

-- 6. A transmission's words are private ---------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select response from public.project_assignments where id = pg_temp.id_of('a0') $$,
  '42501', null, 'the creative director cannot read the refusal''s reason directly');
select is((select count(*)::int from public.project_assignment_messages(pg_temp.id_of('project'))),
          0, 'nor through the function');
select is((select count(*)::int from public.project_assignments where project_id = pg_temp.id_of('project')),
          2, 'she still sees the history');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.project_assignment_messages(pg_temp.id_of('project'))
            where assignment_id = pg_temp.id_of('a0')),
          0, 'the next project manager does not read the first one''s exchange');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select response from public.project_assignment_messages(pg_temp.id_of('project'))
            where assignment_id = pg_temp.id_of('a0')),
          'Pas le temps avant novembre', 'the director reads it');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select note from public.project_assignment_messages(pg_temp.id_of('project'))
            where assignment_id = pg_temp.id_of('a0')),
          'Budget serré : 8 000 €', 'the person it was sent to reads it');
reset role;

-- 7. The budget is the owner's and the direction's ---------------------------
select pg_temp.act_as(pg_temp.id_of('owner'));
insert into public.budget_lines (organization_id, project_id, label, amount_cents, note)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Clip', 500000, 'Négocié à la baisse');
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          1, 'the owner reads the budget');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          0, 'the creative director does not');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.budget_lines where project_id = pg_temp.id_of('project')),
          1, 'the direction does');
reset role;

-- 8. The welcome card is closed by its member --------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$
  insert into public.member_welcomes (organization_id, person_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('creative_person'))
$$, 'a member closes their welcome card');
select throws_ok($$
  insert into public.member_welcomes (organization_id, person_id)
  values (pg_temp.id_of('org'), pg_temp.id_of('owner_person'))
$$, '42501', null, 'never someone else''s');
reset role;

select * from finish();
rollback;
