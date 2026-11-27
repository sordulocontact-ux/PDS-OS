# Test de parcours complet : projet simple et projet collectif (26/11/2026)

Deux projets créés de zéro dans Chrome, sur la base de dev (`rteadftyvfutftfiepvh`), menés aussi
loin que possible, de la création à la clôture du projet. Le but : trouver les blocages et
comparer les deux parcours, qui doivent se ressembler le plus possible.

## 1. Méthode

- Comptes utilisés par « Voir comme » (barre pré-prod) : Claire Morel (DG), Lina Haddad (CP),
  Nadia Benali (DC), et Chloé Martin (DC), ajoutée temporairement à `lib/preprod/accounts.ts`
  le temps du test, puis retirée.
- Les ingénieurs (Karim Haddou au mix, Bastien Coll au mastering) ont été joués depuis leur
  lien privé `/c/…`, sans compte.
- Fichiers de test : WAV de 5 s (maquette, mix, master) et PNG 3000 × 3000 (pochette).
- Les réponses aux questions de PO sont volontairement courtes (« Réponse de test pour : … »).

| | Projet simple | Projet collectif |
| --- | --- | --- |
| Nom | « Lueur test » | « Micro test » |
| Id | `72d83b4a-9975-4bcc-9102-ecfddfbce27f` | `b85e92ae-312d-4a95-afda-b820f9be40f9` |
| Type | Musical · Single · Mona Lys | Musical · Compilation · PDS, invités Elio Danvers et Lila Vega |
| Titres | « Lueur test » (master `c2570c64-…`) | « Echo test » (master `2e3a7a98-…`), « Titre d'Elio Danvers (à nommer) », « Titre de Lila Vega (à nommer) » |
| Sortie | sortie du projet | sortie du titre « Echo test » (`e4fbbb01-…`), mode « Sorties individuelles » |

**Limite importante** : un vrai PDS Mic (Assurance 30) est un projet **Contenu au format
« PDS Mic »**, pas un Musical · Compilation. Le collectif de ce test passe donc par certains
chemins différents (format, mode de sortie). Un second passage en Contenu · PDS Mic reste à faire.

## 2. Jusqu'où va chaque parcours

| Étape | Simple | Collectif |
| --- | --- | --- |
| Création, acceptation | faite | faite |
| Cadrage (19 questions, Brief, Plan du projet) | fait, plan lancé | fait, plan lancé |
| Master | master final au Catalogue | master final pour « Echo test » seulement ; les deux titres « à nommer » n'ont aucun audio |
| Juridique | plan d'action lancé ; fiches, contrats, répartition, SACEM **non faits** | idem, après avoir confirmé les contrats de chaque titre |
| Marketing | Stratégie V2 validée, Conception jusqu'à la pochette, pochette produite et livrée ; Activations, fiche Clip, Suivi & bilan **non faits** | idem |
| Catalogue | ISRC et ligne ℗ renseignés | idem, plus crédits et pochette du titre corrigés |
| Prêt pour la sortie | validé par Claire, aucun blocage | validé par Claire **avec une dérogation** (voir M1) |
| Distribution | dépôt déclaré, réponses de The Orchard saisies, clôturée avec réserves | idem |
| Clôture du projet | bilan validé, projet clos | idem |

La réserve des deux distributions : les liens des 5 plateformes ne peuvent pas être vérifiés
avant la date de sortie (15/04/2027).

## 3. Problèmes d'environnement

| | Problème | Ce qui a été fait |
| --- | --- | --- |
| E1 | PO ne lit plus une réponse en texte libre : `interpretAnswer: AI_APICallError: You need a subscription to access this API.` | Contourné (crédit ajouté au Catalogue). **Pas retesté** depuis la mise à jour de `.env.local` (`VERCEL_OIDC_TOKEN` renouvelé). |
| E2 | « Voir comme » ne liste que les comptes de `lib/preprod/accounts.ts`. Chloé Martin a un compte (`supabase/preprod/showcase.sql`), mais n'y figure pas : choisie comme DC, ses étapes deviennent impossibles. | Ajoutée le temps du test, puis retirée. Pour un test, prendre Nadia Benali comme DC. |
| E3 | `next dev` s'est arrêté (erreur interne de Turbopack). Au redémarrage, erreur 500 partout : `next/font/google` introuvable. Renommer `.next` dans le dépôt a donné une 2e erreur, Tailwind analysant le dossier renommé. | `.next` sorti du dépôt et reconstruit. Consigne ajoutée à `CLAUDE.md`. |
| E4 | Session déconnectée après le changement de `.env.local`. | Reconnexion par Maël. |
| E5 | SMTP désormais configuré (`EMAIL_SMTP_*`) : certaines actions peuvent envoyer de vrais e-mails aux contacts de la base de dev. | À garder en tête pour les prochains tests (liens de fiche, signatures, relances). |

## 4. Bugs communs aux deux parcours

Ils touchent surtout les parties de Sacha. Sévérité : **B** = bloque le parcours, **M** = majeur,
**m** = mineur.

| # | Sév. | Constat | Cause ou piste | Partie |
| --- | --- | --- | --- | --- |
| C1 | B | Un livrable ajouté en Conception (« Ajouter un livrable ») n'arrive jamais en Production. La pochette ajoutée ainsi bloque « Prêt pour la sortie » (« pas encore livrée par la Production »). | `lib/journey/production.ts` ne lit que `strategy_deliverables`. Contourné en révisant la Stratégie (V2, revalidée) : la pochette apparaît ensuite en double en Conception. | Sacha |
| C2 | B | Un valideur du Brief de sortie retiré de l'équipe garde sa validation « en attente », perd l'accès au projet (« Page introuvable »), et rien ne permet de la retirer ou de la confier à un autre (seulement « Relancer »). | Les valideurs sont figés à l'envoi (`strategy_document_reviews`) ; aucune fonction de retrait. Contourné en remettant Chloé dans l'équipe. | Sacha |
| C3 | M | Écrans pas à jour après une action, il faut recharger : « Maintenant » du collectif resté sur « En attente de Claire : valider le Brief de cadrage » après le lancement du plan ; Production vide après un transfert ; « 0 contrôle sur 6 » ; « Validation en cours… » figé ; parcours inchangé après la réponse de The Orchard. | Au même moment, le log montre `project_view_cache: null value in column "value"`. Piste : `write()` dans `lib/projects/view-store.ts` envoie une vue nulle, l'upsert du lot de 25 échoue puis `return` ; les parcours passent par ce cache (`byProjectVersion("journeys", …)`). **Non prouvé.** | Sacha |
| C4 | M | Le valideur voit sa propre décision « En attente » sur le Brief de sortie, les autres voient « Validé ». Un 2e clic : « Cette version a déjà reçu une décision. » | Affichage côté valideur. | Sacha |
| C5 | M | Création d'un Single : « Créer le titre » depuis le formulaire crée le titre au Catalogue mais ne le rattache pas, alors que le panneau dit « Il sera rattaché au projet dès sa création ». La page remonte en haut. En collectif, le rattachement marche. | Formulaire de création. | Sacha |
| C6 | M | Les versions déposées par l'ingénieur depuis son lien sont affichées « déposée par Lina Haddad ». | Auteur du dépôt. | Sacha |
| C7 | M | Le lien privé de l'ingénieur n'est pas montré après « Envoyer » : il est dans le bloc replié « Lien de … », marqué « Pas encore envoyé ». | — | Sacha |
| C8 | M | Un projet clos (bilan validé) reste « En cours » dans la liste des projets, avec des étapes Juridique et Marketing. | — | Sacha |
| C9 | M | Plan juridique : aucun modèle de contrat pour compositeur·rice ou auteur·rice (« Modèle manquant »). | Bibliothèque de modèles. | Sacha |
| C9 bis | M | (vu le 27/11, à transmettre avec C9) « Contrats des intervenants » (Plan d'action › « Modifier les contrats à prévoir ») ignore un « Non nécessaire · justifié » déjà enregistré : sur « Micro test », Karim Haddou et Bastien Coll y reviennent en « Choisir un contrat · Modèle manquant », et le formulaire refuse de s'enregistrer tant qu'on ne choisit pas pour eux. Aucune reconfirmation n'est possible sans changer leur choix. | Piste : `initialOf` dans `components/legal/contracts/mapping-form.tsx` part du modèle du besoin (`row.template?.id ?? null`) dès qu'un besoin existe (`needId`), avant de regarder s'il est enregistré « non nécessaire ». | Sacha |
| C10 | m | Valideur des versions du master : Lina au formulaire de création, Chloé dans le Brief Master, sur les deux projets. | À vérifier en base (`projects.master_validator_person_id`). | Sacha |
| C11 | m | Production : Lina voit « Valider la V1 » alors que l'étape revient à Nadia (vu sur le collectif). | — | Sacha |
| C12 | m | La date « Livraison finale le » d'une fiche se perd à la 1re saisie. | Console : Base UI « uncontrolled FieldControl ». | Sacha |
| C13 | m | Fiche Catalogue : « À valider : Maquette V1 » alors que le master final est validé. | — | Sacha |
| C14 | m | Cadrage : pas de « Non » direct à « Blocages juridiques connus ? » ni à « Quelles contraintes… ? » (il faut « Autre réponse » → « Rien à signaler »). | — | Sacha |
| C15 | m | Panneau « Nouveau titre » : un artiste du Catalogue n'est pas proposé comme personne dans les crédits (seulement le Réseau) ; la liste des artistes s'ouvre hors du panneau ; trait de séparation « Si vous les connaissez déjà » (règle `no-dividers`). | — | Sacha |
| C16 | m | « Pochette transféré en Production » (accord) ; Distribution « Bloqué » dans le menu alors que la page dit « À vous » ; avertissement React `key` dans `BriefDocument`. | — | Sacha |

## 5. Différences entre le collectif et le projet simple

Côté PDS Mic : c'est la partie de Maël, à corriger en priorité.

### Création
- **M2** Un invité déjà crédité sur un titre rattaché reçoit en plus un titre « à nommer » : Elio
  a « Echo test » (où la ligne dit « Aucun artiste invité ») et « Titre d'Elio Danvers (à
  nommer) ». C'est documenté comme voulu (`docs/pds-mic-resume.md`, 23/11), mais ça crée un
  doublon. **Décision à prendre.**
- **M3** PDS n'est pas crédité sur un titre rattaché à la création. Le dossier de livraison bloque
  sur « Crédits pour les plateformes » et renvoie au Catalogue (corrigé à la main : « PDS feat.
  Elio Danvers »). **Décision à prendre** : créditer PDS au rattachement, ou laisser le renvoi au
  Catalogue.
- Le nom du projet est prérempli avec celui du premier titre (« Echo test »).
- La page « transmis » liste un seul titre rattaché, mais montre déjà le tableau des titres.
- **M6** Format « Compilation » choisi, mais mode de sortie « Sorties individuelles » (c'est le
  défaut du lot 13). La sortie du titre reste « À fixer » : c'est voulu par le plan (« en mode
  singles, l'échéance ne date aucune sortie »), mais il faut ressaisir la date dans Sorties.

### Après le lancement
- Navigation en plus : Titres, Sorties, Plans de sortie ; récap « Artistes » dans la Vue
  d'ensemble.
- **M12** Le « À vous » de la Distribution du collectif n'est compté ni dans le menu ni dans la
  Vue d'ensemble.

### Cadrage et Plan du projet
- **M4** Le Brief de cadrage ne voit que les titres qui ont un master : « Echo test » et Elio
  seulement, ni Lila Vega ni les titres « à nommer ». Le Plan annonce « 1 titre sans master
  final » au lieu de 3.

### Master
- **M5** « Attendent leur source : 0 » alors que deux titres n'ont aucun audio. Le Master passe
  « Terminé » dès qu'« Echo test » est masterisé. La clôture du projet affiche « Chaque titre a
  son master final » et « Distribution : Terminé ».
  Cause : `lib/workflow-status/load.ts` compte `project.masters` (titres avec un master) ; la
  Distribution prend la moins avancée des sorties existantes, sans voir les titres sans sortie.
- **M9** La page de l'ingénieur parle du « dossier du mix de Micro test » (le projet), pas du
  titre.

### Juridique
- **M8** « Lancer le plan d'action » est refusé (« Confirmez d'abord les contrats à prévoir ») : il
  faut confirmer une page « Contrats du titre » pour chacun des 3 titres (Production, Droit à
  l'image, Édition, Beatmaker), et choisir un contrat pour Elio. Le projet simple se lance
  directement.
- Le Suivi juridique du collectif liste Karim et Bastien mais pas Elio, alors que la Vue
  d'ensemble demande sa fiche. Les titres « à nommer » commencent par « Rattacher le titre au
  Catalogue ».
- Après « Pas d'accord nécessaire » pour Elio, « Prêt pour la sortie » liste toujours « Contrat de
  Elio Danvers : À créer », et le Brief de sortie dit « Faire signer un contrat à Elio Danvers
  est bloqué ».

### Marketing
- Identique : mêmes 8 dimensions, mêmes livrables, pas de ciblage par titre dans la Stratégie.
  La Production du collectif a en plus « Titres visés : Tout le projet ».

### Distribution et sortie
- **M1 (bloquant)** « Prêt pour la sortie » reste bloqué sur « Sortie enregistrée », même avec la
  sortie du titre datée et son dossier validé. Cause : `loadReadinessInputs`
  (`lib/legal/readiness/queries.ts`) appelle `loadDistributionSources(project)` sans sortie et
  cherche une sortie de projet, qui n'existe pas en « Sorties individuelles ». Contourné par une
  dérogation de Claire. Le point 6 du lot 15 (`docs/pds-mic-plan.md`) l'avait prévu : aucune
  lecture « la sortie » d'un collectif ne doit se faire sans dire laquelle.
- **M7** La pochette d'une sortie de titre est lue au Catalogue, pas dans la Production : il a
  fallu la déposer deux fois. Les paramètres de distribution du collectif n'ont pas de ligne
  « Pochette ». Le projet simple reprend automatiquement la pochette livrée en Production.
- **M10** Les pages de Distribution du collectif demandent `?sortie=` ; sans lui, elles renvoient
  vers Sorties.
- Le dossier du collectif a 10 éléments au lieu de 8 (crédits pour les plateformes, pochette du
  titre).

## 6. Contournements appliqués dans la base de dev

- Crédit d'Elio Danvers (compositeur, auteur) ajouté au Catalogue sur « Echo test » (E1).
- « Pas d'accord nécessaire » pour Elio, avec justification (C9).
- Équipe créative : Nadia ajoutée ; Chloé retirée puis remise (C2).
- Valideur des versions et direction artistique du Brief Master remplis par Lina.
- Stratégies révisées en V2 pour la pochette (C1).
- PDS ajouté en artiste principal, Elio passé en featuring sur « Echo test » (M3).
- Pochette déposée aussi au Catalogue pour « Echo test » (M7).
- Dérogation « Sortie enregistrée » sur le collectif (M1).

## 7. Données de test laissées

- ISRC `FR-ZZ1-26-00001` (« Lueur test ») et `FR-ZZ1-26-00002` (« Echo test »), ligne
  ℗ « 2027 PDS Records ».
- Fichiers audio et pochettes de test, dépôts The Orchard déclarés, deux bilans de clôture.
- Une pochette en double en Conception sur chaque projet.

Rien n'a été supprimé.

## 8. Suite proposée

**Corrigé le 26/11 (sans migration, détail dans `docs/AVANCEMENT.md`) :**
1. **M1** : « Prêt pour la sortie » d'un collectif se calcule sur chacune de ses sorties
   actives.
2. **M5** : plus de « Terminé » (Master, Distribution, clôture) tant que des titres actifs n'ont
   ni audio ni sortie ; ils comptent dans « Attendent leur source ».

**Corrigé le 27/11, après les décisions de Maël du 26/11 (détail dans `docs/AVANCEMENT.md`) :**
3. **M2** : un invité déjà crédité sur un titre choisi reçoit sa participation sur ce titre, sans
   titre « à nommer ».
4. **M3** : chaque titre choisi crédite PDS en tête et ses invités en featuring, sans doublon.
5. **M6** : la sortie d'un titre naît datée de l'échéance du projet, modifiable dans Sorties.
   M2, M3 et M6 : migration `20261126180101_collective_creation_credits`, à pousser par Sacha.
6. **M4** : le Brief de cadrage et le Plan comptent tous les titres actifs, avec ou sans master.
7. **M7** : la sortie d'un titre reprend la pochette livrée par la Production.
8. **M8** : « Confirmer pour les N titres » sur « Contrats du titre ».
9. **M9** : la page de l'ingénieur nomme le titre (« dossier du mix de Rivage test », vérifié
   sur « Collectif test 27-11 ») ; son en-tête nomme encore le projet.
10. **M10** : sans `?sortie=`, la Distribution ouvre la seule sortie, sinon laisse choisir.
11. **M12** : le « À vous » de la Distribution d'un collectif compte dans le menu et la Vue
    d'ensemble.
12. **Juridique d'un invité** : après « Pas d'accord nécessaire », plus de « Contrat : À créer »,
    et le plan ne crée plus de contrat à signer, donc plus de contrat bloqué au Brief de sortie
    (« Micro test » garde l'action stockée avant la correction) ; le Suivi liste les invités dans
    « Projet ».

**À transmettre à Sacha** : C1 à C16, et C9 bis avec C9.

**À refaire** : un passage avec un collectif Contenu · PDS Mic ; le Juridique jusqu'aux
signatures (attention au SMTP) ; Activations et Suivi & bilan ; vérifier PO depuis le nouvel env.
