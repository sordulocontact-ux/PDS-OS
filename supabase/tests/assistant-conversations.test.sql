-- Conversations with PO: saved for oneself, read, continued and deleted by
-- the person who had them only (not even the general director); the title
-- and the page never change once saved.
-- Run with `supabase test db`.
begin;
select plan(13);

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
  ('conv', gen_random_uuid());
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('author', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'author');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- Saving ----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('author'));
select lives_ok($$
  insert into public.assistant_conversations (id, organization_id, title, page_path, messages)
  values (pg_temp.id_of('conv'), pg_temp.id_of('org'), 'Où en est le mix ?', '/app/work',
          '[{"id":"m1","role":"user","parts":[{"type":"text","text":"Où en est le mix ?"}]}]')
$$, 'a member saves a conversation');
select is((select person_id from public.assistant_conversations where id = pg_temp.id_of('conv')),
          pg_temp.id_of('author_person'), 'it is theirs, set by the database');
select lives_ok($$
  update public.assistant_conversations
     set messages = messages || '[{"id":"m2","role":"assistant","parts":[]}]'
   where id = pg_temp.id_of('conv')
$$, 'its turns are saved again after each answer');
select is((select jsonb_array_length(messages) from public.assistant_conversations
            where id = pg_temp.id_of('conv')), 2, 'the new turn is kept');
select throws_ok($$ update public.assistant_conversations set title = 'Autre'
                   where id = pg_temp.id_of('conv') $$,
                 '42501', null, 'the title stays the first question');
select throws_ok($$
  insert into public.assistant_conversations (id, organization_id, title, messages)
  values (gen_random_uuid(), pg_temp.id_of('org'), '   ', '[]')
$$, '23514', null, 'a conversation has a title');
select throws_ok($$
  insert into public.assistant_conversations (id, organization_id, title, messages)
  values (gen_random_uuid(), pg_temp.id_of('org'), 'Objet', '{}')
$$, '23514', null, 'the turns are a list');
reset role;

-- Private ---------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.assistant_conversations
            where id = pg_temp.id_of('conv')), 0, 'the director does not read it');
update public.assistant_conversations set messages = '[]' where id = pg_temp.id_of('conv');
delete from public.assistant_conversations where id = pg_temp.id_of('conv');
select throws_ok($$
  insert into public.assistant_conversations (id, organization_id, title, messages)
  values (pg_temp.id_of('conv'), pg_temp.id_of('org'), 'Reprise', '[]')
$$, '23505', null, 'nobody takes over its id');
reset role;
select is((select jsonb_array_length(messages) from public.assistant_conversations
            where id = pg_temp.id_of('conv')), 2, 'nobody else changes it');

-- Deleted by its owner --------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('author'));
select is((select count(*)::int from public.assistant_conversations
            where id = pg_temp.id_of('conv')), 1, 'its owner reads it');
select lives_ok($$ delete from public.assistant_conversations where id = pg_temp.id_of('conv') $$,
                'its owner deletes it');
reset role;
select is((select count(*)::int from public.assistant_conversations
            where id = pg_temp.id_of('conv')), 0, 'it is gone');

select * from finish();
rollback;
