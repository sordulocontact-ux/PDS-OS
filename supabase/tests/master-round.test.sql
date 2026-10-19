-- Master, Mixage and Mastering rounds (supabase/migrations/
-- 20261019080301_master_mix_round.sql): the link read back by the owner
-- only, the written waiver without stems, taking charge with a rate (a
-- proposed budget line, accepted by the owner), the reason of a change
-- request, reopening a Mix final. Run with `supabase test db`.
begin;
select plan(12);

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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- A launched project with a title, its creative director, a brief; a second
-- project with the same title and no brief.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'EM ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'bare', public.create_project(pg_temp.id_of('org'),
  'EM2 ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1),
       (pg_temp.id_of('org'), pg_temp.id_of('bare'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
create function pg_temp.add_audio(p_name text, p_state text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.master_files (organization_id, master_id, category, audio_state,
                                   path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('title'), 'audio', p_state,
          pg_temp.id_of('org') || '/' || pg_temp.id_of('title') || '/' || gen_random_uuid() || '.wav',
          p_name || '.wav', 'audio/wav', 1000)
  returning id into v_id;
  insert into ids values (p_name, v_id);
end $$;
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
-- A mix done before the workflow: in the Catalogue, no version of the round.
select pg_temp.add_audio('done', 'mix');
select pg_temp.add_audio('demo', 'demo');
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Ingé ' || (select v from vars where k = 'tag'), '{engineer}', 'inge@test.test');
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Ingé ' || (select v from vars where k = 'tag');
insert into public.master_briefs (organization_id, project_id, validator_person_id,
                                  mix_contact_id, mastering_same_engineer, mix_rate_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'),
        pg_temp.id_of('engineer'), true, 80000);
create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;

-- 1. The waiver says why; the link is read back by the owner only.
select throws_ok(format($$ select public.create_master_transmission(%L, 'mix',
  jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', %L::text, 'title', 'Sauvéé'))),
  null, now() + interval '60 days', '{"withoutStems": ["Sauvéé"]}'::jsonb) $$,
  pg_temp.id_of('project'), pg_temp.id_of('title')), '23514', 'stems_reason_required',
  'a title without stems leaves only with a written reason');
insert into tokens select 'link', public.create_master_transmission(pg_temp.id_of('project'), 'mix',
  jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', pg_temp.id_of('title')::text, 'title', 'Sauvéé'))),
  null, now() + interval '60 days',
  '{"withoutStems": ["Sauvéé"], "withoutStemsReason": "Pistes envoyées à part"}'::jsonb);
insert into ids select 'tx', id from public.master_transmissions where project_id = pg_temp.id_of('project');
select is(public.master_transmission_link(pg_temp.id_of('tx')), (select token from tokens where name = 'link'),
          'the owner reads the link again');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is(public.master_transmission_link(pg_temp.id_of('tx')), null, 'nobody else does');
reset role;

-- 2. Taking charge with a rate proposes it to the budget; the owner accepts.
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select is(public.take_master_transmission((select token from tokens where name = 'link'), 90000, null),
          'received', 'the engineer takes the package with a rate');
reset role;
select is((select (amount_cents, status)::text from public.budget_lines
            where project_id = pg_temp.id_of('project') and master_role = 'mix'),
          (90000, 'proposed')::text, 'the mix line is proposed, not committed');
select is((select (amount_cents, status)::text from public.budget_lines
            where project_id = pg_temp.id_of('project') and master_role = 'mastering'),
          null, 'no mastering line without an amount');
select is((select count(*)::int from public.notifications
            where kind = 'master_rate_proposed' and recipient_person_id = pg_temp.id_of('owner_person')),
          1, 'the owner is told');
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.accept_master_rate(%L, 'mix') $$, pg_temp.id_of('project')),
  '42501', null, 'only the owner accepts a rate');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.accept_master_rate(pg_temp.id_of('project'), 'mix');
reset role;
select is((select status from public.budget_lines
            where project_id = pg_temp.id_of('project') and master_role = 'mix'),
          'committed', 'accepted, the amount is committed');

-- 3. A change request says what to change; a Mix final may be reopened.
select pg_temp.act_as(pg_temp.id_of('owner'));
select pg_temp.add_audio('v1', 'mix');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.decide_mix_version(%L, 'changes_requested', '  ') $$,
  (select id from public.master_mix_versions where file_id = pg_temp.id_of('v1'))),
  '23514', 'note_required', 'a change request always says what to change');
select public.decide_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('v1')),
                                 'approved', null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ select public.reopen_mix_version(%L, '') $$,
  (select id from public.master_mix_versions where file_id = pg_temp.id_of('v1'))),
  '23514', 'reason_required', 'reopening says why');
select public.reopen_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('v1')),
                                 'La voix du refrain est trop basse');
reset role;
select is((select decision from public.master_mix_versions where file_id = pg_temp.id_of('v1')),
          'reopened', 'the decision is replaced, never erased');

select * from finish();
rollback;
