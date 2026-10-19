-- PO's proposals of deliverables, milestones and objectives, decided one by
-- one, a deliverable « Hors levier », the reserve as a comment and the
-- notification of a validated Brief (lot 3 of the proto « Projet complet »,
-- supabase/migrations/20261019030101_strategy_proposals.sql and
-- 20261019030201_strategy_reserve_comment.sql).
-- Run with `supabase test db`.
begin;
select plan(20);

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
  ('other', pg_temp.new_user('other-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('creative', pg_temp.new_user('creative-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('manager', 'project_manager'),
               ('other', 'project_manager'), ('creative', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));

create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create function pg_temp.person_of(p_name text) returns uuid language sql as $$
  select person_id from public.accounts where id = pg_temp.id_of(p_name)
$$;
grant execute on function pg_temp.id_of(text), pg_temp.person_of(text) to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.id_of('org'),
  'Néons ' || (select v from vars where k = 'tag'), 'content');
reset role;

-- The project is the manager's, released in 60 days, its strategy open.
update public.projects set owner_person_id = pg_temp.person_of('manager'), due_date = current_date + 60
 where id = pg_temp.id_of('project');
insert into public.project_creatives (organization_id, project_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.person_of('creative'))
on conflict do nothing;
set local session_replication_role = replica;
insert into public.project_stages (organization_id, project_id, stage_definition_id, state)
select pg_temp.id_of('org'), pg_temp.id_of('project'), d.id, 'in_progress'
  from public.stage_definitions d where d.key = 'launch_strategy'
on conflict (project_id, stage_definition_id) do update set state = 'in_progress';
set local session_replication_role = origin;

-- A strategy exchange filed by PO: three items with their quotes.
with c as (
  insert into public.calls (organization_id, project_id, title, consent)
  values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Échange stratégique', 'granted')
  returning id, organization_id),
t as (
  insert into public.transcripts (organization_id, call_id, text, provider, model)
  select organization_id, id, 'Transcription', 'test', 'test' from c
  returning id, organization_id, call_id),
r as (
  insert into public.call_reports (organization_id, call_id, transcript_id, summary, provider, model)
  select organization_id, call_id, id, 'Résumé', 'test', 'test' from t
  returning id, organization_id)
insert into public.report_items (organization_id, report_id, kind, position, what, quote, located)
select r.organization_id, r.id, x.kind, x.position, x.what, x.quote, 'found'
  from r, (values ('deliverable', 0, 'Pochette', 'la pochette, on la veut dans la même lumière'),
                  ('milestone', 0, 'Sortie du clip', 'le clip sort une semaine après le titre'),
                  ('kpi', 0, '200 000 streams à 4 semaines', 'on vise 200 000 streams')) as x (kind, position, what, quote);
insert into ids select 'item_' || kind, id from public.report_items
 where report_id = (select cr.id from public.call_reports cr join public.calls c on c.id = cr.call_id
                     where c.project_id = pg_temp.id_of('project'));

-- PO's import, with the owner's session.
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok(format($$
  insert into public.strategy_proposals (organization_id, project_id, kind, text, proposed_text,
    source_report_item_id, source_quote)
  values (%L, %L, 'deliverable', 'Pochette', 'Pochette', %L, 'la pochette') $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('item_deliverable')),
  '42501', null, 'nobody but the owner writes a proposal');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$
  insert into public.strategy_proposals (organization_id, project_id, kind, text, proposed_text,
    offset_days, milestone_kind, source_report_item_id, source_quote)
  values (%1$L, %2$L, 'deliverable', 'Pochette', 'Pochette', null, null, %3$L, 'la pochette'),
         (%1$L, %2$L, 'milestone', 'Sortie du clip', 'Sortie du clip', 7, 'release', %4$L, 'une semaine après'),
         (%1$L, %2$L, 'objective', '200 000 streams', '200 000 streams', null, null, %5$L, 'on vise') $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('item_deliverable'),
  pg_temp.id_of('item_milestone'), pg_temp.id_of('item_kpi')),
  'the owner files the proposals of an exchange');
select throws_ok(format($$
  insert into public.strategy_proposals (organization_id, project_id, kind, text, proposed_text,
    source_report_item_id, source_quote)
  values (%L, %L, 'deliverable', 'Pochette', 'Pochette', %L, 'la pochette') $$,
  pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('item_deliverable')),
  '23505', null, 'a report item is proposed once');
insert into ids select 'p_' || kind, id from public.strategy_proposals
 where project_id = pg_temp.id_of('project');
select is((select count(*)::int from public.strategy_deliverables where project_id = pg_temp.id_of('project')),
          0, 'a proposal reaches no other module before a person keeps it');

-- Deciding one by one.
reset role;
select pg_temp.act_as(pg_temp.id_of('other'));
select throws_ok(format($$ select public.decide_strategy_proposal(%L, true) $$, pg_temp.id_of('p_deliverable')),
  null, null, 'nobody else decides');
reset role;
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.decide_strategy_proposal(%L, true) $$, pg_temp.id_of('p_deliverable')),
  'Confirmer');
select is((select lever_id is null and title = 'Pochette' from public.strategy_deliverables
            where id = (select item_id from public.strategy_proposals where id = pg_temp.id_of('p_deliverable'))),
          true, 'kept: a deliverable « Hors levier » is created');
select lives_ok(format($$ select public.decide_strategy_proposal(%L, true, 'Sortie du clip officiel') $$,
  pg_temp.id_of('p_milestone')), 'Modifier');
select is((select occurs_on::text || ' ' || title from public.milestones
            where id = (select item_id from public.strategy_proposals where id = pg_temp.id_of('p_milestone'))),
          (current_date + 67)::text || ' Sortie du clip officiel',
          'the milestone falls on its day from the release, reworded');
select is((select proposed_text from public.strategy_proposals where id = pg_temp.id_of('p_milestone')),
          'Sortie du clip', 'PO''s words are kept');
select lives_ok(format($$ select public.decide_strategy_proposal(%L, false) $$, pg_temp.id_of('p_deliverable')),
  'Écarter a kept line');
select is((select state || ' ' || (item_id is null)::text from public.strategy_proposals
            where id = pg_temp.id_of('p_deliverable')), 'discarded true',
          'set aside: the line stays, its deliverable is removed');
select is((select count(*)::int from public.strategy_deliverables where project_id = pg_temp.id_of('project')),
          0, 'no deliverable left');

-- A person's own line, and a row entered before.
select isnt(public.add_strategy_item(pg_temp.id_of('project'), 'objective', 'Faire entrer Mona en radio'),
            null, 'Ajouter un objectif');
select is((select count(*)::int from public.strategy_objectives
            where project_id = pg_temp.id_of('project') and kind = 'qualitative'), 1,
          'kept at once, with its row');
reset role;
insert into public.strategy_deliverables (organization_id, project_id, title)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'Teasers');
insert into ids select 'legacy', id from public.strategy_deliverables
 where project_id = pg_temp.id_of('project') and title = 'Teasers';
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$ select public.discard_strategy_item('deliverable', %L) $$, pg_temp.id_of('legacy')),
  'a row entered before is set aside');
reset role;
select is((select state from public.strategy_proposals
            where project_id = pg_temp.id_of('project') and text = 'Teasers'), 'discarded',
          'it stays visible as a line set aside');

-- « Valider avec réserves » with a comment: a task of the owner, no date.
insert into public.strategy_documents (organization_id, project_id, kind, version, content, state, sent_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'brief', 1, '{"format": 1}', 'sent', now());
insert into ids select 'doc', id from public.strategy_documents where project_id = pg_temp.id_of('project');
insert into public.strategy_document_reviews (organization_id, document_id, person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('doc'), pg_temp.person_of('director'));
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok(format($$ select public.decide_strategy_document(%L, true, 'Revoir la pochette', '{}',
  '[{"text": "Revoir la pochette"}]'::jsonb) $$, pg_temp.id_of('doc')),
  'a reserve is a comment: its owner and date are optional');
reset role;
select is((select (t.assignee_person_id = pg_temp.person_of('manager'))::text || ' ' || t.due_date::text
             from public.tasks t join public.strategy_document_reserves r on r.id = t.strategy_reserve_id
            where r.document_id = pg_temp.id_of('doc')), 'true ' || (current_date + 60)::text,
          'the reserve is a task of the project''s owner, due on the release');
select is((select count(*)::int from public.notifications
            where project_id = pg_temp.id_of('project') and kind = 'strategy_validated'
              and recipient_person_id = pg_temp.person_of('creative')), 1,
          'the Brief validated: strategy_validated reaches the creative director');

select * from finish();
rollback;
