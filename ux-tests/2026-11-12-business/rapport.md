# Compte rendu de test utilisateur — PDS OS — module Business et Budget

> **Test réalisé avec des participants simulés** (3 personas IA exploitables sur 4) le 12/11/2026, sur la stack locale (Docker + `pnpm dev`), avec le jeu `supabase/preprod/showcase-business.sql`.
> Ces résultats identifient des frictions probables et des hypothèses solides. Les problèmes de gravité 3 sont à corriger ; la satisfaction est à confirmer avec Glen, Thibault et Ibé.

## En 30 secondes

**Verdict** : le négociateur tient ses deals sans aide (Malik 5/5, vérifié en base). Mais dès qu'on sort du chemin prévu, l'app ne dit ni pourquoi ni à qui s'adresser (Élise 1/4). Et la direction valide et pilote le budget sans être sûre de ce qu'elle fait (Claire 4/4, SEQ 4,2).

**À corriger en premier**

1. **Ouvrir un deal quand on négocie** : 3/4, Élise. Un business developer ne peut pas ouvrir de négociation, rien ne le lui dit, et il finit par créer un doublon de l'artiste dans le Réseau.
2. **Valider un accord en confiance** : 3/4, Claire. Il faut choisir entre deux demandes quasi identiques sur l'accueil, puis valider en un clic sans récapitulatif ni retour visible.
3. **Lire le budget d'un artiste** : 3/4, Claire. « Dépenses » ne montre aucun reste, le reste négatif n'est pas expliqué, et « prévoir 5 000 € » hésite entre l'enveloppe et un poste.

**Ce qui fonctionne bien**

- L'accueil du négociateur dit tout de suite quoi faire : Malik y a lu sa relance en retard et son call en 10 secondes (SEQ 7).
- Les termes d'un deal se notent proprement : contre-proposition, confirmé, le bon état choisi du premier coup, et la saisie a survécu à une interruption.
- Avant de valider, Claire a trouvé les chiffres négociés sur la même page (« Voir les chiffres négociés juste avant de valider »).

## Indicateurs

| Persona | Tâche                                                         | Réussite réelle (base)                                  | SEQ |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------- | --- |
| Malik   | T1 accueil, quoi faire aujourd'hui                            | ✓                                                       | 7   |
| Malik   | T2 noter l'appel (royalties 20 %, avance OK, rappel vendredi) | ✓ (`counter_proposal` 20 %, relance 13/11)              | 4   |
| Malik   | T3 heure du call et téléphone de la manageuse                 | ✓                                                       | 5   |
| Malik   | T4 accord oral Lila Vega à faire valider                      | ✓ (45 % / 10 000 € confirmés, accord `pending`)         | 5   |
| Malik   | T5 taxi 120 €                                                 | ✓ (ligne Transport 120 €)                               | 5   |
| Élise   | T1 ouvrir une négociation (Kaya Mendès)                       | ✗ impossible par droits, non expliqué                   | 2   |
| Élise   | T2 l'accord de Nahel Nuit est-il validé ?                     | ✓                                                       | 6   |
| Élise   | T3 téléphone d'un contact privé                               | ✗ masqué (attendu), mais affiché « non renseigné »      | 3   |
| Élise   | T4 reprendre un deal abandonné                                | ✗ abandon, aucune issue                                 | 2   |
| Claire  | T1 valider l'accord de Nahel Nuit                             | ✓ (`validated`)                                         | 5   |
| Claire  | T2 confier Lila Vega à Élise                                  | ✓ (affectée à Élise)                                    | 4   |
| Claire  | T3 reste du budget de Mona Lys, +5 000 € coaching             | ✓ (poste coaching 5 000 €, enveloppe portée à 45 000 €) | 3   |
| Claire  | T4 récapitulatif de l'accord Mako Rouge                       | ✓ (PDF du deal memo exporté)                            | 5   |

Aucun faux succès : chaque testeur qui pensait avoir réussi avait réellement enregistré.

**SUS moyen : 53/100** (référence 68), indicatif sur 3 participants simulés : Malik 65, Élise 48, Claire 48. Les notes décrochent chez les deux profils éloignés du chemin heureux, Élise qui se heurte aux droits et Claire qui doute après chaque geste.

## Problèmes observés

Notés par deux évaluateurs indépendants, qui ont donné la même note aux 13 problèmes.

### P1 — Un négociateur ne peut pas ouvrir de négociation, et rien ne le lui dit

- **Gravité** : 3/4 (3 et 3). **Persona touchée** : Élise (1/3).
- **Où** : page Deals, Artistes, fiche contact (T1).
- **Ce qui se passe** : Élise cherche un bouton dans Deals, Artistes, puis le Réseau. Elle crée Kaya Mendès comme contact du Réseau, en doublon de l'artiste déjà au catalogue qu'elle n'a pas vue parmi les 40, puis s'arrête.
- **Verbatims** : « Ah, donc je peux pas ? Ok mais dis-le moi. » ; « C'est qui qui décide ça ? »
- **Cause** :
  - `create_deal` n'autorise que la direction ou le responsable du projet ;
  - la page cache simplement le bouton quand on n'a pas ce droit (`app/(app)/app/deals/page.tsx:78`, `action={options && <NewDealButton …/>}`).
- **Recommandation** :
  - **à trancher avec Ibé** : un business developer (Thibault) ouvre-t-il ses propres pistes ? Le ticket parle de deals « confiés » à Glen et de développement commercial pour Thibault ;
  - si non : garder un « Nouveau deal » pour qui négocie, qui ouvre une courte modale « Un deal s'ouvre par la direction » avec « Demander à Claire Morel » (une notification), plutôt qu'un bouton absent.
- **Type** : utilisabilité, avec une règle métier à trancher.

### P5 — Valider un accord : deux demandes semblables, un clic sans récapitulatif, retour peu visible

- **Gravité** : 3/4 (3 et 3). **Persona touchée** : Claire (1/3).
- **Où** : accueil, puis fiche du deal de Nahel Nuit (T1).
- **Ce qui se passe** : deux lignes « Valider l'accord de principe », une grande carte et une petite ligne, se distinguent seulement par le nom de l'artiste. Le bouton valide immédiatement. Le toast « Accord de principe validé. » existe, mais il passe inaperçu pendant le rechargement.
- **Verbatims** : « Je ne voudrais pas valider la mauvaise. » ; « Est-ce que c'est enregistré, là ? »
- **Cause** :
  - `components/deals/deal-now-actions.tsx:93-96` : `run(() => decideDealAgreement(deal.id, true))`, sans rien à relire dans le bloc « Maintenant » ;
  - confirmation par toast seulement (`components/shell/module/result-banner.tsx:76-78`).
- **Recommandation** :
  - dans « Maintenant », afficher au-dessus du bouton les termes confirmés sur une ligne (« 40 % du master · 20 % de royalties · cachet 8 000 € HT »). C'est le récapitulatif à valider, sans ajouter de confirmation ;
  - après validation, garder un état visible en tête (« Accord validé par vous, le 12/11 ») ;
  - sur l'accueil, mettre l'artiste en tête du libellé (« Nahel Nuit · accord à valider »).
- **Type** : utilisabilité.

### P7 — Le budget d'un artiste : introuvable depuis « Dépenses », reste négatif inexpliqué, « prévoir » ambigu

- **Gravité** : 3/4 (3 et 3). **Persona touchée** : Claire (1/3).
- **Où** : `/app/expenses`, puis l'onglet Business de Mona Lys (T3).
- **Ce qui se passe** :
  - « Dépenses » liste des lignes sans reste ; Claire revient en arrière jusqu'à la fiche de l'artiste ;
  - elle y lit « Reste −7 178 € » sur 40 000 €. L'enveloppe compte aussi les dépenses des projets de l'artiste (« Minuit pile », environ 46 000 €), ce que le petit texte « … en direct, … par ses projets » ne lui a pas fait comprendre ;
  - pour « prévoir 5 000 € de chant », elle augmente à la fois l'enveloppe et un poste.
- **Verbatims** : « Ce n'est pas ça, je ne vois pas ce qui reste. » ; « Moins 7 178 euros ? Le budget est déjà dépassé. » ; « Je crois que c'est bon, mais je ne suis pas sûre d'avoir bien fait. »
- **Cause** :
  - `app/(app)/app/expenses/page.tsx` ne montre ni l'enveloppe ni un lien vers elle ;
  - la répartition directe / projets n'est qu'un indice sous la tuile (`lib/i18n/fr/artist-budget.ts:23`, `spentHint`) ;
  - le formulaire d'enveloppe met côte à côte le total et les postes (`components/budget/envelope/envelope-form.tsx`).
- **Recommandation** :
  - quand « Dépenses » est filtrée sur un artiste, afficher sa tuile d'enveloppe (Enveloppe / Dépensé / Reste) avec un lien ;
  - écrire le dépensé en deux chiffres visibles (« 900 € en direct · 46 278 € par ses projets ») ;
  - dans le formulaire, dire ce qu'un poste change au total (« Le total se met à jour avec les postes »), ou calculer le total.
  - **Jeu de test** : l'enveloppe de 40 000 € de `showcase-business.sql` est plus petite que les dépenses déjà au projet. Il faut la porter à environ 60 000 € pour montrer un cas normal.
- **Type** : utilisabilité et contenu.

### P2 — Contact privé : les coordonnées masquées s'affichent « non renseigné »

- **Gravité** : 2/4 (2 et 2). **Persona touchée** : Élise (T3).
- **Ce qui se passe** : sous l'encadré « Coordonnées privées · Malik Durand les partage deal par deal », l'e-mail, le téléphone et la ville affichent « non renseigné » alors qu'ils sont remplis. Aucun moyen de demander le partage.
- **Cause** : `components/network/contact-coordinates.tsx:35-66`. La `FactList` est rendue même quand `contact.privacy.hidden`, avec `emptyLabel` « non renseigné ».
- **Recommandation** : quand les coordonnées sont masquées, ne pas afficher ces lignes, ou les remplacer par « Privé ». Ajouter un lien vers la fiche de la propriétaire, ou un bouton « Demander à Malik Durand ».
- **Type** : bug d'affichage. C'est le texte qui ment, pas les droits.

### P3 — Un deal abandonné est une impasse sans explication

- **Gravité** : 2/4 (2 et 2). **Persona touchée** : Élise (T4).
- **Cause** : l'abandon est définitif par conception (« il ne change plus ensuite », `lib/i18n/fr/deals.ts:207`). La page d'un deal abandonné n'a plus aucune action et ne le dit pas.
- **Recommandation** :
  - une ligne dans « Maintenant » : « Deal clos. Pour reprendre, la direction ouvre un nouveau deal pour Rivo Blanc » ;
  - pour la direction, un bouton « Ouvrir un nouveau deal » prérempli ;
  - à trancher : faut-il plutôt rouvrir le deal ?
- **Type** : utilisabilité.

### P4 — Soumettre un accord : deux boutons enchaînés, sans savoir si la direction est prévenue

- **Gravité** : 2/4. **Persona touchée** : Malik (T4).
- **Cause** : depuis « Call prévu », « Maintenant » ne propose que l'étape suivante (`components/deals/deal-now-actions.tsx:105-112`). Passer directement à l'accord n'existe que dans « Changer d'étape ».
- **Recommandation** :
  - proposer « Proposer l'accord de principe » dès « Call prévu » quand des termes sont confirmés ;
  - après, afficher « Claire Morel est prévenue » (`decideWhy` existe déjà côté direction).

### P6 — Changer de négociateur : l'action est en bas de page

- **Gravité** : 2/4. **Persona touchée** : Claire (T2).
- **Cause** : le bloc « Négocié par · Changer » (`DealInfo`) est l'avant-dernière section de la page (`app/(app)/app/deals/[dealId]/page.tsx:134`).
- **Recommandation** :
  - afficher « Négocié par Malik Durand · Changer » sous le titre, à côté de l'étape ;
  - une délégation temporaire (« pendant les vacances ») n'est pas demandée par le ticket : à noter, sans la construire.

### P8 — Prochaine action : deux dates pour une seule intention

- **Gravité** : 2/4. **Persona touché** : Malik (T2).
- **Cause** : le formulaire demande « Pour le » et « Relancer le » (`components/deals/deal-next-action.tsx:62-75`). La date tombée sur 06/11 vient probablement de la saisie dans le champ date natif.
- **Recommandation** : une seule date (« Pour le »), et la relance calculée en reprend la valeur par défaut. Garder « Relancer le » en option repliée, si Ibé en a besoin.

### P10 — L'heure du call et le téléphone du contact sont tout en bas de la fiche

- **Gravité** : 2/4. **Persona touché** : Malik (T3).
- **Cause** : la prochaine action n'affiche qu'un jour (`formatDay`, `deal-next-action.tsx:98`) ; l'heure est dans « Calls » et le téléphone dans « Contacts », en fin de page.
- **Recommandation** :
  - quand la prochaine action est un call, afficher sa date et son heure (« Dim. 15/11 à 12 h ») ;
  - dans « Maintenant », afficher le contact principal avec son téléphone cliquable.

### P11 — Dépense avancée de sa poche : pas de remboursement, « Sans justificatif » inexpliqué

- **Gravité** : 2/4. **Persona touché** : Malik (T5).
- **Recommandation** :
  - **à trancher avec Ibé** : les notes de frais d'un membre entrent-elles dans Dépenses ?
  - à défaut, une infobulle sur « Sans justificatif » (« Ajoutez la facture ou le reçu »).

### P9, P12, P13 — Mineurs (1/4)

- **P9** : le toast « Terme enregistré » s'affiche avant la nouvelle valeur. Probablement la lenteur du serveur de développement, à revérifier en `pnpm start`.
- **P12** : lenteurs (un clic sans effet visible, export PDF long). La machine était très chargée (charge 27 à 37) : à juger en `pnpm start` ou sur la pré-prod, pas ici.
- **P13** : la fenêtre de bienvenue de la première connexion absorbe un clic. Un seul passage par compte.

### Constats de l'analyste (hors sessions)

- Après l'accord de Lila Vega, sa prochaine action est restée « Premier call avec son manager » : changer d'étape ne propose pas de la mettre à jour.

## Regard par persona

| Persona        | Profil                                                | Réussites réelles | SEQ moyen | SUS | En un mot      |
| -------------- | ----------------------------------------------------- | ----------------- | --------- | --- | -------------- |
| Malik, 38 ans  | business manager, aisance 3, pressé, 1366×768         | 5/5               | 5,2       | 65  | « Correct »    |
| Élise, 27 ans  | business developer, aisance 4, exploratrice, 1440×900 | 1/4               | 3,2       | 48  | « Verrouillé » |
| Claire, 56 ans | DG, aisance 2, prudente, lit tout, 1280×800           | 4/4               | 4,2       | 48  | « Prudent »    |

- **Malik** : sur le chemin prévu, ça marche. Ses doutes portent toujours sur la même question : « est-ce que c'est passé, et est-ce que Claire le sait ? ».
- **Élise** : chacun de ses trois blocages vient d'une règle juste (droits, confidentialité, abandon définitif) que l'écran ne formule pas. Elle ne conteste pas les règles, elle demande qu'on les lui dise.
- **Claire** : elle réussit tout, mais avec 37 actions sur 4 tâches, et doute après chaque geste qui engage (valider, budget). C'est le profil de la vraie direction.

## Accessibilité

La session clavier et lecteur d'écran (Lina, cheffe de projet) **n'a pas eu lieu**. Au changement de compte, le serveur `pnpm dev` a cessé de répondre : plus de 110 s même pour `/favicon.ico`, processus vivant mais inactif, environ 400 connexions ouvertes. Aucune conclusion d'accessibilité n'est donc tirée de ce test. À rejouer une fois le serveur relancé.

## Réponses aux questions de recherche

1. **Le négociateur sait-il quoi faire en arrivant ?** Oui : l'accueil de Malik montre la relance en retard et le call, sans scroller.
2. **Peut-on noter un appel sans se tromper d'état ?** Oui pour les termes (bon état du premier coup). Moins pour les dates : deux champs pour une intention (P8).
3. **La direction valide-t-elle en confiance ?** Elle valide juste, mais sans confiance : pas de récapitulatif au geste, retour fugace (P5).
4. **Les règles de droits sont-elles compréhensibles quand on s'y heurte ?** Non : elles sont respectées mais muettes (P1, P2, P3).
5. **Saisir et suivre une dépense est-il évident ?** La saisie oui (Malik). Le suivi par rapport à l'enveloppe non (P7). Le parcours au clavier n'est pas testé.

## Méthode et limites

- **Testé** : Deals, fiche d'un deal (termes, prochaine action, étapes, accord, affectation, calls, contacts, deal memo et PDF), Réseau (contact privé), Dépenses, onglet Business et enveloppe.
- **Non testé** :
  - réception des notifications ;
  - Google Meet ;
  - la session de Lina : parcours de la cheffe de projet, clavier, lecteur d'écran.
- **Personas** : 3 rôles (business manager, business, DG). Les deux pôles de chaque facette sont couverts, sauf l'auto-efficacité basse, couverte par Claire seule. Pas de mobile : outil desktop-first.
- **Hypothèses** :
  - connexion par la barre « Voir comme » de la pré-prod, absente pour les vrais utilisateurs ;
  - en T3, le montant que j'attendais (39 220 €) était faux : l'enveloppe inclut les projets, et le −7 178 € lu par Claire est correct.
- **Sessions écartées** : Lina (serveur bloqué, `sessions/lina.json.ecartee`).
- **Limites des participants simulés** : plus positifs, plus homogènes et plus efficaces que de vrais utilisateurs. Glen et Thibault restent à faire passer sur P1, P4 et P8.

## Prochaines étapes suggérées

1. Corriger P2 (bug d'affichage, une condition) et P5 / P7 (récapitulatif avant validation, budget lisible depuis Dépenses).
2. Trancher avec Ibé : qui ouvre un deal (P1), reprise d'un deal abandonné (P3), notes de frais des membres (P11).
3. Relancer `pnpm dev`, puis rejouer la session de Lina (clavier et lecteur d'écran, Dépenses et suivi d'une négo par la cheffe de projet).
4. Porter l'enveloppe du jeu `showcase-business.sql` à environ 60 000 €.
5. Faire passer Glen sur T2 à T4 de Malik, et Thibault sur T1 et T3 d'Élise.

## Nettoyage de l'environnement

- **Comptes créés pour le test** : aucun. Malik Durand et Élise Fabre viennent du jeu `showcase-business.sql`, le même qu'en pré-prod.
- **Données créées par les testeurs** :
  - le contact « Kaya Mendès » (Élise) : **supprimé** et vérifié ;
  - les gestes de Malik et Claire sur les deals et l'enveloppe, le taxi de 120 € : **conservés** dans la base locale.
- **Jeu Business local** : **conservé volontairement**. C'est le jeu de la pré-prod, dont la session de Lina a besoin. Le retirer demanderait de supprimer deux comptes dont le journal d'appartenance est immuable. Pour repartir de zéro en local : `supabase db reset` (rejoue migrations et seed ; à faire seulement si on accepte de perdre les autres données locales).
- **Fichier de secrets** : supprimé (aucun mot de passe n'a été écrit).
- **PDF téléchargé par Claire** (deal memo de Mako Rouge) : dans le dossier Téléchargements de Chrome, à supprimer à la main.

## Annexes

- Plan de test : `plan.md` ; carte de l'app : `carte-app.md`
- Fiches personas : `personas/`
- Journaux de session : `sessions/`
- Cotations de gravité : `evaluations/` (problèmes consolidés : `evaluations/problemes.md`)

## Suite : corrections du 12/11/2026 (commit `79b0c855`)

| Problème | Correction                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| P1       | « Ouvrir un deal » sur la page Deals explique qui ouvre un deal (règle gardée, à trancher avec Ibé)                   |
| P2       | Coordonnées masquées absentes, plus de « non renseigné »                                                              |
| P3       | Deal abandonné : « ne se rouvre pas », et « Ouvrir un nouveau deal » pour la direction                                |
| P4       | Accord proposé directement dès « Call prévu » si un terme est confirmé ; « la direction est prévenue »                |
| P5       | Termes confirmés rappelés au-dessus de la validation ; l'accueil nomme l'artiste                                      |
| P6       | « Informations » (Négocié par · Changer) monté sous la prochaine action                                               |
| P7       | Dépenses filtrée sur un artiste montre son enveloppe ; « Dépensé » nomme d'abord la part des projets ; jeu à 60 000 € |
| P8       | Aide sous « Relancer le » (si personne n'a répondu)                                                                   |
| P10      | Prochain call (jour, heure) à côté de la prochaine action ; Contacts avant Calls                                      |

**Non fait :**

- P9, P12 et P13 : liés à l'environnement ;
- P11 : à trancher avec Ibé.
