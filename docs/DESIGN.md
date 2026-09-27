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

- La correspondance état → ton vit **uniquement** dans `lib/ui/state-tones.ts`. Un écran
  n'écrit jamais une couleur, il passe `tone={…Tone[état]}`.
- Le libellé porte toujours le sens : la couleur ne fait que le renforcer
  (daltonisme, impression).

## 3 bis. Sélection

Le choix fait dans une **carte de choix en tuile** (`ChoiceCards variant="tile"` : icône
et libellé centrés, radio masquée ; type d'un projet) se montre en **bleu** : contour
`--selection-border`, fond `--selection-bg` (Figma de Sacha, 27/09/2026, nœud 1493:4748).
Couleur **provisoire** : Sacha la changera, dans `app/globals.css` seulement (et
`.surface-glass` pour la modale). Ce n'est pas un ton d'état (§ 3) : le bleu `info` reste
réservé à « en cours ».

Le reste des sélections ne change pas : pastilles `FilterChip` en encre pleine (format,
priorité, direction créative, via `ChipChoice` pour un choix unique), cartes `ChoiceCards`
à contour noir.

Formulaire long en **blocs titrés** (`FormSection`) : une carte blanche à filet par groupe
(« Le projet », « Informations initiales », « Équipe »), sans la carte dans une modale ou un
panneau latéral.

---

## 4. Coquille, surfaces et arrondis

Source : maquette Figma « Desktop - 11 » (accueil) et « Devis Sordulo » nœuds 120:47 /
120:74 (navigation), fichier « Devis Sordulo ».

### Coquille

- Fond de l'application `--surface-app` (#fbfbfb). La barre latérale est une carte
  blanche flottante : marge `--shell-inset` (16 px) avec le bord de l'écran, arrondi
  16 px, largeur `--nav-width` (250 px) ou `--nav-width-collapsed` (64 px) repliée,
  marges intérieures 24 / 16 px (12 px repliée), ombre `--nav-shadow` (Figma « Devis
  Sordulo » nœud 121:179 : flou 3 px, sans décalage, noir 10 %). `components/shell/sidebar.tsx`.
- En haut, « PDS » en 16 px gras et la cloche (masqués repliée), plus un chevron pour
  replier / déplier (`components/shell/use-collapsed-nav.tsx`, un contexte React partagé
  avec la sidebar de projet ci-dessous). Dessous, la navigation (`lib/ui/nav-items.ts`,
  8 items) : éléments de 40 px espacés de 12 px, icône 24 px, fond `--nav-item-active-bg`
  sur la page ouverte, `--nav-item-hover-bg` au survol. Repliée : icônes seules, centrées,
  libellé en `Tooltip` au survol/focus. En bas, la personne connectée et
  « Se déconnecter » (masqués repliée), au même format qu'un élément de navigation.
- Repliée par défaut sur une page d'un projet lancé, dépliée partout ailleurs ; le
  chevron l'inverse pour la visite en cours seulement, rien n'est mémorisé.
- Un item sans page encore (Calendrier) reste
  visible, grisé, non cliquable (`disabled` dans `NavItem`), jamais retiré de l'ordre
  du Figma.
- **Sidebar contextuelle d'un projet lancé** (`components/projects/project-sidebar.tsx`,
  Figma « Double sidebar ») : 200 px (`--project-nav-width`, 258 px dans le Figma, réduit
  à la demande de Sacha le 27/09/2026), collée à gauche du contenu, contre la barre
  principale repliée — même géométrie (`sticky`, même hauteur, ombre `--nav-shadow`) —
  pour former une seule carte : arrondi seulement à droite tant que la principale est
  repliée dans ce projet, arrondi des deux côtés si elle est dépliée manuellement.
  L'ombre reste portée par chaque sidebar (pas de conteneur commun entre deux layouts
  Next.js différents) : à peine visible entre les deux colonnes en mode fusionné, vu sa
  douceur (flou seul, 10 %). Titre du projet en haut, 12 sections dans l'ordre du Figma.
  Chaque section a sa page (Workflow = Cadrage + Stratégie + Sortie, entrée par Cadrage) ;
  en-tête commun `ProjectPageHeader` (h2, une phrase, action à droite). Remplace l'ancienne double navigation
  horizontale (fil d'Ariane + onglets). Les 7 étapes du métier s'affichent en fil
  d'Ariane fixe en haut du contenu, seulement sur les 3 pages Workflow
  (`components/projects/workflow-breadcrumb.tsx`, `lib/ui/workflow-steps.ts`) :
  habillage de navigation, pas un nouvel état — la vraie progression reste
  `ProjectStage`, affichée sur la Vue d'ensemble (`docs/CONTEXTE-PROJET.md` § 10, point 3).
- Ce qui attend quelqu'un se compte dans une pastille noire (`CountBadge`), jamais dans
  un bandeau : notifications non lues sur la cloche, demandes d'accès en attente à droite
  d'« Équipe » (et sur le bouton du menu en mobile).
- Mobile : même navigation (pleine largeur) dans un tiroir blanc, ouvert depuis l'en-tête ;
  la sidebar contextuelle du projet n'a pas encore d'équivalent mobile.

### Accueil

- Salutation et sous-titre centrés, puis une colonne de 896 px : suggestions en
  pilules à contour, saisie de PO sur fond teinté `--surface-tint` (micro en carré
  blanc, envoi en carré noir, 32 px), puis les cartes, trois par ligne.
- Une question ouvre la **page de conversation** (d'après Midday) : en-tête avec retour
  et « + » en boutons carrés à contour, titre centré (la première question, tronquée) ;
  fil de 896 px qui défile seul, saisie teintée collée en bas avec la mention de PO.
- Carte de l'accueil : contour `--border-default`, ni fond ni ombre, marge intérieure
  12 px, libellé `caption` gris, lignes en `body-md` (titre semi-gras, détail medium).

### Page Travail

- `PageHeader` puis la grille des cartes de l'accueil (`ListCard`, 1 / 2 / 3 colonnes),
  toutes les lignes affichées, avec le nombre en `CountBadge` à côté du libellé.
- « Mes projets » (chef de projet) occupe deux colonnes : la prochaine action se lit en
  entier. Une carte vide garde sa place avec une phrase : la page d'un poste a toujours
  la même structure.

### Onglets et filtres de liste

- **Onglets soulignés** (`TabBar`, `components/ui/tab-bar.tsx`, une seule barre) :
  libellé gris, encre pleine quand il est actif. **Pas de filet sous la barre** : seul
  l'onglet actif est souligné, d'un trait de 2 px qui **glisse** d'un onglet à l'autre
  (`transform` seul, `--duration-slide` 240 ms, `--ease-standard` ; posé d'un coup si le
  mouvement est réduit). Demande de Sacha, 27/09/2026. Sert aux sections d'une fiche
  (`SectionTabs`) et aux vues d'un tableau (`DataTableViews`).
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
- **Pas de cadre dans un cadre** : la page n'est pas enfermée dans une carte, les
  sections sont espacées (48 px) sans trait ; seuls les éléments (réponses, leviers,
  livrables, temps forts) et les blocs de la colonne de droite ont un contour.
- Titre de section en `display-sm` semi-gras, libellé de champ en `body-md` medium noir
  au-dessus du contrôle ; pas de phrase qui explique la section. Une source (call,
  citation) tient en une ligne `caption`.
- Actions de la page (proposer, dicter) à droite du titre ; boutons d'une réponse en bas
  à droite, secondaires en `ghost` d'abord, le principal (noir) en dernier.

### Modale : une seule, « verre »

**Toute modale du site est la fenêtre « verre »** d'Espace Espace (décision de Sacha,
27/09/2026) : modifier un artiste, un master, un projet, confirmer, transmettre, créer
depuis un sélecteur… Il n'existe **pas** d'autre apparence de modale ; `DialogContent`
n'a plus de variante. Toute nouvelle modale passe par `Dialog` / `FormDialog` /
`ConfirmDialog` (`components/ui/`), jamais par un panneau blanc refait à la main.

- `DialogContent` (`components/ui/dialog.tsx`), d'après une référence fournie par Sacha
  le 27/09/2026 : la page derrière est seulement floutée, **sans voile** : elle reste
  blanche, le panneau noir suffit au contraste ; le panneau est sombre et translucide
  (`--surface-glass`, noir à 82 % : 90 % était trop sombre ; les gris de texte du
  panneau sont éclaircis d'un cran pour rester à 4,5:1), arrondi 16 px (`rounded-3xl`), en bas pleine largeur sur mobile.
  **Deux flous** (demande de Sacha, 27/09/2026, ils n'en faisaient qu'un avant) : la page
  derrière, `--glass-blur` (4 px ; 8 px avant, jugé trop flou), léger, les formes de la
  page restent lisibles ; le panneau lui-même, `--glass-panel-blur` (24 px), plus fort,
  pour que ce qu'il recouvre ne se lise pas à travers.
- La classe `.surface-glass` (`app/globals.css`) inverse les tokens dans le panneau :
  textes blancs, boutons contour sur voile blanc 8 %, bouton principal et action
  définitive blancs, champs et filets blancs translucides, liste d'un sélecteur
  (`SearchPicker`) opaque `--po-ink-700`. Aucun composant enfant n'est retouché.
- **Piège** : un token lu dans une modale et absent de `.surface-glass` y garde sa valeur
  claire (texte noir sur fond noir). Un composant qui lit un nouveau token et s'affiche
  en modale → ajouter ce token à `.surface-glass`. Les couleurs brutes (`text-ink-800`,
  `text-grey-400`) ne s'inversent pas : ne pas les employer dans une modale.
- Hors périmètre : les panneaux latéraux (`Sheet` : relecture d'un brouillon de PO, ligne
  de budget, tiroir de navigation mobile), les menus et listes déroulantes en portail
  (`Select`, `DropdownMenu`, `Popover`, `Tooltip`) restent clairs.
- **Fondu d'entrée et de sortie** (demande de Sacha, 27/09/2026) : le panneau en
  opacité, et le **flou de la page monte avec lui** (`backdrop-filter` de 0 à
  `--glass-blur`, en plus de l'opacité) ; entrée `--duration-base` (180 ms) `--ease-out`,
  sortie plus courte `--duration-fast` (120 ms). Piège : un flou posé d'un coup, sans
  transition, fait croire que la page se recharge avant l'arrivée de la modale. Ni
  glissement ni zoom : rien à couper quand le mouvement est réduit.

### Arrondis

| Élément                                            | Classe        | Rayon   |
| -------------------------------------------------- | ------------- | ------- |
| Bouton-icône, élément de navigation, ligne de carte | `rounded-lg`  | 8 px    |
| Carte de l'accueil, saisie de PO                   | `rounded-2xl` | 12 px   |
| Barre latérale                                     | `rounded-3xl` | 16 px   |
| Bouton à libellé, suggestion, badge, filtre        | pilule        | 999 px  |

Rien au-delà de 16 px, sauf la pilule. Piège : le `Button` utilise `rounded-full` et
non `rounded-pill`, car Tailwind trie les arrondis par nom et `rounded-pill` passerait
après le `rounded-lg` des tailles icône.
