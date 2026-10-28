-- The Brief's PDF kept in Storage (…20261028000701): written once, only for a
-- version sent and in its current state, by the owner or the direction; read
-- by whoever sees the project.
-- Run with `supabase test db`.
begin;
select plan(6);

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
insert into ids select r.name, pg_temp.new_user('bp-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
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
  'BP ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.id_of('project'),
  pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;

insert into ids values ('sent', gen_random_uuid()), ('draft', gen_random_uuid());
insert into public.framing_briefs (id, organization_id, project_id, version, content, state, sent_at)
-- A version sent then replaced (a sent one in review needs a validation row).
values (pg_temp.id_of('sent'), pg_temp.id_of('org'), pg_temp.id_of('project'), 1, '{}', 'superseded', now()),
       (pg_temp.id_of('draft'), pg_temp.id_of('org'), pg_temp.id_of('project'), 2, '{}', 'pending', null);
create function pg_temp.put(p_name text) returns void language sql as $$
  insert into storage.objects (bucket_id, name) values ('framing-brief-pdfs', p_name) $$;
grant execute on function pg_temp.put(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok(format($$ select pg_temp.put(%L) $$, pg_temp.id_of('sent') || '-superseded.pdf'),
                 '42501', null, 'someone outside the project keeps nothing');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok(format($$ select pg_temp.put(%L) $$, pg_temp.id_of('draft') || '-pending.pdf'),
                 '42501', null, 'a version never sent is not kept');
select throws_ok(format($$ select pg_temp.put(%L) $$, pg_temp.id_of('sent') || '-sent.pdf'),
                 '42501', null, 'nor a state the version is not in');
select lives_ok(format($$ select pg_temp.put(%L) $$, pg_temp.id_of('sent') || '-superseded.pdf'),
                'the owner keeps the sent version');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from storage.objects
            where bucket_id = 'framing-brief-pdfs' and name = pg_temp.id_of('sent') || '-superseded.pdf'), 1,
          'the direction reads it');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from storage.objects
            where bucket_id = 'framing-brief-pdfs' and name = pg_temp.id_of('sent') || '-superseded.pdf'), 0,
          'someone outside the project does not');
reset role;

select * from finish();
rollback;
