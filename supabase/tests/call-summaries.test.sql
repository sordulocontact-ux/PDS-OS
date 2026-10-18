-- Résumé envoyé aux participants d'une réunion, versionné, et compte rendu
-- rangé par point de l'ordre du jour
-- (supabase/migrations/20261018200101_call_summaries.sql).
-- Run with `supabase test db`.
begin;
select plan(11);

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

insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('manager', pg_temp.new_user('manager-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
insert into ids select 'p_creative', person_id from public.accounts where id = pg_temp.id_of('creative');

insert into ids select 'p_manager', person_id from public.accounts where id = pg_temp.id_of('manager');
insert into ids select 'p_director', person_id from public.accounts where id = pg_temp.id_of('director');

select has_column('public', 'report_items', 'agenda_topic',
                  'a report line names the agenda point it belongs to');

-- An internal meeting of the manager, the creative invited.
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.calls (organization_id, title) values (pg_temp.id_of('org'), 'Point résumé');
reset role;
insert into ids select 'call', id from public.calls where title = 'Point résumé'
  and organization_id = pg_temp.id_of('org') order by created_at desc limit 1;
select pg_temp.act_as(pg_temp.id_of('manager'));
insert into public.call_attendees (call_id, organization_id, person_id)
  values (pg_temp.id_of('call'), pg_temp.id_of('org'), pg_temp.id_of('p_creative'));

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok(format($$ select public.send_call_summary(%L, 'Bonjour', '[{"name": "Créa", "how": "app"}]') $$,
  pg_temp.id_of('call')), '42501', null, 'only whoever owns the call sends its summary');

select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$ insert into public.call_summaries (organization_id, call_id, version, text, recipients)
  values (%L, %L, 1, 'x', '[{"name": "x"}]') $$, pg_temp.id_of('org'), pg_temp.id_of('call')),
  '42501', null, 'a summary is written by send_call_summary only');
select throws_ok(format($$ select public.send_call_summary(%L, 'Bonjour', jsonb_build_array(
    jsonb_build_object('name', 'Direction', 'how', 'app', 'person_id', %L))) $$,
  pg_temp.id_of('call'), pg_temp.id_of('p_director')),
  '23514', null, 'a member who is not a participant cannot receive it');
select throws_ok(format($$ select public.send_call_summary(%L, '   ', '[{"name": "Créa", "how": "app"}]') $$,
  pg_temp.id_of('call')), '23514', null, 'an empty message is refused');
select is(public.send_call_summary(pg_temp.id_of('call'), 'Bonjour à tous, voici ce qui a été décidé.',
  jsonb_build_array(jsonb_build_object('name', 'Créa', 'how', 'app', 'person_id', pg_temp.id_of('p_creative')),
                    jsonb_build_object('name', 'jade@ext.test', 'how', 'email', 'email', 'jade@ext.test'))),
  1, 'the first sending is version 1');
select is(public.send_call_summary(pg_temp.id_of('call'), 'Bonjour à tous, version corrigée.',
  jsonb_build_array(jsonb_build_object('name', 'Créa', 'how', 'app', 'person_id', pg_temp.id_of('p_creative')))),
  2, '« Corriger et renvoyer » sends version 2');
select is((select sent_by from public.call_summaries where call_id = pg_temp.id_of('call') and version = 1),
          pg_temp.id_of('p_manager'), 'who sent is the session''s person');

reset role;
select is((select count(*)::int from public.notifications
            where kind = 'call_summary_sent' and recipient_person_id = pg_temp.id_of('p_creative')
              and subject_id = pg_temp.id_of('call')), 2, 'the member is told of each version');

select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.call_summaries where call_id = pg_temp.id_of('call')), 2,
          'the member reads every version sent to them, the previous ones kept');

select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.call_summaries
            where call_id = pg_temp.id_of('call') and not public.can_see_call(call_id)), 0,
          'nobody else reads a summary of a call they cannot see');

select * from finish();
rollback;
