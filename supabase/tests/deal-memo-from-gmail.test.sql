-- A memo found in the negotiator's own Gmail (20261124110101): its PDFs, uploaded
-- with her session, become the deal's memo as one sent to po@.
-- Run with `supabase test db`.
begin;
select plan(8);

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
grant all on ids to authenticated, service_role;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, service_role;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('glen'), ('other_pm')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('glen', 'business_manager'),
               ('other_pm', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'glen', 'other_pm');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated, service_role;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated, service_role;
create function pg_temp.memo(p integer) returns uuid language sql as $$
  select id from public.deal_memos where deal_id = pg_temp.id_of('deal') and number = p $$;
grant execute on function pg_temp.memo(integer) to authenticated, service_role;
create function pg_temp.told(p_who text, p_kind text) returns integer language sql as $$
  select count(*)::int from public.notifications
   where recipient_person_id = pg_temp.id_of(p_who || '_person') and kind = p_kind
     and subject_id = pg_temp.id_of('deal') $$;

insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Jay ' || pg_temp.tag(), 'collaboration');
insert into ids select 'jay', id from public.artists where name = 'Jay ' || pg_temp.tag();
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Eben ' || pg_temp.tag(), array[]::text[]);
insert into ids select 'eben', id from public.network_contacts where name = 'Eben ' || pg_temp.tag();

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'deal', public.create_deal(
  p_artist_id => pg_temp.id_of('jay'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;


create function pg_temp.path(p text) returns text language sql as $$
  select pg_temp.id_of('org')::text || '/' || pg_temp.id_of('deal')::text || '/' || p || '.pdf' $$;
grant execute on function pg_temp.path(text) to authenticated;


select pg_temp.act_as(pg_temp.id_of('glen'));
insert into storage.objects (bucket_id, name, metadata)
values ('deal-files', pg_temp.path('g1'), jsonb_build_object('size', 1500));
reset role;

select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ select public.file_deal_memo_from_mail(pg_temp.id_of('deal'), '<g1@label>', 'Léa <lea@label.fr>',
    'Deal memo', now(), jsonb_build_array(jsonb_build_object('path', pg_temp.path('g1'), 'name', 'Memo.pdf'))) $$,
  'P0002', null, 'a member who does not read the deal files nothing');
reset role;

select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.file_deal_memo_from_mail(pg_temp.id_of('deal'), '', 'x', 'y', now(), '[]') $$,
  '22023', null, 'a mail without Message-ID is refused');
select throws_ok($$ select public.file_deal_memo_from_mail(pg_temp.id_of('deal'), '<g0@label>', 'x', 'y', now(),
    jsonb_build_array(jsonb_build_object('path', pg_temp.path('absent'), 'name', 'Memo.pdf'))) $$,
  'P0002', null, 'a PDF never uploaded is refused');
select isnt(public.file_deal_memo_from_mail(pg_temp.id_of('deal'), '<g1@label>', 'Léa <lea@label.fr>',
    'Deal memo Jay', '2026-11-21 10:00+01', jsonb_build_array(jsonb_build_object('path', pg_temp.path('g1'), 'name', 'Memo Jay.pdf'))), null,
  'the negotiator files the memo found in her Gmail');
reset role;
select is((select source || '/' || status || '/' || email_subject from public.deal_memos where id = pg_temp.memo(1)),
  'email/draft/Deal memo Jay', 'a memo « À valider », as one received by e-mail, with its subject');
select is((select email_text from public.deal_memos where id = pg_temp.memo(1)), null,
  'the mail''s text stays in her mailbox');
select is((select file_name || '/' || size_bytes from public.deal_memo_files where memo_id = pg_temp.memo(1)),
  'Memo Jay.pdf/1500', 'its PDF, its size read from the storage');

select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.file_deal_memo_from_mail(pg_temp.id_of('deal'), '<g1@label>', 'x', 'y', now(),
    jsonb_build_array(jsonb_build_object('path', pg_temp.path('g1'), 'name', 'Memo.pdf'))) $$,
  '23505', null, 'the same mail is filed once');
reset role;

select * from finish();
rollback;
