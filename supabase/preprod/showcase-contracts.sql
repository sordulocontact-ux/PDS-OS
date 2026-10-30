-- Pre-production showcase, contracts generated from templates (docs/PREPROD.md
-- § 5 bis, Sacha 30/10/2026): what the « Document » section of a contract
-- shows only for a contract made from a template. By the real gestures:
-- Claire writes and validates the templates, the Juridique of a project
-- names the contract it needs, generate_legal_contract fills it with each
-- value and its source, revise_contract_document makes a v2, advance_contract
-- moves it (submit, approve, request changes). Played after showcase.sql
-- (it uses its network); once only.
--
--   cat supabase/preprod/showcase-contracts.sql | psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1

\set ON_ERROR_STOP on
select exists (select 1 from public.contract_templates where name = 'Contrat de prestation technique') as already \gset
\if :already
  \echo 'Contrats générés déjà présents : rien à faire.'
  \quit
\endif
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
insert into k select distinct on (title) 'p:' || title, id from public.projects order by title, created_at;
insert into k select 'c:' || name, id from public.network_contacts where archived_at is null;
insert into k select split_part(u.email, '@', 1), a.person_id
  from auth.users u join public.accounts a on a.id = u.id where u.email like '%@preprod.pds';

-- The two hand-written contracts of showcase.sql that these replace -------
create temp table gone on commit drop as
  select id from public.contracts
   where title in ('Contrat de co-édition — Sami Kader', 'Cession de droits à l''image — Julie Ferrand');
delete from public.contract_files where contract_id in (select id from gone);
delete from public.contract_parties where contract_id in (select id from gone);
delete from public.contract_events where contract_id in (select id from gone);
delete from public.contracts where id in (select id from gone);

-- Templates: Claire writes them and validates them --------------------------
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k select 'tpl:service', public.create_contract_template(pg_temp.k('org'), null,
  'Contrat de prestation technique', 'service', array['provider'],
  'Ingé son, réalisateur, photographe : une prestation payée sur facture.',
  E'CONTRAT DE PRESTATION TECHNIQUE\n\nEntre {{organisation.nom}}, ci-après « le Producteur », et {{personne.nom_civil}}, demeurant {{personne.adresse}}, ci-après « le Prestataire ».\n\nArticle 1 — Objet\nLe Prestataire réalise pour le Producteur : {{personne.roles}}, pour le projet « {{projet.titre}} » de {{projet.artiste}}.\n\nArticle 2 — Rémunération\nLe Producteur verse au Prestataire la somme de {{remuneration}}, sur facture, à trente jours.\n\nArticle 3 — Cession des droits\nLe Prestataire cède au Producteur les droits nécessaires à l''exploitation du résultat de sa prestation, pour le monde entier et pour la durée légale des droits.\n\nFait à Paris, en deux exemplaires.');
-- Co-édition: a v1, then a v2 that replaces it (the v1 is retired).
insert into k select 'tpl:coed1', public.create_contract_template(pg_temp.k('org'), null,
  'Contrat de co-édition', 'publishing', array['author', 'composer'],
  'Un auteur ou un compositeur co-édite son œuvre avec PDS Éditions.',
  E'CONTRAT DE CO-ÉDITION\n\nEntre {{organisation.nom}}, éditeur, et {{personne.nom_civil}} (IPI {{personne.ipi}}), demeurant {{personne.adresse}}.\n\nArticle 1 — Œuvres\nLe présent contrat porte sur : {{projet.titres}}.\n\nArticle 2 — Partage\nL''auteur conserve {{remuneration}}.\n\nFait à Paris.');
select public.set_contract_template_status(pg_temp.k('tpl:service'), 'validated');
select public.set_contract_template_status(pg_temp.k('tpl:coed1'), 'validated');
insert into k select 'tpl:coed', public.create_contract_template(pg_temp.k('org'),
  (select series_id from public.contract_templates where id = pg_temp.k('tpl:coed1')),
  'Contrat de co-édition', 'publishing', array['author', 'composer'],
  'Un auteur ou un compositeur co-édite son œuvre avec PDS Éditions.',
  E'CONTRAT DE CO-ÉDITION\n\nEntre {{organisation.nom}}, éditeur, et {{personne.nom_civil}} (IPI {{personne.ipi}}), demeurant {{personne.adresse}}.\n\nArticle 1 — Œuvres\nLe présent contrat porte sur : {{projet.titres}}.\n\nArticle 2 — Partage\nL''auteur conserve {{remuneration}}. Les recettes de l''éditeur sont réparties chaque année, sur relevé.\n\nArticle 3 — Durée\nDix ans à compter de la signature, pour le monde entier.\n\nFait à Paris.');
select public.set_contract_template_status(pg_temp.k('tpl:coed'), 'validated');
insert into k select 'tpl:image', public.create_contract_template(pg_temp.k('org'), null,
  'Cession de droit à l''image', 'image_rights', array['other'],
  'Une personne filmée ou photographiée cède son image pour la promotion.',
  E'CESSION DE DROIT À L''IMAGE\n\nJe soussigné(e) {{personne.nom_civil}}, demeurant {{personne.adresse}}, autorise {{organisation.nom}} à utiliser mon image dans les contenus du projet « {{projet.titre}} », contre {{remuneration}}.\n\nFait à Paris.');
select public.set_contract_template_status(pg_temp.k('tpl:image'), 'validated');
-- A draft left for Claire to validate (page Modèles).
select public.create_contract_template(pg_temp.k('org'), null,
  'Contrat de réalisation de clip', 'service', array['provider', 'studio'],
  'La société de production et le réalisateur d''un clip.',
  E'CONTRAT DE RÉALISATION\n\nEntre {{organisation.nom}} et {{personne.societe}} (SIRET {{personne.siret}}), pour le clip du projet « {{projet.titre}} ».\n\nArticle 1 — Budget\n{{remuneration}}, versé en deux fois.\n\nFait à Paris.');

-- The Juridique of the projects names the contracts it needs ---------------
insert into public.legal_agreement_needs (organization_id, project_id, contact_id, roles,
  contract_type, template_id, fee_cents, approved_by, approved_at)
values
  (pg_temp.k('org'), pg_temp.k('p:Néons'), pg_temp.k('c:Sami Kader'), array['composer'],
   'publishing', pg_temp.k('tpl:coed'), null, pg_temp.k('claire.morel'), now() - interval '4 days'),
  (pg_temp.k('org'), pg_temp.k('p:Minuit pile'), pg_temp.k('c:Julie Ferrand'), array['other'],
   'image_rights', pg_temp.k('tpl:image'), 80000, pg_temp.k('claire.morel'), now() - interval '4 days'),
  (pg_temp.k('org'), pg_temp.k('p:Minuit pile'), pg_temp.k('c:Maxime Roux'), array['provider'],
   'service', pg_temp.k('tpl:service'), 450000, pg_temp.k('claire.morel'), now() - interval '4 days'),
  (pg_temp.k('org'), pg_temp.k('p:Mirage'), pg_temp.k('c:Bastien Coll'), array['provider'],
   'service', pg_temp.k('tpl:service'), 60000, pg_temp.k('claire.morel'), now() - interval '2 days');
insert into k select 'need:' || c.name, n.id from public.legal_agreement_needs n
  join public.network_contacts c on c.id = n.contact_id
 where n.contract_id is null and n.template_id is not null;

-- Lina generates them: each value with its source -------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
create function pg_temp.v(p_value text, p_source text) returns jsonb language sql as $$
  select jsonb_build_object('value', p_value, 'source', p_source) $$;
insert into k select 'k:sami', public.generate_legal_contract(pg_temp.k('need:Sami Kader'), jsonb_build_object(
  'organisation.nom', pg_temp.v('PDS Éditions', 'Structure'),
  'personne.nom_civil', pg_temp.v('Sami Kader', 'Fiche de renseignements'),
  'personne.ipi', pg_temp.v('00731245562', 'Fiche de renseignements'),
  'personne.adresse', pg_temp.v('14 rue des Capucins, 13001 Marseille', 'Fiche de renseignements'),
  'projet.titres', pg_temp.v('Néons', 'Crédits des titres'),
  'remuneration', pg_temp.v('50 % de la part éditoriale', 'Contrats à prévoir')));
insert into k select 'k:julie', public.generate_legal_contract(pg_temp.k('need:Julie Ferrand'), jsonb_build_object(
  'organisation.nom', pg_temp.v('PDS', 'Structure'),
  'personne.nom_civil', pg_temp.v('Julie Ferrand', 'Fiche de renseignements'),
  'personne.adresse', pg_temp.v('21 rue de Charonne, 75011 Paris', 'Fiche de renseignements'),
  'projet.titre', pg_temp.v('Minuit pile', 'Projet'),
  'remuneration', pg_temp.v('800 € HT', 'Contrats à prévoir')));
insert into k select 'k:maxime', public.generate_legal_contract(pg_temp.k('need:Maxime Roux'), jsonb_build_object(
  'organisation.nom', pg_temp.v('PDS', 'Structure'),
  'personne.nom_civil', pg_temp.v('Maxime Roux', 'Fiche de renseignements'),
  'personne.adresse', pg_temp.v('8 rue Oberkampf, 75011 Paris', 'Fiche de renseignements'),
  'personne.roles', pg_temp.v('Réalisation du clip', 'Contrats à prévoir'),
  'projet.titre', pg_temp.v('Minuit pile', 'Projet'),
  'projet.artiste', pg_temp.v('Mona Lys', 'Projet'),
  'remuneration', pg_temp.v('4 500 € HT', 'Contrats à prévoir')));
insert into k select 'k:bastien', public.generate_legal_contract(pg_temp.k('need:Bastien Coll'), jsonb_build_object(
  'organisation.nom', pg_temp.v('PDS', 'Structure'),
  'personne.nom_civil', pg_temp.v('Bastien Coll', 'Réseau'),
  'personne.adresse', pg_temp.v('12 rue du Faubourg-Saint-Denis, 75010 Paris', 'Réseau'),
  'personne.roles', pg_temp.v('Mastering de Mirage', 'Contrats à prévoir'),
  'projet.titre', pg_temp.v('Mirage', 'Projet'),
  'projet.artiste', pg_temp.v('Zéphyr Vega', 'Projet'),
  'remuneration', pg_temp.v('600 € HT', 'Contrats à prévoir')));

update public.contract_parties p set role = r
  from (values ('k:sami', 'Co-auteur'), ('k:julie', 'Cédante'), ('k:maxime', 'Prestataire'),
               ('k:bastien', 'Prestataire')) v (key, r)
 where p.contract_id = pg_temp.k(v.key);
update public.contracts c set artist_id = (select id from public.artists where name = a), due_on = current_date + d
  from (values ('k:sami', 'Mona Lys', 3), ('k:julie', 'Mona Lys', 10), ('k:maxime', 'Mona Lys', 7),
               ('k:bastien', 'Zéphyr Vega', 12)) v (key, a, d)
 where c.id = pg_temp.k(v.key);

-- Sami's: a clause changed (v2), then submitted to Claire.
select public.revise_contract_document(pg_temp.k('k:sami'),
  replace((select body from public.contract_documents where contract_id = pg_temp.k('k:sami') and version = 1),
          '50 % de la part éditoriale', '40 % de la part éditoriale'),
  'Part de composition 50 % → 40 %, après l''échange avec Sami.');
update public.contract_documents set fields = jsonb_set(fields, '{remuneration,value}', '"40 % de la part éditoriale"')
 where contract_id = pg_temp.k('k:sami') and version = 2;
select public.advance_contract(pg_temp.k(k), 'submit') from unnest(array['k:sami', 'k:julie', 'k:maxime']) k;

-- Claire: changes asked on Julie's, Maxime's approved; Sami's stays to validate.
select pg_temp.as_user('claire.morel@preprod.pds');
select public.advance_contract(pg_temp.k('k:julie'), 'request_changes',
  'Préciser la durée de la cession et les territoires.');
select public.advance_contract(pg_temp.k('k:maxime'), 'approve');

commit;
\o
\echo 'Contrats générés depuis des modèles ajoutés.'
