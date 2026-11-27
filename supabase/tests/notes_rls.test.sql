-- Written notes (supabase/migrations/20261127180101_notes.sql): read by whoever
-- sees the project, or by every member without project; written by any member
-- who sees the project (not only its owner, decision of Sacha 27/11/2026);
-- changed and deleted by their author only; found by search_notes with the
-- calls. Run with `supabase test db`.
begin;
select plan(24);

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
insert into ids select r.name, pg_temp.new_user('nts-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('creative'), ('other')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'other');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- A launched project run by the owner, its creative on its team; a second
-- project run by the other manager.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'NTS ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'project2', public.create_project(pg_temp.id_of('org'),
  'NTS2 ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'), pg_temp.id_of('owner_person'));
insert into ids select 'a2', public.transmit_project(pg_temp.id_of('project2'), pg_temp.id_of('other_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select public.respond_to_assignment(pg_temp.id_of('a2'), 'accepted');
reset role;
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('creative_person'));

-- A call of the project with its report (as postgres: calls are tested elsewhere).
with c as (
  insert into public.calls (organization_id, project_id, title, consent, occurred_at)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Point clip', 'granted',
          now() - interval '1 day')
  returning id, organization_id),
t as (
  insert into public.transcripts (organization_id, call_id, text, provider, model)
  select organization_id, id, 'On parle du tournage.', 'test', 'test' from c
  returning id, organization_id, call_id)
insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
select organization_id, call_id, id, 'Le budget de la pochette est validé.', 'test', 'test' from t;
insert into ids select 'call', id from public.calls where project_id = pg_temp.id_of('project');

-- Writing --------------------------------------------------------------------------------

select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$
  insert into public.notes (organization_id, project_id, title, body)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Idées de décor',
          'Un parking de nuit, néons froids.')
$$, 'a member of the team who is not the owner writes a note on a launched project');
insert into ids select 'note', id from public.notes where title = 'Idées de décor';
select is((select created_by from public.notes where id = pg_temp.id_of('note')),
          pg_temp.id_of('creative_person'), 'its author is the writer');
select throws_ok($$
  insert into public.notes (organization_id, project_id, title, body, created_by)
  values (pg_temp.id_of('org'), null, 'Signé par un autre', 'Texte',
          pg_temp.id_of('owner_person'))
$$, '42501', null, 'nobody chooses the author');
select throws_ok($$
  insert into public.notes (organization_id, project_id, title, body)
  values (pg_temp.id_of('org'), null, '   ', 'Texte')
$$, '23514', null, 'a title is required');
reset role;

select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$
  insert into public.notes (organization_id, project_id, title, body)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Intrus', 'Texte')
$$, '42501', null, 'never on a project the writer does not see');
select lives_ok($$
  insert into public.notes (organization_id, project_id, title, body)
  values (pg_temp.id_of('org'), null, 'Process de l''équipe', 'Les briefs partent le lundi.')
$$, 'a note of the team, without project');
insert into ids select 'team_note', id from public.notes where title = 'Process de l''équipe';
select lives_ok($$
  insert into public.notes (organization_id, project_id, title, body)
  values (pg_temp.id_of('org'), pg_temp.id_of('project2'), 'Note du projet 2', 'Texte')
$$, 'and on a project the writer sees');
insert into ids select 'note2', id from public.notes where title = 'Note du projet 2';
reset role;

-- Reading --------------------------------------------------------------------------------

select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.notes where id = pg_temp.id_of('note')), 1,
          'the owner reads the note on their project');
select is((select count(*)::int from public.notes where id = pg_temp.id_of('team_note')), 1,
          'and the team''s note');
select is((select count(*)::int from public.notes where id = pg_temp.id_of('note2')), 0,
          'never the note of a project they do not see');
reset role;

select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.notes where id = pg_temp.id_of('note')), 0,
          'who does not see the project does not read its notes');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.notes
            where id in (pg_temp.id_of('note'), pg_temp.id_of('note2'), pg_temp.id_of('team_note'))),
          3, 'the director, who sees every project, reads them all');
reset role;

-- Changing and deleting --------------------------------------------------------------------

select pg_temp.act_as(pg_temp.id_of('owner'));
with u as (update public.notes set title = 'Repris' where id = pg_temp.id_of('note') returning 1)
select is(count(*)::int, 0, 'the project''s owner does not change someone else''s note') from u;
with d as (delete from public.notes where id = pg_temp.id_of('note') returning 1)
select is(count(*)::int, 0, 'nor deletes it') from d;
reset role;

select pg_temp.act_as(pg_temp.id_of('creative'));
with u as (update public.notes set body = 'Un parking de nuit, néons froids, pluie.'
            where id = pg_temp.id_of('note') returning 1)
select is(count(*)::int, 1, 'its author changes it') from u;
select throws_ok($$
  update public.notes set created_by = pg_temp.id_of('owner_person') where id = pg_temp.id_of('note')
$$, '42501', null, 'never its author');
select throws_ok($$
  update public.notes set project_id = pg_temp.id_of('project2') where id = pg_temp.id_of('note')
$$, '42501', null, 'nor moves it to a project they do not see');
reset role;

-- Search ---------------------------------------------------------------------------------

select pg_temp.act_as(pg_temp.id_of('owner'));
select ok(exists (select 1 from public.search_notes('néon') s
                   where s.kind = 'note' and s.id = pg_temp.id_of('note')),
          'search finds a note by its text');
select ok(exists (select 1 from public.search_notes('pochette') s
                   where s.kind = 'call' and s.id = pg_temp.id_of('call')),
          'and a call by its report');
select ok(exists (select 1 from public.search_notes('tournage') s
                   where s.kind = 'call' and s.id = pg_temp.id_of('call')),
          'and by its transcript');
select ok(exists (select 1 from public.search_notes('Point cl') s
                   where s.kind = 'call' and s.id = pg_temp.id_of('call')),
          'a title matches as typed');
select is((select count(*)::int from public.search_notes('')), 0, 'an empty search finds nothing');
reset role;

select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int
             from (select * from public.search_notes('néon')
                   union all select * from public.search_notes('pochette')) s
            where s.id in (pg_temp.id_of('note'), pg_temp.id_of('call'))), 0,
          'search never finds what the reader cannot see');
reset role;

-- Deleting the project takes its notes ----------------------------------------------------

select public.delete_project_row(pg_temp.id_of('project'));
select is((select count(*)::int from public.notes where id = pg_temp.id_of('note')), 0,
          'deleting a project deletes its notes');

select * from finish();
rollback;
