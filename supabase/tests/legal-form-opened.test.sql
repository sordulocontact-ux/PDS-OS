-- Fiches de renseignements : ouverture et réception (JUR-11,
-- supabase/migrations/20261012100301_legal_form_opened_received.sql).
-- Run with `supabase test db`.
begin;
select plan(4);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('preparer', pg_temp.new_user('preparer-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id in (select person_id from public.accounts
                        where id in (pg_temp.id_of('owner'), pg_temp.id_of('preparer')));
insert into ids select 'owner_person', person_id from public.accounts
 where id = pg_temp.id_of('owner');
insert into ids select 'preparer_person', person_id from public.accounts
 where id = pg_temp.id_of('preparer');

insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'Live ' || (select v from vars where k = 'tag'), 'music_release',
        'single', pg_temp.id_of('owner_person'));
insert into ids select 'project', id from public.projects
 where title = 'Live ' || (select v from vars where k = 'tag');


insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Ever ' || (select v from vars where k = 'tag'), array['other']);
insert into ids select 'contact', id from public.network_contacts
 where name = 'Ever ' || (select v from vars where k = 'tag');
insert into vars values ('token', repeat('a', 63) || substr(md5(random()::text), 1, 1));
insert into public.legal_forms (organization_id, project_id, contact_id, status, token_hash,
                                expires_at, definition_version)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('contact'), 'sent',
        encode(sha256(convert_to((select v from vars where k = 'token'), 'UTF8')), 'hex'),
        now() + interval '30 days', 2);
insert into ids select 'form', id from public.legal_forms where contact_id = pg_temp.id_of('contact');
update public.legal_forms set created_by = pg_temp.id_of('preparer_person')
 where id = pg_temp.id_of('form');

set local role anon;
select public.note_legal_form_opened((select v from vars where k = 'token'));
reset role;
select isnt((select opened_at from public.legal_forms where id = pg_temp.id_of('form')), null,
            'opening the public link is noted');
insert into vars select 'opened', opened_at::text from public.legal_forms where id = pg_temp.id_of('form');
set local role anon;
select public.note_legal_form_opened((select v from vars where k = 'token'));
reset role;
select is((select opened_at::text from public.legal_forms where id = pg_temp.id_of('form')),
          (select v from vars where k = 'opened'), 'only the first opening is kept');

update public.legal_forms set status = 'complete', submitted_at = now()
 where id = pg_temp.id_of('form');
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('form') and kind = 'legal_form_received'),
          2, 'who prepared the fiche and the project''s responsible are told');
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('form')
              and recipient_person_id = pg_temp.id_of('preparer_person')),
          1, 'once each');

select * from finish();
rollback;
