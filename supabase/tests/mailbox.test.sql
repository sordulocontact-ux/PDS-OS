-- « Mails » (supabase/migrations/20261123200101_mailbox.sql): a member reads the e-mails that are
-- theirs, the direction every one; a member records only what they just sent, as theirs; nobody
-- changes or deletes a message from the app. Run with `supabase test db`.
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
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into ids select r.name, pg_temp.new_user('mb-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('dg'), ('manager'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('dg', 'general_director'), ('manager', 'project_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select 'p-' || i.name, a.person_id
  from ids i join public.accounts a on a.id = i.id
 where i.name in ('dg', 'manager', 'thibault');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;

-- The cron copies two messages: one the manager's, one nobody's.
insert into public.mailbox_messages (organization_id, folder, message_id, imap_uid, person_ids, subject, sent_at)
values (pg_temp.id_of('org'), 'inbox', '<mine-' || (select v from vars where k = 'tag') || '@x>', 1,
        array[pg_temp.id_of('p-manager')], 'Devis signé', now()),
       (pg_temp.id_of('org'), 'inbox', '<none-' || (select v from vars where k = 'tag') || '@x>', 2,
        '{}', 'Newsletter', now());
insert into ids select 'mine', id from public.mailbox_messages
 where message_id = '<mine-' || (select v from vars where k = 'tag') || '@x>';
insert into ids select 'none', id from public.mailbox_messages
 where message_id = '<none-' || (select v from vars where k = 'tag') || '@x>';

-- Who reads what ------------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('dg'));
select is((select count(*) from public.mailbox_messages
            where id in (pg_temp.id_of('mine'), pg_temp.id_of('none'))),
          2::bigint, 'the direction reads every e-mail of the box');
select pg_temp.act_as(pg_temp.id_of('manager'));
select is((select array_agg(id) from public.mailbox_messages
            where id in (pg_temp.id_of('mine'), pg_temp.id_of('none'))),
          array[pg_temp.id_of('mine')], 'a member reads the e-mails that are theirs only');
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select count(*) from public.mailbox_messages
            where id in (pg_temp.id_of('mine'), pg_temp.id_of('none'))),
          0::bigint, 'another member reads none of them');

-- Writing: what one just sent, as one's own ---------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok($$ insert into public.mailbox_messages
                     (organization_id, folder, message_id, person_ids, subject, sent_at)
                   values (pg_temp.id_of('org'), 'sent', '<sent-' || (select v from vars where k = 'tag') || '@x>',
                           array[pg_temp.id_of('p-manager')], 'Re: Devis', now()) $$,
  'a member records the e-mail they just sent');
select throws_ok($$ insert into public.mailbox_messages
                      (organization_id, folder, message_id, person_ids, subject, sent_at)
                    values (pg_temp.id_of('org'), 'sent', '<other-' || (select v from vars where k = 'tag') || '@x>',
                            array[pg_temp.id_of('p-thibault')], 'Faux', now()) $$,
  '42501', null, 'never as another member''s');
select throws_ok($$ insert into public.mailbox_messages
                      (organization_id, folder, message_id, person_ids, subject, sent_at)
                    values (pg_temp.id_of('org'), 'inbox', '<in-' || (select v from vars where k = 'tag') || '@x>',
                            array[pg_temp.id_of('p-manager')], 'Faux reçu', now()) $$,
  '42501', null, 'never a received e-mail');
select throws_ok($$ insert into public.mailbox_messages
                      (organization_id, folder, message_id, person_ids, subject, sent_at)
                    values (pg_temp.id_of('org'), 'sent', '<old-' || (select v from vars where k = 'tag') || '@x>',
                            array[pg_temp.id_of('p-manager')], 'Ancien', now() - interval '2 days') $$,
  '42501', null, 'never an e-mail of another day');
select throws_ok($$ insert into public.mailbox_messages
                      (organization_id, folder, message_id, imap_uid, person_ids, subject, sent_at)
                    values (pg_temp.id_of('org'), 'sent', '<uid-' || (select v from vars where k = 'tag') || '@x>', 9,
                            array[pg_temp.id_of('p-manager')], 'Uid', now()) $$,
  '42501', null, 'never the columns only the cron writes');

-- Nobody changes or deletes a message ---------------------------------------------------------
select throws_ok($$ update public.mailbox_messages set subject = 'x' where id = pg_temp.id_of('mine') $$,
  '42501', null, 'a member never changes a message');
select pg_temp.act_as(pg_temp.id_of('dg'));
select throws_ok($$ delete from public.mailbox_messages where id = pg_temp.id_of('mine') $$,
  '42501', null, 'nor does the direction delete one');

select * from finish();
rollback;
