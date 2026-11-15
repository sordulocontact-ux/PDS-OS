# Lot 11 : suivi juridique par participation (branché sur les deals de Sacha)

Compte rendu du 14/11/2026. Vérification dans Chrome regroupée après le lot 12
(`recap-9-12.md`).

## Relu avant de coder

- Migrations de Sacha : `20261111230101_deals` (table `deals`, étapes, `can_read_deal` :
  direction, négociateur affecté, responsable du projet ; `read_deal_context`),
  `…231101_deal_terms`, `…232101_deal_notifications`, `20261112010101_deal_calls`,
  `…020101_deal_memos`, `…030101_private_contacts`, `…120101_deals_collective_fixes`,
  `…140101_bm_opens_deals`. Rien de nouveau depuis le 12/11 (dernière : `…150101_finance`).
- `lib/deals/` : `createDeal` (action), `dealFailure` (messages), `DealStageBadge`, la colonne
  « Prochaine action » de la liste des deals (`deals-table.tsx`).
- Ce qui compte pour le lot : le deal d'un collectif passe par une participation
  (`create_deal` refuse projet + artiste, `collective_needs_participation`) ; un deal ouvert sur
  une participation confirmée démarre en négociation, et un deal ouvert avant y passe à la
  confirmation ; le business manager ouvre ses deals sur un artiste seul, pas sur un projet, et
  n'a pas accès aux pages du projet.
- `git fetch` échoue (« Repository not found » sur l'origine) : j'ai lu la branche locale, à jour
  avec `origin/pre-prod` à la dernière synchro.

## Ce qui est fait

- **Nouvelle page du Juridique d'un collectif : « Participations et contrats »**
  (`/legal/participations`), reliée en pied de la colonne du parcours, à côté de « Historique
  du Juridique ». 404 pour un projet simple, et sans `manage_legal` comme tout le Juridique.
- **Un groupe par titre** (ordre du projet, « Prévu » ou « Abandonné » marqué), **une ligne par
  participation** :
  - artiste et rôle ;
  - statut de la participation ;
  - **contrat** lu sur `title_participations.contract_id` : son état (« Signé », « Envoyé pour
    signature »…, la pastille ouvre le contrat), « Manquant » pour une participation confirmée
    sans contrat, « Lié » si le lecteur ne lit pas le contrat ;
  - **négociation** : l'étape du deal (pastille de Sacha, ouvre le deal), « par Malik Durand »
    ou « À affecter » ;
  - **prochaine action** comme la liste des deals : relance due (pastille rouge), sinon action
    et date, sinon relance à venir.
- **La ligne ouvre le deal** dans le module Business (sa page existe).
- **Sans deal vivant** : « Pas de dossier de négociation » et, pour la direction et la
  responsable du projet, **« Ouvrir un dossier »** (ou « Ouvrir un nouveau dossier » après un
  deal abandonné) : une modale avec « Négocié par » facultatif, qui appelle **l'action
  `createDeal` de Sacha avec la participation**. La page reste ouverte, la ligne montre l'étape.
- **En-tête** : contrats signés sur les participations confirmées, participations sans dossier,
  relances dues.
- **Même artiste sur deux titres** : deux lignes, deux deals, deux contrats.
- **« Titres et artistes »** : sa colonne Négociation lisait déjà l'étape du deal depuis le lot 6
  (rien à refaire) ; le contrat manquant y est maintenant dit « Manquant » (avant « À faire »),
  comme dans le Juridique.

## Droits, sans fuite

- Tout est lu avec la session du lecteur, sous la RLS des deals et des contrats ; aucun contact
  n'est lu (ni `title_participations.contact_id`, ni `deal_contacts`).
- Qui voit la page : direction et responsable du projet (`manage_legal`, et seuls eux voient le
  projet parmi les chefs de projet). Ils lisent tous les deals du projet : « Pas de dossier » est
  donc vrai.
- Directeur créatif : pas de Juridique (404). Business manager : pas le projet (404), il
  travaille depuis Deals (inchangé, ta consigne). Un lecteur qui ne lirait qu'une partie des
  deals verrait « — » plutôt que « Pas de dossier », sans bouton ; aucun deal lu : colonnes de
  négociation masquées (même règle qu'au lot 6).

## Mes choix

- **Une page du Juridique plutôt qu'une étape du parcours** : les étapes du Juridique sont ses
  démarches (personne, emprunt, répartition, SACEM) ; une vue de toutes les participations est
  un tableau de bord, comme l'Historique, donc un lien en pied de colonne.
- **Rester sur la page après « Ouvrir un dossier »** (Sacha ouvre la page du deal) : on parcourt
  dix participations d'affilée ; le deal s'ouvre d'un clic sur la ligne.
- **Prochaine action** : même lecture que la liste des deals de Sacha (relance due en premier),
  pour ne pas dire deux choses différentes du même deal.
- **Répartitions et bulletins SACEM** : déjà par titre dans le Juridique (démarches « split » et
  « sacem »), pas répétés ici.
- **Comptes du Juridique** : un titre abandonné y reste (décision 8 : l'abandon ne touche ni
  contrats, ni répartitions, ni bulletins).

## Ce qui manque côté deals

Rien ne bloque la vue. Deux remarques pour Sacha, sans toucher à son code :
- `createDeal` revalide Deals, Travail et l'accueil, pas les pages du projet : la ligne se met à
  jour parce que l'action relit la page courante (à confirmer dans Chrome).
- `read_deal_context` affiche le nom provisoire d'un titre (« Sans titre · … »), déjà signalé au
  lot 7.

## Ce que le skill a fait changer

`/layers-interaction-flow` (breadboard avant l'interface) :
- « Ouvrir un nouveau dossier » quand le dernier deal est abandonné (sinon la participation
  restait sans issue) ;
- participations refusées, retirées ou d'un titre abandonné : grisées, deal gardé, aucun bouton ;
- le cas « deal_exists » (deux personnes ouvrent le même dossier) dit dans la modale ;
- l'état vide (aucun artiste invité) avec le lien vers Titres et artistes, et la ligne « Aucun
  artiste invité sur ce titre ».

## Tests

- Nouveau `supabase/tests/legal-participations.test.sql` (16) : deal ouvert en négociation pour
  une participation confirmée ; même artiste sur deux titres = deux deals distincts ; la
  responsable et la direction lisent tous les deals avec prochaine action, date et relance ; le
  directeur créatif n'en lit aucun ; le business manager ne lit que le sien, ni le projet ni ses
  participations, et n'ouvre pas de deal dessus ; un autre négociateur ne lit que le sien ; un
  chef de projet hors projet ne lit rien ; participation refusée ou titre abandonné : pas de
  deal ; un seul deal vivant par participation ; un nouveau après abandon.
- Verts : `title-board`, `deals-collective`, `deals-bm-opens`.
- Typecheck, lint, prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (après le lot 12).

## Questions pour toi

Aucune.
