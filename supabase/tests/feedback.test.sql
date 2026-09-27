-- Feedback: sent by any member for themself, read by its author and by the
-- general director (read_feedback), edited by its author only, never deleted; grouped into
-- topics by file_feedback(), reviewed (sent with a priority, dismissed) by
-- the director only. Screenshots stay in their author's folder.
-- Run with `supabase test db`.
begin;
select plan(54);

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

-- Edited by its author only, never deleted -----------------------------------
select lives_ok($$ update public.feedback set message = 'Le bouton ne répond pas, capture jointe'
                   where id = pg_temp.id_of('fb') $$,
                'the author edits their feedback');
select isnt((select edited_at from public.feedback where id = pg_temp.id_of('fb')), null,
            'the edit is dated by the database');
select throws_ok($$ update public.feedback set page_path = '/app' where id = pg_temp.id_of('fb') $$,
                 '42501', null, 'the page it was sent from never changes');
select throws_ok($$ update public.feedback set created_by = pg_temp.id_of('other_person') where id = pg_temp.id_of('fb') $$,
                 '42501', null, 'the author never changes');
select throws_ok($$ delete from public.feedback where id = pg_temp.id_of('fb') $$,
                 '42501', null, 'feedback is never deleted');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
update public.feedback set message = 'Changé par un autre' where id = pg_temp.id_of('fb');
reset role;
select is((select message from public.feedback where id = pg_temp.id_of('fb')),
          'Le bouton ne répond pas, capture jointe', 'nobody else edits it');
select pg_temp.act_as(pg_temp.id_of('author'));

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
select is((select edited_at from public.feedback where id = pg_temp.id_of('fb2')), null,
          'filing is not an edit');

reset role;
select pg_temp.act_as(pg_temp.id_of('author'));
select is((select count(*) from public.feedback_topics where id = pg_temp.id_of('topic')), 0::bigint,
          'a member does not read the topics');

-- Review -----------------------------------------------------------------------
select throws_ok($$ select public.review_feedback_topic(pg_temp.id_of('topic'), 'send', 'high') $$,
                 '42501', null, 'only the director reviews a topic');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select status from public.feedback_topics where id = pg_temp.id_of('topic')), 'new',
          'a topic starts to review');
select throws_ok($$ select public.review_feedback_topic(pg_temp.id_of('topic'), 'send') $$,
                 'P0001', 'priority_required', 'sending needs a priority');
select lives_ok($$ select public.review_feedback_topic(pg_temp.id_of('topic'), 'send', 'high') $$,
                'the director sends a topic with a priority');
select is((select status || ':' || priority from public.feedback_topics where id = pg_temp.id_of('topic')),
          'sent:high', 'the topic is sent, high priority');
select is((select reviewed_by from public.feedback_topics where id = pg_temp.id_of('topic')),
          pg_temp.id_of('director_person'), 'who sent it is set by the database');
select lives_ok($$ select public.review_feedback_topic(pg_temp.id_of('topic'), 'prioritize', 'low') $$,
                'the director changes the priority of a sent topic');
select throws_ok($$ select public.review_feedback_topic(pg_temp.id_of('topic'), 'dismiss') $$,
                 'P0001', 'invalid_transition', 'a sent topic is not dismissed');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
insert into public.feedback (organization_id, kind, message)
values (pg_temp.id_of('org'), 'idea', 'Un mode sombre');
insert into public.feedback (organization_id, kind, message)
values (pg_temp.id_of('org'), 'idea', 'Un thème sombre, encore');
insert into ids select 'fb3', id from public.feedback where message = 'Un mode sombre';
insert into ids select 'fb4', id from public.feedback where message = 'Un thème sombre, encore';
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'topic2', public.file_feedback(pg_temp.id_of('fb3'), null, 'Mode sombre', 'Un mode sombre.');
select lives_ok($$ select public.review_feedback_topic(pg_temp.id_of('topic2'), 'dismiss') $$,
                'the director dismisses a topic');
select public.file_feedback(pg_temp.id_of('fb4'), pg_temp.id_of('topic2'));
select is((select status from public.feedback_topics where id = pg_temp.id_of('topic2')), 'new',
          'a new feedback brings a dismissed topic back to review');
select is((select summary from public.feedback_topics where id = pg_temp.id_of('topic2')), 'Un mode sombre.',
          'joining without a summary keeps the summary');

-- Screenshots -----------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('author'));
insert into vars values ('own', pg_temp.id_of('org') || '/' || pg_temp.id_of('author_person') || '/' || gen_random_uuid() || '.png');
insert into vars values ('theirs', pg_temp.id_of('org') || '/' || pg_temp.id_of('other_person') || '/' || gen_random_uuid() || '.png');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('feedback-screenshots', (select v from vars where k = 'own')) $$,
                'a member uploads a screenshot into their folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('feedback-screenshots', (select v from vars where k = 'theirs')) $$,
                 '42501', null, 'never into someone else''s folder');
select throws_ok($$
  insert into public.feedback (organization_id, kind, message, screenshot_paths)
  values (pg_temp.id_of('org'), 'bug', 'Capture d''un autre',
          array[(select v from vars where k = 'own'), (select v from vars where k = 'theirs')])
$$, 'P0001', 'invalid_screenshot_path', 'a feedback points only to its author''s screenshots');
select throws_ok($$
  insert into public.feedback (organization_id, kind, message, screenshot_paths)
  values (pg_temp.id_of('org'), 'bug', 'Six captures', array_fill((select v from vars where k = 'own'), array[6]))
$$, '23514', null, 'five screenshots at most');
select throws_ok($$
  update public.feedback set screenshot_paths = array[(select v from vars where k = 'theirs')]
   where id = pg_temp.id_of('fb')
$$, 'P0001', 'invalid_screenshot_path', 'an edit points only to its author''s screenshots too');
select throws_ok($$ update public.feedback set topic_id = null where id = pg_temp.id_of('fb') $$,
                 '42501', null, 'the author never moves it out of its topic');

-- Editing before sending ------------------------------------------------------
select throws_ok($$ select public.edit_feedback_topic(pg_temp.id_of('topic2'), 'idea', 'Titre', 'Résumé') $$,
                 '42501', null, 'only the director edits a topic');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.edit_feedback_topic(pg_temp.id_of('topic2'), 'idea', 'Thème sombre', 'Proposer un thème sombre.') $$,
                'the director edits a topic before sending it');
select is((select edited_by from public.feedback_topics where id = pg_temp.id_of('topic2')),
          pg_temp.id_of('director_person'), 'who edited it is set by the database');
select throws_ok($$ select public.edit_feedback_topic(pg_temp.id_of('topic'), 'bug', 'Titre', 'Résumé') $$,
                 'P0001', 'topic_already_sent', 'a sent topic is no longer edited');
select throws_ok($$ select public.edit_feedback_topic(pg_temp.id_of('topic2'), 'idea', '  ', 'Résumé') $$,
                 '23514', null, 'a topic keeps a title');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
insert into public.feedback (organization_id, kind, message) values (pg_temp.id_of('org'), 'idea', 'Mode nuit svp');
insert into ids select 'fb5', id from public.feedback where message = 'Mode nuit svp';
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.file_feedback(pg_temp.id_of('fb5'), pg_temp.id_of('topic2'), '', 'Résumé réécrit par PO.');
select is((select summary from public.feedback_topics where id = pg_temp.id_of('topic2')),
          'Proposer un thème sombre.', 'PO never rewrites a summary the director edited');

-- Notion ----------------------------------------------------------------------
select throws_ok($$ select public.record_feedback_notion(pg_temp.id_of('topic2'), 'abc', 'https://www.notion.so/abc') $$,
                 'P0001', 'topic_not_sent', 'only a sent topic has a Notion page');
select lives_ok($$ select public.record_feedback_notion(pg_temp.id_of('topic'), 'abc', 'https://www.notion.so/abc') $$,
                'the director records the Notion page of a sent topic');
select throws_ok($$ select public.record_feedback_notion(pg_temp.id_of('topic'), 'other', null) $$,
                 'P0001', 'notion_page_mismatch', 'a topic keeps its Notion page');
reset role;
select pg_temp.act_as(pg_temp.id_of('author'));
select throws_ok($$ select public.record_feedback_notion(pg_temp.id_of('topic'), 'abc', null) $$,
                 '42501', null, 'only the director records a Notion page');

-- Notion errors ---------------------------------------------------------------
select throws_ok($$ select public.record_feedback_notion_error(pg_temp.id_of('topic'), 'Jeton refusé') $$,
                 '42501', null, 'only the director records a Notion error');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.record_feedback_notion_error(pg_temp.id_of('topic'), 'Jeton refusé');
select is((select notion_error from public.feedback_topics where id = pg_temp.id_of('topic')), 'Jeton refusé',
          'the director records why a topic is not on Notion');
select public.record_feedback_notion(pg_temp.id_of('topic'), 'abc');
select is((select notion_error from public.feedback_topics where id = pg_temp.id_of('topic')), null,
          'a successful update clears the error');

select * from finish();
rollback;
