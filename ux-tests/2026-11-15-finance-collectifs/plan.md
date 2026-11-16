# Plan de test — Finance après fusion, projets collectifs (15/11/2026)

## Questions de recherche

1. La Finance (business, business manager, DG) trouve-t-elle sans aide l'information et le geste du quotidien
   dans les 9 sections et la double colonne ?
2. Les gestes d'écriture (facture, rapprochement, émission planifiée, dépense hors projet) donnent-ils un retour
   clair, et l'état enregistré correspond-il à ce que la personne croit ?
3. Sur téléphone, la DG voit-elle l'urgent et trouve-t-elle l'export comptable ?
4. Une cheffe de projet crée-t-elle un projet collectif et y ajoute-t-elle titres et artistes sans aide ?

## Tâches, critères de succès (jamais montrés aux testeurs), chemin optimal

- E1 (Élise) première impression de Finance. Succès : dit à quoi sert la page (solde, entrées/sorties, alertes).
- E2 facture Renault envoyée (FA-2026-040). Succès : finance_incomes « Synchro pub Renault » invoice_number = FA-2026-040,
  invoiced_on et sent_on renseignés. Optimal : Factures › ⋯ › Modifier › 3 champs › Enregistrer (≈7).
- E3 rapprocher la transaction 1 080 € Studio Ingé Son. Succès : finance_spend_matches sur « Ingé son ». Optimal : Rapprochement › Valider (2).
- E4 solde dans 3 mois et moment le plus tendu. Succès : cite le solde à 90 j et le point bas (date). Optimal : Trésorerie › 90 jours (2).
- M1 (Malik) budget dépassé, de combien, sur quoi. Succès : Ciel ouvert, ≈30 778 €, poste principal (Prestations). Optimal : Budgets › Ciel ouvert (2).
- M2 prévoir un PDS MIC le 18/12. Succès : finance_shows nouvel enregistrement planned_on 2026-12-18 format PDS MIC. Optimal : Financements › Planifier › 3 champs (≈6).
- M3 le repousser d'un mois. Succès : même ligne planned_on 2027-01-18. Optimal : ⋯ › Changer la date (≈4).
- M4 loyer studio 1 200 € HT payé, sans projet ni artiste. Succès : budget_lines amount_cents 120000, cost_center ou off_budget, status paid. Optimal : Dépenses › Ajouter › 5 champs (≈8).
- L1 (Lina) créer le projet collectif du prochain PDS MIC. Succès : projects collective = true créé par Lina.
- L2 y ajouter deux titres avec leurs artistes. Succès : 2 titres liés au projet.
- L3 voir l'avancement du Master titre par titre. Succès : atteint la vue Master du projet et la décrit.
- C1 (Claire, téléphone) voir s'il y a de l'urgent. Succès : cite au moins le budget dépassé (Alertes ou À surveiller).
- C2 trouver où récupérer la liste des factures clients pour le comptable, sans télécharger. Succès : atteint Exports › Factures clients et avoirs.
