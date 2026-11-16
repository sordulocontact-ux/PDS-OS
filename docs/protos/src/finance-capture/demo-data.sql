-- Jeu de données de démonstration de Finance, pour capturer le prototype
-- (docs/protos/src/finance-capture/crawl.cjs) sur un label qui vit : dépenses
-- de septembre à février, factures, banque, justificatifs, budgets, émissions,
-- Pay Later, alertes qui découlent des données. Pensé pour « aujourd'hui » =
-- 16/11/2026 (l'app prend la date du système).
--
-- RÉSERVÉ À LA BASE LOCALE DOCKER. Jamais la pré-prod ni la prod : le script
-- s'arrête s'il ne trouve pas le compte de test glen@pds.test.
--
--   docker exec -i supabase_db_PDS_OS psql -U postgres -v ON_ERROR_STOP=1 \
--     < docs/protos/src/finance-capture/demo-data.sql
--
-- Rejouable : il efface d'abord tout ce que Finance a de l'organisation de
-- glen@pds.test (« PDS ») et le réécrit, ids fixes. Ne touche qu'aux tables de
-- Finance (budget_lines, budget_revisions, finance_*, treasury_*), au montant
-- de l'enveloppe artiste de Mona Lys (artist_budgets) et garde les quatre
-- lignes de projet nées d'un workflow (mix, mastering, contrat : invoice_id ou
-- master_role), seulement corrigées. Les déclencheurs restent actifs :
-- finance_events (l'historique de la page Exports) se remplit, puis ses dates
-- sont ramenées au moment de chaque saisie.
--
-- Fichiers des justificatifs : PDF déposés à part dans le bucket finance-files
-- local (<org>/d4000000-…-0000000000NN.pdf, script proof-files.mjs du
-- scratchpad de la session du 16/11/2026) ; la photo G7 existait déjà.

begin;

-- Garde-fou : seulement la base locale (compte de test du seed).
do $$
begin
  if not exists (select 1 from auth.users where email = 'glen@pds.test') then
    raise exception 'Base sans glen@pds.test : ce script est réservé à la base locale.';
  end if;
  if (select m.organization_id from public.memberships m
        join auth.users u on u.id = m.approved_account_id
       where u.email = 'glen@pds.test') <> '73c525aa-6a0f-4a81-8d38-dc680ce20e47' then
    raise exception 'glen@pds.test n''est plus dans l''organisation attendue.';
  end if;
end $$;

-- Qui saisit : la session d'un membre (auth.uid()), pour created_by et
-- l'auteur de l'historique.
create function pg_temp.act(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', u.id, 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', u.id::text, true)
    from auth.users u where u.email = p_email;
$$;

-- ---------------------------------------------------------------------------
-- 1. Effacer Finance (organisation « PDS »)
-- ---------------------------------------------------------------------------
\set org '''73c525aa-6a0f-4a81-8d38-dc680ce20e47'''

delete from finance_spend_matches where organization_id = :org;
delete from finance_receipts where organization_id = :org;
delete from finance_reminders where organization_id = :org;
delete from finance_credit_notes where organization_id = :org;
delete from finance_proofs where organization_id = :org;
delete from finance_credit_draws where organization_id = :org;
delete from finance_credit_lines where organization_id = :org;
delete from finance_incomes where organization_id = :org;
delete from finance_bank_transactions where organization_id = :org;
delete from finance_shows where organization_id = :org;
delete from finance_show_formats where organization_id = :org;
delete from finance_budget_templates where organization_id = :org;
delete from finance_envelope_shares where organization_id = :org;
delete from finance_briefs where organization_id = :org;
delete from treasury_balances where organization_id = :org;
-- Les lignes nées d'un workflow de projet (facture attendue, mix, mastering)
-- restent ; toutes les autres sont réécrites.
delete from budget_lines
 where organization_id = :org and invoice_id is null and master_role is null;
delete from finance_cost_centers where organization_id = :org;
-- L'historique repart de ce jeu de données (ni les essais d'avant, ni ces effacements).
delete from finance_events where organization_id = :org;

-- ---------------------------------------------------------------------------
-- 2. Réglages, enveloppes
-- ---------------------------------------------------------------------------
select pg_temp.act('glen@pds.test');

insert into treasury_settings (organization_id, reserve_cents)
values (:org, 3000000)
on conflict (organization_id) do update set reserve_cents = excluded.reserve_cents
 where treasury_settings.reserve_cents is distinct from excluded.reserve_cents;

-- Relevé Qonto du 10/11 (le plus récent fait foi), et celui d'octobre.
insert into treasury_balances (organization_id, balance_cents, as_of, note, created_at) values
  (:org, 6118000, '2026-10-12', 'Relevé Qonto d''octobre', '2026-10-12 18:10+02'),
  (:org, 5420000, '2026-11-10', 'Relevé Qonto du 10/11', '2026-11-10 18:20+01');

-- Enveloppe artiste de Mona Lys : 8 000 € pour 2026 (développement en direct :
-- coaching, déplacements, stylisme ; ses projets ont leur propre budget).
update artist_budgets set amount_cents = 800000
 where organization_id = :org and artist_id = 'd0a3779e-594c-43ce-9136-a0f738f8db63'
   and closed_at is null;

insert into finance_cost_centers (id, organization_id, name, budget_cents, created_at) values
  ('d5000000-0000-4000-8000-000000000001', :org, 'PDS MIC #6', 800000, '2026-10-28 10:00+01'),
  ('d5000000-0000-4000-8000-000000000002', :org, 'Frais de structure — S2 2026', 900000, '2026-07-01 09:30+02'),
  ('d5000000-0000-4000-8000-000000000003', :org, 'Matériel studio 2026', 1200000, '2026-09-01 09:30+02');

-- Le partenaire (Radio Néo) finance 40 % de l'émission #6.
insert into finance_envelope_shares (organization_id, target_kind, target_id, pds_share_bp)
values (:org, 'cost_center', 'd5000000-0000-4000-8000-000000000001', 6000);

insert into finance_budget_templates (id, organization_id, name, lines, created_at) values
  ('d7000000-0000-4000-8000-000000000001', :org, 'PDS MIC — émission type',
   '[{"label":"Location plateau","family":"studio","subpost":"Plateau","amount_cents":200000},
     {"label":"Ingé son","family":"services","subpost":"Son","amount_cents":90000},
     {"label":"Cadreurs (2)","family":"photo_video","subpost":"Image","amount_cents":170000},
     {"label":"Montage et étalonnage","family":"photo_video","subpost":"Image","amount_cents":120000},
     {"label":"Habillage graphique","family":"image","subpost":"Image","amount_cents":45000},
     {"label":"Catering plateau","family":"food","subpost":"Accueil","amount_cents":40000},
     {"label":"Taxis invités","family":"transport","subpost":"Accueil","amount_cents":25000},
     {"label":"Imprévus","family":"misc","subpost":null,"amount_cents":70000}]'::jsonb,
   '2026-09-10 11:00+02');

insert into finance_engine_settings (organization_id, orchard_tranche_cents,
                                     orchard_titles_per_tranche, orchard_titles_counted)
values (:org, 5200000, 12, 1)
on conflict (organization_id) do update
   set orchard_tranche_cents = 5200000, orchard_titles_per_tranche = 12,
       orchard_titles_counted = 1
 where (finance_engine_settings.orchard_tranche_cents, finance_engine_settings.orchard_titles_per_tranche,
        finance_engine_settings.orchard_titles_counted) is distinct from (5200000, 12, 1);

insert into finance_show_formats (id, organization_id, name, cost_cents, provisional_titles,
                                  template_id, created_at) values
  ('d6000000-0000-4000-8000-000000000001', :org, 'PDS MIC', 760000, 10,
   'd7000000-0000-4000-8000-000000000001', '2026-09-10 11:05+02'),
  ('d6000000-0000-4000-8000-000000000002', :org, 'PDS SHOW', 550000, 0, null, '2026-09-10 11:06+02');

insert into finance_shows (id, organization_id, format_id, label, planned_on, cost_center_id,
                           cancelled_at, created_at) values
  ('d6100000-0000-4000-8000-000000000001', :org, 'd6000000-0000-4000-8000-000000000001',
   'PDS MIC #6', '2026-11-20', 'd5000000-0000-4000-8000-000000000001', null, '2026-10-05 10:00+02'),
  ('d6100000-0000-4000-8000-000000000002', :org, 'd6000000-0000-4000-8000-000000000001',
   'PDS MIC #7', '2026-12-18', null, null, '2026-10-05 10:01+02'),
  ('d6100000-0000-4000-8000-000000000003', :org, 'd6000000-0000-4000-8000-000000000002',
   'PDS SHOW — Mona Lys', '2027-01-15', null, null, '2026-10-20 15:00+02'),
  ('d6100000-0000-4000-8000-000000000004', :org, 'd6000000-0000-4000-8000-000000000001',
   'PDS MIC #8', '2027-01-29', null, null, '2026-11-03 10:00+01'),
  ('d6100000-0000-4000-8000-000000000005', :org, 'd6000000-0000-4000-8000-000000000002',
   'PDS SHOW — Nahel Nuit', '2026-12-05', null, '2026-11-09 17:40+01', '2026-10-20 15:02+02');

-- Les justificatifs (section 4) : le nom du fichier sert déjà aux dépenses.
create temp table demo_proofs (
  n int, vendor text, ref text, issued date, ttc bigint, vat bigint, kind text,
  line uuid, received timestamptz, actor text, file_name text
) on commit drop;

insert into demo_proofs values
 (1,'Loca Plateau','LP-2026-031','2026-11-04',240000,40000,'invoice','d1000000-0000-4000-8000-000000000029','2026-11-05 10:30+01','glen','LP-2026-031.pdf'),
 (2,'Adobe Systems','IEU2026-88213','2026-11-01',7199,1200,'invoice','d1000000-0000-4000-8000-000000000037','2026-11-02 07:58+01','glen','IEU2026-88213.pdf'),
 (3,'Collectif Prisme','CP-2026-114','2026-11-06',1032000,172000,'invoice','d1000000-0000-4000-8000-000000000002','2026-11-07 09:15+01','lina','Facture CP-2026-114.pdf'),
 (4,'Vinylerie Lyonnaise','VL-2026-0412','2026-10-20',216000,36000,'invoice','d1000000-0000-4000-8000-000000000012','2026-10-21 14:02+02','lina','VL-2026-0412.pdf'),
 (5,'Loca Ciné Paris','LCP-8841','2026-11-03',420000,70000,'invoice','d1000000-0000-4000-8000-000000000013','2026-11-03 17:45+01','lina','LCP-8841.pdf'),
 (6,'Cabinet Ferrand & Associés','F-2026-T3-17','2026-10-31',108000,18000,'invoice','d1000000-0000-4000-8000-000000000038','2026-11-03 09:50+01','glen','Ferrand F-2026-T3-17.pdf'),
 (7,'Ciné Matos Paris','CMP-26-0918','2026-10-20',840000,140000,'invoice','d1000000-0000-4000-8000-000000000040','2026-10-20 16:30+02','glen','CMP-26-0918.pdf'),
 (8,'Studio Ressac','SR-2026-071','2026-11-03',114000,19000,'invoice','d1000000-0000-4000-8000-000000000021','2026-11-04 11:00+01','lina','SR-2026-071.pdf'),
 (9,'Theodora','TH-2026-07','2026-11-09',70000,null,'invoice','d1000000-0000-4000-8000-000000000020','2026-11-10 09:20+01','lina','Note honoraires TH-2026-07.pdf'),
 (10,'Sarah Benhamou','SB-2026-11','2026-11-02',150000,null,'invoice','d1000000-0000-4000-8000-000000000007','2026-11-02 18:05+01','lina','SB-2026-11.pdf'),
 (11,'Studio Ressac','SR-2026-052','2026-09-22',324000,54000,'invoice','d1000000-0000-4000-8000-000000000001','2026-09-23 10:00+02','lina','SR-2026-052.pdf'),
 (12,'Loca Ciné Paris','LCP-8790','2026-10-24',174000,29000,'invoice','d1000000-0000-4000-8000-000000000003','2026-10-25 12:00+02','lina','LCP-8790.pdf'),
 (13,'Studio Ressac','SR-2026-063','2026-10-15',216000,36000,'invoice','d1000000-0000-4000-8000-000000000005','2026-10-16 09:40+02','lina','SR-2026-063.pdf'),
 (14,'Theodora','TH-2026-06','2026-10-28',90000,null,'invoice','d1000000-0000-4000-8000-000000000008','2026-10-28 19:00+01','lina','Note honoraires TH-2026-06.pdf'),
 (15,'Studio Ombre','F-2026-104','2026-10-12',144000,24000,'invoice','d1000000-0000-4000-8000-000000000010','2026-10-13 10:10+02','lina','F-2026-104.pdf'),
 (16,'Studio Ressac','SR-2026-038','2026-08-25',540000,90000,'invoice','d1000000-0000-4000-8000-000000000015','2026-08-26 10:00+02','lina','SR-2026-038.pdf'),
 (17,'Studio Ressac','SR-2026-058','2026-10-06',216000,36000,'invoice','d1000000-0000-4000-8000-000000000017','2026-10-07 09:30+02','lina','SR-2026-058.pdf'),
 (18,'Studio Ombre','F-2026-109','2026-10-28',102000,17000,'invoice','d1000000-0000-4000-8000-000000000019','2026-10-29 10:00+01','lina','F-2026-109.pdf'),
 (19,'Studio Ressac','SR-2026-044','2026-09-16',504000,84000,'invoice','d1000000-0000-4000-8000-000000000023','2026-09-17 10:00+02','lina','SR-2026-044.pdf'),
 (20,'SCI Belleville 21','Q-2026-10','2026-10-05',132000,22000,'receipt','d1000000-0000-4000-8000-000000000034','2026-10-06 09:00+02','glen','Quittance octobre.pdf'),
 (21,'SCI Belleville 21','Q-2026-11','2026-11-05',132000,22000,'receipt','d1000000-0000-4000-8000-000000000035','2026-11-06 09:00+01','glen','Quittance novembre.pdf'),
 (22,'iConcept','IC-2026-3318','2026-09-05',300000,50000,'invoice','d1000000-0000-4000-8000-000000000041','2026-09-05 15:00+02','glen','IC-2026-3318.pdf'),
 -- À traiter : propositions qui tiennent, un autre document, une photo
 (23,'Studio Ombre','F-2026-118','2026-11-10',108000,18000,'invoice',null,'2026-11-14 09:12+01','glen','F-2026-118.pdf'),
 (24,'SNCF Connect','QKZ7LM','2026-11-12',18000,null,'receipt',null,'2026-11-15 08:05+01','malik','QKZ7LM.pdf'),
 (25,'SonoFix','SF-4471','2026-11-12',35000,null,'invoice',null,'2026-11-13 16:40+01','glen','SF-4471.pdf'),
 (26,'Imprimerie Lumière','DEVIS-552','2026-11-08',46800,7800,'other',null,'2026-11-09 11:20+01','glen','DEVIS-552.pdf');

-- ---------------------------------------------------------------------------
-- 3. Dépenses (budget_lines) — HT, TVA en points de base, TTC = HT × (1 + TVA)
-- ---------------------------------------------------------------------------
-- Colonnes communes du VALUES ci-dessous :
-- id, projet, artiste, centre, hors budget, libellé, poste, sous-poste, HT,
-- prévisionnel, TVA, statut, date, échéance, fournisseur (contact), fournisseur
-- (nom), refacturable, note, justificatif (n° du PDF), saisi le.
create temp table demo_lines (
  id uuid, project_id uuid, artist_id uuid, cost_center_id uuid, off_budget boolean,
  label text, family text, subpost text, amount bigint, forecast bigint, vat int,
  status text, spent_on date, due_on date, supplier_contact uuid, supplier_name text,
  rebillable boolean, note text, proof int, created_at timestamptz, actor text
) on commit drop;

insert into demo_lines values
-- Ciel ouvert (Mona Lys, 15 000 € après révision) : dépassé de 1 000 € (106,7 %)
('d1000000-0000-4000-8000-000000000001','fdc18b3f-8e39-4669-af60-23d1e0c48df3',null,null,false,'Sessions d''enregistrement (3 jours)','studio','Enregistrement',270000,null,2000,'paid','2026-09-22',null,'ef1ad260-aa5e-48e8-8d0c-306bbb840309',null,false,null,11,'2026-09-15 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000002','fdc18b3f-8e39-4669-af60-23d1e0c48df3',null,null,false,'Clip — réalisation et tournage','content_production','Clip',860000,700000,2000,'invoiced','2026-11-06','2026-12-07',null,'Collectif Prisme',false,'Deuxième jour de tournage ajouté sur place',3,'2026-10-14 16:20+02','lina'),
('d1000000-0000-4000-8000-000000000003','fdc18b3f-8e39-4669-af60-23d1e0c48df3',null,null,false,'Location matériel clip','photo_video','Clip',145000,null,2000,'paid','2026-10-24',null,null,'Loca Ciné Paris',false,null,12,'2026-10-20 11:00+02','lina'),
('d1000000-0000-4000-8000-000000000004','fdc18b3f-8e39-4669-af60-23d1e0c48df3',null,null,false,'Promo radio (4 semaines)','advertising','Promo',200000,null,null,'committed','2026-11-02','2026-12-15','898e3e88-f63a-4786-85a1-c56cb385dc72',null,false,null,null,'2026-11-02 09:40+01','lina'),
-- Minuit pile (Mona Lys, 15 000 €) : 78 %, proche de la limite
('d1000000-0000-4000-8000-000000000005','41f28596-2167-4c0f-b539-d0a78187a97b',null,null,false,'Sessions d''enregistrement (2 jours)','studio','Enregistrement',180000,null,2000,'paid','2026-10-15',null,'ef1ad260-aa5e-48e8-8d0c-306bbb840309',null,false,null,13,'2026-10-08 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000006','41f28596-2167-4c0f-b539-d0a78187a97b',null,null,false,'Clip — réalisation et tournage','content_production','Clip',650000,null,2000,'committed','2026-11-05','2026-12-18',null,'Collectif Prisme',false,'Tournage prévu les 2 et 3 décembre',null,'2026-11-05 14:00+01','lina'),
('d1000000-0000-4000-8000-000000000007','41f28596-2167-4c0f-b539-d0a78187a97b',null,null,false,'Attachée de presse — lancement','services','Promo',150000,null,null,'invoiced','2026-11-02','2026-12-02','051e3981-23ea-48d4-9598-11327c01efe5',null,false,null,10,'2026-10-21 10:30+02','lina'),
('d1000000-0000-4000-8000-000000000008','41f28596-2167-4c0f-b539-d0a78187a97b',null,null,false,'Pochette et déclinaisons','image','Visuels',90000,null,null,'paid','2026-10-28',null,'81217cc4-43c5-410f-8b19-c449fbf1c5d4',null,false,null,14,'2026-10-12 15:00+02','lina'),
('d1000000-0000-4000-8000-000000000009','41f28596-2167-4c0f-b539-d0a78187a97b',null,null,false,'Campagne Meta Ads — sortie','advertising','Promo',100000,null,2000,'committed','2026-11-10','2026-12-21',null,'Meta Platforms Ireland',false,null,null,'2026-11-10 11:00+01','lina'),
-- Lumière froide (Mona Lys, 15 000 €)
('d1000000-0000-4000-8000-000000000010','ddc17548-06fa-43dd-8579-243de71aa341',null,null,false,'Mix (4 titres)','services','Mix',120000,null,2000,'paid','2026-10-12',null,null,'Studio Ombre',false,null,15,'2026-10-01 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000011','ddc17548-06fa-43dd-8579-243de71aa341',null,null,false,'Clip — tournage','content_production','Clip',500000,null,2000,'planned','2026-12-10',null,null,'Collectif Prisme',false,'Devis attendu',null,'2026-11-09 17:00+01','lina'),
-- Velours (Mona Lys, 15 000 €) : pressage à payer, en retard
('d1000000-0000-4000-8000-000000000012','0cae24c1-5ef0-4019-b542-9e7d9c0148e3',null,null,false,'Pressage vinyles (300 ex.)','content_production','Vinyle',180000,null,2000,'invoiced','2026-10-20','2026-11-05',null,'Vinylerie Lyonnaise',false,null,4,'2026-09-29 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000013','0cae24c1-5ef0-4019-b542-9e7d9c0148e3',null,null,false,'Location matériel clip','photo_video','Clip',350000,null,2000,'paid','2026-11-03',null,null,'Loca Ciné Paris',true,'Refacturée au Label Sillon (coproduction du clip)',5,'2026-10-27 10:00+01','lina'),
('d1000000-0000-4000-8000-000000000014','0cae24c1-5ef0-4019-b542-9e7d9c0148e3',null,null,false,'Mix et mastering','services','Mix',140000,null,2000,'committed','2026-11-12','2026-12-15',null,'Studio Ombre',false,null,null,'2026-11-12 10:00+01','lina'),
-- Néons (Mona Lys, 15 000 €)
('d1000000-0000-4000-8000-000000000015','b3e72edc-3c34-4fcd-bf1f-b1ebf2013e07',null,null,false,'Sessions d''enregistrement (5 jours)','studio','Enregistrement',450000,null,2000,'paid','2026-08-25',null,'ef1ad260-aa5e-48e8-8d0c-306bbb840309',null,false,null,16,'2026-08-10 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000016','b3e72edc-3c34-4fcd-bf1f-b1ebf2013e07',null,null,false,'Mix de l''EP (5 titres)','services','Mix',250000,null,null,'committed','2026-11-09','2026-12-10','47a5f333-5991-43b4-a875-63dab98aff46',null,false,null,null,'2026-11-09 10:00+01','lina'),
-- Marée basse (Mona Lys, 15 000 €)
('d1000000-0000-4000-8000-000000000017','14f169b1-18b9-4fa8-a2b9-05c0769f9490',null,null,false,'Sessions d''enregistrement (2 jours)','studio','Enregistrement',180000,null,2000,'paid','2026-10-06',null,'ef1ad260-aa5e-48e8-8d0c-306bbb840309',null,false,null,17,'2026-09-28 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000018','14f169b1-18b9-4fa8-a2b9-05c0769f9490',null,null,false,'Clip — tournage','content_production','Clip',600000,null,2000,'planned','2027-01-08',null,null,'Collectif Prisme',false,null,null,'2026-11-04 15:00+01','lina'),
-- Aube (Mona Lys, 10 000 €)
('d1000000-0000-4000-8000-000000000019','55d1c845-3e28-47d6-b4af-9c35dbbe3a95',null,null,false,'Mix','services','Mix',85000,null,2000,'paid','2026-10-28',null,null,'Studio Ombre',false,null,18,'2026-10-15 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000020','55d1c845-3e28-47d6-b4af-9c35dbbe3a95',null,null,false,'Pochette','image','Visuels',70000,null,null,'invoiced','2026-11-09','2026-12-09','81217cc4-43c5-410f-8b19-c449fbf1c5d4',null,false,null,9,'2026-10-26 10:00+01','lina'),
-- Ciel bas (Sélène Vega, 8 500 €)
('d1000000-0000-4000-8000-000000000021','c9776da6-b121-4cd4-af89-074afd08c8dc',null,null,false,'Session d''enregistrement (1 jour)','studio','Enregistrement',95000,null,2000,'paid','2026-11-03',null,'ef1ad260-aa5e-48e8-8d0c-306bbb840309',null,false,null,8,'2026-10-27 10:00+01','lina'),
('d1000000-0000-4000-8000-000000000022','c9776da6-b121-4cd4-af89-074afd08c8dc',null,null,false,'Réalisation — beatmaker','services','Production',150000,null,null,'committed','2026-11-04','2026-12-15','c915a289-daca-4dd0-b13c-3ba09b4bc369',null,false,null,null,'2026-11-04 10:00+01','lina'),
-- Mirage (Zéphyr Vega, 19 500 €)
('d1000000-0000-4000-8000-000000000023','cdf404d0-9ff0-4e36-8c4e-e4015be1aa2d',null,null,false,'Résidence de création (1 semaine)','studio','Enregistrement',420000,null,2000,'paid','2026-09-16',null,'ef1ad260-aa5e-48e8-8d0c-306bbb840309',null,false,null,19,'2026-09-01 10:00+02','lina'),
('d1000000-0000-4000-8000-000000000024','cdf404d0-9ff0-4e36-8c4e-e4015be1aa2d',null,null,false,'Clip — tournage','content_production','Clip',700000,null,2000,'planned','2027-01-20',null,null,'Collectif Prisme',false,null,null,'2026-11-06 10:00+01','lina'),
-- Mona Lys, en direct sur son enveloppe artiste (8 000 €)
('d1000000-0000-4000-8000-000000000025',null,'d0a3779e-594c-43ce-9136-a0f738f8db63',null,false,'Coaching vocal (4 séances)','coaching',null,60000,null,null,'paid','2026-10-14',null,'383c7795-26a0-4c01-b030-21b615aebfd1',null,false,null,null,'2026-09-30 10:00+02','malik'),
('d1000000-0000-4000-8000-000000000026',null,'d0a3779e-594c-43ce-9136-a0f738f8db63',null,false,'Train Paris–Lyon, showcase','transport',null,18000,null,null,'paid','2026-11-12',null,null,'SNCF Connect',false,'Showcase du 12/11 au Hangar 21',null,'2026-11-12 08:10+01','malik'),
('d1000000-0000-4000-8000-000000000027',null,'d0a3779e-594c-43ce-9136-a0f738f8db63',null,false,'Taxi retour de session','transport',null,3250,null,null,'paid','2026-11-14',null,null,'G7',false,'Session de nuit, avancé par Malik',null,'2026-11-15 10:00+01','malik'),
('d1000000-0000-4000-8000-000000000028',null,'d0a3779e-594c-43ce-9136-a0f738f8db63',null,false,'Stylisme — PDS SHOW','image',null,45000,null,null,'committed','2026-11-10','2026-11-30','38f04b6f-71bb-46f8-b3c1-54f9fcfb6257',null,false,null,null,'2026-11-10 15:00+01','malik'),
-- PDS MIC #6 (centre de coût, 8 000 €, émission du 20/11)
('d1000000-0000-4000-8000-000000000029',null,null,'d5000000-0000-4000-8000-000000000001',false,'Location plateau','studio','Plateau',200000,null,2000,'paid','2026-11-04',null,null,'Loca Plateau',false,null,1,'2026-10-28 10:10+01','glen'),
('d1000000-0000-4000-8000-000000000030',null,null,'d5000000-0000-4000-8000-000000000001',false,'Ingé son','services','Son',90000,null,2000,'invoiced','2026-11-10','2026-11-25',null,'Studio Ombre',false,null,null,'2026-10-28 10:12+01','glen'),
('d1000000-0000-4000-8000-000000000031',null,null,'d5000000-0000-4000-8000-000000000001',false,'Cadreurs (2)','photo_video','Image',170000,null,2000,'committed','2026-11-06','2026-12-04',null,'Collectif Prisme',false,'Un cadreur de plus que le modèle',null,'2026-10-28 10:14+01','glen'),
('d1000000-0000-4000-8000-000000000032',null,null,'d5000000-0000-4000-8000-000000000001',false,'Catering plateau','food','Accueil',40000,null,1000,'planned','2026-11-20',null,null,'Cantine du Faubourg',false,null,null,'2026-10-28 10:16+01','glen'),
-- Frais de structure — S2 2026 (centre de coût, 9 000 € après révision)
('d1000000-0000-4000-8000-000000000034',null,null,'d5000000-0000-4000-8000-000000000002',false,'Loyer du local — octobre','misc','Loyer',110000,null,2000,'paid','2026-10-05',null,null,'SCI Belleville 21',false,null,20,'2026-10-05 09:00+02','glen'),
('d1000000-0000-4000-8000-000000000035',null,null,'d5000000-0000-4000-8000-000000000002',false,'Loyer du local — novembre','misc','Loyer',110000,null,2000,'paid','2026-11-05',null,null,'SCI Belleville 21',false,null,21,'2026-11-05 09:00+01','glen'),
('d1000000-0000-4000-8000-000000000036',null,null,'d5000000-0000-4000-8000-000000000002',false,'Loyer du local — décembre','misc','Loyer',110000,null,2000,'planned','2026-12-05',null,null,'SCI Belleville 21',false,null,null,'2026-11-05 09:01+01','glen'),
('d1000000-0000-4000-8000-000000000037',null,null,'d5000000-0000-4000-8000-000000000002',false,'Adobe Creative Cloud — novembre','misc','Logiciels',5999,null,2000,'paid','2026-11-01',null,null,'Adobe Systems',false,null,2,'2026-11-02 09:00+01','glen'),
('d1000000-0000-4000-8000-000000000038',null,null,'d5000000-0000-4000-8000-000000000002',false,'Honoraires expert-comptable — T3','services','Comptabilité',90000,null,2000,'invoiced','2026-10-31','2026-11-30',null,'Cabinet Ferrand & Associés',false,null,6,'2026-11-03 10:00+01','glen'),
('d1000000-0000-4000-8000-000000000039',null,null,'d5000000-0000-4000-8000-000000000002',false,'Assurance RC pro 2026-2027','misc','Assurance',42000,null,null,'paid','2026-09-15',null,null,'Assurances Delcourt',false,'Attestation demandée à l''assureur',null,'2026-09-15 09:00+02','glen'),
-- Matériel studio 2026 (centre de coût, 12 000 €) : 79 %, payé en Pay Later
('d1000000-0000-4000-8000-000000000040',null,null,'d5000000-0000-4000-8000-000000000003',false,'Caméra Sony FX3 et deux optiques','equipment','Captation',700000,null,2000,'paid','2026-10-20',null,null,'Ciné Matos Paris',false,'Payée avec Qonto Pay Later, en 6 fois',7,'2026-10-20 12:00+02','glen'),
('d1000000-0000-4000-8000-000000000041',null,null,'d5000000-0000-4000-8000-000000000003',false,'MacBook Pro 14 pouces (montage)','equipment','Informatique',250000,null,2000,'paid','2026-09-05',null,null,'iConcept',false,'Payé avec Qonto Pay Later, en 3 fois',22,'2026-09-05 12:00+02','glen'),
-- Hors budget
('d1000000-0000-4000-8000-000000000042',null,null,null,true,'Réparation enceinte de monitoring','equipment',null,35000,null,null,'invoiced','2026-11-12','2026-11-26',null,'SonoFix',false,'Enceinte du local, tombée au démontage du dernier PDS MIC',null,'2026-11-13 10:00+01','glen');

-- Insérées par celui qui les a saisies (projets : leur responsable).
do $$
declare
  v_actor text;
begin
  for v_actor in select distinct actor from demo_lines loop
    perform pg_temp.act(case v_actor when 'lina' then 'lina.haddad@preprod.pds'
                                     when 'malik' then 'malik.durand@preprod.pds'
                                     else 'glen@pds.test' end);
    insert into budget_lines (id, organization_id, project_id, artist_id, cost_center_id, off_budget,
                              label, family, subpost, amount_cents, forecast_cents, vat_bp, status,
                              spent_on, due_on, supplier_contact_id, supplier_name, rebillable, note,
                              proof_path, proof_name, created_at, updated_at)
    select l.id, '73c525aa-6a0f-4a81-8d38-dc680ce20e47', l.project_id, l.artist_id, l.cost_center_id,
           l.off_budget, l.label, l.family, l.subpost, l.amount, coalesce(l.forecast, l.amount), l.vat,
           l.status, l.spent_on, l.due_on, l.supplier_contact, l.supplier_name, l.rebillable, l.note,
           case when l.proof is not null then '73c525aa-6a0f-4a81-8d38-dc680ce20e47/d4000000-0000-4000-8000-'
                                              || lpad(l.proof::text, 12, '0') || '.pdf' end,
           p.file_name, l.created_at, l.created_at
      from demo_lines l left join demo_proofs p on p.n = l.proof
     where l.actor = v_actor;
  end loop;
end $$;

-- Les quatre lignes nées d'un workflow de projet, remises d'aplomb (le mix de
-- Ciel ouvert à 45 678 € était une saisie de test).
select pg_temp.act('lina.haddad@preprod.pds');
update budget_lines set amount_cents = 90000, forecast_cents = 90000, spent_on = '2026-11-04',
       due_on = '2026-12-04', supplier_contact_id = '47a5f333-5991-43b4-a875-63dab98aff46',
       subpost = 'Mix'
 where id = '6b0bbd84-b7bc-4a73-a0e2-be52037777ee';
update budget_lines set amount_cents = 35000, forecast_cents = 35000, spent_on = '2026-11-04',
       due_on = '2026-12-04', supplier_contact_id = '47a5f333-5991-43b4-a875-63dab98aff46',
       subpost = 'Mastering'
 where id = 'ed20d03b-b724-4f5f-9cff-92cc2281f28a';
update budget_lines set due_on = '2026-11-30', supplier_contact_id = '47a5f333-5991-43b4-a875-63dab98aff46',
       subpost = 'Mix'
 where id = '9c4e7ba9-220c-4da0-a943-bc0587e739a5';
update budget_lines set due_on = '2026-12-07', supplier_contact_id = 'ad3303ea-f4a0-4a8a-a5e0-be7b163aa3b1'
 where id = 'e07eee0b-c46f-4062-894e-2070399d2ee2';

-- ---------------------------------------------------------------------------
-- 4. Justificatifs (finance_proofs) — fichiers PDF du bucket local
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in select * from demo_proofs order by n loop
    perform pg_temp.act(case p.actor when 'lina' then 'lina.haddad@preprod.pds'
                                     when 'malik' then 'malik.durand@preprod.pds'
                                     else 'glen@pds.test' end);
    insert into finance_proofs (id, organization_id, file_path, file_name, mime, source,
                                email_from, email_subject, email_message_id, email_part,
                                received_at, read_state, read_at, read_values, kind,
                                vendor, vendor_verified, amount_cents, amount_verified,
                                vat_cents, vat_verified, issued_on, issued_on_verified,
                                reference, reference_verified, created_at, updated_at)
    values (('d4000000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid,
            '73c525aa-6a0f-4a81-8d38-dc680ce20e47',
            '73c525aa-6a0f-4a81-8d38-dc680ce20e47/d4000000-0000-4000-8000-' || lpad(p.n::text, 12, '0') || '.pdf',
            p.file_name, 'application/pdf',
            case when p.n = 24 then 'email' else 'upload' end,
            case when p.n = 24 then 'malik.durand@preprod.pds' end,
            case when p.n = 24 then 'Billet Lyon showcase' end,
            case when p.n = 24 then '<demo-qkz7lm@pds.test>' end,
            case when p.n = 24 then 1 end,
            p.received, 'read', p.received + interval '20 seconds',
            jsonb_build_object('vendor', p.vendor, 'amountCents', p.ttc, 'vatCents', p.vat,
                               'issuedOn', p.issued, 'reference', p.ref),
            p.kind, p.vendor, true, p.ttc, true, p.vat, p.vat is not null,
            p.issued, true, p.ref, true, p.received, p.received);
  end loop;
end $$;

-- La photo du taxi G7 (fichier déjà dans le bucket) : lue sur une photo, rien
-- n'est vérifié → « À vérifier ».
select pg_temp.act('malik.durand@preprod.pds');
insert into finance_proofs (id, organization_id, file_path, file_name, mime, source, received_at,
                            read_state, read_at, read_values, kind, vendor, amount_cents, issued_on,
                            created_at, updated_at)
values ('d4000000-0000-4000-8000-000000000027', :org,
        '73c525aa-6a0f-4a81-8d38-dc680ce20e47/62f152fc-59ff-4e94-871b-f79806265e77.jpg',
        'IMG_4821.jpg', 'image/jpeg', 'upload', '2026-11-14 23:48+01', 'read', '2026-11-14 23:48:30+01',
        '{"vendor": "G7", "issuedOn": "2026-11-14", "vatCents": null, "reference": null, "amountCents": 3250}',
        'receipt', 'G7', 3250, '2026-11-14', '2026-11-14 23:48+01', '2026-11-14 23:48+01');

-- Rattachés à leur dépense (le geste « Rattacher » : attach_finance_proof).
update finance_proofs f
   set line_id = p.line, attached_by = pe.person_id, attached_at = p.received + interval '2 hours'
  from demo_proofs p
  join lateral (select a.person_id from public.accounts a join auth.users u on u.id = a.id
                 where u.email = case p.actor when 'lina' then 'lina.haddad@preprod.pds'
                                              else 'glen@pds.test' end) pe on true
 where f.id = ('d4000000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid
   and p.line is not null;

-- ---------------------------------------------------------------------------
-- 5. Banque (finance_bank_transactions), relevé Qonto importé en CSV
-- ---------------------------------------------------------------------------
select pg_temp.act('glen@pds.test');
insert into finance_bank_transactions (id, organization_id, booked_on, amount_cents, counterparty,
                                       reference, label, external_id, source, ignored_at,
                                       ignore_reason, created_at) values
  ('d3000000-0000-4000-8000-000000000001', :org, '2026-09-02', 486000, 'THE ORCHARD FRANCE', 'RLV-2026-T2', 'VIR SEPA THE ORCHARD FRANCE', 'qonto-2026-09-02-01', 'csv', null, null, '2026-09-04 09:00+02'),
  ('d3000000-0000-4000-8000-000000000002', :org, '2026-09-16', -504000, 'STUDIO RESSAC', 'SR-2026-044', 'VIR SEPA STUDIO RESSAC', 'qonto-2026-09-16-01', 'csv', null, null, '2026-09-18 09:00+02'),
  ('d3000000-0000-4000-8000-000000000016', :org, '2026-09-25', 800000, 'CENTRE NATIONAL DE LA MUSIQUE', 'AIDE ENR 2026-1187', 'VIR SEPA CENTRE NATIONAL DE LA MUSIQUE', 'qonto-2026-09-25-01', 'csv', null, null, '2026-09-28 09:00+02'),
  ('d3000000-0000-4000-8000-000000000003', :org, '2026-10-05', -132000, 'SCI BELLEVILLE 21', 'LOYER OCT 2026', 'PRLV SEPA SCI BELLEVILLE 21', 'qonto-2026-10-05-01', 'csv', null, null, '2026-10-07 09:00+02'),
  ('d3000000-0000-4000-8000-000000000004', :org, '2026-10-15', 5200000, 'THE ORCHARD FRANCE', 'FA-2026-024', 'VIR SEPA THE ORCHARD FRANCE AVANCE', 'qonto-2026-10-15-01', 'csv', null, null, '2026-10-16 09:00+02'),
  ('d3000000-0000-4000-8000-000000000005', :org, '2026-10-21', 960000, 'MAISON ARLO SAS', 'FA-2026-026', 'VIR SEPA MAISON ARLO SAS', 'qonto-2026-10-21-01', 'csv', null, null, '2026-10-23 09:00+02'),
  ('d3000000-0000-4000-8000-000000000006', :org, '2026-10-31', -2900, 'QONTO', null, 'Abonnement Qonto Essentiel octobre', 'qonto-2026-10-31-01', 'csv', '2026-11-04 10:00+01', 'Frais bancaires : passés en charges par le cabinet comptable', '2026-11-04 09:00+01'),
  ('d3000000-0000-4000-8000-000000000007', :org, '2026-11-03', 360000, 'LUMEN FILMS', 'FA-2026-029 ACOMPTE 50%', 'VIR SEPA LUMEN FILMS', 'qonto-2026-11-03-01', 'csv', null, null, '2026-11-04 09:00+01'),
  ('d3000000-0000-4000-8000-000000000008', :org, '2026-11-03', -420000, 'LOCA CINE PARIS', 'LCP-8841', 'VIR SEPA LOCA CINE PARIS', 'qonto-2026-11-03-02', 'csv', null, null, '2026-11-04 09:00+01'),
  ('d3000000-0000-4000-8000-000000000009', :org, '2026-11-04', -240000, 'LOCA PLATEAU', 'LP-2026-031', 'VIR SEPA LOCA PLATEAU', 'qonto-2026-11-04-01', 'csv', null, null, '2026-11-06 09:00+01'),
  ('d3000000-0000-4000-8000-000000000010', :org, '2026-11-05', -132000, 'SCI BELLEVILLE 21', 'LOYER NOV 2026', 'PRLV SEPA SCI BELLEVILLE 21', 'qonto-2026-11-05-01', 'csv', null, null, '2026-11-06 09:00+01'),
  ('d3000000-0000-4000-8000-000000000011', :org, '2026-11-05', -8990, 'FNAC.COM', null, 'CB FNAC.COM 04/11', 'qonto-2026-11-05-02', 'csv', null, null, '2026-11-06 09:00+01'),
  ('d3000000-0000-4000-8000-000000000012', :org, '2026-11-06', 600000, 'BRASSERIE DE L OURCQ', 'FA-2026-028', 'VIR SEPA BRASSERIE DE L OURCQ', 'qonto-2026-11-06-01', 'csv', null, null, '2026-11-09 09:00+01'),
  ('d3000000-0000-4000-8000-000000000013', :org, '2026-11-12', -18000, 'SNCF CONNECT', 'QKZ7LM', 'CB SNCF CONNECT 12/11', 'qonto-2026-11-12-01', 'csv', null, null, '2026-11-14 09:00+01'),
  ('d3000000-0000-4000-8000-000000000014', :org, '2026-11-13', -108000, 'STUDIO OMBRE', 'F-2026-118', 'VIR SEPA STUDIO OMBRE', 'qonto-2026-11-13-01', 'csv', null, null, '2026-11-14 09:00+01'),
  ('d3000000-0000-4000-8000-000000000015', :org, '2026-11-13', 180000, 'LE HANGAR 21', 'FA-2026-030', 'VIR SEPA ASSOCIATION LE HANGAR 21', 'qonto-2026-11-13-02', 'csv', null, null, '2026-11-14 09:00+01');

-- Débits rattachés à leur dépense payée.
insert into finance_spend_matches (organization_id, transaction_id, line_id, amount_cents, created_at) values
  (:org, 'd3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000023', 504000, '2026-09-18 09:30+02'),
  (:org, 'd3000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000034', 132000, '2026-10-07 09:30+02'),
  (:org, 'd3000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-000000000013', 420000, '2026-11-04 09:30+01'),
  (:org, 'd3000000-0000-4000-8000-000000000009', 'd1000000-0000-4000-8000-000000000029', 240000, '2026-11-06 09:30+01'),
  (:org, 'd3000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000035', 132000, '2026-11-06 09:31+01');

-- ---------------------------------------------------------------------------
-- 6. Factures et entrées d'argent (finance_incomes)
-- ---------------------------------------------------------------------------
select pg_temp.act('malik.durand@preprod.pds');
insert into finance_incomes (id, organization_id, label, kind, amount_cents, vat_bp, contact_id,
                             payer_name, project_id, artist_id, expected_on, invoice_number,
                             invoiced_on, sent_on, due_on, owner_person_id, note, next_action,
                             next_action_on, source_line_id, cancelled_at, cancelled_by,
                             cancel_reason, created_at, updated_at) values
  ('d2000000-0000-4000-8000-000000000001', :org, 'Reversement The Orchard — T2 2026', 'distribution', 486000, null,
   '115a50c0-fcfc-44f8-aed4-8c94ec929c62', null, null, null, '2026-08-31', 'RLV-2026-T2', '2026-08-14', '2026-08-14', '2026-08-31',
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', null, null, null, null, null, null, null, '2026-08-14 10:00+02', '2026-08-14 10:00+02'),
  ('d2000000-0000-4000-8000-000000000002', :org, 'Avance The Orchard — tranche 3', 'advance', 5200000, null,
   '115a50c0-fcfc-44f8-aed4-8c94ec929c62', null, null, null, '2026-10-15', 'FA-2026-024', '2026-10-01', '2026-10-01', '2026-10-15',
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', '12 titres livrés depuis la tranche 2', null, null, null, null, null, null, '2026-10-01 10:00+02', '2026-10-01 10:00+02'),
  ('d2000000-0000-4000-8000-000000000003', :org, 'DJ set — soirée de lancement Maison Arlo', 'service', 240000, 2000,
   null, 'Maison Arlo', null, null, '2026-10-15', 'FA-2026-025', '2026-09-15', '2026-09-15', '2026-10-15',
   'c997a4c6-8865-4c99-955e-de3a437aec74', null, null, null, null, null, null, null, '2026-09-15 11:00+02', '2026-09-15 11:00+02'),
  ('d2000000-0000-4000-8000-000000000004', :org, 'Synchro « Maison Arlo » — campagne hiver', 'service', 960000, 2000,
   null, 'Maison Arlo', '41f28596-2167-4c0f-b539-d0a78187a97b', null, '2026-10-22', 'FA-2026-026', '2026-09-22', '2026-09-22', '2026-10-22',
   'c997a4c6-8865-4c99-955e-de3a437aec74', 'Licence 12 mois, web et réseaux', null, null, null, null, null, null, '2026-09-22 10:00+02', '2026-09-22 10:00+02'),
  ('d2000000-0000-4000-8000-000000000005', :org, 'Partenariat Brasserie de l''Ourcq — Marée basse', 'partnership', 600000, 2000,
   null, 'Brasserie de l''Ourcq', '14f169b1-18b9-4fa8-a2b9-05c0769f9490', null, '2026-11-07', 'FA-2026-028', '2026-10-08', '2026-10-08', '2026-11-07',
   'c997a4c6-8865-4c99-955e-de3a437aec74', null, null, null, null, null, null, null, '2026-10-08 10:00+02', '2026-10-08 10:00+02'),
  ('d2000000-0000-4000-8000-000000000006', :org, 'Licence synchro série « Rive gauche »', 'service', 720000, 2000,
   'f8ca6ba8-1247-4ed6-ad04-f87e4027b7da', null, 'ddc17548-06fa-43dd-8579-243de71aa341', null, '2026-12-19', 'FA-2026-029', '2026-10-20', '2026-10-21', '2026-12-19',
   'c997a4c6-8865-4c99-955e-de3a437aec74', 'Acompte de 50 % à la signature, solde à la diffusion', null, null, null, null, null, null, '2026-10-20 15:00+02', '2026-10-20 15:00+02'),
  ('d2000000-0000-4000-8000-000000000007', :org, 'Cachet concert — Festival Les Embruns', 'service', 360000, 550,
   null, 'Festival Les Embruns', null, 'd0a3779e-594c-43ce-9136-a0f738f8db63', '2026-10-30', 'FA-2026-027', '2026-09-30', '2026-09-30', '2026-10-30',
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', 'Concert du 26/09', 'Rappeler la trésorière si rien n''arrive', '2026-11-20', null, null, null, null, '2026-09-30 10:00+02', '2026-09-30 10:00+02'),
  ('d2000000-0000-4000-8000-000000000008', :org, 'Cachet showcase — Le Hangar 21', 'service', 180000, 550,
   null, 'Le Hangar 21', null, 'd0a3779e-594c-43ce-9136-a0f738f8db63', '2026-11-20', 'FA-2026-030', '2026-10-24', '2026-10-24', '2026-11-20',
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', 'Showcase du 12/11 à Lyon', null, null, null, null, null, null, '2026-10-24 10:00+02', '2026-10-24 10:00+02'),
  ('d2000000-0000-4000-8000-000000000009', :org, 'Reversement The Orchard — T3 2026', 'distribution', 524000, null,
   '115a50c0-fcfc-44f8-aed4-8c94ec929c62', null, null, null, '2026-11-30', 'RLV-2026-T3', '2026-10-31', '2026-10-31', '2026-11-30',
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', null, null, null, null, null, null, null, '2026-10-31 10:00+01', '2026-10-31 10:00+01'),
  ('d2000000-0000-4000-8000-000000000010', :org, 'Refacturation location matériel clip Velours', 'rebilling', 420000, 2000,
   'b2146e3b-16de-44df-98f9-8d21a6aa5dd7', null, '0cae24c1-5ef0-4019-b542-9e7d9c0148e3', null, '2026-12-05', 'FA-2026-033', '2026-11-05', '2026-11-05', '2026-12-05',
   'c997a4c6-8865-4c99-955e-de3a437aec74', 'Coproduction du clip avec le Label Sillon', null, null, 'd1000000-0000-4000-8000-000000000013', null, null, null, '2026-11-05 11:00+01', '2026-11-05 11:00+01'),
  ('d2000000-0000-4000-8000-000000000011', :org, 'Part partenaire PDS MIC #6 (40 %)', 'partnership', 384000, 2000,
   '850d7461-545f-46dc-8559-35bbe02418fd', null, null, null, '2026-12-10', 'FA-2026-034', '2026-11-14', null, '2026-12-10',
   'c997a4c6-8865-4c99-955e-de3a437aec74', '40 % du budget de l''émission (8 000 € HT)', 'Envoyer la facture après l''émission', '2026-11-21', null, null, null, null, '2026-11-14 16:00+01', '2026-11-14 16:00+01'),
  ('d2000000-0000-4000-8000-000000000012', :org, 'Avance éditoriale — Mirage', 'advance', 800000, null,
   '203635e1-8c80-4bef-b96f-4c63bb4dea04', null, 'cdf404d0-9ff0-4e36-8c4e-e4015be1aa2d', null, '2027-01-15', null, null, null, null,
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', 'Contrat d''édition signé le 06/11, avance à la livraison des masters', null, null, null, null, null, null, '2026-11-06 17:00+01', '2026-11-06 17:00+01'),
  ('d2000000-0000-4000-8000-000000000013', :org, 'Synchro « Maison Arlo » — campagne printemps', 'service', 1200000, 2000,
   null, 'Maison Arlo', 'fdc18b3f-8e39-4669-af60-23d1e0c48df3', null, '2027-02-10', null, null, null, null,
   'c997a4c6-8865-4c99-955e-de3a437aec74', 'Accord de principe, contrat en relecture', null, null, null, null, null, null, '2026-11-12 18:00+01', '2026-11-12 18:00+01'),
  ('d2000000-0000-4000-8000-000000000014', :org, 'Second showcase — Le Hangar 21 (28/11)', 'service', 180000, 550,
   null, 'Le Hangar 21', null, 'd0a3779e-594c-43ce-9136-a0f738f8db63', '2026-11-28', null, null, null, null,
   '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', null, null, null, null, '2026-11-08 12:00+01', '03208a6d-0d1c-4b34-b07c-044b6e24c8ff',
   'Date reportée au printemps par la salle', '2026-10-24 10:05+02', '2026-11-08 12:00+01'),
  ('d2000000-0000-4000-8000-000000000015', :org, 'Aide à l''enregistrement — EP Néons', 'other', 800000, null,
   null, 'Centre national de la musique', 'b3e72edc-3c34-4fcd-bf1f-b1ebf2013e07', null, '2026-09-25', null, null, null, null,
   'c997a4c6-8865-4c99-955e-de3a437aec74', 'Dossier 2026-1187, accordé en juillet', null, null, null, null, null, null, '2026-07-20 10:00+02', '2026-07-20 10:00+02');

-- Encaissements (rattachés à leur virement quand il est dans le relevé).
insert into finance_receipts (organization_id, income_id, amount_cents, received_on, note, transaction_id, created_at) values
  (:org, 'd2000000-0000-4000-8000-000000000001', 486000, '2026-09-02', 'Rapproché avec la banque · THE ORCHARD FRANCE', 'd3000000-0000-4000-8000-000000000001', '2026-09-04 09:30+02'),
  (:org, 'd2000000-0000-4000-8000-000000000015', 800000, '2026-09-25', 'Rapproché avec la banque · CENTRE NATIONAL DE LA MUSIQUE', 'd3000000-0000-4000-8000-000000000016', '2026-09-28 09:30+02'),
  (:org, 'd2000000-0000-4000-8000-000000000003', 180000, '2026-10-10', 'Virement reçu, après l''avoir AV-2026-002', null, '2026-10-12 09:30+02'),
  (:org, 'd2000000-0000-4000-8000-000000000002', 5200000, '2026-10-15', 'Rapproché avec la banque · THE ORCHARD FRANCE', 'd3000000-0000-4000-8000-000000000004', '2026-10-16 09:30+02'),
  (:org, 'd2000000-0000-4000-8000-000000000004', 960000, '2026-10-21', 'Rapproché avec la banque · MAISON ARLO SAS', 'd3000000-0000-4000-8000-000000000005', '2026-10-23 09:30+02'),
  (:org, 'd2000000-0000-4000-8000-000000000006', 360000, '2026-11-03', 'Rapproché avec la banque · LUMEN FILMS', 'd3000000-0000-4000-8000-000000000007', '2026-11-04 09:30+01'),
  (:org, 'd2000000-0000-4000-8000-000000000005', 600000, '2026-11-06', 'Rapproché avec la banque · BRASSERIE DE L OURCQ', 'd3000000-0000-4000-8000-000000000012', '2026-11-09 09:30+01');

-- Un avoir : le set a été écourté d'une heure.
insert into finance_credit_notes (organization_id, income_id, number, issued_on, amount_cents, reason, created_at)
values (:org, 'd2000000-0000-4000-8000-000000000003', 'AV-2026-002', '2026-10-01', 60000,
        'Set écourté d''une heure (coupure de courant côté client)', '2026-10-01 10:00+02');

-- Les relances de la facture en retard.
insert into finance_reminders (organization_id, income_id, reminded_on, channel, note, created_at) values
  (:org, 'd2000000-0000-4000-8000-000000000007', '2026-11-05', 'email', 'Relance envoyée à la comptabilité du festival', '2026-11-05 10:00+01'),
  (:org, 'd2000000-0000-4000-8000-000000000007', '2026-11-12', 'phone', 'La trésorière promet un virement sous dix jours', '2026-11-12 15:30+01');

-- ---------------------------------------------------------------------------
-- 7. Pay Later
-- ---------------------------------------------------------------------------
select pg_temp.act('glen@pds.test');
insert into finance_credit_lines (id, organization_id, name, limit_cents, created_at)
values ('d8000000-0000-4000-8000-000000000001', :org, 'Qonto Pay Later', 3000000, '2026-09-01 09:00+02');
insert into finance_credit_draws (organization_id, credit_line_id, line_id, label, amount_cents, drawn_on,
                                  installments, fee_bp, created_at) values
  (:org, 'd8000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000041',
   'MacBook Pro 14 pouces (montage)', 300000, '2026-09-05', 3, 300, '2026-09-05 15:10+02'),
  (:org, 'd8000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000040',
   'Caméra Sony FX3 et deux optiques', 840000, '2026-10-20', 6, 300, '2026-10-20 16:40+02');

-- ---------------------------------------------------------------------------
-- 8. Révisions de budget (motivées) et historique
-- ---------------------------------------------------------------------------
delete from budget_revisions where organization_id = :org;
insert into budget_revisions (organization_id, target_kind, target_id, before_cents, after_cents, reason,
                              actor_person_id, created_at) values
  (:org, 'project', 'fdc18b3f-8e39-4669-af60-23d1e0c48df3', 1200000, 1500000,
   'Clip ajouté au plan de sortie', '78edc128-d978-4b27-827d-df48177ebd88', '2026-10-14 15:00+02'),
  (:org, 'cost_center', 'd5000000-0000-4000-8000-000000000002', 800000, 900000,
   'Loyer du local revalorisé au 1er octobre', '03208a6d-0d1c-4b34-b07c-044b6e24c8ff', '2026-10-02 09:30+02'),
  (:org, 'cost_center', 'd5000000-0000-4000-8000-000000000001', 760000, 800000,
   'Un cadreur de plus sur le plateau', 'c997a4c6-8865-4c99-955e-de3a437aec74', '2026-11-06 11:00+01');

-- L'historique : seulement ce jeu de données, chaque ligne datée du moment de
-- sa saisie (les déclencheurs l'ont daté de maintenant).
update finance_events e
   set created_at = case when e.action = 'insert'
                         then coalesce((e.after ->> 'created_at')::timestamptz, e.created_at)
                         else coalesce((e.after ->> 'attached_at')::timestamptz, e.created_at) end
 where e.organization_id = :org and e.created_at = now();
-- La page Exports lit l'historique dans l'ordre d'écriture (seq) : on le
-- réécrit dans l'ordre des dates de saisie.
create temp table demo_events on commit drop as
  select * from finance_events where organization_id = :org;
delete from finance_events where organization_id = :org;
insert into finance_events (id, organization_id, entity, row_id, action, before, after,
                            actor_person_id, created_at)
select id, organization_id, entity, row_id, action, before, after, actor_person_id, created_at
  from demo_events order by created_at, seq;

commit;
