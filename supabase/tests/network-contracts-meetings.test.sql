-- Network, contracts, file versions and internal meetings
-- (supabase/migrations/20260929000101…000301). Run with `supabase test db`.
begin;
select plan(31);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other', 'creative');

-- Network -------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles)
  values (pg_temp.id_of('org'), 'organization', 'Studio Lumière', array['provider', 'engineer'])
$$, 'every poste adds an organization to the network (manage_network)');
insert into ids select 'studio', id from public.network_contacts where name = 'Studio Lumière'
 order by created_at desc limit 1;

select lives_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles, parent_id, email)
  values (pg_temp.id_of('org'), 'person', 'Inès Beat', array['beatmaker'], pg_temp.id_of('studio'),
          'ines@example.com')
$$, 'a person belongs to an organization of the network');
insert into ids select 'ines', id from public.network_contacts where name = 'Inès Beat'
 order by created_at desc limit 1;

select throws_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles, parent_id)
  values (pg_temp.id_of('org'), 'person', 'Membre de personne', array['musician'], pg_temp.id_of('ines'))
$$, '23514', 'network_parent_not_organization', 'a person never belongs to another person');

select throws_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles)
  values (pg_temp.id_of('org'), 'person', 'Sans rôle connu', array['astronaut'])
$$, '23514', null, 'roles come from the known list');

select throws_ok($$
  update public.network_contacts set archived_at = now() where id = pg_temp.id_of('ines')
$$, '42501', null, 'archived_at is never written directly');

-- Contracts -----------------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select throws_ok($$
  insert into public.contracts (organization_id, title, type, owner_person_id)
  values (pg_temp.id_of('org'), 'Contrat interdit', 'service', pg_temp.id_of('creative_person'))
$$, null, null, 'a creative director does not create contracts');

reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$
  insert into public.contracts (organization_id, title, type, owner_person_id, due_on)
  values (pg_temp.id_of('org'), 'Prestation studio ' || (select v from vars where k = 'tag'),
          'service', pg_temp.id_of('owner_person'), current_date + 10)
$$, 'a project manager creates a contract they follow');
insert into ids select 'contract', id from public.contracts
 where title = 'Prestation studio ' || (select v from vars where k = 'tag');

select throws_ok($$
  insert into public.contracts (organization_id, title, type, owner_person_id)
  values (pg_temp.id_of('org'), 'Pour un autre', 'service', pg_temp.id_of('other_person'))
$$, '42501', null, 'a project manager does not give a contract to someone else');

select lives_ok($$
  insert into public.contract_parties (contract_id, organization_id, contact_id, role)
  values (pg_temp.id_of('contract'), pg_temp.id_of('org'), pg_temp.id_of('studio'), 'Prestataire')
$$, 'the owner names a party from the network');

select throws_ok($$
  update public.contracts set status = 'signed' where id = pg_temp.id_of('contract')
$$, '42501', null, 'the status is never written directly');

-- Versions of a contract file.
select lives_ok($$
  insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
  values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 'draft',
          pg_temp.id_of('org') || '/' || pg_temp.id_of('contract') || '/' || gen_random_uuid() || '.pdf',
          'contrat-v1.pdf', 'application/pdf', 100)
$$, 'the owner adds a draft');
insert into ids select 'v1', id from public.contract_files where file_name = 'contrat-v1.pdf'
 and contract_id = pg_temp.id_of('contract');
insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes, replaces_id)
values (pg_temp.id_of('org'), pg_temp.id_of('contract'), 'draft',
        pg_temp.id_of('org') || '/' || pg_temp.id_of('contract') || '/' || gen_random_uuid() || '.pdf',
        'contrat-v2.pdf', 'application/pdf', 120, pg_temp.id_of('v1'));
select is((select version from public.contract_files where file_name = 'contrat-v2.pdf'
            and contract_id = pg_temp.id_of('contract')),
          2, 'a new version takes the next number in its series');
select is((select series_id from public.contract_files where file_name = 'contrat-v2.pdf'
            and contract_id = pg_temp.id_of('contract')),
          pg_temp.id_of('v1'), 'a new version joins the replaced file''s series');
select is((select count(*)::int from public.library_files where source = 'contract'
            and owner_id = pg_temp.id_of('contract')),
          1, 'the library shows the latest version only');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.contracts where id = pg_temp.id_of('contract')),
          0, 'another project manager does not see the contract');
select is((select count(*)::int from public.contract_files where contract_id = pg_temp.id_of('contract')),
          0, 'nor its files');
select is((select count(*)::int from public.library_files where source = 'contract'
            and owner_id = pg_temp.id_of('contract')),
          0, 'nor in the library');

reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select lives_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'submit') $$,
  'the owner submits the contract to the director');
update public.contracts set title = 'Changé pendant la relecture' where id = pg_temp.id_of('contract');
select is((select count(*)::int from public.contracts where title = 'Changé pendant la relecture'),
          0, 'a contract under review is frozen');
select throws_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'approve') $$,
  '42501', null, 'the owner does not approve their own contract');

reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('contract') and kind = 'contract_review_requested'
              and recipient_person_id = pg_temp.id_of('director_person')),
          1, 'the director is asked to review it');
select throws_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'request_changes') $$,
  'P0001', 'contract_comment_required', 'asking for changes needs a comment');
select lives_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'approve', 'OK') $$,
  'the director approves it');

reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'sign', null, current_date + 1) $$,
  'P0001', 'contract_signed_on_invalid', 'a signature date is never in the future');
select lives_ok($$ select public.advance_contract(pg_temp.id_of('contract'), 'sign', null, current_date) $$,
  'the owner records the signature');

reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.set_network_contact_archived(pg_temp.id_of('studio'), true) $$,
  'P0001', 'contact_in_use', 'a party of a running contract is not archived');

-- Internal meetings ---------------------------------------------------------
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select lives_ok($$
  insert into public.calls (organization_id, title, occurred_at, consent, meeting_url)
  values (pg_temp.id_of('org'), 'Point créa ' || (select v from vars where k = 'tag'), now() + interval '1 day',
          'granted', 'https://meet.google.com/abc-defg-hij')
$$, 'any member creates a meeting without a project, with its video link');
insert into ids select 'meeting', id from public.calls
 where title = 'Point créa ' || (select v from vars where k = 'tag');
select lives_ok($$
  insert into public.call_attendees (call_id, organization_id, person_id)
  values (pg_temp.id_of('meeting'), pg_temp.id_of('org'), pg_temp.id_of('owner_person'))
$$, 'its creator invites a member');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select is((select count(*)::int from public.calls where id = pg_temp.id_of('meeting')),
          0, 'a member not invited does not see the meeting');

reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select count(*)::int from public.calls where id = pg_temp.id_of('meeting')),
          1, 'an attendee sees it');
select is((select count(*)::int from public.notifications
            where subject_id = pg_temp.id_of('meeting') and kind = 'meeting_invited'),
          1, 'and was notified of the invitation');

select * from finish();
rollback;
