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

Le **bleu est l'accent unique de sélection** (décision de Sacha, 27/09/2026) : jeton
`--selection` (#64a2ff), avec `--selection-border` (contour) et `--selection-bg` (fond
pâle). Classes Tailwind `accent-selection`, `outline-ring`, `border-ring`. Il habille :

- le **focus** clavier, partout (`--focus-ring` = `--selection`, aussi dans la modale) ;
- un **champ en saisie** (`Input`, `Textarea`, `Select`, saisie de PO) : contour bleu ;
- une **radio** et une **case cochée** natives (`accent-selection`) ;
- une **carte de choix** cochée (`ChoiceCards`, tuile ou non) et une option retenue de la
  Stratégie (`optionClass`) : contour `--selection-border`, fond `--selection-bg`.

À changer dans `app/globals.css` seulement (`.surface-glass` éclaircit `--selection-bg`
pour la modale). Ce n'est pas un ton d'état (§ 3) : le bleu `info` reste réservé à
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

## 4. Coquille, surfaces et arrondis

Source : maquette Figma « Desktop - 11 » (accueil) et « Devis Sordulo » nœuds 120:47 /
120:74 (navigation), fichier « Devis Sordulo ».

### Coquille

- Fond de l'application `--surface-app` (#fbfbfb). La barre latérale est une carte
  blanche flottante : marge `--shell-inset` (16 px) avec le bord de l'écran, arrondi
  16 px, largeur `--nav-width` (250 px) ou `--nav-width-collapsed` (64 px) repliée,
  marge intérieure 8 px (24 / 16 px jusqu'au 27/09/2026, jugée trop large par Sacha ;
  même 8 px sur la sidebar de projet), ombre `--nav-shadow` (Figma « Devis
  Sordulo » nœud 121:179 : flou 3 px, sans décalage, noir 10 %). `components/shell/sidebar.tsx`.
- En haut, « PDS » en 16 px gras et la cloche (masqués repliée), plus un bouton pour
  replier / déplier (même taille de bouton que la cloche, icône 20 px comme la
  navigation) (`components/shell/use-collapsed-nav.tsx`, un contexte React partagé
  avec la sidebar de projet ci-dessous). Dessous, la navigation (`lib/ui/nav-items.ts`,
  8 items) : éléments de 40 px espacés de 12 px, icône 20 px, fond `--nav-item-active-bg`
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
  douceur (flou seul, 10 %). Titre du projet en haut, puis les sections en groupes
  titrés (Figma « PDS OS », nœud 1510:3096) : Vue d'ensemble seule, **Processus**
  (Workflow, Master, Juridique), **Pilotage** (Travail, Équipe, Planning, Budget),
  **Production** (Calls, Livrables, Activations, Fichiers, Validations, Activité) —
  Activations, absente du Figma, rangée avec les Livrables. Liste et groupes :
  `lib/ui/project-sections.ts`. Chaque section a sa page (Workflow = Cadrage +
  Stratégie + Sortie, entrée par Cadrage ; Master, ouvert par son État du master ; Juridique, ouvert
  par son État des lieux, listé seulement pour `manage_legal`) ;
  en-tête commun `ProjectPageHeader` (h2, une phrase, action à droite).
- **Étapes d'un processus en chevrons** (`ProcessSteps`, `components/ui/`), sous
  l'en-tête, au même endroit pour chaque processus : Workflow (7 étapes numérotées,
  `WorkflowBreadcrumb`) et Juridique (État des lieux · Cadrage juridique · Confirmation ·
  Plan d'action · Suivi, son parcours interne défini par le DG le 04/10/2026, sans numéro,
  `LegalSteps`, une URL par étape sous `/legal`) et Master (État du master · Brief
  Mix/Master · Mix · Mastering · Master final, sans numéro, `SectionSteps`, une URL par
  étape sous `/master`).
  **Deux signaux jamais mélangés** : le fond noir = la page ouverte ; la coche dans le
  rond = l'étape vraiment validée (états des `project_stages`, jamais la position de
  la page). Étape sans page ou verrouillée : grisée, non cliquable, `title` explicatif.
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
  **Une case à cocher à gauche de chaque choix** (`SelectItem indicator="checkbox"`), bleue
  `--selection` une fois cochée : on voit tout de suite qu'on peut en choisir plusieurs. Le
  menu à choix unique garde la coche à droite.
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
