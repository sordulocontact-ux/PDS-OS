-- Stratégie, étape 2 (…20261010000201): « Objectifs & KPIs », written by the
-- owner while the strategy is in progress only. Run with `supabase test db`.
begin;
select plan(19);



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

create function pg_temp.add_objective(p_label text, p_target numeric) returns void language sql as $$
  insert into public.strategy_objectives (organization_id, project_id, label, target, unit)
  values (pg_temp.org(), pg_temp.prj(), p_label, p_target, 'streams');
$$;
grant execute on function pg_temp.add_objective(text, numeric) to authenticated;

-- The owner validates the Brief through the director.
select public.start_stage(pg_temp.id_of('framing'));
select public.create_framing_brief(pg_temp.prj(), '{}'::jsonb);
select public.request_validation(pg_temp.id_of('framing'), null);
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.decide_validation((select id from public.validations
  where project_stage_id = pg_temp.id_of('framing') and state = 'pending'), true, null);
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));

select throws_ok($$ select pg_temp.add_objective('Streams', 1000) $$,
                 '42501', null, 'no objective before the plan starts the strategy');
select public.launch_project_plan(pg_temp.prj(),
  '[{"column":"focus","workflow":"strategy","title":"Stratégie"}]'::jsonb);

select lives_ok($$ select pg_temp.add_objective('Streams Spotify', 50000) $$,
                'the owner sets an objective while the strategy is in progress');
select lives_ok($$ select pg_temp.add_objective('Abonnés', null) $$,
                'a target can be set later');
select is((select count(*)::int from public.strategy_objectives
            where project_id = pg_temp.prj() and created_by = pg_temp.id_of('owner_person')), 2,
          'the author is recorded');
select throws_ok($$ select pg_temp.add_objective('Négatif', -1) $$,
                 '23514', null, 'a target is never negative');
select throws_ok($$ select pg_temp.add_objective(' ', 10) $$,
                 '23514', null, 'an objective needs a label');
select lives_ok($$ update public.strategy_objectives set target = 2000
                    where project_id = pg_temp.prj() and label = 'Abonnés' $$,
                'the owner sets the target later');
select is((select target from public.strategy_objectives
            where project_id = pg_temp.prj() and label = 'Abonnés'), 2000::numeric,
          'the target is saved');

-- KPI kinds and sources (…20261010000701).
select lives_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, kind)
  values (pg_temp.org(), pg_temp.prj(), 'Retours presse spécialisée', 'qualitative')
$$, 'a qualitative KPI has no figure');
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, kind, target)
  values (pg_temp.org(), pg_temp.prj(), 'Qualitatif chiffré', 'qualitative', 10)
$$, '23514', null, 'a qualitative KPI never carries a target');
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, kind, source)
  values (pg_temp.org(), pg_temp.prj(), 'Qualitatif mesuré', 'qualitative', 'deezer_fans')
$$, '23514', null, 'only a figure can be measured automatically');
select lives_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, target, metric, source)
  values (pg_temp.org(), pg_temp.prj(), 'Fans Deezer', 15000, 'fans', 'deezer_fans')
$$, 'a fans KPI can be fed by Deezer');
-- MKT-S1-03 (…20261012100101): streams and fans are distinct metrics.
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, target, metric, source)
  values (pg_temp.org(), pg_temp.prj(), 'Streams du single', 500000, 'streams', 'deezer_fans')
$$, '23514', null, 'a streams target is never measured by the Deezer fans count');
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, kind, metric)
  values (pg_temp.org(), pg_temp.prj(), 'Signal chiffré', 'qualitative', 'streams')
$$, '23514', null, 'a qualitative signal has no metric');
select throws_ok($$
  insert into public.strategy_objectives (organization_id, project_id, label, source)
  values (pg_temp.org(), pg_temp.prj(), 'Inconnu', 'spotify')
$$, '23514', null, 'an unknown source is refused');

reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok($$ select pg_temp.add_objective('Intrus', 1) $$,
                 '42501', null, 'another project manager cannot write');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select is((select count(*)::int from public.strategy_objectives where project_id = pg_temp.prj()), 4,
          'the director reads the objectives');

-- Once submitted, the objectives are frozen.
reset role;
update public.project_stages set state = 'awaiting_validation' where id = pg_temp.id_of('strategy');
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select pg_temp.add_objective('Tard', 1) $$,
                 '42501', null, 'no objective once the strategy is submitted');
update public.strategy_objectives set target = 1 where project_id = pg_temp.prj();
delete from public.strategy_objectives where project_id = pg_temp.prj();
reset role;
select is((select count(*)::int from public.strategy_objectives
            where project_id = pg_temp.prj() and target <> 1), 3,
          'a submitted strategy keeps its objectives as they were');

select * from finish();
rollback;
