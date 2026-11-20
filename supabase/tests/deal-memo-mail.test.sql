-- Business module (…20261120150101): the deal memo's circuit by e-mail.
-- A memo received by the cron (service role only, once per Message-ID, with
-- its PDFs), shown to the direction, changes asked with a reason, validated,
-- sent back once; the people in the loop; the notifications.
-- Run with `supabase test db`.
begin;
select plan(42);

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
create function pg_temp.files(p text) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'path', pg_temp.id_of('org')::text || '/' || pg_temp.id_of('deal')::text || '/' || p || '.pdf',
    'name', 'Deal memo Jay.pdf', 'size', 1200)) $$;
grant execute on function pg_temp.files(text) to service_role;

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

-- Received by e-mail ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.receive_deal_memo(pg_temp.id_of('deal'), '<m1@label>', 'a@label.fr',
    'Deal memo', 'Bonjour', now(), '[]') $$,
  '42501', null, 'a member never files a memo as if it came by e-mail');
reset role;

select set_config('request.jwt.claims', '', true);
set local role service_role;
select isnt(public.receive_deal_memo(pg_temp.id_of('deal'), '<m1@label>', 'a@label.fr',
    'Deal memo Jay', 'Bonjour, voici le deal memo.', now(), pg_temp.files('m1')), null,
  'the cron files a memo received by e-mail');
select is(public.receive_deal_memo(pg_temp.id_of('deal'), '<m1@label>', 'a@label.fr',
    'Deal memo Jay', 'Bonjour', now(), pg_temp.files('m1b')), null,
  'the same e-mail is filed once');
select throws_ok($$ select public.receive_deal_memo(pg_temp.id_of('deal'), '<m0@label>', 'a@label.fr',
    'Re', 'Merci', now(), '[]') $$,
  '22023', 'memo_without_file', 'an e-mail without a PDF is no memo');
select throws_ok($$ select public.receive_deal_memo(pg_temp.id_of('deal'), '<m9@label>', 'a@label.fr',
    'Re', 'x', now(), '[{"path": "elsewhere/x.pdf", "name": "x.pdf"}]') $$,
  '22023', 'invalid_path', 'a file only where the cron puts a deal''s files');
reset role;

select is((select source || '/' || status || '/' || email_from from public.deal_memos
            where id = pg_temp.memo(1)), 'email/draft/a@label.fr',
  'memo n°1 is a draft received from its sender');
select is((select count(*)::int from public.deal_memo_files where memo_id = pg_temp.memo(1)), 1,
  'with its PDF');
select is((select count(*)::int from public.deal_events
            where deal_id = pg_temp.id_of('deal') and kind = 'memo_received'), 1,
  'the journal says it came');
select is(pg_temp.told('glen', 'deal_memo_received'), 1, 'the negotiator is told');
select is(pg_temp.told('director', 'deal_memo_received'), 0, 'the direction not yet');

select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select count(*)::int from public.deal_memo_files), 1, 'the negotiator reads its files');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.deal_memo_files
            where memo_id = pg_temp.memo(1)), 0, 'another member reads none');
reset role;

-- Shown to the direction -----------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.submit_deal_memo(pg_temp.memo(1)) $$,
  'the negotiator shows it to the direction');
select throws_ok($$ select public.submit_deal_memo(pg_temp.memo(1)) $$,
  'P0001', 'memo_submitted', 'once');
select throws_ok($$ select public.request_deal_memo_changes(pg_temp.memo(1), 'Non') $$,
  '42501', 'forbidden', 'only the direction asks for changes');
reset role;
select is(pg_temp.told('director', 'deal_memo_submitted'), 1, 'the direction is told');

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.request_deal_memo_changes(pg_temp.memo(1), '  ') $$,
  '22023', 'reason_required', 'a change is asked with a reason');
select lives_ok($$ select public.request_deal_memo_changes(pg_temp.memo(1),
    'Après l''appel : avance à 25 000 €') $$, 'the direction asks for changes');
select throws_ok($$ select public.request_deal_memo_changes(pg_temp.memo(1), 'Encore') $$,
  'P0001', 'memo_changes_requested', 'once');
reset role;
select is((select changes_reason from public.deal_memos where id = pg_temp.memo(1)),
  'Après l''appel : avance à 25 000 €', 'the reason is kept on the memo');
select is((select reason from public.deal_events where deal_id = pg_temp.id_of('deal')
            and kind = 'memo_changes_requested'), 'Après l''appel : avance à 25 000 €',
  'and in the journal');
select is(pg_temp.told('glen', 'deal_memo_changes_requested'), 1, 'the negotiator is told');
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.submit_deal_memo(pg_temp.memo(1)) $$,
  'P0001', 'memo_changes_requested', 'a memo sent back is not shown again: the next version is');
select throws_ok($$ select public.record_deal_memo_sent(pg_temp.memo(1), 'Label (a@label.fr)') $$,
  'P0001', 'memo_not_validated', 'only a validated memo is sent back');
reset role;

-- The next version, validated, sent back -------------------------------------------------------
select set_config('request.jwt.claims', '', true);
set local role service_role;
select isnt(public.receive_deal_memo(pg_temp.id_of('deal'), '<m2@label>', 'a@label.fr',
    'Deal memo Jay v2', 'Voici la version corrigée.', now(), pg_temp.files('m2')), null,
  'the corrected memo comes by e-mail');
reset role;
select is((select number from public.deal_memos where email_message_id = '<m2@label>'), 2,
  'as memo n°2');
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.validate_deal_memo(pg_temp.memo(1)) $$,
  'P0001', 'memo_not_latest', 'the latest only is validated');
select lives_ok($$ select public.validate_deal_memo(pg_temp.memo(2)) $$,
  'the direction validates the new version');
reset role;
select is(pg_temp.told('glen', 'deal_memo_validated'), 1, 'the negotiator is told');

select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.record_deal_memo_sent(pg_temp.memo(2), 'Label (a@label.fr)') $$,
  'the negotiator sends the validated agreement back');
select throws_ok($$ select public.record_deal_memo_sent(pg_temp.memo(2), null) $$,
  'P0001', 'memo_sent', 'once');
reset role;
select is((select sent_to from public.deal_memos where id = pg_temp.memo(2)),
  'Label (a@label.fr)', 'to whom is kept');
select is(pg_temp.told('director', 'deal_memo_sent'), 1, 'the direction is told');

-- The loop -------------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select isnt(public.add_deal_loop(pg_temp.id_of('deal'), p_contact_id => pg_temp.id_of('eben')), null,
  'a contact of the Réseau is put in the loop');
select throws_ok($$ select public.add_deal_loop(pg_temp.id_of('deal'), p_contact_id => pg_temp.id_of('eben')) $$,
  'P0001', 'loop_unchanged', 'once');
select throws_ok($$ select public.add_deal_loop(pg_temp.id_of('deal'), pg_temp.id_of('eben'),
    pg_temp.id_of('director_person')) $$,
  '22023', 'invalid_loop', 'a contact or a member, not both');
select throws_ok($$ select public.add_deal_loop(pg_temp.id_of('deal'),
    p_person_id => pg_temp.id_of('other_pm_person')) $$,
  '22023', 'member_cannot_read_deal', 'a member who does not read the deal is never put in it');
select is((select count(*)::int from public.list_deal_loop_members(pg_temp.id_of('deal'))
            where person_id in (pg_temp.id_of('director_person'), pg_temp.id_of('glen_person'))), 2,
  'the members offered read the deal: the direction, the negotiator');
select is((select count(*)::int from public.list_deal_loop_members(pg_temp.id_of('deal'))
            where person_id = pg_temp.id_of('other_pm_person')), 0,
  'never another member');
select lives_ok($$ select public.remove_deal_loop(
    (select id from public.deal_memo_loop where contact_id = pg_temp.id_of('eben'))) $$,
  'and taken off');
reset role;

select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ select public.add_deal_loop(pg_temp.id_of('deal'), p_contact_id => pg_temp.id_of('eben')) $$,
  'P0002', 'deal_not_found', 'whoever does not read the deal puts no one in its loop');
select is((select count(*)::int from public.list_deal_loop_members(pg_temp.id_of('deal'))), 0,
  'nor sees its members');
reset role;

select * from finish();
rollback;
