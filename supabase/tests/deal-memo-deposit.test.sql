-- « Déposer le memo reçu » (20261123220101): whoever writes an open deal uploads the
-- PDF the label sent them and files it as the deal's memo (source « upload »).
-- Run with `supabase test db`.
begin;
select plan(18);

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

-- Storage: who writes the deal drops under its folder ------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ insert into storage.objects (bucket_id, name, metadata)
    values ('deal-files', pg_temp.path('m1'), jsonb_build_object('size', 1200)) $$,
  'the negotiator uploads a PDF in the deal''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name, metadata)
    values ('deal-files', pg_temp.id_of('org')::text || '/' || gen_random_uuid()::text || '/x.pdf',
            jsonb_build_object('size', 1200)) $$,
  '42501', null, 'never in another deal''s folder');
reset role;

select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ insert into storage.objects (bucket_id, name, metadata)
    values ('deal-files', pg_temp.path('m2'), jsonb_build_object('size', 1200)) $$,
  '42501', null, 'a member who does not write the deal uploads nothing');
select throws_ok($$ select public.deposit_deal_memo(pg_temp.id_of('deal'), pg_temp.path('m1'), 'Memo.pdf') $$,
  'P0002', null, 'nor deposits a memo on a deal he does not read');
reset role;

-- The memo ------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.deposit_deal_memo(pg_temp.id_of('deal'),
    pg_temp.id_of('org')::text || '/' || gen_random_uuid()::text || '/x.pdf', 'Memo.pdf') $$,
  '22023', null, 'a path outside the deal''s folder is refused');
select throws_ok($$ select public.deposit_deal_memo(pg_temp.id_of('deal'), pg_temp.path('absent'), 'Memo.pdf') $$,
  'P0002', null, 'a file never uploaded is refused');
select isnt(public.deposit_deal_memo(pg_temp.id_of('deal'), pg_temp.path('m1'), 'Memo label.pdf'), null,
  'the negotiator deposits the memo he received');
reset role;

select is((select source || '/' || status from public.deal_memos where id = pg_temp.memo(1)),
  'upload/draft', 'a deposited memo is a draft whose source is « upload »');
select is((select created_by from public.deal_memos where id = pg_temp.memo(1)),
  pg_temp.id_of('glen_person'), 'its author is who dropped it');
select is((select file_name || '/' || size_bytes from public.deal_memo_files where memo_id = pg_temp.memo(1)),
  'Memo label.pdf/1200', 'its PDF is the memo''s file, its size read from the storage');
select is((select count(*)::int from public.deal_events
            where deal_id = pg_temp.id_of('deal') and kind = 'memo_received'),
  1, 'the deal''s journal says a memo came');

select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.deposit_deal_memo(pg_temp.id_of('deal'), pg_temp.path('m1'), 'Memo.pdf') $$,
  '23505', null, 'the same file is never filed twice');
select is((select count(*)::int from storage.objects
            where bucket_id = 'deal-files' and name = pg_temp.path('m1')), 1,
  'he reads the file of his memo');
select lives_ok($$ insert into storage.objects (bucket_id, name, metadata)
    values ('deal-files', pg_temp.path('orphan'), jsonb_build_object('size', 10)) $$,
  'a drop whose memo failed…');
reset role;
-- Supabase refuses a direct delete on storage.objects (protect_delete): the
-- policy is read as the API would.
select is((select count(*)::int from pg_policies
            where tablename = 'objects' and policyname = 'deal_files_delete_unfiled'), 1,
  '…can be removed by its uploader while no memo holds it (policy present)');
select pg_temp.act_as(pg_temp.id_of('glen'));
select ok(public.can_drop_deal_file(pg_temp.path('orphan')), 'the uploader may still remove it');
reset role;

-- Closed deal ---------------------------------------------------------------------------------
update public.deals set stage = 'abandoned', abandon_reason = 'Test' where id = pg_temp.id_of('deal');
select pg_temp.act_as(pg_temp.id_of('glen'));
select ok(not public.can_drop_deal_file(pg_temp.path('m3')), 'an abandoned deal takes no file');
select throws_ok($$ select public.deposit_deal_memo(pg_temp.id_of('deal'), pg_temp.path('m1'), 'Memo.pdf') $$,
  'P0001', null, 'nor any memo');
reset role;

select * from finish();
rollback;
