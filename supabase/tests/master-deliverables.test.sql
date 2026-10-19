-- Master final: deliverables deposited by the engineer's link, « Rouvrir le
-- master » (supabase/migrations/20261020010501_master_deliverables_reopen.sql).
-- Run with `supabase test db`.
begin;
select plan(11);

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
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  execute 'set local role anon';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
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

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, anon;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Nova ' || (select v from vars where k = 'tag'), 'signed');
insert into ids select 'artist', id from public.artists where name = 'Nova ' || (select v from vars where k = 'tag');
insert into ids select 'title', public.create_master(pg_temp.id_of('org'), 'Sauvéé',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('artist'))));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'MDL ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
reset role;
insert into public.project_masters (organization_id, project_id, master_id, position)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('title'), 1);
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
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
insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'person', 'Ingé ' || (select v from vars where k = 'tag'), '{engineer}', 'inge@test.test');
insert into ids select 'engineer', id from public.network_contacts
 where name = 'Ingé ' || (select v from vars where k = 'tag');
insert into public.master_briefs (organization_id, project_id, validator_person_id,
                                  mix_contact_id, mastering_same_engineer, mix_rate_cents,
                                  mastering_rate_cents, deliverables)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'),
        pg_temp.id_of('engineer'), true, 80000, 30000, array['mix_final', 'master_final', 'instrumental']);
create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;
insert into tokens select 'link', public.create_master_transmission(pg_temp.id_of('project'), 'mix',
  jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', pg_temp.id_of('title')::text, 'title', 'Sauvéé'))),
  null, now() + interval '60 days',
  '{"withoutStems": ["Sauvéé"], "withoutStemsReason": "Pistes envoyées à part"}'::jsonb);
reset role;

-- The engineer takes the package with the estimate; the owner accepts both.
select pg_temp.as_anon();
select public.take_master_transmission((select token from tokens where name = 'link'), null, null);
select is(public.get_master_invoice((select token from tokens where name = 'link')), null,
          'no invoice before the master final');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.accept_master_rate(pg_temp.id_of('project'), 'mix');
select public.accept_master_rate(pg_temp.id_of('project'), 'mastering');
select pg_temp.add_audio('mix1', 'mix');
select pg_temp.add_audio('master1', 'master');
reset role;

-- 1. The Master final validated: the invoice is requested.
select pg_temp.act_as(pg_temp.id_of('creative'));
select public.decide_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('mix1')),
                                 'approved', null);
reset role;
select is((select count(*)::int from public.master_invoices where project_id = pg_temp.id_of('project')),
          0, 'the mix validated does not ask for the invoice');
select pg_temp.act_as(pg_temp.id_of('creative'));
select public.decide_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('master1')),
                                 'approved', null);
reset role;
select pg_temp.as_anon();
select is(jsonb_array_length(public.get_master_deliverables((select token from tokens where name = 'link'))),
          1, 'the link expects the instrumental');
select throws_ok(format($$ select public.open_master_deliverable(%L, %L, 'radio_edit', 'wav', 'x.wav') $$,
  (select token from tokens where name = 'link'), pg_temp.id_of('title')), 'P0001', 'deliverable_not_expected',
  'only what the Brief expects');
insert into vars select 'slot', public.open_master_deliverable((select token from tokens where name = 'link'),
  pg_temp.id_of('title'), 'instrumental', 'wav', 'Instrumental.wav');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('master-files', (select v from vars where k = 'slot'), '{"size": 4096}'::jsonb);
select pg_temp.as_anon();
select lives_ok(format($$ select public.record_master_deliverable(%L, %L, 'Instrumental.wav', 'audio/wav', 4096) $$,
  (select token from tokens where name = 'link'), (select v from vars where k = 'slot')),
  'the engineer deposits it');
select is(public.get_master_deliverables((select token from tokens where name = 'link')) -> 0 ->> 'fileName',
          'Instrumental.wav', 'the link says it is received');
reset role;
select is((select via_link from public.master_deliverables_received
            where project_id = pg_temp.id_of('project') and deliverable = 'instrumental'),
          true, 'received « par son lien »');
select is((select count(*)::int from public.master_files where master_id = pg_temp.id_of('title')
            and file_name = 'Instrumental.wav' and audio_state is null), 1,
          'a file of the title, never a version');

-- « Rouvrir le master ».
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ select public.reopen_mix_version(%L, ' ') $$,
  (select id from public.master_mix_versions where file_id = pg_temp.id_of('master1'))),
  '23514', 'reason_required', 'reopening the master says why');
select public.reopen_mix_version((select id from public.master_mix_versions where file_id = pg_temp.id_of('master1')),
                                 'La voix du dernier refrain doit monter');
reset role;
select is((select decision from public.master_mix_versions where file_id = pg_temp.id_of('master1')),
          'reopened', 'the master is reopened');
select is((select audio_state from public.master_files where id = pg_temp.id_of('master1')),
          'master', 'the file is no longer the Master final');

select * from finish();
rollback;
