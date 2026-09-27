-- Feedback: sent by any member for themself, read by its author and by the
-- general director (read_feedback), never edited nor deleted; grouped into
-- topics by file_feedback(), for the director only.
-- Run with `supabase test db`.
begin;
select plan(19);

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
  ('author', pg_temp.new_user('author-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('author', 'project_manager'),
               ('other', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'author', 'other');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Sending ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('author'));
select lives_ok($$
  insert into public.feedback (organization_id, kind, message, page_path)
  values (pg_temp.id_of('org'), 'bug', 'Le bouton ne répond pas', '/app/work')
$$, 'a member sends feedback');
insert into ids select 'fb', id from public.feedback where created_by = pg_temp.id_of('author_person');
select is((select created_by from public.feedback where id = pg_temp.id_of('fb')),
          pg_temp.id_of('author_person'), 'authorship is set by the database');
select throws_ok($$
  insert into public.feedback (organization_id, kind, message, created_by)
  values (pg_temp.id_of('org'), 'idea', 'Au nom d''un autre', pg_temp.id_of('other_person'))
$$, '42501', null, 'authorship is never chosen by the client');
select throws_ok($$
  insert into public.feedback (organization_id, kind, message)
  values (pg_temp.id_of('org'), 'complaint', 'Type inconnu')
$$, '23514', null, 'kind is a closed list');
select throws_ok($$
  insert into public.feedback (organization_id, kind, message)
  values (pg_temp.id_of('org'), 'idea', '   ')
$$, '23514', null, 'a feedback has a message');
select throws_ok($$
  insert into public.feedback (organization_id, kind, message, page_path)
  values (pg_temp.id_of('org'), 'idea', 'Lien externe', 'https://example.com')
$$, '23514', null, 'the page is a path of the app');

-- Never edited nor deleted ----------------------------------------------------
select throws_ok($$ update public.feedback set message = 'Changé' where id = pg_temp.id_of('fb') $$,
                 '42501', null, 'feedback is never edited');
select throws_ok($$ delete from public.feedback where id = pg_temp.id_of('fb') $$,
                 '42501', null, 'feedback is never deleted');

-- Reading ---------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*) from public.feedback where id = pg_temp.id_of('fb')), 0::bigint,
          'another member does not read it');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*) from public.feedback where id = pg_temp.id_of('fb')), 1::bigint,
          'the director reads it');

-- Topics ----------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('author'));
insert into public.feedback (organization_id, kind, message)
values (pg_temp.id_of('org'), 'bug', 'Le bouton est toujours cassé');
insert into ids select 'fb2', id from public.feedback
 where created_by = pg_temp.id_of('author_person') and id <> pg_temp.id_of('fb');
select throws_ok($$ select public.file_feedback(pg_temp.id_of('fb'), null, 'Titre', 'Résumé') $$,
                 '42501', null, 'only the director files feedback');
select throws_ok($$
  insert into public.feedback_topics (organization_id, kind, title, summary)
  values (pg_temp.id_of('org'), 'bug', 'Titre', 'Résumé')
$$, '42501', null, 'a topic is never written directly');

reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'topic', public.file_feedback(pg_temp.id_of('fb'), null, 'Bouton cassé', 'Le bouton ne répond pas.');
select is((select topic_id from public.feedback where id = pg_temp.id_of('fb')), pg_temp.id_of('topic'),
          'the director opens a topic with the feedback');
select is((select kind from public.feedback_topics where id = pg_temp.id_of('topic')), 'bug',
          'the topic takes the kind of its first feedback');
select is(public.file_feedback(pg_temp.id_of('fb2'), pg_temp.id_of('topic'), '', 'Le bouton ne répond toujours pas.'),
          pg_temp.id_of('topic'), 'a similar feedback joins the topic');
select is((select summary from public.feedback_topics where id = pg_temp.id_of('topic')),
          'Le bouton ne répond toujours pas.', 'joining updates the summary');
select is(public.file_feedback(pg_temp.id_of('fb2'), null, 'Autre', 'Autre'), pg_temp.id_of('topic'),
          'feedback already filed stays where it is');
select is((select message from public.feedback where id = pg_temp.id_of('fb2')),
          'Le bouton est toujours cassé', 'the original message is never changed');

reset role;
select pg_temp.act_as(pg_temp.id_of('author'));
select is((select count(*) from public.feedback_topics where id = pg_temp.id_of('topic')), 0::bigint,
          'a member does not read the topics');

select * from finish();
rollback;
