-- Recette Marketing V1 of 23/10/2026 (20261026400101, 20261026400201):
-- nothing with a creator before the launch, an influence closed once its
-- creators have an issue, an agency campaign declared done only settled (or
-- with a reserve), a deadline between today and the end of the campaign, the
-- reserve of an open activation kept, the closure refused while one is not
-- followed, a budget line on an activation of the project. Simulation only,
-- rolled back. Run with `supabase test db` or `psql -f`.
begin;
select plan(25);

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
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated, anon;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
create function pg_temp.v(p_k text) returns text language sql as $$
  select v from vars where k = p_k
$$;
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Europe/Paris')::date
$$;

insert into ids values
  ('manager', pg_temp.new_user('rv1-manager-' || pg_temp.v('tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'project_manager'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('manager'));
insert into ids select 'manager_person', person_id from public.accounts where id = pg_temp.id_of('manager');

-- Released in ten days: the campaign ends 28 days later.
insert into public.projects (organization_id, title, type, music_format, owner_person_id, due_date)
values (pg_temp.id_of('org'), 'RV1 ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person'), pg_temp.today() + 10);
insert into ids select 'project', id from public.projects where title = 'RV1 ' || pg_temp.v('tag');
insert into public.projects (organization_id, title, type, music_format, owner_person_id)
values (pg_temp.id_of('org'), 'RV1 autre ' || pg_temp.v('tag'), 'music_release', 'single',
        pg_temp.id_of('manager_person'));
insert into ids select 'other_project', id from public.projects where title = 'RV1 autre ' || pg_temp.v('tag');

insert into public.marketing_activations (organization_id, project_id, kind, mode, title, owner_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'influence', 'internal', 'Influence RV1',
        pg_temp.id_of('manager_person')),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'press', 'agency', 'Presse agence RV1',
        pg_temp.id_of('manager_person')),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'event', null, 'Showcase RV1',
        pg_temp.id_of('manager_person'));
insert into ids select 'influence', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and kind = 'influence';
insert into ids select 'press', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and kind = 'press';
insert into ids select 'showcase', id from public.marketing_activations
 where project_id = pg_temp.id_of('project') and kind = 'event';
insert into public.marketing_activations (organization_id, project_id, kind, title)
values (pg_temp.id_of('org'), pg_temp.id_of('other_project'), 'content', 'Ailleurs RV1');
insert into ids select 'elsewhere', id from public.marketing_activations
 where project_id = pg_temp.id_of('other_project');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Léa RV1 (simulation)', array['influencer']);
insert into ids select 'lea', id from public.network_contacts where name = 'Léa RV1 (simulation)';

-- 1. Nothing with a creator before the launch (MKT-INF-001) -----------------
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$insert into public.activation_targets (organization_id, project_id, activation_id, contact_id)
                         values (%L, %L, %L, %L)$$, pg_temp.id_of('org'), pg_temp.id_of('project'),
                       pg_temp.id_of('influence'), pg_temp.id_of('lea')),
                'choosing a creator stays open before the launch');
reset role;
insert into ids select 'target', id from public.activation_targets where activation_id = pg_temp.id_of('influence');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$insert into public.influence_proposals (organization_id, project_id, activation_id, target_id, party, fee_amount)
                          values (%L, %L, %L, %L, 'pds', 500)$$, pg_temp.id_of('org'), pg_temp.id_of('project'),
                        pg_temp.id_of('influence'), pg_temp.id_of('target')),
                 '23514', 'collaboration_frozen:not_launched', 'no proposal before the launch');
select throws_ok(format($$update public.activation_targets set outcome = 'closed' where id = %L$$, pg_temp.id_of('target')),
                 '23514', 'collaboration_frozen:not_launched', 'no issue of a collaboration before the launch');

-- 2. A deadline: from today to the end of the campaign ----------------------
select throws_ok(format($$update public.marketing_activations set due_on = %L where id = %L$$,
                        pg_temp.today() - 1, pg_temp.id_of('influence')),
                 '23514', 'due_in_past', 'a deadline is never in the past');
select throws_ok(format($$update public.marketing_activations set due_on = %L where id = %L$$,
                        pg_temp.today() + 39, pg_temp.id_of('influence')),
                 '23514', null, 'a deadline is never after the release + 28 days');
select lives_ok(format($$update public.marketing_activations set due_on = %L, status = 'in_progress' where id = %L$$,
                       pg_temp.today() + 38, pg_temp.id_of('influence')),
                'the last day of the campaign is a deadline; the activation is launched');
select is(public.marketing_campaign_end(pg_temp.id_of('project')), pg_temp.today() + 38,
          'the end of the campaign is the release + 28 days');

-- 3. Launched: the collaboration goes on; closed only once settled ----------
select lives_ok(format($$insert into public.influence_proposals (organization_id, project_id, activation_id, target_id, party, fee_amount)
                         values (%L, %L, %L, %L, 'pds', 500)$$, pg_temp.id_of('org'), pg_temp.id_of('project'),
                       pg_temp.id_of('influence'), pg_temp.id_of('target')),
                'once launched, PDS makes its proposal');
reset role;
insert into ids select 'proposal', id from public.influence_proposals where target_id = pg_temp.id_of('target');
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format('select public.accept_influence_terms(%L)', pg_temp.id_of('proposal')),
                'the terms are accepted: the creator is engaged');
select throws_ok(format($$select public.close_activation(%L, 'definitive', null, null)$$, pg_temp.id_of('influence')),
                 '23514', 'creators_open:Léa RV1 (simulation)',
                 'an influence is not closed while an engaged creator has no issue, named');
select lives_ok(format($$update public.activation_targets set outcome = 'closed' where id = %L$$, pg_temp.id_of('target')),
                'the collaboration gets its issue');
select lives_ok(format($$select public.close_activation(%L, 'definitive', null, null)$$, pg_temp.id_of('influence')),
                'every engaged creator settled: the influence is closed');
select throws_ok(format($$insert into public.influence_proposals (organization_id, project_id, activation_id, target_id, party, fee_amount)
                          values (%L, %L, %L, %L, 'pds', 600)$$, pg_temp.id_of('org'), pg_temp.id_of('project'),
                        pg_temp.id_of('influence'), pg_temp.id_of('target')),
                 '23514', 'collaboration_frozen:closed', 'a closed activation freezes its collaborations');

-- 4. An agency campaign is declared done settled, or with a reserve (MKT-ACT-001)
update public.marketing_activations set due_on = pg_temp.today() + 20, status = 'in_progress'
 where id = pg_temp.id_of('press');
reset role;
insert into public.agency_sources (organization_id, project_id, activation_id, label, kind)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'), 'Tableau RV1', 'manual');
insert into public.agency_rows (organization_id, project_id, activation_id, source_id, row_key)
select pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('press'), s.id, 'radio-lumen'
  from public.agency_sources s where s.activation_id = pg_temp.id_of('press');
select pg_temp.act_as(pg_temp.id_of('manager'));
select throws_ok(format($$update public.marketing_activations set status = 'done_declared' where id = %L$$, pg_temp.id_of('press')),
                 '23514', 'activation_not_done:agency_review,no_coverage',
                 'a line « À examiner » and no coverage: not done');
select throws_ok(format($$select public.declare_activation_done_with_reserve(%L, ' ', %L, %L)$$,
                        pg_temp.id_of('press'), pg_temp.id_of('manager_person'), pg_temp.today() + 5),
                 '23514', 'reason_required', 'the exception says why');
select lives_ok(format($$select public.declare_activation_done_with_reserve(%L, 'Radio Lumen à confirmer par l''agence', %L, %L)$$,
                       pg_temp.id_of('press'), pg_temp.id_of('manager_person'), pg_temp.today() + 5),
                'with a reason, who and when, it is declared done');
select is((select row(a.status, r.category, r.status, r.follow_up_due_on = pg_temp.today() + 5)::text
             from public.marketing_activations a
             join public.marketing_reserves r on r.activation_id = a.id
            where a.id = pg_temp.id_of('press')),
          '(done_declared,coverage,open,t)', 'the exception is a reserve of the bilan, still to arbitrate');

-- 5. The reserve of an open activation stays; the closure waits (MKT-BIL-001)
insert into ids select 'press_reserve', id from public.marketing_reserves where activation_id = pg_temp.id_of('press');
select throws_ok(format($$select public.arbitrate_marketing_reserve(%L, 'not_applicable', 'Plus utile', null, null, null, null)$$,
                        pg_temp.id_of('press_reserve')),
                 '23514', 'activation_reserve_kept', 'an open activation is never « Non applicable »');
select is(public.marketing_uncovered_activations(pg_temp.id_of('project')), 'Presse agence RV1, Showcase RV1',
          'the open activations without a reserve followed, by title');
select lives_ok(format($$select public.arbitrate_marketing_reserve(%L, 'follow_up', null, %L, %L, 'E-mail', null)$$,
                       pg_temp.id_of('press_reserve'), pg_temp.id_of('manager_person'), pg_temp.today() + 7),
                'followed after the closure: who, when, which channel');
select is(public.marketing_uncovered_activations(pg_temp.id_of('project')), 'Showcase RV1',
          'a followed reserve covers its activation');

-- Two reserves never keep each other.
reset role;
insert into public.marketing_reserves (organization_id, project_id, category, description, origin)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'links', 'Lien manquant A (simulation)', 'manual'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'links', 'Lien manquant B (simulation)', 'manual'),
       (pg_temp.id_of('org'), pg_temp.id_of('project'), 'links', 'Lien manquant C (simulation)', 'manual');
insert into ids select 'ra', id from public.marketing_reserves where description = 'Lien manquant A (simulation)';
insert into ids select 'rb', id from public.marketing_reserves where description = 'Lien manquant B (simulation)';
insert into ids select 'rc', id from public.marketing_reserves where description = 'Lien manquant C (simulation)';
select pg_temp.act_as(pg_temp.id_of('manager'));
select lives_ok(format($$select public.arbitrate_marketing_reserve(%L, 'duplicate', null, null, null, null, %L)$$,
                       pg_temp.id_of('ra'), pg_temp.id_of('rb')),
                'A is a duplicate of B');
select throws_ok(format($$select public.arbitrate_marketing_reserve(%L, 'duplicate', null, null, null, null, %L)$$,
                        pg_temp.id_of('rb'), pg_temp.id_of('rc')),
                 '23514', 'invalid_duplicate', 'B, kept for A, is not itself a duplicate');

-- 6. A budget line names an activation of its project (MKT-BIL-002) ---------
reset role;
select throws_ok(format($$insert into public.budget_lines (organization_id, project_id, label, amount_cents, status, activation_id)
                          values (%L, %L, 'Location salle', 120000, 'planned', %L)$$,
                        pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('elsewhere')),
                 'P0001', 'activation_not_in_project', 'a line never names an activation of another project');
select lives_ok(format($$insert into public.budget_lines (organization_id, project_id, label, amount_cents, status, activation_id)
                         values (%L, %L, 'Location salle', 120000, 'invoiced', %L)$$,
                       pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('showcase')),
                'a line names the Showcase it pays for');

select * from finish();
rollback;
