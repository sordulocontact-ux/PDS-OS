# Carte de l'app — module Business et Budget (12/11/2026)

- App : Next.js, `pnpm dev` de Sacha sur http://localhost:3000, base Supabase locale (Docker, 127.0.0.1:54321).
- Barre de pré-prod (`PREPROD_TOOLS=1`) : « Voir comme » change de compte sans mot de passe (lib/preprod/actions.ts) ; utilisée pour connecter chaque persona.
- Pages testées :
  - `/app/deals` (onglets En cours / À relancer / Signés / Abandonnés, recherche, filtres) — components/deals/deals-list.tsx, deals-table.tsx
  - `/app/deals/[id]` : Maintenant, Prochaine action, Termes, Calls, Deal memo et contrat, Contacts, Étapes, Infos, Historique — app/(app)/app/deals/[dealId]/page.tsx
  - `/app/expenses` (Dépenses d'artiste)
  - `/app/catalog/artists/[id]/business` (onglet Business : deals + enveloppe)
- Droits (role_permissions) :
  - DG : validate, manage_artist_budgets, read_artist_budgets…
  - Chef de projet : read_artist_budgets (pas negotiate)
  - Business manager : negotiate, manage_network, read_artist_budgets
  - Business : negotiate, manage_network
- Lire un deal (can_read_deal) : direction, négociateur assigné, responsable du projet du deal.
- Ouvrir un deal (create_deal) : direction ou responsable du projet seulement. Un négociateur n'ouvre pas de deal.
- Abandonner un deal : abandon_deal ; aucune fonction pour reprendre un deal abandonné.
- Contacts privés (BIZ 8) : coordonnées lisibles par le propriétaire, la direction et les lecteurs d'un deal où le contact est lié.
- Données (supabase/preprod/showcase-business.sql joué en local) :

| Deal                                   | Négociateur | État                                                                                   |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| Mona Lys, Minuit pile (projet de Lina) | Malik       | negotiation, relance due il y a 2 j, termes dans tous les états, contact Camille Petit |
| Lila Vega                              | Malik       | call_planned, call dans 3 j à 11 h, contact privé Yasmine Ould (06 11 42 87 30)        |
| Nahel Nuit                             | Élise       | accord de principe en attente de la direction                                          |
| Mako Rouge                             | Malik       | signé                                                                                  |
| Rivo Blanc                             | Élise       | abandonné                                                                              |

- Enveloppe de Mona Lys : 40 000 € (studio 15 000, photo/vidéo 10 000, publicité 10 000) ; dépenses : coaching 600 € (payé), train 180 € (facturé).
