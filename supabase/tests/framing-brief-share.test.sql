-- « Copier le lien » of the Brief de cadrage (…20261105180101): one public
-- link per project, made by the owner or the direction once a version was
-- sent, that always opens the latest version sent; and the kept PDFs of the
-- new layout (…20261105180201).
-- Run with `supabase test db`.
begin;
select plan(10);

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
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into ids select r.name, pg_temp.new_user('bs-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('creative'), ('other_pm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('creative', 'creative_director'), ('other_pm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'creative', 'other_pm');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'BS ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'),
  pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;

create function pg_temp.share() returns uuid language sql as $$
  select public.share_framing_brief(pg_temp.id_of('project')) $$;
grant execute on function pg_temp.share() to authenticated;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select pg_temp.share() $$, 'P0001', 'brief_not_sent',
                 'no link before a version is sent');
reset role;

insert into ids values ('v1', gen_random_uuid()), ('v2', gen_random_uuid()), ('v3', gen_random_uuid());
insert into public.framing_briefs (id, organization_id, project_id, version, content, state, sent_at)
values (pg_temp.id_of('v1'), pg_temp.id_of('org'), pg_temp.id_of('project'), 1, '{"n": 1}', 'superseded', now()),
       (pg_temp.id_of('v2'), pg_temp.id_of('org'), pg_temp.id_of('project'), 2, '{"n": 2}', 'superseded', now()),
       (pg_temp.id_of('v3'), pg_temp.id_of('org'), pg_temp.id_of('project'), 3, '{"n": 3}', 'pending', null);

select pg_temp.act_as(pg_temp.id_of('owner'));
insert into vars select 'token', pg_temp.share()::text;
select is(pg_temp.share()::text, (select v from vars where k = 'token'),
          'the owner gets one link, the same each time');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is(pg_temp.share()::text, (select v from vars where k = 'token'),
          'the direction gets the same link');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$ select pg_temp.share() $$, 'P0001', 'project_not_found',
                 'a creative director not on the project makes no link');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ select pg_temp.share() $$, 'P0001', 'project_not_found',
                 'someone outside the project makes no link');
reset role;

set local role anon;
select is((public.get_shared_framing_brief((select v from vars where k = 'token')::uuid)->>'version')::int, 2,
          'the link opens the latest version sent, not a draft');
select is(public.get_shared_framing_brief(gen_random_uuid()), null, 'an unknown token reads nothing');
reset role;
update public.share_links set revoked_at = now() where token = (select v from vars where k = 'token')::uuid;
set local role anon;
select is(public.get_shared_framing_brief((select v from vars where k = 'token')::uuid), null,
          'a revoked link reads nothing');
reset role;

create function pg_temp.put(p_name text) returns void language sql as $$
  insert into storage.objects (bucket_id, name) values ('framing-brief-pdfs', p_name) $$;
grant execute on function pg_temp.put(text) to authenticated;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok(format($$ select pg_temp.put(%L) $$, pg_temp.id_of('v2') || '-superseded-l2.pdf'),
                'the PDF of the new layout is kept');
select throws_ok(format($$ select pg_temp.put(%L) $$, pg_temp.id_of('v2') || '-superseded-x.pdf'),
                 '42501', null, 'not under another name');
reset role;

select * from finish();
rollback;
