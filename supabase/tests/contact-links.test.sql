-- Lot 11: one private page per person and per project
-- (supabase/migrations/20261019110101_project_contact_links.sql,
-- 20261019110201_contact_link_overloads.sql). Run with `supabase test db`.
-- A token reads only the objects of its contact in its project; a revoked
-- or expired link reads nothing; anon never reads the table.
begin;
select plan(25);

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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
create function pg_temp.v(p_k text) returns text language sql as $$
  select v from vars where k = p_k
$$;

insert into ids values
  ('manager', pg_temp.new_user('manager-' || pg_temp.v('tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || pg_temp.v('tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('manager', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'manager_person', person_id from public.accounts
 where id = pg_temp.id_of('manager');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Lien ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person')),
       (pg_temp.id_of('org'), 'Ailleurs ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person'));
insert into ids select 'project', id from public.projects where title = 'Lien ' || pg_temp.v('tag');
insert into ids select 'other_project', id from public.projects where title = 'Ailleurs ' || pg_temp.v('tag');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Mona ' || pg_temp.v('tag'), '{artist}'),
       (pg_temp.id_of('org'), 'person', 'Sami ' || pg_temp.v('tag'), '{songwriter}');
insert into ids select 'mona', id from public.network_contacts where name = 'Mona ' || pg_temp.v('tag');
insert into ids select 'sami', id from public.network_contacts where name = 'Sami ' || pg_temp.v('tag');

-- Three fiches: Mona's here, Sami's here, Mona's in another project.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into ids select 'mona_form', form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), pg_temp.id_of('mona'), 'Mona', array['artist'], '{}', '{}'::jsonb, 1);
insert into ids select 'sami_form', form_id from public.prepare_legal_form(
  pg_temp.id_of('project'), pg_temp.id_of('sami'), 'Sami', array['songwriter'], '{}', '{}'::jsonb, 1);
insert into ids select 'mona_elsewhere', form_id from public.prepare_legal_form(
  pg_temp.id_of('other_project'), pg_temp.id_of('mona'), 'Mona', array['artist'], '{}', '{}'::jsonb, 1);

-- Issuing ---------------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok(
  format('select public.issue_contact_link(%L, %L)', pg_temp.id_of('project'), pg_temp.id_of('mona')),
  '42501', 'forbidden', 'only the project''s owner gives a person their link');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('mona'));
select ok(pg_temp.v('token') ~ '^[0-9a-f]{64}$', 'the owner gets the token');
reset role;
select is((select count(*)::int from public.project_contact_links where token_hash = pg_temp.v('token')),
          0, 'the token itself is never stored, only its hash and its sealed copy');
insert into ids select 'link', id from public.project_contact_links
 where project_id = pg_temp.id_of('project') and contact_id = pg_temp.id_of('mona');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is(public.contact_link_token(pg_temp.id_of('link')), pg_temp.v('token'),
          'the owner can copy the link again');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is(public.contact_link_token(pg_temp.id_of('link')), null,
          'nobody else reads the token back');
select throws_ok('select token_hash from public.project_contact_links', '42501', null,
                 'members never read the hash');

-- The person's page -------------------------------------------------------------
reset role;
set local role anon;
select throws_ok('select count(*) from public.project_contact_links', '42501', null,
                 'anon never reads the table');
select is(public.get_contact_page(pg_temp.v('token')) ->> 'person', 'Mona ' || pg_temp.v('tag'),
          'the page names its person');
select is(jsonb_array_length(public.get_contact_page(pg_temp.v('token')) -> 'items'), 1,
          'only this contact''s objects, in this project');
select is((public.get_contact_page(pg_temp.v('token')) -> 'items' -> 0 ->> 'id')::uuid,
          pg_temp.id_of('mona_form'), 'her own fiche');
select is(public.get_contact_page(pg_temp.v('token')) -> 'items' -> 0 ->> 'state', 'todo',
          'still to fill: « À vous »');
select is(public.get_contact_page(repeat('0', 64)), null, 'an unknown token shows nothing');

-- The object's own functions, through the person's link ---------------------------
select is(public.get_legal_form(pg_temp.v('token'), pg_temp.id_of('mona_form')) ->> 'state', 'open',
          'her fiche opens with her token and its id');
select is(public.get_legal_form(pg_temp.v('token'), pg_temp.id_of('sami_form')), null,
          'another contact''s fiche never opens');
select is(public.get_legal_form(pg_temp.v('token'), pg_temp.id_of('mona_elsewhere')), null,
          'nor her fiche of another project');
select is(public.submit_legal_form(pg_temp.v('token'), pg_temp.id_of('mona_form'), array['artist'], null,
          '{"legal_first_name": "Mona", "legal_last_name": "Lys", "email": "mona@example.com", "entity_type": "person"}'::jsonb,
          '{}'::jsonb, 1),
          'complete', 'she sends it from her page');
select is(public.get_contact_page(pg_temp.v('token')) -> 'items' -> 0 ->> 'state', 'done',
          'then it is « Fait »');
select public.note_contact_link_opened(pg_temp.v('token'));
reset role;
select is((select open_count from public.project_contact_links where id = pg_temp.id_of('link')), 1,
          'the opening is counted');

-- Renewal, revocation, expiry ------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token2', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('mona'));
reset role;
select is((select count(*)::int from public.project_contact_links
            where project_id = pg_temp.id_of('project') and contact_id = pg_temp.id_of('mona')
              and revoked_at is null), 1, 'one active link per person and project');
set local role anon;
select is(public.get_contact_page(pg_temp.v('token')) ->> 'state', 'revoked',
          'the former link says it no longer works');
select is(public.get_legal_form(pg_temp.v('token'), pg_temp.id_of('mona_form')), null,
          'and opens nothing');
reset role;
insert into ids select 'link2', id from public.project_contact_links
 where project_id = pg_temp.id_of('project') and contact_id = pg_temp.id_of('mona') and revoked_at is null;
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format('select public.revoke_contact_link(%L, %L)', pg_temp.id_of('link2'), ' '),
                 '23514', 'reason_required', 'a revocation says why');
select public.revoke_contact_link(pg_temp.id_of('link2'), 'Mauvaise adresse e-mail');
reset role;
set local role anon;
select is(public.get_contact_page(pg_temp.v('token2')) ->> 'state', 'revoked', 'a revoked link reads nothing');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into vars select 'token3', public.issue_contact_link(pg_temp.id_of('project'), pg_temp.id_of('mona'));
reset role;
update public.project_contact_links set expires_at = now() - interval '1 day'
 where project_id = pg_temp.id_of('project') and contact_id = pg_temp.id_of('mona') and revoked_at is null;
set local role anon;
select is(public.get_contact_page(pg_temp.v('token3')) ->> 'state', 'expired', 'an expired link says so');
select is(public.get_legal_form(pg_temp.v('token3'), pg_temp.id_of('mona_form')), null,
          'and opens nothing');

select * from finish();
rollback;
