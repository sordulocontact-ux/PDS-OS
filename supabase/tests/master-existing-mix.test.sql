-- Retours BUG + UX du 11/10/2026, lot 11 (supabase/migrations/
-- 20261011500501_master_existing_mix_final.sql): a mix already done feeds
-- the mastering without a new mixing round, declared once by the owner.
-- Run with `supabase test db`.
begin;
select plan(7);

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
insert into public.master_briefs (organization_id, project_id, validator_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));

reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select public.declare_mix_final(pg_temp.id_of('project'), pg_temp.id_of('title'),
                    pg_temp.id_of('done'), null) $$, '42501', null, 'only the owner declares it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.declare_mix_final(pg_temp.id_of('project'), pg_temp.id_of('title'),
                    pg_temp.id_of('demo'), null) $$, 'P0001', 'not_a_mix', 'a demo is not a mix');
select lives_ok($$ select public.declare_mix_final(pg_temp.id_of('project'), pg_temp.id_of('title'),
                    pg_temp.id_of('done'), 'Mix livré avant le projet') $$,
                'the owner declares the existing mix the Mix final');
select is((select (stage, decision, decision_note, file_id)::text from public.master_mix_versions
            where project_id = pg_temp.id_of('project') and master_id = pg_temp.id_of('title')),
          ('mix', 'approved', 'Mix livré avant le projet', pg_temp.id_of('done'))::text,
          'it is the title''s validated mix version, the same file');
select is((select count(*)::int from public.master_files where master_id = pg_temp.id_of('title')),
          2, 'no copy of the file');
select throws_ok($$ select public.declare_mix_final(pg_temp.id_of('project'), pg_temp.id_of('title'),
                    pg_temp.id_of('done'), null) $$, 'P0001', 'already_final', 'once');
select throws_ok($$ select public.declare_mix_final(pg_temp.id_of('bare'), pg_temp.id_of('title'),
                    pg_temp.id_of('done'), null) $$, '42501', null, 'never in a project one does not own');
reset role;

select * from finish();
rollback;
