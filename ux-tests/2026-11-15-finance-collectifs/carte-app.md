# Carte de l'app (test du 15/11/2026)

- App : PDS OS, Next.js 16 + Supabase local (http://localhost:3000, API 127.0.0.1:54321, Mailpit 54324).
- Organisation de test : « pds » (jeu de démo de la pré-prod chargé en local). Barre « Voir comme / Aller à »
  (PREPROD_TOOLS=1) : vraie connexion à un autre compte de la démo, sans mot de passe à taper.
- Rôles testés : business (Élise Fabre), business manager (Malik Durand), cheffe de projet (Lina Haddad),
  directrice générale (Claire Morel). Finance (`read_finance`/`manage_finance`) : DG, business managers, business.
- Finance : 9 sections dans une seconde colonne (Vue d'ensemble, Trésorerie, Alertes / Budgets, Dépenses /
  Factures & encaissements, Financements / Rapprochement, Exports), barre principale repliée en icônes.
- Projets collectifs (Maël, lots 6 à 15) : création d'un collectif, « Titres et artistes », Master par titre,
  Distribution par sortie. Aucun projet collectif dans la démo locale.
- À ne pas toucher : bouton « Retours » (crée de vraies pages Notion), envois d'e-mails, téléchargements.
- Données créées pendant le test : retrouvées par created_at > début du test (.start) et créateur = personne testée.
