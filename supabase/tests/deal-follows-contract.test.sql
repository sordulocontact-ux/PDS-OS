-- Business module (20261123100101): a deal's stage follows its contract, wherever
-- the contract comes from: sent → « Contractualisation » once the accord is
-- validated, signed → « Signé ». Run with `supabase test db`.
begin;
select plan(7);

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
insert into ids select 'pending', public.create_deal(
  p_artist_id => pg_temp.id_of('jay'), p_assignee_person_id => pg_temp.id_of('glen_person'));
reset role;

-- Two contracts made elsewhere (in Contrats, the Juridique), approved.
insert into public.contracts (organization_id, title, type, status, owner_person_id)
values (pg_temp.id_of('org'), 'Contrat A ' || pg_temp.tag(), 'artist', 'approved', pg_temp.id_of('glen_person')),
       (pg_temp.id_of('org'), 'Contrat B ' || pg_temp.tag(), 'artist', 'approved', pg_temp.id_of('glen_person'));
insert into ids select 'contract', id from public.contracts where title = 'Contrat A ' || pg_temp.tag();
insert into ids select 'contract_b', id from public.contracts where title = 'Contrat B ' || pg_temp.tag();
-- The accord validated on one deal, pending on the other.
update public.deals set stage = 'agreement', agreement_status = 'validated',
       contract_id = pg_temp.id_of('contract') where id = pg_temp.id_of('deal');
update public.deals set stage = 'agreement', agreement_status = 'pending',
       contract_id = pg_temp.id_of('contract_b') where id = pg_temp.id_of('pending');

create function pg_temp.stage(p text) returns text language sql as $$
  select stage from public.deals where id = pg_temp.id_of(p) $$;

update public.contracts set status = 'sent', sent_via = 'other', sent_how = 'Envoyé depuis ma messagerie',
       sent_on = current_date where id in (pg_temp.id_of('contract'), pg_temp.id_of('contract_b'));
select is(pg_temp.stage('deal'), 'contracting', 'its contract sent, the validated accord moves to contractualisation');
select is(pg_temp.stage('pending'), 'agreement', 'an accord not validated stays');
select is((select detail ->> 'contract' from public.deal_events
            where deal_id = pg_temp.id_of('deal') and kind = 'stage' and to_stage = 'contracting'),
  'sent', 'the move is journaled with the contract''s status');

update public.contracts set status = 'sent' where id = pg_temp.id_of('contract');
select is((select count(*)::int from public.deal_events where deal_id = pg_temp.id_of('deal') and kind = 'stage'),
  1, 'nothing moves when the status does not change');

update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('contract');
select is(pg_temp.stage('deal'), 'signed', 'its contract signed, the deal is signed');
select is((select from_stage from public.deal_events
            where deal_id = pg_temp.id_of('deal') and kind = 'stage' and to_stage = 'signed'),
  'contracting', 'from contractualisation');

-- Signed straight from the accord (the contract was sent before the deal had it).
update public.deals set stage = 'agreement' where id = pg_temp.id_of('pending');
update public.deals set agreement_status = 'validated' where id = pg_temp.id_of('pending');
update public.contracts set status = 'signed', signed_on = current_date where id = pg_temp.id_of('contract_b');
select is(pg_temp.stage('pending'), 'signed', 'a validated accord whose contract is signed is signed');

select * from finish();
rollback;
