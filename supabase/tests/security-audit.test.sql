-- Holes found by the back-end audit of 2026-09-27, each proven closed:
-- contracts in Storage, a frozen framing, project masters after launch, and
-- Web Push subscriptions. Run with `supabase test db`.
begin;
select plan(17);

-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;

create function pg_temp.add_call_report(p_project uuid) returns void language sql as $$
  with c as (
    insert into public.calls (organization_id, project_id, title, consent)
    select organization_id, id, 'Call de cadrage', 'granted' from public.projects where id = p_project
    returning id, organization_id),
  t as (
    insert into public.transcripts (organization_id, call_id, text, provider, model)
    select organization_id, id, 'Transcription', 'test', 'test' from c
    returning id, organization_id, call_id)
  insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
  select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;
$$;
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.set_framing_state(p_project uuid, p_state text) returns void language sql as $$
  update public.project_stages s set state = p_state
    from public.stage_definitions d
   where d.id = s.stage_definition_id and d.key = 'framing' and s.project_id = p_project;
$$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'creative');

-- 1. Contracts in the artist-files bucket --------------------------------------
with x as (
  insert into public.artists (organization_id, name, relation)
  values ((select id from ids where name = 'org'), 'Artiste ' || (select v from vars where k = 'tag'), 'signed')
  returning id)
insert into ids select 'artist', id from x;
insert into vars select 'contract_path',
  (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/' || gen_random_uuid() || '.pdf';
insert into vars select 'press_path',
  (select id from ids where name = 'org') || '/' || (select id from ids where name = 'artist') || '/' || gen_random_uuid() || '.pdf';
insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes)
select (select id from ids where name = 'org'), (select id from ids where name = 'artist'), c.category,
       (select v from vars where k = c.k), c.category || '.pdf', 'application/pdf', 1000
  from (values ('contract', 'contract_path'), ('press', 'press_path')) as c (category, k);
insert into storage.objects (bucket_id, name)
select 'artist-files', v from vars where k in ('contract_path', 'press_path');

select pg_temp.act_as((select id from ids where name = 'creative'));
select is((select count(*)::int from storage.objects where name = (select v from vars where k = 'contract_path')), 0,
          'a member without manage_catalog cannot read a contract object');
select is((select count(*)::int from storage.objects where name = (select v from vars where k = 'press_path')), 1,
          'the same member reads the press kit');
reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select is((select count(*)::int from storage.objects
            where name in (select v from vars where k in ('contract_path', 'press_path'))), 2,
          'a catalog manager reads the contract too');

-- 3. Project masters (before launch only) -------------------------------------
with x as (
  insert into public.masters (organization_id, title)
  values ((select id from ids where name = 'org'), 'Titre 1') returning id)
insert into ids select 'master1', id from x;
with x as (
  insert into public.masters (organization_id, title)
  values ((select id from ids where name = 'org'), 'Titre 2') returning id)
insert into ids select 'master2', id from x;
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'OP ' || (select v from vars where k = 'tag'), 'partnership', array[(select id from ids where name = 'master1')]);
select lives_ok($$
  insert into public.project_masters (organization_id, project_id, master_id, position)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
          (select id from ids where name = 'master2'), 2)
$$, 'before launch, the director links a master');

insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
delete from public.project_masters where project_id = (select id from ids where name = 'project');
select is((select count(*)::int from public.project_masters where project_id = (select id from ids where name = 'project')), 2,
          'once launched, the director cannot unlink its masters');
with x as (
  insert into public.masters (organization_id, title)
  values ((select id from ids where name = 'org'), 'Titre 3') returning id)
insert into ids select 'master3', id from x;
select throws_ok($$
  insert into public.project_masters (organization_id, project_id, master_id, position)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'),
          (select id from ids where name = 'master3'), 3)
$$, '42501', null, 'once launched, the director cannot link another master');

insert into ids select 'draft', public.create_project((select id from ids where name = 'org'),
  'Brouillon ' || (select v from vars where k = 'tag'), 'partnership');
reset role;
update public.masters set archived_at = now() where id = (select id from ids where name = 'master3');
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$
  insert into public.project_masters (organization_id, project_id, master_id, position)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'draft'),
          (select id from ids where name = 'master3'), 1)
$$, '42501', null, 'an archived master cannot be linked');

-- 2. Framing frozen once submitted ---------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
select lives_ok($$
  with n as (
    insert into public.needs (organization_id, project_id, label, family, source_type)
    values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Clip', 'creation_content', 'manual')
    returning id)
  insert into ids select 'need', id from n
$$, 'while the framing is open, the owner adds a need');

reset role;
select pg_temp.set_framing_state((select id from ids where name = 'project'), 'awaiting_validation');
select pg_temp.act_as((select id from ids where name = 'owner'));
select throws_ok($$
  insert into public.needs (organization_id, project_id, label, family, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Pochette', 'creation_content', 'manual')
$$, '42501', null, 'a submitted framing takes no new need');

reset role;
select pg_temp.set_framing_state((select id from ids where name = 'project'), 'validated');
select pg_temp.act_as((select id from ids where name = 'owner'));
select throws_ok($$
  insert into public.field_values (organization_id, project_id, deliverable, field_key, value, status, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'brief', 'objective', '"réécrit"', 'confirmed', 'manual')
$$, '42501', null, 'a validated Brief cannot be rewritten');
select throws_ok($$
  insert into public.project_team_members (organization_id, project_id, display_name, role, source_type)
  values ((select id from ids where name = 'org'), (select id from ids where name = 'project'), 'Intrus', 'Photographe', 'manual')
$$, '42501', null, 'a validated framing takes no new team member');
update public.needs set label = 'Changé' where id = (select id from ids where name = 'need');
select is((select label from public.needs where id = (select id from ids where name = 'need')), 'Clip',
          'a validated framing''s needs cannot be edited');

-- 4. Web Push ----------------------------------------------------------------
reset role;
select pg_temp.act_as((select id from ids where name = 'owner'));
insert into vars select 'endpoint', 'https://fcm.googleapis.com/fcm/send/' || (select v from vars where k = 'tag');
select public.save_push_subscription((select v from vars where k = 'endpoint'), 'key', 'secret');
select throws_ok($$ select public.save_push_subscription('https://attacker.example/hook', 'key', 'secret') $$,
                 '22023', null, 'an endpoint outside the known push services is refused');

reset role;
select pg_temp.act_as((select id from ids where name = 'director'));
select throws_ok($$ select * from public.claim_push_deliveries(null) $$,
                 '42501', null, 'claiming pushes without the server secret is refused');
select throws_ok($$ select * from public.claim_push_deliveries('guess') $$,
                 '42501', null, 'a wrong secret is refused too');
select throws_ok($$ select public.drop_gone_push_subscription((select v from vars where k = 'endpoint'), null) $$,
                 '42501', null, 'dropping a gone subscription is for the server only');
select public.forget_push_subscription((select v from vars where k = 'endpoint'));
reset role;
select is((select count(*)::int from public.push_subscriptions where endpoint = (select v from vars where k = 'endpoint')), 1,
          'a member cannot unsubscribe a colleague''s browser');

select * from finish();
rollback;
