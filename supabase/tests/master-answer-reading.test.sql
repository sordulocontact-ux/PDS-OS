-- Master, the creative director's answer read by PO
-- (supabase/migrations/20261020010401_master_answer_reading.sql): only what is
-- written word for word is kept; the owner adds the items to their fields.
-- Run with `supabase test db`.
begin;
select plan(5);

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
  'MA ' || (select v from vars where k = 'tag'), 'content');
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
reset role;
insert into public.master_briefs (organization_id, project_id, validator_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));
insert into public.master_brief_questions (organization_id, project_id, dimension, asked_to)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'direction', pg_temp.id_of('creative_person'));
insert into ids select 'q', id from public.master_brief_questions where project_id = pg_temp.id_of('project');
insert into vars values ('answer', 'Je veux la voix devant sur les refrains. Références : Blinding Lights de The Weeknd. Pas de reverb sur la voix du couplet.');

select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(format($$ select public.answer_master_question_read(%L, %L, %L::jsonb) $$,
  pg_temp.id_of('q'), (select v from vars where k = 'answer'),
  '[{"group": "references", "label": "« Levitating », Dua Lipa", "quote": "Levitating de Dua Lipa"}]'),
  '23514', 'not_verbatim', 'an item not written in the answer is refused');
select lives_ok(format($$ select public.answer_master_question_read(%L, %L, %L::jsonb) $$,
  pg_temp.id_of('q'), (select v from vars where k = 'answer'),
  '[{"group": "direction", "label": "Voix devant sur les refrains", "quote": "la voix  devant sur les refrains"},
    {"group": "references", "label": "« Blinding Lights », The Weeknd", "quote": "Blinding Lights de The Weeknd"},
    {"group": "constraints", "label": "Pas de reverb sur la voix du couplet", "quote": "pas de reverb sur la voix du couplet"}]'),
  'what is written word for word is sent');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.apply_master_question(pg_temp.id_of('q'));
reset role;
select is((select direction from public.master_briefs where project_id = pg_temp.id_of('project')),
          'Voix devant sur les refrains', 'the direction gets its items');
select is((select references_text from public.master_briefs where project_id = pg_temp.id_of('project')),
          '« Blinding Lights », The Weeknd', 'the references theirs');
select is((select constraints_text from public.master_briefs where project_id = pg_temp.id_of('project')),
          'Pas de reverb sur la voix du couplet', 'the constraints theirs');

select * from finish();
rollback;
