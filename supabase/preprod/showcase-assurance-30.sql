-- Showcase of « Assurance 30 », the collective project Ibé created live on
-- 18/11/2026 (ticket « PDSMIC : retours d'Ibé du 18/11 », lot L5): PDS as the
-- main artist, guests, 1 000 000 streams in 3 months on Spotify and Deezer,
-- 10 000 €, shoot on 5 December 2026. It replays that case so the recap of the
-- titles shows every state at once. Two parts:
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
-- the contract template, the accord and the contracts, and countersigns for PDS;
-- Lina runs the project, drafts and sends the contracts, plans the fiches and
-- confirms the source; the business manager negotiates; the person's side, who
-- has no account, acts as the anonymous role with her private link: opening and
-- sending back the fiche, depositing the signed contract). Plain inserts, as the
-- other showcases, for what the app does through a browser or a file upload
-- (no content behind these files, the local and pre-production Storage have no
-- seed): the artists, the Network contacts and the Catalogue contributors; the
-- demo file of « Cap sur demain » (master_files, the source then confirmed as the
-- app does it, an insert under the owner's rights); the object of the signed
-- copy in storage.objects (what the upload leaves, before submit_signed_contract
-- records it) and the PDF countersigned by PDS (contract_files, category
-- pds_signed: advance_contract wants the file, as for the real signature).
-- Constraints and triggers are never disabled. NEVER on production. The plan
-- (Master, Juridique) is not launched: the project is accepted by Lina, its plan
-- left to be launched.

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

commit;
\o
\if :already
  \echo 'Assurance 30 existe déjà : les états du récap sont ajoutés, ou déjà là.'
\else
  \echo 'Assurance 30 créé, avec les états du récap.'
\endif
