-- Business module, BIZ 2 (…20261111230101): the Deal. Who creates, assigns,
-- reads and writes it; its stages by functions only (the accord de
-- principe validated by the direction alone, contracting after it, signed
-- from contracting); abandoned with a reason only; a participation of
-- another project refused; delete_project_row takes a project's deals.
-- Run with `supabase test db`.
begin;
select plan(54);

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
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('other_pm'), ('glen'), ('thibault'), ('creative')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('other_pm', 'project_manager'), ('glen', 'business_manager'),
               ('thibault', 'business'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'other_pm', 'glen', 'thibault', 'creative');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
create function pg_temp.deal(p text) returns public.deals
  language sql as $$ select * from public.deals where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.deal(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Nadia'), ('Sami')) as v (label);
insert into ids
select v.name, a.id
  from (values ('pds', 'PDS'), ('nadia', 'Nadia'), ('sami', 'Sami')) as v (name, label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- Two collectives: c1 launched and run by « owner », c2 not launched.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'm1', public.create_master(pg_temp.id_of('org'), 'Un ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'm2', public.create_master(pg_temp.id_of('org'), 'Deux ' || pg_temp.tag(),
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main')));
insert into ids select 'c1', public.create_project(pg_temp.id_of('org'), 'Mic ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m1')], p_music_format => 'single');
insert into ids select 'c2', public.create_project(pg_temp.id_of('org'), 'Mic bis ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m2')], p_music_format => 'single');
insert into ids select 'a_c1', public.transmit_project(pg_temp.id_of('c1'), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a_c1'), 'accepted');
reset role;
update public.projects set collective = true, artist_id = pg_temp.id_of('pds')
 where id in (pg_temp.id_of('c1'), pg_temp.id_of('c2'));
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c1')), pg_temp.id_of('nadia'));
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select public.add_title_participation(
  (select id from public.project_titles where project_id = pg_temp.id_of('c2')), pg_temp.id_of('sami'));
reset role;
insert into ids select 'p1', id from public.title_participations where project_id = pg_temp.id_of('c1');
insert into ids select 'p2', id from public.title_participations where project_id = pg_temp.id_of('c2');

-- Creating -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.create_deal(p_artist_id => pg_temp.id_of('sami')) $$,
  '42501', 'forbidden', 'the business manager does not create a deal');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p1')) $$,
  'P0002', 'participation_not_found', 'a project manager without the project does not reach its participation');
select throws_ok($$ select public.create_deal(p_artist_id => pg_temp.id_of('sami')) $$,
  '42501', 'forbidden', 'nor creates a deal on an artist alone');
reset role;

select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p1'),
                                              p_assignee_person_id => pg_temp.id_of('creative_person')) $$,
  '22023', 'assignee_cannot_negotiate', 'a deal is given to a member who negotiates only');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p1'), p_kind => 'label') $$,
  '22023', 'deal_kind_unavailable', 'only a music deal is created in V1');
select throws_ok($$ select public.create_deal() $$,
  '22023', 'deal_subject_required', 'a deal is about something');
insert into ids select 'd1', public.create_deal(
  p_participation_id => pg_temp.id_of('p1'),
  p_assignee_person_id => pg_temp.id_of('glen_person'));
select is((pg_temp.deal('d1')).project_id, pg_temp.id_of('c1'), 'the participation names the project');
select is((pg_temp.deal('d1')).artist_id, pg_temp.id_of('nadia'), 'and the artist');
select is((pg_temp.deal('d1')).stage, 'to_contact', 'a deal starts « à contacter »');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p1')) $$,
  '23505', 'deal_exists', 'one live deal per participation');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p2'),
                                              p_project_id => pg_temp.id_of('c1')) $$,
  '23514', 'participation_other_project', 'a participation of another project is refused');
select throws_ok($$ select public.create_deal(p_participation_id => pg_temp.id_of('p2'),
                                              p_artist_id => pg_temp.id_of('nadia')) $$,
  '23514', 'participation_other_artist', 'and one of another artist');
insert into ids select 'd2', public.create_deal(
  p_artist_id => pg_temp.id_of('sami'), p_assignee_person_id => pg_temp.id_of('thibault_person'));
insert into ids select 'd3', public.create_deal(p_artist_id => pg_temp.id_of('nadia'));
select is((select count(*)::int from public.deals where id in (pg_temp.id_of('d1'), pg_temp.id_of('d2'), pg_temp.id_of('d3'))),
  3, 'the direction reads every deal');
reset role;

select throws_ok($$ insert into public.deals (organization_id) values (pg_temp.id_of('org')) $$,
  '23514', null, 'a deal without its subject is refused, even written directly');

-- Who reads -------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select array_agg(id) from public.deals), array[pg_temp.id_of('d1')],
  'the business manager reads only the deals assigned to him');
select ok((select count(*) from public.deal_events where deal_id = pg_temp.id_of('d1')) >= 2,
  'and their journal');
select is((select count(*)::int from public.deal_events where deal_id = pg_temp.id_of('d2')), 0,
  'nothing of another''s deal');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d2'), 'call_planned') $$,
  'P0002', 'deal_not_found', 'another''s deal does not exist for him');
select throws_ok($$ insert into public.deals (organization_id, artist_id)
                    values (pg_temp.id_of('org'), pg_temp.id_of('sami')) $$,
  '42501', null, 'nobody writes a deal directly');
reset role;
select pg_temp.act_as(pg_temp.id_of('thibault'));
select is((select array_agg(id) from public.deals), array[pg_temp.id_of('d2')],
  'each negotiator reads his own');
reset role;
select pg_temp.act_as(pg_temp.id_of('other_pm'));
select is((select count(*)::int from public.deals), 0, 'a project manager without a link reads nothing');
reset role;
select pg_temp.act_as(pg_temp.id_of('creative'));
select is((select count(*)::int from public.deals), 0, 'nor does a creative director');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select is((select array_agg(id) from public.deals), array[pg_temp.id_of('d1')],
  'the owner of the linked project reads its deal');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'call_planned') $$,
  '42501', 'forbidden', 'but does not move it');
select throws_ok($$ select public.assign_deal(pg_temp.id_of('d1'), pg_temp.id_of('creative_person')) $$,
  '22023', 'assignee_cannot_negotiate', 'he assigns it, to a negotiator only');
reset role;

-- Context ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select (project_title, project_visible)::text from public.read_deal_context(array[pg_temp.id_of('d1')])),
  ('Mic ' || pg_temp.tag(), false)::text,
  'the business manager reads the name of his deal''s project, without opening it');
select is((select count(*)::int from public.read_deal_context(array[pg_temp.id_of('d2')])), 0,
  'nothing of another''s deal');
select is((select count(*)::int from public.list_deal_negotiators()), 0,
  'he does not list the negotiators: he assigns nothing');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select ok((select array_agg(person_id) from public.list_deal_negotiators())
            @> array[pg_temp.id_of('glen_person'), pg_temp.id_of('thibault_person')]
          and not (select array_agg(person_id) from public.list_deal_negotiators())
            @> array[pg_temp.id_of('creative_person')],
  'a project manager lists the members who negotiate, and them only');
reset role;

-- Stages ---------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ select public.set_deal_next_action(pg_temp.id_of('d1'), 'Appeler son manager',
                                                       date '2026-11-20', date '2026-11-18') $$,
  'the assignee sets the next action and the follow-up');
select is((pg_temp.deal('d1')).next_action_on, date '2026-11-20', 'the next action has its date');
select lives_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'call_planned') $$,
  'the assignee moves his deal');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'call_planned') $$,
  'P0001', 'stage_unchanged', 'the same stage twice is refused');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'contracting') $$,
  'P0001', 'agreement_not_validated', 'no contracting before a validated agreement');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'abandoned') $$,
  '22023', 'invalid_stage', 'abandoning has its own gesture');
select lives_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'agreement') $$,
  'the assignee proposes the accord de principe');
select is((pg_temp.deal('d1')).agreement_status, 'pending', 'it waits for the direction');
select throws_ok($$ select public.decide_deal_agreement(pg_temp.id_of('d1'), true) $$,
  '42501', 'forbidden', 'the assignee does not validate it');
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select throws_ok($$ select public.decide_deal_agreement(pg_temp.id_of('d1'), true) $$,
  '42501', 'forbidden', 'nor does the project''s owner');
reset role;

select pg_temp.act_as(pg_temp.id_of('director'));
select throws_ok($$ select public.decide_deal_agreement(pg_temp.id_of('d1'), false, '  ') $$,
  '22023', 'reason_required', 'a refusal says why');
select lives_ok($$ select public.decide_deal_agreement(pg_temp.id_of('d1'), false, 'Avance trop haute') $$,
  'the direction refuses the agreement');
select is((pg_temp.deal('d1')).stage, 'negotiation', 'the deal goes back to negotiation');
select is((select reason from public.deal_events where deal_id = pg_temp.id_of('d1')
            and kind = 'agreement_refused'), 'Avance trop haute', 'the reason is in the journal');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select public.set_deal_stage(pg_temp.id_of('d1'), 'agreement');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.decide_deal_agreement(pg_temp.id_of('d1'), true) $$,
  'only the direction validates the accord de principe');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'signed') $$,
  'P0001', 'not_contracting', 'signed comes after contracting');
select public.set_deal_stage(pg_temp.id_of('d1'), 'contracting');
select lives_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'signed') $$,
  'then signed');
select throws_ok($$ select public.set_deal_stage(pg_temp.id_of('d1'), 'negotiation') $$,
  'P0001', 'deal_closed', 'a signed deal no longer moves');
reset role;

-- Abandoning ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select throws_ok($$ select public.abandon_deal(pg_temp.id_of('d2'), '') $$,
  '22023', 'reason_required', 'an abandoned deal without a reason is refused');
select lives_ok($$ select public.abandon_deal(pg_temp.id_of('d2'), 'L''artiste a signé ailleurs') $$,
  'abandoned with its reason');
select is(((pg_temp.deal('d2')).stage, (pg_temp.deal('d2')).abandon_reason),
  ('abandoned'::text, 'L''artiste a signé ailleurs'::text), 'the deal stays, abandoned, with its reason');
reset role;

-- Assigning ------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ select public.assign_deal(pg_temp.id_of('d3'), pg_temp.id_of('glen_person')) $$,
  'the direction assigns a deal');
reset role;
select pg_temp.act_as(pg_temp.id_of('glen'));
select is((select count(*)::int from public.deals), 2, 'the new assignee reads it at once');
reset role;

-- delete_project_row ------------------------------------------------------------
select lives_ok($$ select public.delete_project_row(pg_temp.id_of('c1')) $$,
  'a project with a deal is deleted');
select is((select count(*)::int from public.deals where id = pg_temp.id_of('d1')), 0,
  'its deals go with it');

select * from finish();
rollback;
