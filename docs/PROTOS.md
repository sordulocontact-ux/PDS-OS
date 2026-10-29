# Faire un proto de PDS OS

Comment ont été faits les protos du 14/10/2026 (`docs/protos/`), que Sacha a pris comme niveau de
qualité attendu. À lire **avec** `docs/VISION-UX.md` (ce que le proto doit montrer) et
`docs/DESIGN.md` (à quoi il doit ressembler). Le skill global `proto` (`~/.claude/skills/proto`)
renvoie ici pour tout proto de PDS OS.

---

## 1. Ce qu'est un proto ici

**Le produit lui-même, cliquable.** La vraie coquille de PDS OS (barre principale, navigation du
projet, chevrons), les vrais mots de l'app, un projet fil rouge crédible, et des gestes qui font
avancer l'état : on clique « Confirmer la version source » et l'étape se coche, le Brief se
débloque, la personne suivante voit son « À vous ».

Ce n'est **jamais** une page qui décrit des options en cartes, une présentation, des slides ou un
avant/après statique. Le raisonnement va dans la réponse du chat ; l'artefact, lui, se clique.

Un proto sert à **sentir un parcours en jouant chaque rôle**. Il doit donc permettre de changer de
personne et de sauter aux moments importants, sans tout recliquer.

## 2. Avant d'écrire

1. **Lire** `docs/VISION-UX.md` en entier, puis le doc métier du module (`PRODUCTION-METIER.md`,
   `CONTEXTE-PROJET.md`, la section de `ARCHITECTURE.md`).
2. **Relever ce que l'app fait déjà**, dans le code, avant d'inventer. Exemple qui a coûté une
   correction : l'étape Source du Master *détecte* la dernière version audio et la fait
   *confirmer ou changer* dans une liste (`components/master-workflow/confirm-source-button.tsx`) ;
   le proto en avait fait un champ texte. Lire les composants de l'écran en jeu et leurs textes
   (`lib/i18n/fr/<domaine>.ts`) : le proto dit **les mêmes mots** (« Mix V1 attendu le », pas
   « Mix V1 »).
3. **Partir d'un proto existant** : copier `docs/protos/pds-app.html` (toute l'application) ou
   `docs/protos/production.html`, et le faire évoluer. Ne pas repartir d'une page blanche : la
   coquille, les tokens, le moteur d'état et la barre du proto y sont déjà justes.
4. Charger le skill `design-engineer` (règle de la config de Sacha pour toute interface).

## 3. Forme technique

- **Un seul fichier HTML autonome**, sans dépendance : CSS et JS en ligne, icônes en SVG en ligne
  (trait fin, style Nucleo, **jamais Lucide**), seule ressource externe la police Google Sans Flex
  (Google Fonts, graisses 500/600/700, repli système). Il s'ouvre hors ligne et s'envoie par
  WhatsApp.
- **Tokens recopiés de `app/globals.css`** dans `:root` (surfaces, textes, bordures, sélection,
  tons d'état info/warn/ok/bad/act), et **thème sombre** : même bloc sous
  `@media (prefers-color-scheme: dark)` (garde `:root:not([data-theme="light"])`) et sous
  `:root[data-theme="dark"]`. Aucune couleur en dur dans les composants.
- **Typo** : medium (500) minimum, 16 px courant, 14 px au plus petit (13 px seulement pour les
  sources et pastilles), `letter-spacing` négatif comme l'app, `text-wrap: balance` sur les titres.

### Le moteur (le reprendre tel quel)

```js
// Personnes : comptes de PDS (where:"app") ou externes par lien privé (where:"lien").
const P = { dg:{name:"Claire Morel", role:"Directrice générale", ini:"CM", where:"app"},
            mix:{name:"Karim Haddou", role:"Ingénieur mix et mastering", where:"lien",
                 link:"/m/", place:"Son dossier du master"}, … };

// Workflows et étapes : tout le parcours est de la donnée.
wf("master","Master","workflows",[
  {id:"m1", title:"Source", why:"La version de départ du mix…", owner:"cp", validator:null,
   prereq:["p1"],                                   // peut pointer vers un autre module
   facts:[["Version source","Néons_maquette_v3.wav","v3 · dernière version détectée · 02/10","src"]],
   acts:[A("cp","Confirmer la version source","Version source confirmée")]},
  …]);
// A(by, label, done, alt) : qui fait le geste, le bouton, le résultat écrit, et les issues
// alt:[{label:"Refuser", note:"…", reopen:"l1"}] (motif obligatoire, renvoi à une autre étape).
// Options d'étape : readonly (décision sur pièce), intro, missing (ce qui n'est pas connu),
// po (encadré PO), reopenLabel (« Répondre et transmettre à nouveau »).
// 4e élément d'un fait : une clé de CHOICE (fichier, personne : liste) ou "date" (champ date).

// État : un seul objet, ce que les gens ont fait. Jamais un statut.
S = {role, view, wf, sel, ph:{stepId: nombre d'actions faites}, notes, log, flash, edits, …};
// Dérivés, recalculés à chaque rendu : statusOf, actorOf, myOpen, othersOpen, wfStatus.
// render() redessine toute l'app depuis S ; un seul écouteur de clic délégué sur [data-act].
```

Conséquence voulue : **ajouter une étape, c'est ajouter une ligne de données**, et l'Accueil, le
Travail, les Validations, les pastilles et les cartes de la Vue d'ensemble suivent seuls, comme
dans l'app (`docs/VISION-UX.md` § 3, « Une seule source »).

### La barre du proto

En bas, au centre, en verre sombre, pour qu'on ne la confonde jamais avec l'app. C'est la seule
partie qui n'est pas le produit :

- **Voir comme** : chaque rôle, les externes marqués « (lien) ». Passer à un externe remplace l'app
  par **sa page à lui** (lien privé), pas par l'app vue autrement.
- **Aller à** : 4 à 5 moments du parcours (« Le projet est à créer », « Cadrage : Brief en
  validation », « Plan lancé : workflows en cours », « Six semaines avant la sortie »), construits
  en marquant des étapes comme faites.
- **Recommencer**.

### Données

Un projet fil rouge, cohérent partout : « Néons » de Mona Lys, single, sortie le Sam. 05/12/2026,
25 000 € HT dont 18 000 € de clip, master final le Sam. 21/11/2026, l'équipe Claire Morel (DG),
Lina Haddad (cheffe de projet), Nadia Benali (directrice créative), Tom Mercier (chargé de
production), Karim Haddou (mix et mastering), Studio Ressac (société de production), Sami Kader
(co-auteur). Pas de lorem ipsum, pas de « Projet A ». Les dates ont leur jour de la semaine
juste, et les dates calculées suivent la règle du code (Mix V1 = master final − 6 jours, etc.).

## 4. Plancher de qualité

- Mobile à **390 px sans défilement horizontal** (les navigations se replient, la mise en page
  passe sur une colonne), thème sombre lisible, focus visible, vrais `<button>`, `aria-label` sur
  les boutons d'icône, `aria-pressed` sur les bascules, cibles de 32 à 44 px.
- Survol seulement sous `@media (hover: hover) and (pointer: fine)` ; mouvement réduit respecté.
- Presque pas d'animation : l'enfoncement du bouton (`scale(.97)`), le toast. Rien sur la
  navigation, utilisée des dizaines de fois par jour.
- **Le proto montre l'application finale.** Aucune note de chantier à l'écran (« dépend du
  branchement de l'e-mail », « point à trancher », « à décider avec le label ») : on dessine
  comme si tout était branché et tranché. Ces réserves vont dans la réponse et dans `docs/`.
  Seuls les boutons qui simulent l'extérieur (« Proto : faire arriver leur réponse ») portent
  le style de la barre du proto. *(Sacha 17/10)*
- Chaque étape montre ses états : faite, en cours pour moi, en cours pour un autre (« En attente
  de… »), verrouillée, renvoyée avec motif. Chaque formulaire a son erreur (motif manquant, date
  hors ordre), affichée au premier essai, jamais avant.

## 5. Tester avant de montrer

Les tests sont dans `docs/protos/tests/`, en playwright-core avec le Chrome installé, sans
interface. Depuis la racine du dépôt :

```bash
node docs/protos/tests/app.cjs          # tout le parcours en changeant de rôle, mobile, erreurs
node docs/protos/tests/acceptation.cjs  # acceptation : tout visible, précision avec motif, aller-retour
node docs/protos/tests/source.cjs       # Source : choisir une version, écouter, importer
node docs/protos/tests/dates.cjs        # dates du Brief : champ date, ordre refusé, « Modifié par »
node docs/protos/tests/audio.cjs        # mixeur : dépôt audio (PDF refusé), écoute, retour avec motif, V2, master
node docs/protos/tests/legal.cjs        # Cadrage juridique : question, réponse, « Ce que PO a compris », retirer
node docs/protos/tests/mixer-package.cjs # dossier du mixeur : aperçu, tarifs exclus, lien affiché une fois, relance
node docs/protos/tests/production.cjs   # proto Production, interne et externe
node docs/protos/tests/production-v2.cjs # externe selon Ibé (15/10) : rôles, devis versionné, lieu remplacé, décisions, blocages, contrôle, livraison
node docs/protos/tests/distribution.cjs  # Distribution : paramètres, contrôles, V1 refusée, corrections de The Orchard, plateformes, clôture avec réserves (PROTO=… pour une copie)
node docs/protos/tests/marketing.cjs     # Marketing complet : Stratégie, Conception, Production, Activations, Suivi & bilan jusqu'à la clôture
node docs/protos/tests/accueil.cjs       # Accueil (29/10) : quatre rôles, moments, valider puis voir l'accueil suivant, motif obligatoire, mobile, sombre
node docs/protos/tests/projet.cjs        # Projet complet : Cadrage puis Master, Juridique, Marketing, Distribution dans une seule coquille, moments du projet, rôles, pages privées réunies
```

Chaque test finit par `errors: []` (aucune erreur JavaScript) et le mobile par
`scrollWidth: 390`. Les captures vont dans `$TMPDIR/pds-protos`. Pour un nouveau parcours, écrire
son test sur le même modèle **et le relancer avec les autres** : une retouche casse souvent un
autre rôle. Le Chrome piloté par MCP ne sert pas ici ; ces scripts suffisent.

## 6. Publier et itérer

1. Publier avec l'outil `Artifact`, depuis un fichier du scratchpad. Une retouche **republie le même
   fichier** (même adresse).
2. Les artefacts ne s'ouvrent que dans l'organisation Unowhy : **Ibé ne peut pas les voir**.
   Recopier chaque version dans `~/Desktop/Protos PDS OS/` (« PDS OS - toute l'application.html »,
   « PDS OS - Production.html ») pour que Sacha la lui envoie. Ne jamais mettre un proto en ligne
   publiquement sans que Sacha le demande.
3. Une fois validé, **recopier le fichier dans `docs/protos/`** : c'est la référence suivante.
4. Sacha teste et envoie des captures en demandant « c'est normal ? ». Répondre franchement (non,
   si ce n'est pas ce que fait l'app ou ce que dit la vision), puis **corriger la règle partout
   où elle s'applique**, pas seulement sur l'écran montré (le choix d'un fichier a aussi corrigé
   le choix des personnes du Brief). Ajouter la règle à `docs/VISION-UX.md` si elle est nouvelle.
5. Dans la réponse : le lien, ce que le proto montre (par rôle), les choix faits faute de réponse
   (et signalés dans le proto), ce qui n'est pas cliquable et pourquoi.

## 7. Du proto au code

Quand Sacha dit « code-le pareil que le proto », le proto devient la spécification : mêmes
étapes, mêmes mots, même ordre, mêmes règles d'issues. Les statuts calculés en SQL ou en TS
(jamais stockés), les décisions par fonctions SQL, les composants existants d'abord
(`docs/COMPOSANTS.md`). Exemple livré : la Production (`components/production/journey/`,
`lib/production/journey/`).


## 6. Le proto « Projet complet » (`docs/protos/projet.html`, 18/10/2026)

Le parcours global du projet, construit en réunissant les protos existants plutôt qu'en les recopiant :
`marketing.html` (qui porte aussi le **Cadrage** : démarrer, les 6 dimensions, le Brief de cadrage validé par
la direction, le Plan du projet), `master-v2.html`, `juridique-v2.html` et `distribution.html`.

- **Une coquille** : navigation du projet (Vue d'ensemble, Cadrage, Master, Juridique, Marketing,
  Distribution, Travail, Validations, Activité), un « Voir comme » et un « Aller à » communs (moments du projet,
  puis moments de chaque workflow). Avant « Lancer le plan », les workflows sont verrouillés.
- **Chaque workflow garde son moteur** : son script est enveloppé dans une fonction `MOD_<nom>(api)` qui reçoit
  ses écouteurs (`api.on`), ses commandes de proto cachées (`api.el`) et prévient la coquille quand il se
  redessine (`api.changed`). Un clic est routé vers le workflow dont la zone (`data-mod`) le contient.
- **Une page privée par personne** : les cartes de chaque workflow qui lui demande quelque chose, sous un seul
  en-tête (Mona Lys voit son écoute du Master et sa répartition du Juridique).
- **Un seul design system** : le CSS du Marketing fait foi ; d'un autre proto, on ne garde que les règles dont le
  sélecteur n'existe pas dans ce socle, limitées à sa zone.
- **Les cartes en double prennent la meilleure version** : choix de départ en cartes cliquables avec
  « Recommandé » et sa raison ; préparation d'un call (participants en pastilles, date, heure, format, ordre du
  jour modifiable et déplaçable, récapitulatif avant création) partout : Cadrage, Stratégie, Conception,
  Production, Master.
