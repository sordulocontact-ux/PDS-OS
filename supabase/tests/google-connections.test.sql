-- Paramètres › Connexions (supabase/migrations/20261112100101): a member's
-- Google accounts and choices are theirs alone; the work address is written
-- by the direction, one member per address. Run with `supabase test db`.
begin;
select plan(12);

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

insert into ids values
  ('member', pg_temp.new_user('member-' || substr(md5(random()::text), 1, 8) || '@pds.test')),
  ('other', pg_temp.new_user('other-' || substr(md5(random()::text), 1, 8) || '@pds.test')),
  ('director', pg_temp.new_user('director-' || substr(md5(random()::text), 1, 8) || '@pds.test'));
update public.memberships m set status = 'approved', role = 'creative_director'
 where m.person_id in (select person_id from public.accounts
                        where id in (pg_temp.id_of('member'), pg_temp.id_of('other')));
update public.memberships m set status = 'approved', role = 'general_director'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('director'));
insert into ids select 'member_person', person_id from public.accounts where id = pg_temp.id_of('member');
insert into ids select 'member_membership', m.id from public.memberships m
 where m.person_id = pg_temp.id_of('member_person');
insert into ids select 'other_membership', m.id from public.memberships m
 join public.accounts a on a.person_id = m.person_id where a.id = pg_temp.id_of('other');

-- The member: their own accounts and choices.
select pg_temp.act_as(pg_temp.id_of('member'));

select lives_ok($$
  insert into public.google_accounts (email, refresh_token_sealed, scopes)
  values ('perso.member@gmail.com', 'v1.sealed', array['gmail.readonly'])
$$, 'a member connects one of their Google accounts');

select is(
  (select person_id from public.google_accounts where email = 'perso.member@gmail.com'),
  pg_temp.id_of('member_person'),
  'the account is the caller''s, whatever the client sends');

select lives_ok($$
  insert into public.google_service_opt_outs (account_email, service)
  values ('perso.member@gmail.com', 'gmail')
$$, 'a member turns one service of one account off');

select throws_ok($$
  insert into public.google_service_opt_outs (account_email, service)
  values ('perso.member@gmail.com', 'photos')
$$, '23514', null, 'only Agenda, Gmail and Drive');

select throws_ok($$
  insert into public.google_accounts (person_id, email, refresh_token_sealed)
  values (gen_random_uuid(), 'x@gmail.com', 'v1.sealed')
$$, '42501', null, 'nobody connects an account for someone else');

update public.memberships set google_work_email = 'boss@pdsrecords.com'
 where id = pg_temp.id_of('member_membership');
select is(
  (select google_work_email from public.memberships where id = pg_temp.id_of('member_membership')),
  null,
  'a member never writes their work address (it would open a mailbox)');

reset role;

-- The direction: never reads a member's accounts, writes the work address.
select pg_temp.act_as(pg_temp.id_of('director'));

select is(
  (select count(*)::int from public.google_accounts
    where person_id = pg_temp.id_of('member_person'))
  + (select count(*)::int from public.google_service_opt_outs
      where person_id = pg_temp.id_of('member_person')),
  0,
  'not even the direction reads a member''s accounts and choices');

select lives_ok($$
  update public.memberships set google_work_email = 'member@pdsrecords.com'
   where id = pg_temp.id_of('member_membership')
$$, 'the direction writes a member''s work address');

select throws_ok($$
  update public.memberships set google_work_email = 'member@pdsrecords.com'
   where id = pg_temp.id_of('other_membership')
$$, '23505', null, 'one member per work address');

select throws_ok($$
  update public.memberships set google_work_email = 'Member@PDSrecords.com '
   where id = pg_temp.id_of('other_membership')
$$, '23514', null, 'the address is stored in lower case, trimmed');

reset role;

-- The member again: reads their own work address, disconnects.
select pg_temp.act_as(pg_temp.id_of('member'));

select is(
  (select google_work_email from public.memberships where id = pg_temp.id_of('member_membership')),
  'member@pdsrecords.com',
  'the member reads their work address');

select lives_ok($$
  delete from public.google_accounts where email = 'perso.member@gmail.com'
$$, 'the member disconnects their account');

select * from finish();
rollback;
