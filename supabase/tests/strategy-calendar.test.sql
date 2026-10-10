-- Stratégie, étapes 4 et 5 (…20261010000601): a deliverable's quantity, a
-- milestone's channel and note. Run with `supabase test db`.
begin;
select plan(9);



-- Fixtures ------------------------------------------------------------------
create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;

-- The framing opens once the project has a call report (run as postgres).
create function pg_temp.add_call_report(p_project uuid) returns void language sql as $$
  with c as (
    insert into public.calls (organization_id, project_id, title, consent)
    select organization_id, id, 'Call de cadrage', 'granted' from public.projects where id = p_project
    returning id, organization_id),
  t as (
    insert into public.transcripts (organization_id, call_id, text, provider, model)
    select organization_id, id, 'Transcription', 'test', 'test' from c
    returning id, organization_id, call_id)
  insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
  select organization_id, call_id, id, 'Résumé', 'test', 'test' from t;
$$;
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
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'other');

-- The director creates and transmits, the owner accepts: the project is launched.
select pg_temp.act_as((select id from ids where name = 'director'));
insert into ids select 'project', public.create_project((select id from ids where name = 'org'),
  'ST ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project((select id from ids where name = 'project'),
  (select id from ids where name = 'owner_person'));
reset role;
select pg_temp.add_call_report((select id from ids where name = 'project'));
select pg_temp.act_as((select id from ids where name = 'owner'));
select public.respond_to_assignment((select id from ids where name = 'a1'), 'accepted');
insert into ids select case d.key when 'framing' then 'framing' else 'strategy' end, s.id
  from public.project_stages s
  join public.stage_definitions d on d.id = s.stage_definition_id
 where s.project_id = (select id from ids where name = 'project')
   and d.key in ('framing', 'launch_strategy');


-- Shortcuts: org and project ids.
create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.org(), pg_temp.prj(), pg_temp.id_of(text) to authenticated;

-- The owner validates the Brief through the director, then launches the plan.
select public.start_stage(pg_temp.id_of('framing'));
select public.create_framing_brief(pg_temp.prj(), '{}'::jsonb);
select public.request_validation(pg_temp.id_of('framing'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation((select id from public.validations
  where project_stage_id = pg_temp.id_of('framing') and state = 'pending'), true, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.launch_project_plan(pg_temp.prj(),
  '[{"column":"focus","workflow":"strategy","title":"Stratégie"}]'::jsonb);
with l as (insert into public.levers (organization_id, project_id, label, family, state)
           values (pg_temp.org(), pg_temp.prj(), 'Social organique', 'promotion_distribution', 'selected')
           returning id)
insert into ids select 'lever', id from l;

-- Livrables engagés ------------------------------------------------------------
select lives_ok($$
  with d as (insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, quantity)
             values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Capsules', 5) returning id)
  insert into ids select 'deliverable', id from d;
$$, 'a deliverable carries its quantity');
select throws_ok($$
  insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, quantity)
  values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Rien', 0)
$$, '23514', null, 'a quantity is at least one');
select lives_ok($$ update public.strategy_deliverables set quantity = 6
                    where id = pg_temp.id_of('deliverable') $$,
                'the owner changes the quantity');

-- Calendrier de lancement ------------------------------------------------------
select lives_ok($$
  with m as (insert into public.milestones (organization_id, project_id, title, occurs_on, kind,
                                            channel, notes, deliverable_id)
             values (pg_temp.org(), pg_temp.prj(), 'Teaser capsules', current_date + 30, 'teaser',
                     'influence', 'Avec trois créateurs', pg_temp.id_of('deliverable')) returning id)
  insert into ids select 'milestone', id from m;
$$, 'a milestone sits on a channel and carries a note');
select is((select channel from public.milestones
            where project_id = pg_temp.prj() and title = 'Teaser capsules'), 'influence',
          'its channel is saved');
select throws_ok($$
  insert into public.milestones (organization_id, project_id, title, occurs_on, channel)
  values (pg_temp.org(), pg_temp.prj(), 'TV', current_date + 10, 'tv')
$$, '23514', null, 'an unknown channel is refused');
select throws_ok($$
  insert into public.milestones (organization_id, project_id, title, occurs_on, notes)
  values (pg_temp.org(), pg_temp.prj(), 'Vide', current_date + 10, '  ')
$$, '23514', null, 'a blank note is refused');
select lives_ok($$ update public.milestones set channel = 'press', notes = null
                    where id = pg_temp.id_of('milestone') $$,
                'the owner moves a milestone to another channel');
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
update public.milestones set channel = 'live' where id = pg_temp.id_of('milestone');
reset role;
select is((select channel from public.milestones where id = pg_temp.id_of('milestone')), 'press',
          'another project manager changes nothing');

select * from finish();
rollback;
