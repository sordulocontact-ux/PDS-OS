-- Master, a delay sent to the direction
-- (supabase/migrations/20261020010301_master_delay_escalation.sql): the owner
-- escalates, the direction is told and decides; the engineer reads the answer.
-- Run with `supabase test db`.
begin;
select plan(10);

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
  'MD ' || (select v from vars where k = 'tag'), 'content');
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
                                  mastering_rate_cents)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'),
        pg_temp.id_of('engineer'), true, 80000, 30000);
create temp table tokens (name text primary key, token text) on commit drop;
grant all on tokens to authenticated, anon;
insert into tokens select 'link', public.create_master_transmission(pg_temp.id_of('project'), 'mix',
  jsonb_build_object('titles', jsonb_build_array(jsonb_build_object('masterId', pg_temp.id_of('title')::text, 'title', 'Sauvéé'))),
  null, now() + interval '60 days',
  '{"withoutStems": ["Sauvéé"], "withoutStemsReason": "Pistes envoyées à part"}'::jsonb);
reset role;

update public.master_briefs set mix_v1_due = '2026-11-15', mix_final_due = '2026-11-18',
       mastering_due = '2026-11-20', master_final_due = '2026-11-21'
 where project_id = pg_temp.id_of('project');
select pg_temp.as_anon();
select public.post_master_engineer_message((select token from tokens where name = 'link'), 'delay',
  'Le studio est fermé deux jours', 3);
reset role;
insert into ids select 'delay', id from public.master_engineer_messages
 where project_id = pg_temp.id_of('project') and kind = 'delay';

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.escalate_master_delay(%L) $$, pg_temp.id_of('delay')),
  '42501', null, 'only the owner sends a delay to the direction');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok(format($$ select public.escalate_master_delay(%L) $$, pg_temp.id_of('delay')),
  'the owner sends it to the direction');
select throws_ok(format($$ select public.keep_master_dates(%L, 'Non') $$, pg_temp.id_of('delay')),
  '42501', null, 'once sent, the owner no longer decides');
reset role;
select is((select status from public.master_engineer_messages where id = pg_temp.id_of('delay')),
          'escalated', '« Chez la direction »');
select is((select count(*)::int from public.notifications where kind = 'master_delay_escalated'
            and recipient_person_id = pg_temp.id_of('director_person')), 1, 'the direction is told');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.keep_master_dates(%L, '  ') $$, pg_temp.id_of('delay')),
  '23514', 'reply_required', 'refusing says why to the engineer');
select lives_ok(format($$ select public.apply_master_delay(%L, %L::jsonb, 'On décale, la sortie bouge') $$,
  pg_temp.id_of('delay'), '{"mix_v1_due": "2026-11-18", "mix_final_due": "2026-11-21", "mastering_due": "2026-11-23", "master_final_due": "2026-11-24"}'),
  'the direction applies the dates');
reset role;
select is((select master_final_due::text from public.master_briefs where project_id = pg_temp.id_of('project')),
          '2026-11-24', 'the dates moved');
select is((select (status, outcome)::text from public.master_engineer_messages where id = pg_temp.id_of('delay')),
          '(handled,applied)', 'the delay is handled');
select is((select count(*)::int from public.notifications where kind = 'master_delay_decided'
            and recipient_person_id = pg_temp.id_of('owner_person')), 1, 'the owner is told');

select * from finish();
rollback;
