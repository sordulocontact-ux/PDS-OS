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
- Un item sans page encore (Calendrier) reste
  visible, grisé, non cliquable (`disabled` dans `NavItem`), jamais retiré de l'ordre
  du Figma.
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
  (Master, Juridique, Marketing, Distribution, menés en parallèle) ; **Pilotage** (Travail,
  Équipe, Planning, Budget) ; **Production** (Calls, Livrables, Fichiers, Validations,
  Activité). Plus rien ne s'appelle « Processus » ni « Workflow ». Liste et groupes :
  `lib/ui/project-sections.ts`. Chaque section a sa page (Marketing = Stratégie,
  Conception, Activations, entrée par la Stratégie ; Distribution = la Sortie ; Master,
  ouvert par son État du master ; Juridique, ouvert par son État des lieux). Sans
  `manage_legal`, le Juridique reste listé, **grisé avec un cadenas** et sa raison, jamais
  un lien (sa page répond toujours 404) ; en onglets, il n'a pas d'onglet.
- **Titre d'une page de projet lancé** (Sacha, 10/10/2026, Figma « PDS OS » 76:3145 : « il
  y a trop d'information ») : seulement le **nom de la section** en h1 (« Master »,
  « Budget », 28 px medium, `text-display-md` ; plus grand que la maquette à la demande de Sacha), puis les chevrons du workflow s'il en a, puis le contenu.
  Plus de titre du projet (le sélecteur de la sidebar le nomme), ni d'artiste, ni de h2 +
  phrase d'en-tête sur la page : l'étape est dite par son chevron. Une sous-page ouverte
  depuis la section (Brief Mix/Master, branches du Juridique, Brief de cadrage) a un **fil
  d'Ariane** à la place : « Master / Brief Mix/Master », parents en gris et en lien
  (`ProjectPageTitle`, `projectTrail` dans `lib/ui/project-sections.ts`). L'action d'une
  page (« Nouveau call », « Ajouter une tâche ») reste, à droite au-dessus du contenu
  (`ProjectPageActions`). Projet non lancé : son titre et son type restent l'en-tête.
- **Étapes d'un processus en chevrons** (`ProcessSteps`, `components/ui/`), sous
  l'en-tête, au même endroit pour chaque workflow, sans numéro : Marketing (**Stratégie ·
  Conception · Production · Activations · Suivi & bilan**, `SectionSteps` +
  `lib/ui/marketing-steps.ts` ; une organisation, pas une séquence : chaque étape qui a une
  page s'ouvre seule, sauf la Stratégie avant son lancement ; Production et Suivi & bilan
  grisés tant qu'ils n'ont pas de page ; Défense, non tranchée, n'est montrée nulle part),
  Juridique (**État des lieux · Plan d'action**, sans numéro,
  `LegalSteps` ; le Cadrage et la Confirmation vivent sur l'État des lieux, le Suivi est le
  Plan d'action lancé ; le chevron devient « Suivi » une fois le plan lancé, et sous les
  chevrons une ligne « Étape du dossier · … » donne l'une des cinq étapes du DG, un état et
  jamais un chevron : `legalPhase`), Master (**Préparation · Mixage · Mastering · Master
  final**, sans numéro, `SectionSteps`, une étape pouvant couvrir une sous-page : le Brief
  sous Préparation ; les validations du mix et du master vivent dans Mixage et Mastering,
  jamais une étape à part) et Distribution (**Préparation · En ligne** : la page Sortie en
  deux, `lib/ui/distribution-steps.ts`). Le
  Cadrage n'a pas de chevrons : il est au-dessus des workflows (les 7 chevrons du parcours,
  `WorkflowBreadcrumb`, ont disparu le 08/10/2026). Trois
  étapes au plus à l'écran pour un workflow spécialisé (simplification du 07/10/2026) : une
  sous-page ouverte depuis une étape y revient par le fil d'Ariane du titre, jamais une pastille.
  **Deux signaux jamais mélangés** : le fond noir = la page ouverte ; la coche dans le
  rond = l'étape vraiment validée (états réels, `project_stages` pour le Marketing, jamais
  la position de la page). Étape sans page ou verrouillée : grisée, non cliquable, `title` explicatif.
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
| Barres latérales : aucun arrondi (collées au bord) | —             | 0       |
| Bouton à libellé, suggestion, badge, filtre        | pilule        | 999 px  |

Rien au-delà de 16 px, sauf la pilule. Piège : le `Button` utilise `rounded-full` et
non `rounded-pill`, car Tailwind trie les arrondis par nom et `rounded-pill` passerait
après le `rounded-lg` des tailles icône.
