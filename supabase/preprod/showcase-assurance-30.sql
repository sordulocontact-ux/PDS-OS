-- Showcase of « Assurance 30 », the collective project Ibé created live on
-- 18/11/2026 (ticket « PDSMIC : retours d'Ibé du 18/11 », lot L5): PDS as the
-- main artist, guests, 1 000 000 streams in 3 months on Spotify and Deezer,
-- 10 000 €, shoot on 5 December 2026. It replays that case so the recap of the
-- titles shows every state at once. Three parts:
--
-- 1. THE PROJECT (created once; skipped when « Assurance 30 » exists):
--
--   Tavio Marlan   « À contacter »  (a note, nothing else; no fiche: « À envoyer »)
--   Selma Quirin   « Contacté »     (her manager is the participation's interlocutor)
--   Joss Barelle   « D'accord »     (deal with the business manager, call planned;
--                                    his manager is the artist's primary contact)
--   Elio Danvers   « D'accord »     (deal: accord validated, master split 50 %;
--                                    title on a Catalogue master with its beatmaker,
--                                    « Sortie oui »)
--
-- 2. THE STATES of the recap's columns « Fiche », « Contrat » and « Son »
--    (played on a project just created or already there; each state is added
--    once, with its own guard, so a second run adds nothing and never touches
--    what is already there, nor a status changed by hand):
--
--   Fiche « En attente »   Selma Quirin   sent, opened by her, not sent back
--   Fiche « Remplie »      Elio Danvers   received, checked and validated
--                          (also Ysolde Marnay and Tiago Lestrel: their contract
--                          is filled from it)
--   Contrat « Envoyé · en attente de retour »   Elio Danvers
--                          (accord validated; contract drafted from a template,
--                          submitted, approved, sent on his private link)
--   Contrat « Retour reçu · à contresigner »    Ysolde Marnay  (new guest, title
--                          « Marée haute »: accord validated at 30 %; the signed
--                          copy deposited by her private link, PDS has not signed)
--   Contrat « Signé »      Tiago Lestrel  (new guest, title « Dernier métro »:
--                          accord validated at 25 %; deposited by his link,
--                          countersigned by the direction, signature checked)
--   Son « Son reçu »       « Cap sur demain » (Elio): a demo with the final vocals
--                          confirmed as the source in the Master, no mix
--   Son « Son attendu »    « Marée haute » (Ysolde): a master in the Catalogue,
--                          no audio, no source confirmed, no mix
--
-- 3. THE JURIDIQUE STARTED (own guards: nothing is redone once launched). The
--    project was accepted but its plan not launched, so the Juridique said
--    « Non démarré » beside a recap full of fiches and signed contracts. This
--    part plays what Claire and Lina do in the app, in order:
--
--    - the Cadrage du projet: Lina's answers, the Brief sent, validated by
--      Claire (« Lancer le plan » requires it: framing_not_validated);
--    - « Lancer le plan »: the plan holds the Juridique and the Master (the
--      Master is already open through its confirmed sound source); the
--      Marketing and the other workflows stay waiting;
--    - the Cadrage juridique: each question the app asks, answered as the app
--      saves it (« Marée haute »: its guest; per title no existing work and no
--      publisher; the agreements are not asked, contracts exist);
--    - the confirmation of the dossier;
--    - « Lancer le plan d'action » of the Juridique: the actions the app
--      proposes from the dossier (lib/legal/plan/proposal.ts, due dates of
--      lib/legal/plan/due-dates.ts, both written again here in SQL): the fiches
--      to fill, a contract per person, the SACEM declaration of each title,
--      each with Lina (the project's owner) as responsible; the contract of a
--      guest who is no credit is left out and dismissed, as a person does when
--      confirming the plan (the Suivi would show it « Obsolète »: it reads a
--      contract through a credit). The démarches of
--      the Juridique read the fiches and contracts of part 2: it is « En cours »
--      and agrees with the recap.
--
-- The two new guests are invented (no real artist), like the first four: artist
-- page, person of the Réseau (network_contacts.artist_id), « D'accord », deal
-- entrusted to the business manager, accord validated (the database drafts no
-- guest's contract before it: agreement_not_validated).
--
-- Played alone, on a local base or the pre-production (accounts of the team
-- below; the business manager is Malik Durand in pre-production, else Glen):
--
--   docker exec -i supabase_db_PDS_OS psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/preprod/showcase-assurance-30.sql
--
-- Adds only, in one transaction, replayable. Every gesture goes through the
-- app's own functions, as the person who would act (Claire creates, validates
-- the contract template, the accord, the contracts and the Cadrage, and
-- countersigns for PDS; Lina runs the project, drafts and sends the contracts,
-- plans the fiches, confirms the source, answers the Cadrage and the Cadrage
-- juridique, confirms the dossier and launches the plans; the business manager
-- negotiates; the person's side, who
-- has no account, acts as the anonymous role with her private link: opening and
-- sending back the fiche, depositing the signed contract). Plain inserts, as the
-- other showcases, for what the app does through a browser or a file upload
-- (no content behind these files, the local and pre-production Storage have no
-- seed): the artists, the Network contacts and the Catalogue contributors; the
-- demo file of « Cap sur demain » (master_files, the source then confirmed as the
-- app does it, an insert under the owner's rights); the object of the signed
-- copy in storage.objects (what the upload leaves, before submit_signed_contract
-- records it) and the PDF countersigned by PDS (contract_files, category
-- pds_signed: advance_contract wants the file, as for the real signature) and
-- the answers of the Cadrage (field_values, as supabase/preprod/seed.sql writes
-- them). Constraints and triggers are never disabled. NEVER on production.

\set ON_ERROR_STOP on
select exists (select 1 from public.projects p
                 join public.organizations o on o.id = p.organization_id
                where o.slug = 'pds' and p.title = 'Assurance 30') as already \gset

\o /dev/null
begin;

create temp table k (name text primary key, id uuid) on commit drop;
create function pg_temp.k(p text) returns uuid language sql as $$
  select id from k where name = p $$;
create function pg_temp.as_user(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select id from auth.users where email = p_email), 'role', 'authenticated')::text, true);
end $$;

insert into k select 'org', id from public.organizations where slug = 'pds';
insert into k select 'claire', person_id from public.accounts
 where id = (select id from auth.users where email = 'claire.morel@preprod.pds');
insert into k select 'lina', person_id from public.accounts
 where id = (select id from auth.users where email = 'lina.haddad@preprod.pds');
-- The negotiator: Malik Durand in pre-production, Glen on a local base.
insert into k select 'bm', person_id from public.accounts
 where id = (select id from auth.users
              where email in ('malik.durand@preprod.pds', 'glen@pds.test')
              order by (email = 'malik.durand@preprod.pds') desc limit 1);
create temp table who (email text);
insert into who select email from auth.users
 where email in ('malik.durand@preprod.pds', 'glen@pds.test')
 order by (email = 'malik.durand@preprod.pds') desc limit 1;

-- ===========================================================================
-- 1. The project, created once -------------------------------------------------
-- ===========================================================================
\if :already
\else

-- The invented guests: the Catalogue refuses a homonym (artist_name_taken), so
-- an artist already there under that name is reused, never duplicated.
select pg_temp.as_user('claire.morel@preprod.pds');
insert into public.artists (organization_id, name, relation)
select pg_temp.k('org'), v.name, 'collaboration'
  from (values ('Tavio Marlan'), ('Selma Quirin'), ('Joss Barelle'), ('Elio Danvers')) v (name)
 where not exists (select 1 from public.artists a
                    where a.organization_id = pg_temp.k('org') and a.archived_at is null
                      and public.artist_name_key(a.name) = public.artist_name_key(v.name));
insert into k select 'a:' || a.name, a.id from public.artists a
 where a.organization_id = pg_temp.k('org') and a.archived_at is null
   and a.name in ('Tavio Marlan', 'Selma Quirin', 'Joss Barelle', 'Elio Danvers');
insert into k select 'a:pds', id from public.artists
 where organization_id = pg_temp.k('org') and archived_at is null and name = 'PDS';

-- Network: each artist as a person (linked to the Catalogue), two managers,
-- a beatmaker (fictional phone numbers) ---------------------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
create temp table net (key text, name text, roles text[], relations text[], artist text,
  email text, phone text, city text, notes text);
insert into net values
  ('tavio', 'Tavio Marlan', '{artist}', '{}', 'Tavio Marlan', null, null, 'Nantes', null),
  ('selma', 'Selma Quirin', '{artist}', '{}', 'Selma Quirin', null, null, 'Lyon', null),
  ('joss',  'Joss Barelle', '{artist}', '{}', 'Joss Barelle', null, null, 'Lille', null),
  ('elio',  'Elio Danvers', '{artist}', '{}', 'Elio Danvers', null, null, 'Bordeaux', null),
  ('maud',  'Maud Terrien', '{manager}', '{client}', null, 'maud.terrien@management.test',
     '06 00 00 41 12', 'Lyon', 'Manageuse de Selma Quirin.'),
  ('roch',  'Roch Delmas', '{manager}', '{client}', null, 'roch.delmas@management.test',
     '06 00 00 73 58', 'Lille', 'Manager de Joss Barelle.'),
  ('nilo',  'Nilo Sarrat', '{beatmaker}', '{partner}', null, 'nilo.sarrat@beats.test',
     '06 00 00 29 64', 'Toulouse', 'Beatmaker : instru de « Assurance 30 ».');
insert into public.network_contacts (organization_id, kind, name, roles, relations, artist_id,
  email, phone, city, notes)
select pg_temp.k('org'), 'person', n.name, n.roles, n.relations,
       case when n.artist is not null then pg_temp.k('a:' || n.artist) end,
       n.email, n.phone, n.city, n.notes
  from net n
 where not exists (select 1 from public.network_contacts c
                    where c.organization_id = pg_temp.k('org') and c.name = n.name
                      and c.archived_at is null);
insert into k select 'c:' || n.key, c.id
  from net n join public.network_contacts c
    on c.organization_id = pg_temp.k('org') and c.name = n.name and c.archived_at is null;

-- Joss's manager, the artist's primary contact at the Catalogue.
select pg_temp.as_user('claire.morel@preprod.pds');
insert into public.artist_contacts (organization_id, artist_id, role, name, email, phone, is_primary)
select pg_temp.k('org'), pg_temp.k('a:Joss Barelle'), 'manager', 'Roch Delmas',
       'roch.delmas@management.test', '06 00 00 73 58', true
 where not exists (select 1 from public.artist_contacts
                    where artist_id = pg_temp.k('a:Joss Barelle') and role = 'manager');

-- The project: created by Claire, run by Lina ---------------------------------
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k values ('p', public.create_collective_project(
  pg_temp.k('org'), 'Assurance 30', 'content', pg_temp.k('a:pds'), pg_temp.k('lina'),
  p_due_date => date '2026-12-05',
  p_budget_cents => 1000000,
  p_initial_context =>
    'Objectif : 1 000 000 de streams en 3 mois, sur Spotify et Deezer. Tournage le 5 décembre 2026. Budget : 10 000 €.',
  p_content_format_id => (select id from public.content_formats where name = 'PDS Mic' and archived_at is null),
  p_guest_artist_ids => array[pg_temp.k('a:Tavio Marlan'), pg_temp.k('a:Selma Quirin'),
                              pg_temp.k('a:Joss Barelle'), pg_temp.k('a:Elio Danvers')]));
insert into k select 'assignment', id from public.project_assignments
 where project_id = pg_temp.k('p');
select pg_temp.as_user('lina.haddad@preprod.pds');
select public.respond_to_assignment(pg_temp.k('assignment'), 'accepted');

insert into k select 'part:' || a.name, tp.id
  from public.title_participations tp join public.artists a on a.id = tp.artist_id
 where tp.project_id = pg_temp.k('p');
insert into k select 'title:' || a.name, tp.title_id
  from public.title_participations tp join public.artists a on a.id = tp.artist_id
 where tp.project_id = pg_temp.k('p');

-- Tavio: « À contacter », a note ------------------------------------------------
select public.set_title_participation_note(pg_temp.k('part:Tavio Marlan'),
  'Repéré sur TikTok, à contacter cette semaine avant la fin du tournage.');

-- Selma: « Contacté », her manager the interlocutor -------------------------------
select public.set_title_participation_status(pg_temp.k('part:Selma Quirin'), 'invited',
  'Message envoyé à son management.');
select public.set_title_participation_contact(pg_temp.k('part:Selma Quirin'), pg_temp.k('c:maud'));

-- Joss: « D'accord », a deal for the business manager, a call planned ------------
select public.set_title_participation_status(pg_temp.k('part:Joss Barelle'), 'invited');
select public.set_title_participation_status(pg_temp.k('part:Joss Barelle'), 'confirmed',
  'D''accord de principe au téléphone.');
insert into k values ('d:joss', public.create_deal(
  p_participation_id => pg_temp.k('part:Joss Barelle'), p_assignee_person_id => pg_temp.k('bm'),
  p_next_action => 'Confirmer le split avec son manager', p_next_action_on => current_date + 3));
create temp table slot as
  select starts_at, ends_at from public.negotiator_free_slots(pg_temp.k('bm')) order by starts_at limit 1;
insert into k values ('call:joss', public.plan_deal_negotiation_call(
  'Call · Joss Barelle · Assurance 30',
  (select starts_at from slot), (select ends_at from slot),
  p_deal_id => pg_temp.k('d:joss'),
  p_guests => '[{"email": "roch.delmas@management.test", "name": "Roch Delmas"}]'::jsonb,
  p_agenda => '[{"topic": "Split et crédits sur le titre", "minutes": 10}]'::jsonb));

-- Elio: « D'accord », title on a Catalogue master, accord validated, split 50 % --
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k values ('m:elio', public.create_master(pg_temp.k('org'), 'Cap sur demain',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.k('a:pds'), 'role', 'main'))));
select pg_temp.as_user('lina.haddad@preprod.pds');
select public.attach_master_to_project_title(pg_temp.k('title:Elio Danvers'), pg_temp.k('m:elio'));
select public.set_title_participation_status(pg_temp.k('part:Elio Danvers'), 'confirmed',
  'Partant dès le premier message.');
insert into k values ('d:elio', public.create_deal(
  p_participation_id => pg_temp.k('part:Elio Danvers'), p_assignee_person_id => pg_temp.k('bm')));
select pg_temp.as_user((select email from who));
select public.set_deal_stage(d.id, 'negotiation', 'Premier échange fait.')
  from public.deals d where d.id = pg_temp.k('d:elio') and d.stage <> 'negotiation';
select public.set_deal_term(pg_temp.k('d:elio'), 'master_split', '{"units": 500000}', 'confirmed');
select public.set_deal_stage(pg_temp.k('d:elio'), 'agreement', 'Accord sur 50 % du master.');
select pg_temp.as_user('claire.morel@preprod.pds');
select public.decide_deal_agreement(pg_temp.k('d:elio'), true);
-- Catalogue credit of the beatmaker (Network contact).
insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
select pg_temp.k('org'), pg_temp.k('m:elio'), c.name, 'producer', c.id
  from public.network_contacts c where c.id = pg_temp.k('c:nilo');

-- « Sortie oui » on Elio's title -------------------------------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
select public.set_project_title_release(pg_temp.k('title:Elio Danvers'), true);

\endif

-- ===========================================================================
-- 2. The states of the recap ------------------------------------------------------
-- ===========================================================================

-- What the project already holds, as the first part would have left it (the
-- keys the creation just set are kept).
insert into k select 'p', id from public.projects
 where organization_id = pg_temp.k('org') and title = 'Assurance 30'
on conflict (name) do nothing;
insert into k select 'a:' || a.name, a.id from public.artists a
 where a.organization_id = pg_temp.k('org') and a.archived_at is null
   and a.name in ('Tavio Marlan', 'Selma Quirin', 'Joss Barelle', 'Elio Danvers')
on conflict (name) do nothing;
insert into k select 'a:pds', id from public.artists
 where organization_id = pg_temp.k('org') and archived_at is null and name = 'PDS'
on conflict (name) do nothing;
insert into k select 'c:' || split_part(a.name, ' ', 1), c.id
  from public.network_contacts c join public.artists a on a.id = c.artist_id
 where c.organization_id = pg_temp.k('org') and c.archived_at is null
   and a.name in ('Tavio Marlan', 'Selma Quirin', 'Joss Barelle', 'Elio Danvers')
on conflict (name) do nothing;
insert into k select 'part:' || a.name, tp.id
  from public.title_participations tp join public.artists a on a.id = tp.artist_id
 where tp.project_id = pg_temp.k('p')
on conflict (name) do nothing;
insert into k select 'title:' || a.name, tp.title_id
  from public.title_participations tp join public.artists a on a.id = tp.artist_id
 where tp.project_id = pg_temp.k('p')
on conflict (name) do nothing;

-- The contract template of the guests: the validated one, else written by
-- Claire (who writes and validates the templates in the showcases) and validated.
create function pg_temp.template() returns uuid language plpgsql as $$
declare
  v uuid;
begin
  select id into v from public.contract_templates
   where organization_id = pg_temp.k('org') and name = 'Contrat d''artiste invité'
     and status = 'validated'
   order by version desc limit 1;
  if v is null then
    perform pg_temp.as_user('claire.morel@preprod.pds');
    v := public.create_contract_template(pg_temp.k('org'), null, 'Contrat d''artiste invité', 'artist',
      array['performer'], 'Un artiste invité d''un projet collectif, une fois son accord validé.',
      E'CONTRAT D''ARTISTE INVITÉ\n\nEntre {{organisation.nom}} et {{personne.nom_civil}}, demeurant {{personne.adresse}}.\n\nArticle 1 — Objet\n{{personne.nom_civil}} participe, comme artiste invité, au titre « {{titre.nom}} » du projet « {{projet.titre}} ».\n\nArticle 2 — Rémunération\n{{remuneration}}.\n\nFait à Paris, en deux exemplaires.');
    perform public.set_contract_template_status(v, 'validated');
  end if;
  return v;
end $$;

-- A new invented guest: artist page, person of the Réseau, a title of the
-- project (on a master of the Catalogue when one is named), « D'accord », the
-- deal entrusted to the business manager, the accord validated. Nothing when the
-- artist already has a participation in the project.
create function pg_temp.guest(p_name text, p_city text, p_working_title text,
                              p_master text, p_units integer, p_note text)
returns void language plpgsql as $$
declare
  v_master uuid;
  v_title uuid;
  v_part uuid;
  v_deal uuid;
begin
  -- The Catalogue refuses a homonym: an artist already there is reused.
  perform pg_temp.as_user('claire.morel@preprod.pds');
  insert into public.artists (organization_id, name, relation)
  select pg_temp.k('org'), p_name, 'collaboration'
   where not exists (select 1 from public.artists a
                      where a.organization_id = pg_temp.k('org') and a.archived_at is null
                        and public.artist_name_key(a.name) = public.artist_name_key(p_name));
  insert into k select 'a:' || a.name, a.id from public.artists a
   where a.organization_id = pg_temp.k('org') and a.archived_at is null and a.name = p_name
  on conflict (name) do nothing;
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  insert into public.network_contacts (organization_id, kind, name, roles, relations, artist_id, city)
  select pg_temp.k('org'), 'person', p_name, '{artist}', '{}', pg_temp.k('a:' || p_name), p_city
   where not exists (select 1 from public.network_contacts c
                      where c.organization_id = pg_temp.k('org') and c.archived_at is null
                        and c.artist_id = pg_temp.k('a:' || p_name));
  insert into k select 'c:' || split_part(p_name, ' ', 1), c.id from public.network_contacts c
   where c.organization_id = pg_temp.k('org') and c.archived_at is null
     and c.artist_id = pg_temp.k('a:' || p_name)
  on conflict (name) do nothing;

  select tp.id, tp.title_id into v_part, v_title from public.title_participations tp
   where tp.project_id = pg_temp.k('p') and tp.artist_id = pg_temp.k('a:' || p_name);
  if v_part is not null then
    insert into k values ('part:' || p_name, v_part), ('title:' || p_name, v_title)
    on conflict (name) do nothing;
    return;
  end if;

  if p_master is not null then
    select id into v_master from public.masters
     where organization_id = pg_temp.k('org') and title = p_master and archived_at is null
     order by created_at limit 1;
    if v_master is null then
      perform pg_temp.as_user('claire.morel@preprod.pds');
      v_master := public.create_master(pg_temp.k('org'), p_master,
        jsonb_build_array(jsonb_build_object('artist_id', pg_temp.k('a:pds'), 'role', 'main')));
    end if;
  end if;
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  v_title := public.add_project_title(pg_temp.k('p'), p_working_title, v_master);
  select participation_id into v_part from public.add_title_participation(v_title, pg_temp.k('a:' || p_name));
  insert into k values ('part:' || p_name, v_part), ('title:' || p_name, v_title);

  perform public.set_title_participation_status(v_part, 'invited');
  perform public.set_title_participation_status(v_part, 'confirmed', p_note);
  v_deal := public.create_deal(p_participation_id => v_part, p_assignee_person_id => pg_temp.k('bm'));
  perform pg_temp.as_user((select email from who));
  if (select stage from public.deals where id = v_deal) <> 'negotiation' then
    perform public.set_deal_stage(v_deal, 'negotiation', 'Premier échange fait.');
  end if;
  perform public.set_deal_term(v_deal, 'master_split', jsonb_build_object('units', p_units), 'confirmed');
  perform public.set_deal_stage(v_deal, 'agreement', 'Accord sur la part du master.');
  perform pg_temp.as_user('claire.morel@preprod.pds');
  perform public.decide_deal_agreement(v_deal, true);
end $$;

-- The person's fiche on this project, as the person's side does it. One fiche
-- per (project, person): nothing when there is one. p_how:
--   opened    sent, opened by the person, not sent back     (« En attente »)
--   complete  sent back, checked and validated by the team   (« Remplie »)
create function pg_temp.fiche(p_name text, p_how text, p_address text)
returns void language plpgsql as $$
declare
  v_contact uuid := pg_temp.k('c:' || split_part(p_name, ' ', 1));
  v_form uuid;
  v_token text;
begin
  if v_contact is null or exists (select 1 from public.legal_forms f
                                   where f.project_id = pg_temp.k('p')
                                     and f.contact_id = v_contact) then
    return;
  end if;
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  select f.form_id, f.token into v_form, v_token
    from public.prepare_legal_form(pg_temp.k('p'), v_contact, p_name, array['artist'],
                                   '{}'::uuid[], '{}'::jsonb, 2) f;
  perform public.set_legal_form_state(v_form, 'sent');
  -- The person has no account: her private link, as the anonymous role.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  perform public.note_legal_form_opened(v_token);
  if p_how = 'complete' then
    perform public.submit_legal_form(v_token, array['performer'], null::text,
      jsonb_build_object(
        'legal_first_name', split_part(p_name, ' ', 1),
        'legal_last_name', substr(p_name, length(split_part(p_name, ' ', 1)) + 2),
        'email', lower(replace(p_name, ' ', '.')) || '@artistes.test',
        'entity_type', 'person',
        'address', p_address),
      '{}'::jsonb, 2);
  end if;
  execute 'reset role';
  if p_how = 'complete' then
    perform pg_temp.as_user('lina.haddad@preprod.pds');
    perform public.review_legal_form(v_form, true);
  end if;
end $$;

-- The person's contract, up to p_target:
--   sent      approved by the direction and sent on the private link
--   returned  and the signed copy deposited by the person, PDS not signed yet
--   signed    and countersigned by the direction, the signature checked
-- Only for a guest whose accord is validated, and only once (a need already
-- drafted into a contract is left as it is).
create function pg_temp.contract(p_name text, p_target text, p_remuneration text)
returns void language plpgsql as $$
declare
  v_contact uuid := pg_temp.k('c:' || split_part(p_name, ' ', 1));
  v_part uuid := pg_temp.k('part:' || p_name);
  v_need uuid;
  v_contract uuid;
  v_details jsonb;
  v_token text;
  v_path text;
  v_template uuid;
begin
  if v_contact is null or v_part is null or exists (
       select 1 from public.legal_agreement_needs n
        where n.project_id = pg_temp.k('p') and n.contact_id = v_contact
          and n.contract_id is not null) then
    return;
  end if;
  if not public.participation_agreement_validated(v_part) then
    raise notice 'Contrat de % : accord non validé, rien à rédiger.', p_name;
    return;
  end if;

  -- The Juridique names the contract it needs; Lina drafts it, each value with
  -- its source (the person's fiche).
  v_template := pg_temp.template();
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  perform public.approve_contract_mapping(pg_temp.k('p'), jsonb_build_array(jsonb_build_object(
    'contact_id', v_contact, 'needed', true, 'roles', jsonb_build_array('performer'),
    'template_id', v_template)));
  select id into v_need from public.legal_agreement_needs
   where project_id = pg_temp.k('p') and contact_id = v_contact;
  select d.details into v_details from public.contact_legal_details d where d.contact_id = v_contact;
  v_contract := public.generate_legal_contract(v_need, jsonb_build_object(
    'organisation.nom', jsonb_build_object('value', 'PDS', 'source', 'Structure'),
    'personne.nom_civil', jsonb_build_object('value', coalesce(
      nullif(btrim(concat_ws(' ', v_details ->> 'legal_first_name', v_details ->> 'legal_last_name')), ''),
      p_name), 'source', 'Fiche de renseignements'),
    'personne.adresse', jsonb_build_object('value', coalesce(
      nullif(btrim(v_details ->> 'address'), ''), 'Adresse à compléter'),
      'source', 'Fiche de renseignements'),
    'titre.nom', jsonb_build_object('value', public.project_title_label(pg_temp.k('title:' || p_name)),
      'source', 'Titre'),
    'projet.titre', jsonb_build_object('value', 'Assurance 30', 'source', 'Projet'),
    'remuneration', jsonb_build_object('value', p_remuneration, 'source', 'Accord validé')));
  perform public.advance_contract(v_contract, 'submit');
  perform pg_temp.as_user('claire.morel@preprod.pds');
  perform public.advance_contract(v_contract, 'approve');
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  v_token := public.issue_contact_link(pg_temp.k('p'), v_contact);
  perform public.send_contract(v_contract, 'link', null, null);
  if p_target = 'sent' then
    return;
  end if;

  -- The person downloads it, signs it and deposits the PDF by her link.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  v_path := public.open_signed_return_slot(v_token, 'contract', v_contract);
  execute 'reset role';
  insert into storage.objects (bucket_id, name, metadata)
  values ('contract-files', v_path, '{"mimetype": "application/pdf", "size": 184000}');
  execute 'set local role anon';
  perform public.submit_signed_contract(v_token, v_contract, v_path,
                                        'Contrat signé — ' || p_name || '.pdf');
  execute 'reset role';
  if p_target = 'returned' then
    return;
  end if;

  -- PDS signs after her, on the PDF she signed; the team checks the signature.
  insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
  values (pg_temp.k('org'), v_contract, 'pds_signed',
          pg_temp.k('org') || '/' || v_contract || '/' || gen_random_uuid() || '.pdf',
          'Contrat signé des deux parties — ' || p_name || '.pdf', 'application/pdf', 196000);
  perform pg_temp.as_user('claire.morel@preprod.pds');
  perform public.advance_contract(v_contract, 'countersign');
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  perform public.advance_contract(v_contract, 'sign', null, current_date, true);
end $$;

-- « Son reçu »: the title's master has a demo with the final vocals, confirmed as
-- the source in the Master by the project's owner; no mix. Nothing when a source
-- is confirmed for this master in the project, or the title has no master.
create function pg_temp.sound(p_name text, p_file text)
returns void language plpgsql as $$
declare
  v_master uuid := (select master_id from public.project_titles where id = pg_temp.k('title:' || p_name));
  v_file uuid;
begin
  if v_master is null or exists (select 1 from public.master_flow_sources s
                                  where s.project_id = pg_temp.k('p') and s.master_id = v_master) then
    return;
  end if;
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  insert into public.master_files (organization_id, master_id, category, audio_state, duration_seconds,
                                   path, file_name, mime, bytes)
  values (pg_temp.k('org'), v_master, 'audio', 'demo', 192,
          pg_temp.k('org') || '/' || v_master || '/' || gen_random_uuid() || '.wav',
          p_file, 'audio/wav', 34000000)
  returning id into v_file;
  insert into public.master_flow_sources (organization_id, project_id, master_id, file_id, vocals_final)
  values (pg_temp.k('org'), pg_temp.k('p'), v_master, v_file, true);
end $$;

-- The two new guests, « D'accord », their accord validated. Ysolde on a master
-- of the Catalogue (no audio yet), Tiago on a title still to be named.
select pg_temp.guest('Ysolde Marnay', 'Rennes', null, 'Marée haute', 300000,
  'Partante après le call avec son label.');
select pg_temp.guest('Tiago Lestrel', 'Marseille', 'Dernier métro', null, 250000,
  'D''accord par message, il envoie ses dates.');

-- Fiche: Selma « En attente », Elio « Remplie » (and the two new guests, whose
-- contract is drafted from it).
select pg_temp.fiche('Selma Quirin', 'opened', null);
select pg_temp.fiche('Elio Danvers', 'complete', '8 quai des Chartrons, 33000 Bordeaux');
select pg_temp.fiche('Ysolde Marnay', 'complete', '22 rue Saint-Michel, 35000 Rennes');
select pg_temp.fiche('Tiago Lestrel', 'complete', '5 rue de la Palud, 13001 Marseille');

-- Contract: Elio « Envoyé · en attente de retour », Ysolde « Retour reçu · à
-- contresigner », Tiago « Signé ».
select pg_temp.contract('Elio Danvers', 'sent', '50 % du master');
select pg_temp.contract('Ysolde Marnay', 'returned', '30 % du master');
select pg_temp.contract('Tiago Lestrel', 'signed', '25 % du master');

-- Son: « Cap sur demain » « Son reçu »; « Marée haute » stays « Son attendu ».
select pg_temp.sound('Elio Danvers', 'Cap sur demain — voix finales (démo).wav');

-- ===========================================================================
-- 3. The Juridique started ----------------------------------------------------------
-- ===========================================================================

-- A name as lib/utils/search.ts normalizeSearch keys it (no accent, no space).
create function pg_temp.nkey(p text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(p), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
                        '[\s-]+', '', 'g') $$;

-- 3a. The Cadrage du projet and « Lancer le plan ». Nothing when the plan is
-- launched (the Juridique alone is launched when the plan left it out), nor
-- when the Cadrage is in a state of its own (started or decided by hand).
create function pg_temp.plan() returns void language plpgsql as $$
declare
  v_p uuid := pg_temp.k('p');
  v_state text;
  v_brief uuid;
  v_val uuid;
  v_due date := (select due_date from public.projects where id = v_p);
begin
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  if exists (select 1 from public.project_plans where project_id = v_p) then
    if not exists (select 1 from public.project_plan_items
                    where project_id = v_p and workflow = 'legal' and launched_at is not null) then
      perform public.launch_plan_workflow(v_p, 'legal', 'Juridique',
        'Sécuriser les fiches, les contrats et les droits de chaque titre.');
    end if;
    return;
  end if;

  select s.state into v_state from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
   where s.project_id = v_p and d.key = 'framing';
  if v_state = 'not_started' then
    -- The Cadrage's answers, as the other showcases write them, then the Brief
    -- as the app freezes it (lib/framing/brief-snapshot.ts, schema 2).
    perform public.start_framing_without_call(v_p);
    insert into public.field_values (organization_id, project_id, deliverable, field_key,
                                     value, status, source_type)
    select pg_temp.k('org'), v_p, 'brief', a.key, a.value, 'confirmed', 'manual'
      from (values
        ('objective', to_jsonb('Atteindre 1 000 000 de streams en 3 mois, sur Spotify et Deezer, avec PDS et ses artistes invités.'::text)),
        ('success_criteria', to_jsonb('1 000 000 de streams cumulés sur Spotify et Deezer trois mois après la sortie.'::text)),
        ('main_priority', to_jsonb('Réunir les artistes invités et tourner le 5 décembre 2026.'::text)),
        ('current_state', to_jsonb('PDS en artiste principal ; les invités sont contactés, leurs accords avancent.'::text)),
        ('target_date', to_jsonb(v_due::text)),
        ('budget_envelope', to_jsonb(1000000)),
        ('contributors', '{"none": true}'::jsonb),
        ('legal_blockers', '{"none": true}'::jsonb)) a (key, value);
    v_brief := public.create_framing_brief(v_p, jsonb_build_object(
      'schema', 2,
      'project', jsonb_build_object('title', 'Assurance 30', 'kind', 'Contenu', 'artist', 'PDS'),
      'sources', '[]'::jsonb,
      'summary', jsonb_build_object(
        'decisions', jsonb_build_array('Réunir les artistes invités et tourner le 5 décembre 2026.'),
        'open', '[]'::jsonb, 'risks', '[]'::jsonb, 'prerequisites', '[]'::jsonb,
        'owners', jsonb_build_array('Responsable : Lina Haddad', 'Validation : Claire Morel')),
      'dimensions', jsonb_build_array(
        jsonb_build_object('dimension', 'objective', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
          jsonb_build_object('key', 'objective', 'label', 'Résultat recherché', 'source', null, 'lines', '[]'::jsonb,
            'value', 'Atteindre 1 000 000 de streams en 3 mois, sur Spotify et Deezer, avec PDS et ses artistes invités.'),
          jsonb_build_object('key', 'success_criteria', 'label', 'Critère de réussite', 'source', null, 'lines', '[]'::jsonb,
            'value', '1 000 000 de streams cumulés sur Spotify et Deezer trois mois après la sortie.'),
          jsonb_build_object('key', 'main_priority', 'label', 'Priorité principale', 'source', null, 'lines', '[]'::jsonb,
            'value', 'Réunir les artistes invités et tourner le 5 décembre 2026.'))),
        jsonb_build_object('dimension', 'timing', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
          jsonb_build_object('key', 'target_date', 'label', 'Date cible', 'source', null, 'lines', '[]'::jsonb,
            'value', to_char(v_due, 'DD/MM/YYYY')))),
        jsonb_build_object('dimension', 'budget', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
          jsonb_build_object('key', 'budget_envelope', 'label', 'Enveloppe', 'source', null, 'lines', '[]'::jsonb,
            'value', '10 000 €'))),
        jsonb_build_object('dimension', 'team', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
          jsonb_build_object('key', 'contributors', 'label', 'Intervenants', 'source', null, 'lines', '[]'::jsonb,
            'value', 'Rien à signaler'))),
        jsonb_build_object('dimension', 'start', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
          jsonb_build_object('key', 'current_state', 'label', 'État réel', 'source', null, 'lines', '[]'::jsonb,
            'value', 'PDS en artiste principal ; les invités sont contactés, leurs accords avancent.'))),
        jsonb_build_object('dimension', 'legal', 'facts', '[]'::jsonb, 'items', jsonb_build_array(
          jsonb_build_object('key', 'legal_blockers', 'label', 'Blocages connus', 'source', null, 'lines', '[]'::jsonb,
            'value', 'Rien à signaler'))))));
    v_val := public.send_framing_brief(v_brief, null);
    perform pg_temp.as_user('claire.morel@preprod.pds');
    perform public.decide_framing_brief(v_val, true, null, null);
    perform pg_temp.as_user('lina.haddad@preprod.pds');
    v_state := 'validated';
  end if;
  if v_state is distinct from 'validated' then
    raise notice 'Cadrage du projet dans un état à part (%) : le plan n''est pas lancé.', v_state;
    return;
  end if;

  perform public.launch_project_plan(v_p, jsonb_build_array(
    jsonb_build_object('column', 'focus', 'workflow', 'legal', 'title', 'Juridique',
                       'why', 'Sécuriser les fiches, les contrats et les droits de chaque titre.'),
    jsonb_build_object('column', 'focus', 'workflow', 'master', 'title', 'Master',
                       'why', 'Réunir le son de chaque titre.')));
end $$;

-- 3b. The Cadrage juridique, as Lina answers it, then the confirmation. Only
-- while the dossier has no answer at all (an intake of its own is left alone).
create function pg_temp.intake() returns void language plpgsql as $$
declare
  v_p uuid := pg_temp.k('p');
  v_none constant jsonb := '[{"kind": "none", "value": {}, "quote": null}]';
  m record;
  v_text text;
  v_facts jsonb;
begin
  if exists (select 1 from public.legal_intakes where project_id = v_p)
     or not exists (select 1 from public.project_plan_items
                     where project_id = v_p and workflow = 'legal' and launched_at is not null) then
    return;
  end if;
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  -- The questions, in the order lib/legal/intake/questions.ts asks them: per
  -- title its people (unless its credits name them) then its borrowed element,
  -- the project's agreements (unless a contract exists), each title's publisher.
  for m in select pm.master_id, ma.title from public.project_masters pm
             join public.masters ma on ma.id = pm.master_id
            where pm.project_id = v_p order by pm.position loop
    if not exists (select 1 from public.master_contributors where master_id = m.master_id) then
      -- Who the title already names: its guests, « interprète (featuring du titre) ».
      select string_agg(a.name || ' : interprète (featuring du titre).', E'\n' order by x.position),
             coalesce(jsonb_agg(jsonb_build_object('kind', 'contribution',
               'value', jsonb_build_object('name', a.name, 'role', 'performer'),
               'quote', a.name) order by x.position), '[]'::jsonb)
        into v_text, v_facts
        from public.master_artists x join public.artists a on a.id = x.artist_id
       where x.master_id = m.master_id and x.role = 'featuring';
      if v_text is null then
        perform public.record_legal_answer(v_p, 'contributors', m.master_id, 'Personne d''autre.', v_none);
      else
        perform public.record_legal_answer(v_p, 'contributors', m.master_id, v_text, v_facts);
      end if;
    end if;
    perform public.record_legal_answer(v_p, 'third_party', m.master_id, 'Aucune œuvre existante', v_none);
  end loop;
  if not exists (select 1 from public.contracts where project_id = v_p) then
    perform public.record_legal_answer(v_p, 'agreements', null, 'Aucun accord', v_none);
  end if;
  for m in select pm.master_id from public.project_masters pm
            where pm.project_id = v_p
              and not exists (select 1 from public.master_splits s
                               where s.master_id = pm.master_id and s.kind = 'publishing'
                                 and s.role = 'publisher')
            order by pm.position loop
    perform public.record_legal_answer(v_p, 'publisher', m.master_id, 'Pas d''éditeur', v_none);
  end loop;
  perform public.confirm_legal_intake(v_p);
end $$;

-- 3c. « Lancer le plan d'action »: what the app proposes from the confirmed
-- dossier (lib/legal/plan/proposal.ts and proposal-titles.ts), with the dates
-- lib/legal/plan/due-dates.ts proposes, Lina answering for each action. Nothing
-- once a plan of the Juridique exists.
create function pg_temp.legal_plan() returns void language plpgsql as $$
declare
  v_p uuid := pg_temp.k('p');
  v_org uuid := pg_temp.k('org');
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_release date := (select due_date from public.projects where id = v_p);
  v_owner uuid := (select p.owner_person_id from public.projects p where p.id = v_p);
  v_n integer;
  v_person record;
  v_credit record;
  v_m record;
  v_art record;
  v_contact record;
  v_label text;
  v_same uuid;
  v_theirs boolean;
  v_running boolean;
  v_wait text[];
  v_creators text;
  v_deps text[];
  v_items jsonb;
begin
  if exists (select 1 from public.legal_plans where project_id = v_p)
     or not exists (select 1 from public.legal_intakes where project_id = v_p and status = 'confirmed') then
    return;
  end if;
  perform pg_temp.as_user('lina.haddad@preprod.pds');
  -- Who may answer for an action: a member holding manage_legal.
  if v_owner is null or not public.person_has_permission(v_org, v_owner, 'manage_legal') then
    v_owner := null;
  end if;

  -- The people: each credited person once (by name), then the featured artists,
  -- on the person of their contact, or the guest credited by name (a collective).
  create temp table pl_people (ord serial, key text primary key, name text, contact_id uuid,
                               roles text[], credit_ids uuid[]) on commit drop;
  create temp table pl_items (ord serial, key text primary key, kind text, master_id uuid, label text,
                              detail text, why text, subject text, credit_ids uuid[], status text,
                              depends_on text[], due date, kept boolean default true) on commit drop;
  for v_credit in
    select c.id, c.name, c.contact_id, c.role from public.master_contributors c
      join public.project_masters pm on pm.master_id = c.master_id
     where pm.project_id = v_p order by pm.position, c.created_at
  loop
    v_label := case v_credit.role
      when 'composer' then 'Compositeur·rice' when 'lyricist' then 'Auteur·rice (paroles)'
      when 'arranger' then 'Arrangeur·se' when 'producer' then 'Réalisateur·rice'
      when 'co_producer' then 'Coréalisateur·rice' when 'recording_engineer' then 'Ingé son (enregistrement)'
      when 'mix_engineer' then 'Ingé son (mixage)' when 'mastering_engineer' then 'Ingé son (mastering)'
      when 'musician' then 'Musicien·ne' else 'Autre' end;
    insert into pl_people (key, name, contact_id, roles, credit_ids)
    values (pg_temp.nkey(v_credit.name), v_credit.name, v_credit.contact_id, array[v_label],
            array[v_credit.id])
    on conflict (key) do update
      set contact_id = coalesce(pl_people.contact_id, excluded.contact_id),
          credit_ids = pl_people.credit_ids || excluded.credit_ids,
          roles = case when v_label = any (pl_people.roles) then pl_people.roles
                       else pl_people.roles || v_label end;
  end loop;
  for v_art in
    select f.artist_id, f.name from (
      select distinct on (ma.artist_id) ma.artist_id, a.name, pm.position as pos, ma.position as apos
        from public.master_artists ma
        join public.project_masters pm on pm.master_id = ma.master_id
        join public.artists a on a.id = ma.artist_id
       where pm.project_id = v_p and ma.role = 'featuring'
       order by ma.artist_id, pm.position, ma.position) f
     order by f.pos, f.apos
  loop
    select c.id, c.name into v_contact from public.network_contacts c
     where c.artist_id = v_art.artist_id and c.archived_at is null order by c.created_at limit 1;
    v_same := null;
    if v_contact.id is not null then
      select key into v_same from pl_people where contact_id = v_contact.id order by ord limit 1;
    elsif (select collective from public.projects where id = v_p) then
      select key into v_same from pl_people where key = pg_temp.nkey(v_art.name);
    end if;
    if v_same is not null then
      update pl_people set roles = case when 'Artiste interprète' = any (roles) then roles
                                        else roles || 'Artiste interprète' end
       where key = v_same;
    else
      insert into pl_people (key, name, contact_id, roles, credit_ids)
      values (case when v_contact.id is not null then 'contact:' || v_contact.id
                   else 'artist:' || v_art.artist_id end,
              coalesce(v_contact.name, v_art.name), v_contact.id, array['Artiste interprète'], '{}');
    end if;
  end loop;

  -- A fiche is missing when the person has no contact or no complete fiche.
  select count(*) into v_n from pl_people pp
   where pp.contact_id is null or not exists (select 1 from public.legal_forms f
        where f.project_id = v_p and f.contact_id = pp.contact_id and f.status = 'complete');
  v_wait := case when v_n > 0 then array['onboarding'] else '{}' end;
  if v_n > 0 then
    insert into pl_items (key, kind, label, detail, why, status, depends_on, credit_ids)
    select 'onboarding', 'onboarding',
           case when v_n = 1 then 'Faire remplir une fiche de renseignements'
                else 'Faire remplir ' || v_n || ' fiches de renseignements' end,
           string_agg(pp.name, ', ' order by pp.ord),
           'Chaque personne créditée remplit sa fiche par un lien, sans compte : identité, coordonnées, numéro SACEM, de quoi la payer. Ses contrats et déclarations en dépendent.',
           'action_now', '{}', '{}'
      from pl_people pp
     where pp.contact_id is null or not exists (select 1 from public.legal_forms f
        where f.project_id = v_p and f.contact_id = pp.contact_id and f.status = 'complete');
  end if;

  -- The borrowed elements still to secure.
  insert into pl_items (key, kind, master_id, label, detail, why, subject, credit_ids, status, depends_on)
  select 'clearance:' || c.id, 'clearance', c.master_id, 'Autorisation d''utilisation « ' || c.work || ' »',
         concat_ws(' · ',
           case c.element when 'topline' then 'Topline' when 'sample' then 'Sample'
             when 'interpolation' then 'Interpolation' when 'cover' then 'Reprise'
             else 'Élément repris' end,
           c.author,
           (select 'Repris dans « ' || m.title || ' »' from public.masters m
             join public.project_masters pm on pm.master_id = m.id
            where pm.project_id = v_p and m.id = c.master_id)),
         'Reprendre un élément d''une œuvre existante exige l''accord de ses ayants droit avant la sortie.',
         c.work, '{}',
         case when c.status in ('rightsholders_identified', 'contacted', 'waiting_external', 'negotiating',
                                'agreement_reached', 'document_pending', 'signed')
              then 'waiting_external' else 'action_now' end,
         '{}'
    from public.legal_clearances c
   where c.project_id = v_p and c.status not in ('cleared', 'abandoned')
   order by c.created_at;

  -- A contract per person: none once signed, nor when the Cadrage settled it.
  for v_person in select * from pl_people order by ord loop
    v_theirs := false;
    v_running := false;
    if v_person.contact_id is not null then
      select coalesce(bool_or(k.status = 'signed'), false), coalesce(bool_or(k.status not in ('terminated', 'signed')), false)
        into v_theirs, v_running
        from public.contracts k
       where k.project_id = v_p and exists (select 1 from public.contract_parties cp
              where cp.contract_id = k.id and cp.contact_id = v_person.contact_id);
    end if;
    continue when v_theirs
      or exists (select 1 from public.framing_legal_parties fp
                  where fp.project_id = v_p and fp.party_key = pg_temp.nkey(btrim(v_person.name))
                    and fp.document_status in ('existing', 'not_needed', 'not_applicable'));
    v_deps := case when v_person.contact_id is null or not exists (
                         select 1 from public.legal_forms f where f.project_id = v_p
                            and f.contact_id = v_person.contact_id and f.status = 'complete')
                   then v_wait else '{}' end;
    insert into pl_items (key, kind, label, detail, why, subject, credit_ids, status, depends_on)
    values ('contract:' || v_person.key, 'contract', 'Faire signer un contrat à ' || v_person.name,
            array_to_string(v_person.roles, ' · '),
            'Sa participation (rémunération, cession de ses droits) doit être écrite et signée.',
            v_person.name, v_person.credit_ids,
            case when v_running then 'waiting_external'
                 when cardinality(v_deps) > 0 then 'blocked' else 'action_now' end,
            case when v_running then '{}' else v_deps end);
    -- The Suivi reads a contract through a credit of the person
    -- (lib/legal/tracking/sources.ts: « Plus créditée » otherwise), so a guest
    -- who is no credit shows « Obsolète » there: left out of the plan, as a
    -- person does when confirming it (the key is dismissed below). The guest's
    -- contract stays in « Contrats des intervenants » and in the recap.
    if cardinality(v_person.credit_ids) = 0 then
      update pl_items set kept = false where key = 'contract:' || v_person.key;
    end if;
  end loop;

  -- Per title: its publishing split, then its SACEM declaration.
  for v_m in
    select pm.master_id, m.title from public.project_masters pm
      join public.masters m on m.id = pm.master_id where pm.project_id = v_p order by pm.position
  loop
    select string_agg(distinct_name, ', ' order by first_at) into v_creators from (
      select c.name as distinct_name, min(c.created_at) as first_at from public.master_contributors c
       where c.master_id = v_m.master_id and c.role in ('composer', 'lyricist', 'arranger')
       group by c.name) x;
    v_deps := v_wait;
    if v_creators is not null then
      insert into pl_items (key, kind, master_id, label, detail, why, subject, credit_ids, status, depends_on)
      values ('splits:' || v_m.master_id, 'splits', v_m.master_id,
              'Répartir l''édition de « ' || v_m.title || ' »', v_creators,
              'Les auteurs et compositeurs doivent s''accorder sur la part de chacun : elle sert à la déclaration SACEM.',
              v_m.title, '{}',
              case when cardinality(v_wait) > 0 then 'blocked' else 'action_now' end, v_wait);
      v_deps := v_deps || ('splits:' || v_m.master_id);
    end if;
    if not exists (select 1 from public.master_declarations d where d.master_id = v_m.master_id
                    and d.organism = 'sacem' and d.status = 'confirmed') then
      select v_deps || coalesce(array_agg(i.key order by i.ord), '{}') into v_deps
        from pl_items i where i.kind = 'clearance' and i.master_id = v_m.master_id;
      insert into pl_items (key, kind, master_id, label, why, subject, credit_ids, status, depends_on)
      values ('formality:' || v_m.master_id, 'formality', v_m.master_id,
              'Déclarer « ' || v_m.title || ' » à la SACEM',
              'La déclaration ouvre les droits d''auteur. Elle attend les informations des créateurs, la répartition, les autorisations d''œuvres existantes et le master final.',
              v_m.title, '{}',
              case when cardinality(v_deps) > 0 then 'blocked' else 'action_now' end, v_deps);
    end if;
  end loop;

  -- The due dates: the kind's date, never sooner than three days from today,
  -- then a week past the latest of what the action waits for.
  update pl_items set due = case when v_release is null and kind <> 'onboarding' then null
    else greatest(
      case kind when 'onboarding' then v_today + 7
        else v_release - case kind when 'clearance' then 45 when 'contract' then 30
                                   when 'splits' then 30 else 15 end end,
      v_today + 3) end;
  for v_n in 1..4 loop
    update pl_items i set due = greatest(i.due, (select max(d.due) + 7 from pl_items d
                                                  where d.key = any (i.depends_on)))
     where i.due is not null and cardinality(i.depends_on) > 0;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'key', i.key, 'kind', i.kind, 'master_id', i.master_id, 'label', i.label,
           'detail', i.detail, 'why', i.why, 'subject', i.subject,
           'credit_ids', to_jsonb(i.credit_ids), 'status', i.status,
           'depends_on', to_jsonb(i.depends_on), 'responsible_person_id', v_owner,
           'due_on', i.due) order by i.ord), '[]'::jsonb)
    into v_items from pl_items i where i.kept;
  perform public.launch_legal_plan(v_p, v_items);
  perform public.dismiss_legal_plan_keys(v_p, coalesce(
    (select array_agg(i.key order by i.ord) from pl_items i where not i.kept), '{}'));
end $$;

select pg_temp.plan();
select pg_temp.intake();
select pg_temp.legal_plan();

commit;
\o
\if :already
  \echo 'Assurance 30 existe déjà : les états du récap et le Juridique sont ajoutés, ou déjà là.'
\else
  \echo 'Assurance 30 créé, avec les états du récap et son Juridique démarré.'
\endif
