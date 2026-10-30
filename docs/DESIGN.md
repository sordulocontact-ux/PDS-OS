# DESIGN.md

Design system de PDS OS, reconstruit section par section. Ce fichier fait foi pour
l'apparence de l'interface. Une section absente = pas encore décidée : demander, ne pas
inventer.

---

## 1. Icônes

### Famille

**Nucleo Sharp**, et uniquement elle. Angles vifs, extrémités de trait carrées
(`strokeLinecap="square"`), jonctions en onglet, trait de 2 px dessiné sur une grille de
24 × 24. Aucune autre famille ne se mélange avec elle.

`lucide-react` a été retiré. Piège : `components.json` déclare encore
`"iconLibrary": "lucide"`, donc un composant ajouté par `shadcn add` arrive avec des
imports Lucide : les remplacer avant de commiter.

### Où prendre une icône

1. **Dans `nucleo-sharp-essential`** d'abord.
2. **Sinon, dans `components/icons/`** : icônes dessinées par nous dans le même style,
   exportées par `components/icons/index.ts` (`import { IconCopy } from "@/components/icons"`).
3. **Absente des deux** : la dessiner dans `components/icons/`, un fichier par icône,
   en réutilisant le composant `Icon` de Nucleo et le groupe `SharpStroke`
   (`components/icons/sharp-stroke.tsx`) : grille 24, trait de 2, bouts carrés,
   jonctions en onglet, tracés alignés sur des coordonnées entières, marge de 2 à 3
   unités au bord. Jamais de SVG copié d'une autre famille.

### Paquet

- **Aujourd'hui : `nucleo-sharp-essential`** (npm public, gratuit, ~180 icônes, 24 px).
  Choisir d'abord dans ce jeu ; la liste est dans
  `node_modules/nucleo-sharp-essential/dist/components/`.
- Plus tard, peut-être : `nucleo-sharp` (paquet complet, licence payante, clé dans
  `NUCLEO_LICENSE_KEY`, jamais commitée). Le jeu gratuit en est un extrait : le
  passage ne devrait changer que le chemin d'import (à vérifier le moment venu).

```tsx
import { IconCheck } from "nucleo-sharp-essential";
```

### Licence : 250 icônes par projet

La licence Nucleo autorise **250 icônes différentes au plus par projet**, et interdit de
redistribuer les SVG. Avant d'introduire une nouvelle icône, vérifier qu'une icône déjà
utilisée ne fait pas l'affaire.

### Tailles

Taille réglée par classe Tailwind, jamais par la prop `size` :

| Usage                                   | Classe   |
| --------------------------------------- | -------- |
| Dans une ligne de texte, un badge       | `size-4` |
| Bouton, champ                           | `size-5` |
| Navigation (barre latérale, tiroir)     | `size-6` |
| Icône isolée, état vide                 | `size-6` |

Le trait est fixé à 2 dans la grille de 24 : il s'affine avec la taille (1,33 px à
`size-4`). C'est voulu, ne pas le compenser.

### Couleur

Les icônes sont en `currentColor` : elles prennent la couleur du texte qui les porte.
Jamais de couleur en dur sur une icône ; changer la couleur du parent.

### Rangée de boutons

Quand **trois boutons ou plus** se suivent dans une rangée **dense** (beaucoup d'information,
peu de place), ce sont des **boutons-icônes seuls**, sans texte : icône `size-5`,
`aria-label` et infobulle avec le libellé. Ailleurs (place disponible, action principale),
les boutons gardent leur libellé, sans icône. Décision de Sacha, 24/10/2026.

**Lien privé** (maquette Figma PDS OS, node `229:2257`) : en-tête = icône lien, « Lien privé
de … », pastille d'état ; dessous, l'URL dans une pastille avec son bouton-icône « Copier »
(icône copy), puis « Relancer », « Nouveau lien », « Révoquer l'accès » en texte. Ni
sous-titre ni ligne de dates : seuls « Révoqué le … » ou « Expiré le … » s'affichent.

### Accessibilité

Le composant Nucleo n'ajoute pas `aria-hidden` tout seul :

- icône à côté d'un libellé → `aria-hidden` sur l'icône ;
- icône seule dans un bouton → `aria-hidden` sur l'icône **et** `aria-label` sur le
  bouton, texte tiré de `lib/i18n/fr/`.

---

## 2. Typographie

### Familles

- **Google Sans Flex** pour tout : titres, texte, boutons, tableaux. Licence OFL,
  chargée par `next/font/google` dans `app/layout.tsx` (axe de graisse variable seul).
- **Geist Mono** pour les identifiants, si un écran en a besoin.
- **Sharp Grotesk** est la typo de titre des maquettes Figma, mais elle n'est **pas
  utilisable** : le vault n'en a qu'une version d'essai, sans licence commerciale, et
  PDS OS est un projet client. Si une licence web est achetée, il suffira de changer
  `--font-heading` dans `app/globals.css`.

### Échelle

Tokens dans `app/globals.css` (`--type-*`), classes Tailwind `text-display-*`,
`text-body-*` :

| Usage                                         | Token          | Taille | Graisse |
| --------------------------------------------- | -------------- | ------ | ------- |
| Salutation de l'accueil                       | `display-xl`   | 46 px  | medium  |
| Titre de page                                 | `display-lg`   | 36 px  | medium  |
| Sous-titre de l'accueil                       | `body-xl`      | 22 px  | medium  |
| Texte d'introduction sous le titre, bouton `lg`, champ de recherche | `body-lg` | 18 px | medium |
| Texte courant, cellules et en-têtes de tableau | `body-md`     | 16 px  | medium / semi-bold |
| Ligne secondaire (version d'un master…), libellé d'une carte de l'accueil | `caption` | 14 px | medium |

**Taille : 16 px pour le texte courant, 14 px au plus petit** (hors pastille de
compteur). Échelle agrandie d'un facteur 8/7 le 27/09/2026 à la demande de Sacha (14 → 16,
12 → 14), rapports entre paliers conservés : display 46 / 36 / 28 / 20, chiffres 32 / 22 /
16, texte 22 / 18 / 16 / 15, légende et en-tête de colonne 14, surtitre 13. Les classes
par défaut de Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`…) sont branchées
sur ces paliers dans `app/globals.css` : `text-sm` = 16 px, `text-xs` = 14 px. Ne jamais
écrire une taille en pixels dans un composant.

**Exception 13 px (décision C0 du 18/10/2026, proto « Projet complet »)** : seulement pour
les **sources** (« Catalogue · le 02/10 », sous une valeur), les **libellés de la grille d'une
étape** (Exécute, Prérequis…) et les **pastilles** (`StatusBadge`), via le token
`--type-micro` (13 px, classe `text-micro`), jamais une valeur en dur. Tout autre texte reste à
14 px au moins. Le titre d'un module (h1 de `ModuleHeader`) est à **30 px**
(`--type-display-module`, classe `text-display-module`) ; le titre de l'étape ouverte et de la
carte « Maintenant » à 22 px (`text-figure-lg`).

**Graisse : medium (500) au minimum, partout.** Jamais de regular ni plus léger (demande
de Sacha, 27/09/2026) ; semi-bold (600) et bold (700) si besoin de hiérarchie. `body`
est en medium, et `font-normal` / `font-light` sont ramenés à 500 dans le bloc `@theme`
de `app/globals.css` : une classe héritée de shadcn ne peut pas réintroduire du 400.
La hiérarchie se fait par la taille, la couleur (`--text-secondary`, `--text-tertiary`)
et le semi-bold, pas en allégeant.

Espacement des lettres : **-4 %** sur les titres (`--type-display-tracking`), **-2 %**
sur tout le reste (`--type-body-tracking`). Le -2 % est posé sur **chaque élément**, pas
sur `body` seul : un `em` hérité se fige en pixels à la taille de `body` (un texte de
20 px recevrait l'espacement d'un texte de 14 px).

---

## 3. Couleurs d'état

Un état métier s'affiche dans un `StatusBadge` : pilule, fond pâle, texte foncé. Six
tons sémantiques, et seulement six (`--tone-*` dans `globals.css`) :

| Ton       | Sens                                   | Exemples                                  |
| --------- | -------------------------------------- | ----------------------------------------- |
| `neutral` | rien à faire pour l'instant, ou écarté | étape non commencée, brouillon, sans date |
| `info`    | en cours                               | étape en cours, projet lancé, transcription, sortie prévue |
| `warning` | attend l'action de quelqu'un           | validation attendue, transmis, invité, proposé |
| `success` | fait, en ligne                         | validé, prêt, approuvé, en ligne          |
| `danger`  | bloqué, refusé, en échec               | refusé, échec, en retard, citation introuvable |
| `action`  | une validation attend une décision | étape « À valider », carte « Validations qui m'attendent » |

Le ton `action` est **gris** (fond `--tone-neutral-bg`, texte encre) depuis le 18/10/2026
(décision C0, proto « Projet complet » ; ticket « Architecture globale » d'Ibé : « noir,
blanc, gris, sans violet ») : il garde son nom et son sens, sa pastille ne se distingue plus
par la couleur mais par son libellé (« À valider », « ✦ PO »).

- La correspondance état → ton vit **uniquement** dans `lib/ui/state-tones.ts`. Un écran
  n'écrit jamais une couleur, il passe `tone={…Tone[état]}`.
- Le libellé porte toujours le sens : la couleur ne fait que le renforcer
  (daltonisme, impression).

## 3 bis. Sélection

Le **bleu est l'accent unique de sélection** (décision de Sacha, 27/09/2026) : jeton
`--selection` (#155dfc depuis le 07/10/2026, Figma « Checkbox base » ; #64a2ff avant), avec `--selection-border` (contour) et `--selection-bg` (fond
pâle). Classes Tailwind `accent-selection`, `outline-ring`, `border-ring`. Il habille :

- le **focus** clavier, partout (`--focus-ring` = `--selection`, aussi dans la modale) ;
- un **champ en saisie** (`Input`, `Textarea`, `Select`, saisie de PO) : contour bleu ;
- une **radio** native (`accent-selection`) ;
- une **case à cocher** : toujours le composant `Checkbox` (`components/ui/checkbox.tsx`),
  d'après le Figma « Checkbox base » (49:12665) : 16 px (`sm`, rayon 4) ou 20 px (`md`,
  rayon 6) ; au repos contour `--border-default` sur fond blanc ; survol, focus, cochée ou
  demi-cochée : contour `--selection` et fond `--selection-bg`, coche ou tiret bleu en trait
  arrondi ; désactivée : fond `--surface-soft`, coche grise. Jamais d'`<input
  type="checkbox">` brut ni de case pleine bleue ; la case des menus (`SelectItem
  indicator="checkbox"`) reprend le même dessin (`CheckboxMark`) ;
- une **carte de choix** cochée (`ChoiceCards`, tuile ou non) et une option retenue de la
  Stratégie (`optionClass`) : contour `--selection-border`, fond `--selection-bg`.

À changer dans `app/globals.css` seulement (la modale, en verre clair, garde le même
`--selection-bg`). Ce n'est pas un ton d'état (§ 3) : le bleu `info` reste réservé à
« en cours ». Les pastilles `FilterChip` (filtres, et `ChipChoice` qui s'en sert) restent
en encre pleine : un filtre actif n'est pas une sélection de formulaire.

## 3 ter. Teintes de catégorie

Pour reconnaître d'un coup d'œil une **catégorie** dans un tableau, sans aucune valeur
d'état : l'**étape** d'un projet (Cadrage bleu ciel, Stratégie indigo, Conception rose,
Production orange, Livraison sarcelle, Défense jaune, Bilan ardoise) et son **type**
(Musical violet, Contenu vert tilleul, Événement sable), distincts des étapes puisqu'ils
sont sur la même ligne. Jetons `--hue-<teinte>-bg` / `-fg` (`app/globals.css`), variantes
de `StatusBadge`, correspondance dans `lib/ui/category-hues.ts` seulement.
Le **titre d'une ligne** dans les tableaux du Juridique est aussi une catégorie : un tag dans
une colonne « Titre », une teinte par titre selon sa place dans le projet (`titleHue`). Il
n'est jamais ajouté au sous-titre de la ligne (demande de Sacha, 04/10/2026).

Liste des projets : la colonne « Étape » ne montre **que l'étape** (jamais « En cours »,
« À venir » : cet état se lit sur le projet), ou « Brouillon », « Terminé », ou avant le
lancement le statut de transmission (« Transmis, à accepter »…).

Formulaire long en **blocs titrés** (`FormSection`) : une carte blanche à filet par groupe
(« Le projet », « Informations initiales », « Équipe »), sans la carte dans une modale ou un
panneau latéral.

**Cartes de section** (`sectionCardClass`, `components/ui/section-card.ts`) : fond `bg-card`,
filet `--border-hairline`, `rounded-xl`, marge intérieure 16 px puis 24 px dès `md`. Les
mêmes pour `FormSection` et pour `PageSection card`. Fiche titre (Figma « PDS OS » 1:3,
04/10/2026) : **chaque bloc de chaque onglet est une carte** (y compris la bibliothèque de
l'onglet Fichiers), les tuiles de la Vue d'ensemble restent hors carte.
**Rien d'encadré dans une carte** (demande de Sacha, 04/10/2026) : ni contour, ni carte
imbriquée, ni traits entre les lignes. Les listes y sont des `DataTable` comme partout
(artistes interprètes avec le rôle en pastille et sans numéro, l'ordre n'ayant pas de sens ;
sorties de la Distribution), le dossier du titre une liste sans filet. Les pièces partagées
perdent leur cadre dans une carte par la variante `in-[.section-card]:` (classe posée par
`sectionCardClass`) : `FactList` passe en grille sans contour (faits côte à côte tant que la
largeur le permet), `EmptyNote` en simple ligne grise, le journal sans traits.
**Tuiles qui filtrent** (État du master) : une tuile de chiffres peut être le filtre de sa page
(`StatTiles` `view`) ; active, elle passe à l'encre (contour `foreground`, fond `muted`), comme
une pastille de filtre active, et un nouveau clic la retire.
**Espacements d'un bloc** (`PageSection`, partout) : 2 px entre le titre et sa description,
20 px entre l'en-tête (titre + description) et le contenu.

---

## 3 quater. Thème sombre

Demande de Sacha du 10/10/2026 : toute l'application existe en clair et en sombre.

- **Choix** : menu du compte (pied de la barre latérale) et tiroir mobile, « Thème » :
  **Système** (défaut, suit le réglage de l'ordinateur), Clair, Sombre. `next-themes`
  (déjà installé pour les toasts) pose la classe `.dark` sur `<html>` avant le premier
  affichage, sans éclair blanc. Le choix est une préférence d'affichage du navigateur,
  pas une donnée métier : il reste dans le stockage de `next-themes` (clé `pds-theme`),
  pas dans Supabase. Le changement est instantané (transitions coupées pendant la bascule).
- **Un seul endroit** : le bloc `:root.dark` d'`app/globals.css` redéfinit les tokens
  sémantiques (texte, surfaces, bordures, navigation, tons, teintes, sélection, jauges,
  contrôles, élévation, pont shadcn). **Jamais** la palette `--po-*`, **jamais** un
  composant. Un composant qui lit un token marche dans les deux thèmes ; une couleur brute
  de la palette (`text-ink-800`, `bg-[var(--po-…)]`) ne s'inverse pas : ne pas l'employer
  pour du texte ou un fond (gris moyens `text-grey-400`, points d'état : tolérés, lisibles
  sur les deux fonds).
- **Règles** : plus une surface est haute, plus elle est claire (`--surface-app` #0a0a0a
  → page #0f0f0f → carte #161616 → menu #1c1c1c) ; fonds discrets (doux, creux, survol,
  appuyé) en blanc translucide, lisibles sur la page comme sur une carte ; texte principal
  #ededed, jamais blanc pur ; le bouton principal, l'action définitive et le carré du logo
  passent en clair ; tons d'état et teintes de catégorie en fond sombre teinté **opaque**
  et texte clair (≥ 7:1) ; bleu de sélection éclairci (#3b7bff) pour garder 3:1 sur le
  noir ; ombres plus denses, les filets portent la forme.
- **Modale « verre »** en sombre : le même verre (88 % de `--surface-raised`, donc sombre),
  filet `--border-default` pour se détacher de la page (§ 4, « Modale »).
- Hors périmètre : les PDF exportés (Brief, contrats, bulletin SACEM) restent clairs.

---

## 4. Coquille, surfaces et arrondis

Source : maquette Figma « Desktop - 11 » (accueil) et « Devis Sordulo » nœuds 120:47 /
120:74 (navigation), fichier « Devis Sordulo ».

### Coquille

- Fond de l'application `--surface-app`. La barre latérale est **collée au bord de
  l'écran, pleine hauteur, sans arrondi ni ombre**, un filet `--nav-border` à droite
  (Figma « PDS OS », nœuds 47:12055 dépliée et 47:12047 repliée, 07/10/2026 ; avant :
  carte flottante à 16 px du bord, `--shell-inset` vaut désormais 0). Largeur
  `--nav-width` (218 px) ou `--nav-width-collapsed` (68 px), marge intérieure 8 px.
  `components/shell/sidebar.tsx`.
- En haut, « PDS » dans un carré noir de 60 px arrondi 12 px (`--nav-brand-bg`, masqué
  repliée) et le bouton pour replier / déplier (icône 20 px). Dessous, la navigation
  (`lib/ui/nav-items.ts`) : éléments de 40 px, icône 20 px, fond `--nav-item-active-bg`
  sur la page ouverte, `--nav-item-hover-bg` au survol. Repliée : icônes seules,
  centrées, libellé en `Tooltip`. En bas, sur un filet : l'avatar (initiales) et le nom
  de la personne connectée, qui ouvrent un menu (nom, email, « Envoyer un retour »,
  « Se déconnecter » ; `AccountMenu`), et la cloche ronde à droite, point bleu
  `--nav-unread-dot` s'il y a du non lu. Repliée : la cloche au-dessus de l'avatar
  (absente du Figma replié, gardée pour ne pas perdre les notifications dans un
  projet). Le texte reste en `body-md` (16 px) : le Figma est dessiné à 14 px, avant
  l'agrandissement 8/7 de l'échelle (§ 2).
- Repliée par défaut sur une page d'un projet lancé, dépliée partout ailleurs ; le
  chevron l'inverse pour la visite en cours seulement, rien n'est mémorisé.
- Un item sans page encore reste visible, grisé, non cliquable (`disabled` dans `NavItem`),
  jamais retiré de l'ordre du Figma (le Calendrier l'a été jusqu'au 27/10/2026).
- **Sidebar contextuelle d'un projet lancé** (`components/projects/project-sidebar.tsx`,
  Figma « PDS OS » nœud 47:12056) : 200 px (`--project-nav-width`), contre la barre
  principale repliée, même géométrie (`sticky`, pleine hauteur, filet `--nav-border` à
  droite), **sans arrondi ni marge
  extérieure** (demande de Sacha, 07/10/2026). En haut, sur un filet, le **sélecteur de
  projet** (`ProjectSwitcher`) : le titre et un double chevron ouvrent les projets
  visibles (lus à l'ouverture, ordre de la liste Projets) avec une recherche, comme
  Vercel ou Supabase ; choisir un projet lancé garde la section ouverte (seulement la
  section : un call ou une étape du Juridique n'a pas de sens dans l'autre projet), un
  projet non lancé ouvre sa première page ; « Tous les projets » en pied. Puis les sections en groupes
  titrés (ticket « Architecture globale », 08/10/2026) : **Vue d'ensemble** puis
  **Cadrage**, sans titre de groupe, au-dessus de tous les workflows ; **Workflows**
  (Master, Juridique, Marketing, Distribution, menés en parallèle ; un « ⓘ » donne la légende
  de leurs points de statut, un point gris dit où se lancer) ; **Pilotage** (Travail, Équipe,
  Planning, Budget, Validations, Activité) ; **Ressources** (Calls, Livrables, Fichiers ;
  plus « Production », nom d'une étape du Marketing, test UX du 09/10/2026). Plus rien ne s'appelle « Processus » ni « Workflow ». Liste et groupes :
  `lib/ui/project-sections.ts`. Chaque section a sa page (Marketing = Stratégie,
  Conception, Activations, entrée par la Stratégie ; Distribution = la Sortie ; Master,
  ouvert par son État du master ; Juridique, ouvert par son État des lieux). Sans
  `manage_legal`, le Juridique reste listé, **grisé avec un cadenas** et sa raison, jamais
  un lien (sa page répond toujours 404) ; en onglets, il n'a pas d'onglet.
- **En-tête de module** (`ModuleHeader`, `components/shell/module/`, décision C0 du
  18/10/2026, proto « Projet complet ») : remplace le titre de section (`ProjectPageTitle`, 28 px,
  fil dans le h1) et les chevrons (`SectionSteps`). De haut en bas :
  1. **fil d'Ariane dans la barre du haut** (Figma PDS OS 304:20801, Sacha 29/10/2026) : une barre
     de `--project-bar-height` (55 px, alignée sur la ligne du sélecteur de projet) avec un filet
     dessous, sur toute la largeur de la colonne ; le fil à 24 px du bord, 16 px medium
     `--text-tertiary`, séparateur « / » : « Module / [sous-module /] Étape », **sans le projet**
     (la barre latérale du projet le nomme) ; chaque segment sauf le dernier est un lien, le
     dernier (`aria-current="page"`) en `--text-primary` ;
  2. **pilules des sous-modules**, Marketing seul (Stratégie · Conception · Production ·
     Activations · Suivi & bilan) : pilule 36 px, fond `--surface-soft`, texte
     `--text-secondary` 15 px ; active = encre pleine (`--surface-inverse`) ; sous-module fait =
     rond vert 16 px coché avant le libellé ; compteur « à vous » (rond bleu `--selection`) après ;
  3. **ligne de titre** : h1 du module à **30 px** (`text-display-module`), pastille de statut
     facultative à côté (Distribution), actions à droite (« Qui fait quoi » en `ghost sm`,
     « Ajouter une dépense » du Budget) ;
  4. **ligne de faits** (`ModuleFacts`), seulement quand le module donne les siens (Master,
     Distribution, fiche de Production…) : 15 px `--text-secondary`, valeurs en semi-gras
     `--text-primary` (« Master final **Ven. 20/11/2026** », « Sortie **Sam. 05/12/2026** »), dates
     toujours par `formatDay`. La ligne du projet par défaut (« Néons · Mona Lys · Single »,
     Budget, Responsable, Sortie) n'est plus affichée (Figma 304:20801), ni l'état et les faits de
     la Vue d'ensemble, qui garde son nom seul.
  Le **Master et la Distribution n'ont plus de chevrons** (leurs étapes sont dans le parcours),
  ni le Juridique ni le Cadrage. Le layout du projet rend un en-tête par défaut, tiré de l'URL ;
  une section qui a ses propres faits ou actions rend son `ModuleHeader` en tête de page, et
  celui du layout s'efface (règle et mécanisme : `docs/ARCHITECTURE.md` § 3 ter). Projet non
  lancé : son titre et son type restent l'en-tête.
- **Navigation du projet** (décision C0, construite au lot « coquille ») : celle du proto —
  Vue d'ensemble, Cadrage, **Workflows** (Master, Juridique, Marketing, Distribution),
  **Pilotage** (Travail, Validations, Activité, **Budget**, ticket MKT-S1-15). Équipe, Planning,
  Calls, Livrables et Fichiers sortent de la barre : leurs routes restent, joignables depuis
  leurs étapes. **Mobile** : la navigation du projet en **puces horizontales** défilantes
  au-dessus du contenu. Exception assumée à « une pastille = un filtre » (§ « Onglets et
  filtres ») : ces puces sont des liens de navigation, signalés comme tels (`nav`,
  `aria-current`), jamais mêlées à des filtres sur la même ligne.
- **Patron d'étape** (`JourneySpine`, `StepPanel`, `NowCard`, `docs/VISION-UX.md` § 4) :
  colonne de contenu de **1180 px** au plus, blocs espacés de **20 px** ; parcours et étape
  en grille `[300 px | 1fr]` (écart 24 px, une colonne sous 900 px). Toute l'étape ouverte est
  **dans une carte** (rayon 12, filet `--border-hairline`, padding 20, écart 14). La carte
  « Maintenant » (et toute section « À vous » / tête du Travail) a le filet `--border-default`,
  **sans ombre** (Sacha, 30/10/2026).
- **Sidebar ou onglets : un seul interrupteur**, `DOUBLE_SIDEBAR` dans
  `lib/ui/project-sections.ts` (liste des sections partagée par les deux). `true` : la
  sidebar contextuelle ci-dessus, la barre principale repliée. `false` : une seule
  rangée d'onglets sous l'en-tête (`ProjectTabs`, même `TabBar` que l'artiste et le
  titre), la barre principale garde sa largeur ; Équipe, Activations, Validations et
  Activité n'ont pas d'onglet : listées dans « Aussi dans ce projet » sur la Vue
  d'ensemble, elles allument l'onglet Vue d'ensemble. Jamais les deux à la fois. Sous
  les onglets : le fil des étapes du Workflow ou rien — les filtres appartiennent à la
  page, une pastille veut toujours dire « filtre », jamais « autre page ».
- Ce qui attend quelqu'un se compte dans une pastille noire (`CountBadge`), jamais dans
  un bandeau : notifications non lues sur la cloche de l'en-tête mobile (un point bleu
  sur celle de la barre latérale, Figma), demandes d'accès en attente à droite
  d'« Équipe » (et sur le bouton du menu en mobile).
- Mobile : même navigation (pleine largeur) dans un tiroir blanc, ouvert depuis l'en-tête ;
  la navigation du projet y est la rangée de puces (`ProjectNavChips`, ci-dessus), toutes ses
  entrées (Validations, Activité et Budget compris, pour qu'aucune page ne soit sans accès).
- Barre principale repliée (dans un projet) : le carré **PDS** (40 px, rayon 10) reste
  toujours visible au-dessus du bouton de dépliage ; « Travail » porte le nombre de mes actions
  du projet ouvert (`CountBadge size="sm"` 16 px au coin de l'icône).

### Accueil

- Salutation et sous-titre centrés, puis une colonne de 896 px : suggestions en
  pilules à contour, saisie de PO sur fond teinté `--surface-tint` (micro en carré
  blanc, envoi en carré noir, 32 px), puis le fil de l'accueil (29/10/2026, proto
  `docs/protos/accueil.html`) : « Maintenant » (`WorkLead`, le cadre de `NowFrame`) suivi à
  16 px de « Aussi à vous » (trois lignes), puis à 40 px « Ce que vous attendez » (quatre lignes,
  initiales en disque gris, seul le nom en gras) et « Vos projets » (en-tête Projet, Responsable
  seulement s'il n'est pas toujours la personne, Échéance avec « dans n jours », Pour vous =
  **l'action la plus pressée** en semi-gras, « +n » s'il y en a d'autres, son échéance ou « En
  retard » dessous, et la ligne ouvre ce geste ; sinon « Transmis… » ou « Suivi » en pastille.
  Jamais un compte seul : « 2 à vous » ne disait rien, Sacha 29/10). Une seule colonne, 40 px entre les blocs, plus de grille de cartes.
- Liste de l'accueil (`HomeSection`) : titre `caption` semi-gras gris au-dessus, nombre en gris
  clair, lien souligné à droite ; liste encadrée `--border-default`, rayon 12, filets
  `--border-hairline` entre les lignes ; ligne de 12 × 16 px entièrement cliquable, titre
  `body-md` semi-gras, détail `caption` gris, pastilles puis chevron à droite.
- Sous la salutation, le sous-titre compte ce qui attend la personne (`HomeSummary`) ; la
  phrase « Suivez chaque sortie, du cadrage au bilan » le remplace pendant la lecture.
- Une question ouvre la **page de conversation** (d'après Midday) : en-tête avec retour
  et « + » en boutons carrés à contour, titre centré (la première question, tronquée) ;
  fil de 896 px qui défile seul, saisie teintée collée en bas avec la mention de PO.
- Carte de l'accueil (`ListCard`) : contour `--border-default`, ni fond ni ombre, marge
  intérieure 12 px, libellé `caption` gris, lignes en `body-md` (titre semi-gras, détail
  medium) ; au-delà des lignes montrées, une ligne `caption` grise dit combien il en reste.

### Page Travail

Refonte du 27/10/2026, d'après `docs/VISION-UX.md` § 2 (les cinq questions) :

- `PageHeader` (« Voir le calendrier » en contour à droite), puis **« Maintenant »** : le cadre de
  `NowCard` (`NowFrame`), l'action la plus pressée — « À vous » (+ « En retard », « À valider »),
  « Projet · Module › Étape · avant le Sam. 05/12/2026 », l'action en titre, le pourquoi, une
  ligne « Validation : … · Ensuite : … », le bouton plein « Ouvrir » (le geste, `actionHref`).
  Rien à faire : « Rien à faire pour vous », et la Vue d'ensemble de chaque projet dit qui on
  attend.
- Dessous, onglets **Tout / À faire / À valider**, puis **un tableau** (`DataTable`, Sacha 28/10 :
  « comme Asana, Plane, GitLab ») : **Action** (l'endroit dans le module en dessous, « Mixage »,
  « Production › Pochette »), **Projet** (étiquette à la teinte du projet, `projectHue`, la même que
  dans les Calls et le Calendrier), **Module** (étiquette Cadrage, Marketing, Master, Juridique,
  Distribution à sa teinte fixe, `moduleHue`, dès 1024 px ; « — » pour une tâche libre ou un projet
  à accepter ; un livrable est au Marketing), **Échéance** (jj/mm, rouge en retard), **Validation** (qui valide, dès 1280 px), **État** (À
  faire, À valider, n propositions, statut de transmission). Les lignes sont rangées sous des
  titres de groupe par **échéance** (En retard en rouge, Cette semaine, Plus tard, Sans échéance,
  En attente d'un autre), avec leur nombre et un chevron qui replie le groupe. Sur téléphone :
  Action (projet, module et lieu en dessous) et État ; sous 1024 px, le module repasse sous
  l'action. L'action de « Maintenant » n'y est jamais répétée.

### Calendrier

- Page de la barre principale (27/10/2026), plus un item grisé. `PageHeader` avec **Tout / À
  vous** en pastilles, `CalendarToolbar` comme les Calls (Mois par défaut, Semaine), puis la
  grille : filets `--border-hairline`, jours hors du mois sur `--surface-soft`, aujourd'hui en
  rond d'encre. Une date = une pastille de la **teinte de son projet** (comme un call), 13 px,
  heure en chiffres tabulaires, « Sortie » en semi-gras ; point `--selection` = à vous,
  `--error` = en retard ; jour passé à 70 %. Téléphone : agenda par jour.

- **Travail et Validations d'un projet** (décision C0 du 18/10/2026, proto « Projet
  complet ») : la liste de **mes** actions tirées des parcours (`loadProjectJourneys`, une
  seule source), une ligne par action (« Module › Étape », pour quand) ; Validations = les
  mêmes, filtrées par le **type d'action** `validate` de l'acteur (`JourneyActor.kind`),
  jamais par le verbe du libellé. Ni tâches à part, ni tableau de bord.

### Onglets et filtres de liste

- **Onglets soulignés** (`TabBar`, `components/ui/tab-bar.tsx`, une seule barre) :
  libellé gris, encre pleine quand il est actif. **Un filet gris sous toute la barre**
  (`--border-hairline`, demande de Sacha le 05/10/2026 : sans lui la barre flottait) ;
  l'onglet actif est souligné par-dessus, d'un trait de 2 px qui **glisse** d'un onglet à l'autre
  (`transform` seul, `--duration-slide` 240 ms, `--ease-standard` ; posé d'un coup si le
  mouvement est réduit). Demande de Sacha, 27/09/2026. Sert aux sections d'une fiche
  (`SectionTabs`) et aux vues d'un tableau (`DataTableViews`).
- **Six onglets au plus sur une fiche, sur un seul niveau.** Au-delà, la barre déborde
  et les derniers onglets se cachent derrière une barre de défilement. On ne crée pas de
  second niveau (pastilles sous les onglets : on ne sait plus ce qui navigue et ce qui
  filtre) : on **fusionne** les sections voisines en blocs (`PageSection`) d'une même page,
  atteints par leur ancre. Fiche titre, 04/10/2026 : Vue d'ensemble (+ Variantes, Activité)
  · Audio (+ Sessions & pistes) · Crédits (+ Splits) · Droits · Projets & sorties (+
  Distribution) · Fichiers. Dans une page fusionnée, une section vide est une `EmptyNote`,
  pas un `EmptyState`.
- **Tout filtre d'un tableau est en onglets** (`DataTableViews`, exporté avec
  `DataTable`, d'après une référence de Sacha le 27/09/2026) : un onglet par vue avec
  son nombre en gris entre parenthèses, calculé par le code, au-dessus du tableau **ou de
  son état vide** (les onglets restent quand une vue est vide). Vue dans l'URL (`href`,
  construit avec `viewHref`) ou filtre sur place (`onSelect`, Budget). Au bout de la
  barre, `action` : un bouton (« Ajouter une ligne ») ou un filtre secondaire en
  pastilles (Actifs / Archivés sur Artistes). Une seule vue : pas d'onglets. Casse
  normale, comme les onglets des fiches. En place : Artistes (relation), Masters et
  Projets (Actifs / Archivés, DG), Membres (statut), Budget (statut).
- **Pastilles** (`FilterChip`, `ViewToggle`) : filtres secondaires ou qui se combinent.
- **Recherche et filtres d'une liste** (Figma Projets 90:4972, Sacha 29/10/2026) : sous les
  onglets, **une seule ligne** (`ListToolbar`) : la recherche, **deux fois plus large qu'un filtre**
  (Sacha 29/10), puis les filtres principaux en listes déroulantes de même largeur (3 au plus, « Tous les … » quand rien n'est choisi), puis
  le bouton carré des **filtres avancés** pour les autres ; « Effacer les filtres » au bout
  dès qu'un filtre est posé. Recherche et listes déroulantes **dessinées comme les champs** (Sacha
  29/10) : contour, fond, coins `rounded-lg`, texte 16 px ; jamais en pilule. Jamais les filtres principaux cachés derrière un bouton. En
  place : Projets, Travail, Artistes, Catalogue, Réseau, Contrats, Fichiers, Calls (liste).
- **Tableaux** (`DataTable`, Sacha 29/10/2026) : une carte comme les listes de l'accueil,
  contour, fond, en-tête sur bande douce, filet entre les lignes. Dans une carte de section,
  la règle « rien d'encadré dans une carte » prime : le tableau y perd cadre et filets.

### Sélection et formulaires en étapes

D'après la maquette « Nouveau projet » fournie par Sacha le 27/09/2026, appliquée
d'abord à la Stratégie (`app/(app)/app/projects/[projectId]/strategy`,
`components/strategy/option-class.ts`) :

- **Choix retenu en bleu** : une réponse cochée parmi des cartes (questions de la
  Stratégie), un levier retenu, prennent le fond `--select-bg` et le contour
  `--select-border` ; les autres restent blanches à contour `--border-default`. Texte
  toujours noir. Le bleu ne sert qu'à ça : ni lien, ni bouton, ni état (les états
  restent aux `--tone-*`).
- **Pastilles à cocher** (formats) : `FilterChip` « ink », noire une fois cochée.
- **Longue liste de choix : un menu, pas des pastilles** (demande de Sacha, 04/10/2026). Les
  pastilles conviennent à quelques choix visibles d'un coup (format, priorité). Au-delà
  (les 16 rôles d'un contact du Réseau), on utilise `OptionSelect multiple` : un menu
  déroulant où l'on coche sans le fermer, et les choix résumés dans le déclencheur.
  **Une case à cocher à gauche de chaque choix** (`SelectItem indicator="checkbox"`), dessinée
  comme `Checkbox` (§ 3 bis) une fois cochée : on voit tout de suite qu'on peut en choisir plusieurs. Le
  menu à choix unique garde la coche à droite.
- **Pas de cadre dans un cadre** : la page n'est pas enfermée dans une carte, les
  sections sont espacées (48 px) sans trait ; seuls les éléments (réponses, leviers,
  livrables, temps forts) et les blocs de la colonne de droite ont un contour.
- Titre de section en `display-sm` semi-gras, libellé de champ en `body-md` medium noir
  au-dessus du contrôle ; pas de phrase qui explique la section. Une source (call,
  citation) tient en une ligne `caption`.
- Actions de la page (proposer, dicter) à droite du titre ; boutons d'une réponse en bas
  à droite, secondaires en `ghost` d'abord, le principal (noir) en dernier.

### Personnes et pré-remplissage

Règles de Sacha (07/10/2026), pour **toute** l'application :

- **Désigner quelqu'un = `PersonPickerField`**, jamais un champ texte libre : un crédit, une
  part, un créateur ou un éditeur SACEM, un ingénieur, une partie… Les personnes déjà liées
  à l'objet (crédités du titre, artistes, répartition) en tête, puis le Réseau ; « Ajouter
  « X » au Réseau » en modale sans quitter le formulaire ; « Garder seulement le nom » en
  dernier recours. On enregistre l'id (`contact_id`), jamais un lien deviné par le nom. Les
  comptes de l'app (responsable, assigné, validateur) restent choisis dans la liste des
  membres : ce ne sont pas des contacts du Réseau.
  Appliqué le 07/10/2026 : créateurs et éditeurs SACEM, ayants droit d'un accord, lignes
  d'une répartition, parties d'un contrat, structure parente d'un contact, ingénieurs du
  Brief Mix/Master et d'une session, personnes externes d'un rôle d'équipe du Cadrage.
  Quand le lien est obligatoire (partie de contrat, ingénieur du Brief, structure parente),
  « Garder seulement le nom » est masqué (`allowNameOnly={false}`). Restent en texte, faute
  de colonne pour l'id : l'ingénieur d'une session (`master_sessions.engineer`, choisi dans
  le Réseau mais seul le nom est gardé) et le titulaire du ℗ (pré-rempli par le label de la
  répartition master). Les réponses libres lues par PO (Cadrage juridique, questions du
  Cadrage) restent du texte.
  **Pour un rôle, seuls ceux qui y correspondent sont listés avant de taper** (`suggest`,
  10/10/2026 : pas d'ingé son proposé pour la direction artistique) ; taper cherche dans tout
  le Réseau. Rôles d'équipe du Cadrage → rôles du Réseau (`NETWORK_ROLES_OF`,
  `assign-role-dialog.tsx`) : direction artistique et créative = directeur·rice artistique
  (rôle du Réseau ajouté le 10/10/2026), graphiste, photographe, vidéaste ; clip = vidéaste ; presse = média, prestataire ; influence = prestataire,
  partenaire, média ; playlisting = prestataire, média ; mix et mastering = ingé son.
  Dans une modale, la liste du sélecteur est dans le flux : la modale grandit au lieu de la
  couper.
- **Tout ce qu'on sait est pré-rempli** : identité, IPI, coordonnées, rôle, montants ou dates
  déjà connus ailleurs dans l'app arrivent remplis, avec leur source quand le formulaire en
  affiche une, et restent corrigeables. L'utilisateur ne retape jamais une information que
  PDS OS détient. Exceptions : ce qu'une règle interdit de déduire (parts Phono, DEP/DR,
  première exploitation…).

### Champs obligatoires

Décision de Sacha (08/10/2026) : **un champ obligatoire porte un « * » après son libellé,
un champ facultatif ne porte rien.** On n'écrit jamais « facultatif » (ni dans le libellé,
ni dans l'aide, ni en note) : c'était du texte en plus sur la moitié des champs, et
l'astérisque est la convention que tout le monde connaît. Pas de légende « * = obligatoire ».

- Le « * » vient du composant, jamais tapé dans le texte : `RequiredMark`
  (`components/ui/required-mark.tsx`), en gris secondaire (pas en rouge : le rouge `--error`
  est réservé aux manques, ci-dessous).
- `Field` / `TextareaField` l'affichent d'eux-mêmes avec `required`, ou `aria-required`
  quand la validation native du navigateur ne doit pas s'en mêler ; `Label`,
  `OptionSelect`, `ChipChoice`, `ChipMultiChoice`, `PeoplePicker`, `SinglePicker`,
  `ChoiceCards` et `PersonPickerField` prennent une prop `required`.
- Obligatoire = ce que le serveur refuse vide (schéma zod, action, SQL) ; on ne marque pas un
  champ que le serveur accepte vide.
- Lecteurs d'écran : le « * » est masqué, le contrôle porte `required` / `aria-required` ;
  pour un groupe (pastilles, choix, sélecteur de personne), « (obligatoire) » est dit en
  texte masqué.
- L'astérisque annonce avant ; le rouge explique après (« Manques à la validation »).
  L'aide sous un champ ne sert qu'à ce qui apprend quelque chose (format, conséquence).

### Manques à la validation

Quand on valide un formulaire ou un dossier incomplet, **chaque champ manquant passe en
rouge** (`aria-invalid`, contour `error`) avec, dessous, **pourquoi** il est attendu
(`FieldError`, une phrase qui dit quoi faire) ; un `FormMessage` au-dessus du bouton compte
les manques ; le premier champ en rouge prend le focus. Rien en rouge avant le premier essai.
Pas de pastille de provenance au-dessus des champs (« Rempli », « Saisi », « À saisir ») :
elles n'apprenaient rien (Sacha, 07/10/2026) ; seul « À vérifier » reste, sur un champ rouvert.
Ce rouge est un **vrai rouge**, le token `--error` (`text-error`, `border-error`), propre à la
saisie : `--destructive` reste à l'encre pour les actions définitives (décision de Sacha,
07/10/2026 : les manques en encre se lisaient comme du gris).
Un champ redevient normal dès qu'il est corrigé. Le bouton n'est jamais désactivé pour
cause de champs manquants.

### Sections d'une étape

Dans une étape ouverte, chaque section a un titre à l'encre (`StepSection`, 18 px, semibold),
jamais un intertitre gris : il passe au-dessus des libellés de champs et des valeurs qu'il
introduit. 28 px séparent deux sections, 8 px séparent un titre de son contenu, et une
explication reste collée à la liste qu'elle commente (proto Juridique v3, Sacha, 24/10/2026).

### Boutons, pastilles, encarts, toast, dates (décisions C0 du 18/10/2026)

D'après le proto « Projet complet » (`docs/protos/projet.html`), qui fait foi :

- **Bouton** (`Button`) : 40 px, padding 18, **15 px semi-gras (600)**, pilule ; `sm` 32 px,
  padding 14, 14 px ; `ghost` en `--text-secondary`, encre au survol. À l'appui,
  `scale(.97)` (140 ms, `--ease-out`), coupé quand le mouvement est réduit. Les autres
  variantes ne changent pas.
- **Pastille** (`StatusBadge`) : 24 px, padding 10, **13 px semi-gras** (`--type-micro`) ;
  `sm` garde 20 px pour les lignes denses.
- **Encart** (`ToneCallout`) : rayon 10, padding 12/14, 15 px, **icône du ton à gauche**
  (info, alerte, stop, coche ; un cadenas pour une étape verrouillée, prop `icon`).
- **Toast** (sonner) : **fond encre** (`--surface-inverse`), texte `--text-on-dark`, rayon
  12, 15 px, sans filet, en bas à droite ; il reprend le verbe du bouton (« Confirmer » →
  « Proposition confirmée. »).
- **Dates** : une date de fait se dit en entier, « Sam. 05/12/2026 » (`formatDay`,
  `lib/utils/day.ts`, Europe/Paris) ; dans une source ou un historique, en court :
  « le 14/10 », et avec l'heure « 19/10, 11:16 » (`formatShortDay`, `formatShortInstant`).
  `Timestamp` reste pour les instants détaillés (« 11 oct. 2026 à 16:42 »).
- **Durées et questions par point d'ordre du jour** (formulaire de call, Sacha 28/10/2026) : la
  durée est visible et modifiable sur chaque point ; les questions de PO ne sont pas dans le
  formulaire, elles se lisent sous chaque point dans la carte de l'échange prévu.
- **Page privée** : à terme **un lien par personne et par projet** (proto), construit en
  dernier ; d'abord, le même habillage pour les liens existants (`/m`, `/p`, `/f`…).

### Action principale d'une carte

Une seule action pleine (`variant="default"`) par carte, le reste en contour.

- **« Préparer un échange » est toujours l'action principale** de la carte qui le propose
  (Cadrage, Stratégie, Conception, Production, Master), avant « Commencer… » ou
  « Reprendre… », qui passent en contour (Sacha, 14/10/2026). Dans l'entrée du Cadrage,
  la voie « Recommandé » reste choisie par le code et placée en premier, mais c'est
  toujours le bouton de l'échange qui est plein. Les en-têtes de page (à côté de
  « Dicter ») ne sont pas des cartes : l'échange y reste en contour.
- **Brief existant** : « Voir le Brief » est plein, « Mettre à jour le Brief » en contour
  (Sacha, 14/10/2026) ; Brief de cadrage : « Envoyer en validation à X » est plein, un seul geste
  (28/10/2026).
- **Bouton selon le statut** (retour « Néons » 04, 21/10/2026) : une action déjà faite
  n'est jamais reproposée telle quelle. Rien n'a changé depuis → plus de bouton, une ligne
  qui dit que c'est fait et comment le changer ; modifié depuis → « Enregistrer les
  modifications » ; modification interdite → l'état terminé seul. Le serveur garde son
  refus (« Rien à enregistrer… ») en filet. Premier cas : `BriefRecord` du Brief Master.
- **Qui agit, quoi, qui prend le relais** (retour « Néons » 10, 21/10/2026) : toute étape
  ouverte d'un parcours (`StepPanel`) dit sous son « pourquoi » qui agit maintenant et
  quoi (« À vous : … », « En attente de Nadia : … »), même quand « Maintenant » ne la
  répète pas ; « Ensuite » nomme qui reprend l'étape suivante (« Mixage · Karim »), lu
  dans le parcours, jamais deviné.
- **Blocage** (retour « Néons » 05) : un blocage dit sa raison, mène à l'endroit où on le
  lève (« Résoudre le blocage », `BlockerCallout`, type `Blocker` de `lib/ui/journey.ts`)
  et, quand c'est utile, comment l'action reprend ensuite. Pas de lien quand il n'y a
  rien à lever (seulement à savoir) ou quand la résolution est juste en dessous.

### Décisions, propositions et faits (composants communs, 18/10/2026)

Rendu du proto « Projet complet » (`docs/projet-complet/commons.md` § 3, 6, 7, 10), un seul
composant par motif, dans `components/ui/` (`docs/COMPOSANTS.md`) :

- **Départ d'une étape = `StartChoices`** : cartes entières cliquables, au fond de la page
  (`--surface-page`) dans la carte de l'étape ; la carte « Recommandé » (choisie par le code) est
  placée **en premier, à gauche** (Sacha, 29/10/2026) et la raison, calculée par le code, est écrite **sous les cartes, sur toute la largeur**. Le Cadrage dessine
  en plus un bouton au pied de chaque carte (`action`, Figma 304:20801) : plein sur la recommandée,
  contour sur l'autre ; c'est un dessin, la carte entière reste la seule cible. La règle « l'échange est toujours plein » ci-dessus
  vaut pour les cartes à bouton qui restent ; une entrée migrée vers `StartChoices` n'a plus de
  bouton. Un choix de formulaire qui ne déclenche rien = `ChoiceCards variant="list"`.
- **Proposition = `ProposalRow`** : rien de coché d'avance ; « Confirmer » (contour),
  « Modifier », « Écarter » (fantômes) ; le texte modifié est **confirmé en l'enregistrant**
  (bouton « Enregistrer », plus « Confirmer ainsi ») ; « Modifié par … » en gris dans la source
  (proto), la citation gardée. La pastille « Proposition de PO » de l'ancienne `ProposalCard`
  disparaît : la ligne dit sa source.
- **Décision = `DecisionPanel`** : principal d'abord à gauche, puis contour, puis fantôme ;
  commentaire **obligatoire pour toute issue autre que « oui »** (réserves, modification,
  précision, refus), erreur rouge au premier essai, jamais de bouton désactivé.
- **Fait = `FactRow`** : la source **sous** la valeur ; « Modifié par … » en couleur de
  sélection (fait changé par une personne) ; une personne non désignée = « À choisir » en
  rouge (`--error`), jamais une supposition.

### Modale : une seule, « verre »

**Toute modale du site est la fenêtre « verre »** d'Espace Espace (décision de Sacha,
27/09/2026) : modifier un artiste, un master, un projet, confirmer, transmettre, créer
depuis un sélecteur… Il n'existe **pas** d'autre apparence de modale ; `DialogContent`
n'a plus de variante. Toute nouvelle modale passe par `Dialog` / `FormDialog` /
`ConfirmDialog` (`components/ui/`), jamais par un panneau blanc refait à la main.

- **Verre clair** depuis le 18/10/2026 (décision C0, proto « Projet complet » ; le verre
  sombre du 27/09/2026 est abandonné) : `DialogContent` (`components/ui/dialog.tsx`) pose un
  **voile** `--glass-scrim` (noir à 35 %) sur la page, un flou léger `--glass-blur`, et un
  panneau `--surface-glass` = `color-mix(in srgb, var(--surface-raised) 88%, transparent)`,
  flou `--glass-panel-blur` (20 px), filet `--border-default`, rayon 16 px, ombre
  `--elevation-modal` (`0 24px 60px rgb(0 0 0/.3)`). Largeur **520 px**, **900 px** en
  `wide` ; en bas pleine largeur sur mobile. En sombre, le même mélange part de la surface
  sombre (`--surface-raised` sombre) : rien d'autre à faire.
- La classe `.surface-glass` (`app/globals.css`) **ne réinverse plus** les tokens : le panneau
  est clair en clair et sombre en sombre, ce qui est posé dedans lit les tokens de la page.
  Elle ne garde que les rares ajustements d'un panneau translucide (une liste déroulante
  posée dessus, `--popover`, reste opaque). Un nouveau token n'a donc rien à y déclarer.
- **Un geste qui demande une saisie ouvre une modale** (`FormDialog` / `ConfirmDialog`,
  décision de Sacha du 24/10/2026) : révoquer un accès (motif), accorder une dérogation,
  changer un responsable, noter une signature reçue autrement, contester… Jamais un champ
  ou un formulaire qui s'ouvre dans une carte ou une ligne : il change la taille de la carte
  et la page saute. Un geste sans saisie (« Nouveau lien », « Relancer ») reste un bouton
  direct. Le bouton principal de la modale reprend le verbe (« Révoquer l'accès »).
- Hors périmètre : les panneaux latéraux (`Sheet`), les menus et listes déroulantes en
  portail (`Select`, `DropdownMenu`, `Popover`, `Tooltip`).
- **Entrée** : opacité et `scale(.97 → 1)` en `--duration-base` (180 ms) `--ease-out`, le flou
  de la page monte avec le panneau ; sortie en opacité, `--duration-fast`. Mouvement réduit :
  opacité seule.
- **Boutons d'une modale ou d'une décision** (décision C0) : le **principal d'abord, à
  gauche**, puis les secondaires (« Annuler » en dernier), comme le proto. Un seul endroit :
  `DialogFormActions` et `ReasonForm` ; aucune modale ne range ses boutons à la main.

### Arrondis

| Élément                                            | Classe        | Rayon   |
| -------------------------------------------------- | ------------- | ------- |
| Bouton-icône, élément de navigation, ligne de carte | `rounded-lg`  | 8 px    |
| Carte de l'accueil, saisie de PO                   | `rounded-2xl` | 12 px   |
| Barres latérales : aucun arrondi (collées au bord) | —             | 0       |
| Bouton à libellé, suggestion, badge, filtre        | pilule        | 999 px  |

Rien au-delà de 16 px, sauf la pilule. Piège : le `Button` utilise `rounded-full` et
non `rounded-pill`, car Tailwind trie les arrondis par nom et `rounded-pill` passerait
après le `rounded-lg` des tailles icône.
