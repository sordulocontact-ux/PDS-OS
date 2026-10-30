-- Pre-production showcase (docs/PREPROD.md § 5 bis, Sacha 30/10/2026): enough
-- of everything to see every page full — more people in the team, a network
-- of people and organizations, contracts in every state, files, credits,
-- fiches de renseignements and calls — tied to the projects and titles of
-- supabase/preprod/seed.sql. Adds only; played after the seed by
-- scripts/preprod-reset.sh, or alone on a base already in use:
--
--   { printf "\\set pw '%s'\n" "$PREPROD_PASSWORD"; cat supabase/preprod/showcase.sql; } \
--     | psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1
--
-- Played once: a second run stops at the guard below. NEVER on production
-- (accounts @preprod.pds only, as the seed).

\set ON_ERROR_STOP on
select exists (select 1 from public.network_contacts where name = 'Studio Ressac') as already \gset
\if :already
  \echo 'Jeu de démonstration déjà présent : rien à faire.'
  \quit
\endif

-- Nothing printed but the last line: the links' tokens stay out of the logs.
\o /dev/null
begin;

create temp table k (name text primary key, id uuid) on commit drop;
create function pg_temp.k(p text) returns uuid language sql as $$
  select id from k where name = p $$;
-- Writes as this account (auth.uid() fills created_by), without RLS: the
-- seed's gestures already proved the rights; this adds the scenery.
create function pg_temp.as_user(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select id from auth.users where email = p_email), 'role', 'authenticated')::text, true);
end $$;

insert into k select 'org', id from public.organizations where slug = 'pds';
insert into k select split_part(email, '@', 1), a.person_id
  from auth.users u join public.accounts a on a.id = u.id
 where u.email like '%@preprod.pds';
-- The seed's projects and titles, by title (the first one when two share it).
insert into k select distinct on (title) 'p:' || title, id from public.projects
 order by title, created_at;
insert into k select distinct on (title) 'm:' || title, id from public.masters
 order by title, created_at;
insert into k select 'a:' || name, id from public.artists;

-- Team: two more project managers, a creative director, a pending request -----
create temp table new_accounts (email text, first_name text, last_name text, role text);
insert into new_accounts values
  ('ines.garnier@preprod.pds',  'Inès',  'Garnier',  'project_manager'),
  ('yanis.belkacem@preprod.pds','Yanis', 'Belkacem', 'project_manager'),
  ('chloe.martin@preprod.pds',  'Chloé', 'Martin',   'creative_director'),
  ('hugo.lefevre@preprod.pds',  'Hugo',  'Lefèvre',  null);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       a.email, extensions.crypt(:'pw', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}',
       jsonb_build_object('first_name', a.first_name, 'last_name', a.last_name),
       now(), now(), '', '', '', ''
  from new_accounts a;
insert into auth.identities (id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users u join new_accounts a on a.email = u.email;
-- Hugo stays a request for Claire to decide (Équipe).
update public.memberships m set status = 'approved', role = a.role
  from new_accounts a join auth.users u on u.email = a.email
  join public.accounts ac on ac.id = u.id
 where m.person_id = ac.person_id and a.role is not null;
insert into k select split_part(u.email, '@', 1), ac.person_id
  from auth.users u join public.accounts ac on ac.id = u.id
  join new_accounts a on a.email = u.email;

-- Network ------------------------------------------------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
create temp table net (key text, kind text, name text, roles text[], relations text[],
  parent text, email text, phone text, city text, website text, tiktok text, notes text);
insert into net values
  ('ressac',  'organization', 'Studio Ressac', '{studio}', '{provider}', null, 'contact@studioressac.fr', '01 42 55 18 90', 'Paris', 'https://studioressac.fr', null, 'Studio de mix et mastering, deux cabines. Tarif jour négocié en 2026.'),
  ('lumen',   'organization', 'Lumen Films', '{production_company}', '{provider}', null, 'prod@lumenfilms.fr', '01 48 06 77 21', 'Paris', 'https://lumenfilms.fr', null, null),
  ('rivage',  'organization', 'Éditions Rivage', '{publisher}', '{partner}', null, 'catalogue@editions-rivage.fr', null, 'Paris', null, null, 'Co-édite les titres de Mona Lys depuis 2025.'),
  ('orchard', 'organization', 'The Orchard France', '{distributor}', '{partner}', null, 'france@theorchard.com', null, 'Paris', 'https://www.theorchard.com', null, null),
  ('hublot',  'organization', 'Agence Hublot', '{agency}', '{provider}', null, 'bonjour@agencehublot.fr', '04 78 22 61 30', 'Lyon', null, null, 'Agence d''influence : propose des créateurs par campagne.'),
  ('neo',     'organization', 'Radio Néo', '{media}', '{partner}', null, 'prog@radioneo.fr', null, 'Paris', 'https://radioneo.fr', null, null),
  ('sillon',  'organization', 'Label Sillon', '{label}', '{partner}', null, 'demo@labelsillon.fr', null, 'Bordeaux', null, null, null),
  ('karim',   'person', 'Karim Haddou', '{engineer}', '{provider}', 'ressac', 'karim@studioressac.fr', '06 12 48 90 33', 'Paris', null, null, 'Mixe les singles de Mona Lys. Préfère les retours groupés.'),
  ('bastien', 'person', 'Bastien Coll', '{engineer}', '{provider}', 'ressac', 'bastien@studioressac.fr', null, 'Paris', null, null, null),
  ('sami',    'person', 'Sami Kader', '{songwriter,producer}', '{partner}', null, 'sami.kader@gmail.com', '06 71 20 54 18', 'Marseille', null, null, null),
  ('maxime',  'person', 'Maxime Roux', '{videographer}', '{provider}', 'lumen', 'maxime@lumenfilms.fr', '06 33 81 25 07', 'Paris', null, null, 'Réalisateur des clips de Néons et Minuit pile.'),
  ('lea',     'person', 'Léa Dumas', '{photographer}', '{provider}', null, 'lea.dumas.photo@gmail.com', null, 'Lyon', null, null, null),
  ('nora',    'person', 'Nora Aït', '{art_director,designer}', '{provider}', null, 'nora.ait@studio-nora.fr', null, 'Paris', null, null, 'Pochettes et identité visuelle.'),
  ('julie',   'person', 'Julie Ferrand', '{influencer}', '{client}', null, 'julie.ferrand@gmail.com', null, 'Paris', null, 'julieferrand', '190 k abonnés TikTok, public 18-24 ans.'),
  ('sarah',   'person', 'Sarah Benhamou', '{lawyer}', '{provider}', null, 's.benhamou@cabinet-benhamou.fr', '01 53 40 12 88', 'Paris', null, null, 'Avocate en droit de la musique.'),
  ('thomas',  'person', 'Thomas Girard', '{journalist}', '{partner}', 'neo', 'thomas.girard@radioneo.fr', null, 'Paris', null, null, null),
  ('camille', 'person', 'Camille Petit', '{manager}', '{client}', null, 'camille.petit@management.fr', '06 02 19 77 45', 'Lille', null, null, 'Manageuse de Mona Lys.'),
  ('jade',    'person', 'Jade Morel', '{artist}', '{}', null, null, null, 'Nantes', null, 'jademorel.music', 'Repérée sur TikTok : 40 k abonnés, à rencontrer.');

insert into public.network_contacts (organization_id, kind, name, roles, relations, email,
  phone, city, website, tiktok_handle, notes)
select pg_temp.k('org'), kind, name, roles, relations, email, phone, city, website, tiktok, notes
  from net where parent is null;
insert into k select 'c:' || n.key, c.id from net n join public.network_contacts c on c.name = n.name;
insert into public.network_contacts (organization_id, kind, name, roles, relations, email,
  phone, city, website, tiktok_handle, notes, parent_id)
select pg_temp.k('org'), kind, name, roles, relations, email, phone, city, website, tiktok, notes,
       pg_temp.k('c:' || parent)
  from net where parent is not null;
insert into k select 'c:' || n.key, c.id from net n join public.network_contacts c on c.name = n.name
 where n.parent is not null;

-- Catalogue: a first title for the artists who have none ---------------------
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k select 'm:' || t.title, public.create_master(pg_temp.k('org'), t.title,
    jsonb_build_array(jsonb_build_object('artist_id', a.id, 'role', 'main')))
  from (values ('Lila Vega', 'Sable chaud'), ('Mako Rouge', 'Feu de camp'),
               ('Nahel Nuit', 'Nuit blanche'), ('Rivo Blanc', 'Rive gauche')) t (artist, title)
  join public.artists a on a.name = t.artist
 where not exists (select 1 from public.master_artists ma where ma.artist_id = a.id);

-- Credits on the titles ------------------------------------------------------
insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
select pg_temp.k('org'), pg_temp.k('m:' || m), c.name, r, c.id
  from (values ('Néons', 'sami', 'composer'), ('Néons', 'sami', 'lyricist'),
               ('Néons', 'karim', 'mix_engineer'), ('Néons', 'bastien', 'mastering_engineer'),
               ('Minuit pile', 'sami', 'producer'), ('Minuit pile', 'karim', 'mix_engineer'),
               ('Mirage', 'sami', 'arranger'), ('Ciel bas', 'bastien', 'mastering_engineer'),
               ('Velours', 'sami', 'composer')) v (m, who, r)
  join public.network_contacts c on c.id = pg_temp.k('c:' || who)
 where pg_temp.k('m:' || m) is not null;

-- Who does what in the projects (« Qui fait quoi ») ---------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
insert into public.project_team_members (organization_id, project_id, display_name, role,
  contact_id, review_status, source_type)
select pg_temp.k('org'), pg_temp.k('p:' || p), c.name, r, c.id, 'confirmed', 'manual'
  from (values ('Minuit pile', 'karim', 'Ingénieur du mix'), ('Minuit pile', 'maxime', 'Réalisateur du clip'),
               ('Minuit pile', 'lea', 'Photographe'), ('Minuit pile', 'julie', 'Créatrice de contenu'),
               ('Néons', 'karim', 'Ingénieur du mix'), ('Néons', 'sami', 'Compositeur'),
               ('Néons', 'nora', 'Directrice artistique'), ('Mirage', 'sami', 'Réalisateur'),
               ('Mirage', 'bastien', 'Ingénieur du mastering'), ('Ciel ouvert', 'maxime', 'Réalisateur du clip'),
               ('Ciel ouvert', 'nora', 'Directrice artistique')) v (p, who, r)
  join public.network_contacts c on c.id = pg_temp.k('c:' || who)
 where pg_temp.k('p:' || p) is not null;

-- Fiches de renseignements: sent, one returned -------------------------------
insert into public.legal_forms (organization_id, project_id, contact_id, status, token_hash,
  definition_version, expires_at, sent_at, sent_by, submitted_at, completed_at, created_at)
select pg_temp.k('org'), pg_temp.k('p:' || p), pg_temp.k('c:' || who), s, 
       encode(extensions.gen_random_bytes(32), 'hex'), 1, now() + interval '30 days',
       now() - (d || ' days')::interval, pg_temp.k('lina.haddad'),
       case when s = 'complete' then now() - interval '1 day' end,
       case when s = 'complete' then now() - interval '1 day' end,
       now() - (d || ' days')::interval
  from (values ('Minuit pile', 'sami', 'sent', 5), ('Minuit pile', 'karim', 'complete', 6),
               ('Néons', 'sami', 'sent', 3), ('Minuit pile', 'maxime', 'sent', 2)) v (p, who, s, d)
 where pg_temp.k('p:' || p) is not null;

-- Their private page by project (the app's own gesture), sent, opened or not --
create temp table links (p text, who text, d int, o int);
insert into links values ('Minuit pile', 'sami', 5, null), ('Minuit pile', 'karim', 6, 2),
                         ('Minuit pile', 'maxime', 2, null), ('Néons', 'sami', 3, 1);
select public.issue_contact_link(pg_temp.k('p:' || p), pg_temp.k('c:' || who), now() + interval '30 days')
  from links where pg_temp.k('p:' || p) is not null;
update public.project_contact_links l
   set sent_at = now() - (x.d || ' days')::interval, sent_by = pg_temp.k('lina.haddad'),
       first_opened_at = now() - (x.o || ' days')::interval,
       last_opened_at = now() - (x.o || ' days')::interval,
       open_count = case when x.o is not null then 2 else 0 end
  from links x
 where l.project_id = pg_temp.k('p:' || x.p) and l.contact_id = pg_temp.k('c:' || x.who)
   and l.revoked_at is null;

-- Contracts in every state --------------------------------------------------
create temp table ctr (key text, title text, type text, status text, project text, artist text,
  owner text, due int, starts date, ends date, signed date, review text, sent_how text, sent_ago int,
  notes text);
insert into ctr values
  ('coed',  'Contrat de co-édition — Sami Kader', 'publishing', 'in_review', 'Néons', 'Mona Lys', 'lina.haddad', 5, null, null, null, null, null, null, 'Part éditoriale 50/50 avec Éditions Rivage.'),
  ('mix',   'Contrat de prestation — Studio Ressac (mix)', 'service', 'sent', 'Minuit pile', 'Mona Lys', 'lina.haddad', -1, null, null, null, null, 'Envoyé depuis ma messagerie', 4, null),
  ('image', 'Cession de droits à l''image — Julie Ferrand', 'image_rights', 'draft', 'Minuit pile', null, 'lina.haddad', 10, null, null, null, 'Préciser la durée de la cession et les territoires.', null, null, null),
  ('clip',  'Contrat de réalisation du clip — Lumen Films', 'service', 'approved', 'Minuit pile', 'Mona Lys', 'lina.haddad', 7, null, null, null, null, null, null, 'Tournage sur deux jours, à Paris.'),
  ('photo', 'Commande photo — Léa Dumas', 'service', 'draft', 'Ciel ouvert', 'Mona Lys', 'lina.haddad', 20, null, null, null, null, null, null, null),
  ('zeph',  'Contrat d''artiste — Zéphyr Vega', 'artist', 'in_review', 'Mirage', 'Zéphyr Vega', 'tom.mercier', 14, null, null, null, null, null, null, null),
  ('mona',  'Contrat d''artiste — Mona Lys', 'artist', 'signed', null, 'Mona Lys', 'claire.morel', null, date '2025-03-14', date '2028-03-13', date '2025-03-14', null, null, null, 'Trois albums ou six singles sur la durée.'),
  ('orch',  'Licence de distribution — The Orchard', 'distribution', 'signed', null, null, 'claire.morel', null, date '2025-06-01', date '2027-05-31', date '2025-05-20', null, null, null, null),
  ('neo',   'Partenariat Radio Néo', 'partnership', 'terminated', null, null, 'claire.morel', null, date '2025-01-01', date '2025-12-31', date '2024-12-10', null, null, null, null);

select pg_temp.as_user('claire.morel@preprod.pds');
insert into public.contracts (organization_id, title, type, status, project_id, artist_id,
  owner_person_id, due_on, starts_on, ends_on, signed_on, notes, review_comment, reviewed_by,
  reviewed_at, sent_via, sent_how, sent_on)
select pg_temp.k('org'), title, type, status, pg_temp.k('p:' || project), pg_temp.k('a:' || artist),
       pg_temp.k(owner), current_date + due, starts, ends, signed, notes, review,
       case when review is not null then pg_temp.k('claire.morel') end,
       case when review is not null then now() - interval '1 day' end,
       case when sent_how is not null then 'other' end, sent_how,
       case when sent_how is not null then current_date - sent_ago end
  from ctr;
insert into k select 'k:' || c.key, x.id from ctr c join public.contracts x on x.title = c.title;

insert into public.contract_parties (contract_id, organization_id, contact_id, role)
select pg_temp.k('k:' || k), pg_temp.k('org'), pg_temp.k('c:' || who), r
  from (values ('coed', 'sami', 'Auteur-compositeur'), ('coed', 'rivage', 'Éditeur'),
               ('mix', 'ressac', 'Prestataire'), ('mix', 'karim', 'Ingénieur du mix'),
               ('image', 'julie', 'Cédante'), ('clip', 'lumen', 'Société de production'),
               ('clip', 'maxime', 'Réalisateur'), ('photo', 'lea', 'Photographe'),
               ('mona', 'camille', 'Représentante de l''artiste'), ('orch', 'orchard', 'Distributeur'),
               ('neo', 'neo', 'Partenaire'), ('neo', 'thomas', 'Contact')) v (k, who, r);

-- Files (no content behind them: the pre-production has no Storage seed) -----
create function pg_temp.path(p_owner uuid, p_ext text) returns text language sql as $$
  select pg_temp.k('org') || '/' || p_owner || '/' || gen_random_uuid() || '.' || p_ext $$;

insert into public.contract_files (organization_id, contract_id, category, path, file_name, mime, bytes)
select pg_temp.k('org'), pg_temp.k('k:' || k), cat, pg_temp.path(pg_temp.k('k:' || k), 'pdf'), f, 'application/pdf', b
  from (values ('coed', 'draft', 'Contrat de co-édition — Sami Kader v2.pdf', 224000),
               ('mix', 'draft', 'Contrat de prestation Studio Ressac.pdf', 188000),
               ('mona', 'signed', 'Contrat d''artiste — Mona Lys (signé).pdf', 1150000),
               ('mona', 'evidence', 'Preuve de signature — Mona Lys.pdf', 96000),
               ('orch', 'signed', 'Licence The Orchard (signée).pdf', 870000),
               ('clip', 'annex', 'Devis Lumen Films — clip.pdf', 312000)) v (k, cat, f, b);

insert into public.artist_files (organization_id, artist_id, category, path, file_name, mime, bytes, description)
select pg_temp.k('org'), pg_temp.k('a:' || a), cat, pg_temp.path(pg_temp.k('a:' || a), ext), f, mime, b, d
  from (values ('Mona Lys', 'press', 'Dossier de presse Mona Lys 2026.pdf', 'pdf', 'application/pdf', 6800000, 'Version française'),
               ('Mona Lys', 'photo', 'Mona Lys — portrait studio.jpg', 'jpg', 'image/jpeg', 3200000, null),
               ('Mona Lys', 'photo', 'Mona Lys — live Cigale.jpg', 'jpg', 'image/jpeg', 4100000, null),
               ('Zéphyr Vega', 'photo', 'Zéphyr Vega — presse 2026.jpg', 'jpg', 'image/jpeg', 2700000, null),
               ('Sélène Vega', 'press', 'Biographie Sélène Vega.pdf', 'pdf', 'application/pdf', 410000, null)) v (a, cat, f, ext, mime, b, d)
 where pg_temp.k('a:' || a) is not null;

insert into public.project_files (organization_id, project_id, category, path, file_name, mime, bytes, description)
select pg_temp.k('org'), pg_temp.k('p:' || p), cat, pg_temp.path(pg_temp.k('p:' || p), ext), f, mime, b, d
  from (values ('Minuit pile', 'visual', 'Moodboard clip Minuit pile.pdf', 'pdf', 'application/pdf', 12300000, 'Références lumière et lieux'),
               ('Minuit pile', 'press', 'Communiqué Minuit pile.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 82000, null),
               ('Minuit pile', 'visual', 'Pochette Minuit pile — piste 2.png', 'png', 'image/png', 4100000, null),
               ('Néons', 'visual', 'Néons — planche typographique.pdf', 'pdf', 'application/pdf', 2200000, null),
               ('Ciel ouvert', 'other', 'Plan de tournage Ciel ouvert.xlsx', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 64000, null),
               ('Mirage', 'press', 'Fiche radio Mirage.pdf', 'pdf', 'application/pdf', 350000, null)) v (p, cat, f, ext, mime, b, d)
 where pg_temp.k('p:' || p) is not null;

-- Calls: guests of the network on a past call, two calls to come ------------
select pg_temp.as_user('lina.haddad@preprod.pds');
insert into public.call_guests (call_id, organization_id, email, name, contact_id)
select c.id, pg_temp.k('org'), n.email, n.name, n.id
  from (select id from public.calls where status = 'ready' order by occurred_at limit 1) c
  cross join public.network_contacts n
 where n.id in (pg_temp.k('c:sami'), pg_temp.k('c:karim'));

insert into public.calls (organization_id, project_id, title, occurred_at, ends_at, status,
  consent, agenda, created_by)
values
  (pg_temp.k('org'), pg_temp.k('p:Minuit pile'), 'Point mix avec Karim',
   date_trunc('day', now()) + interval '1 day 14 hours', date_trunc('day', now()) + interval '1 day 14 hours 45 minutes',
   'draft', 'pending', '["Retours sur le mix V1", "Calendrier du master final"]', pg_temp.k('lina.haddad')),
  (pg_temp.k('org'), null, 'Réunion interne — planning de novembre',
   date_trunc('day', now()) + interval '2 days 10 hours', date_trunc('day', now()) + interval '2 days 11 hours',
   'draft', 'pending', '["Sorties de novembre", "Charge de chacun"]', pg_temp.k('lina.haddad'));
insert into public.call_guests (call_id, organization_id, email, name, contact_id)
select c.id, pg_temp.k('org'), n.email, n.name, n.id
  from public.calls c, public.network_contacts n
 where c.title = 'Point mix avec Karim' and n.id = pg_temp.k('c:karim');

commit;
\o
\echo 'Jeu de démonstration ajouté.'
