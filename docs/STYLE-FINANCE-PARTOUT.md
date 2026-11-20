# Le style de Finance dans toute l'application

Guide de référence pour étendre à **toute** l'app le style refait dans Finance (15-16/11/2026, d'après Midday).
Écrit le 16/11/2026 à la demande de Sacha. **Il fait foi** sur `docs/DESIGN.md` partout où ils se contredisent
(liste au § 10). À lire en entier avant de toucher une seule ligne.

Ce que veut Sacha, en trois phrases :

1. **Toute l'app doit ressembler à Finance aujourd'hui** : même typo, mêmes graisses, mêmes arrondis, même densité,
   mêmes patterns.
2. **Un pattern est le même partout.** Une liste, une fiche, un formulaire, un état, une carte chiffre, un bouton
   se dessinent de la même façon dans Finance, dans un projet, dans le Réseau, dans le Catalogue. Jamais deux
   variantes du même geste.
3. **La densité est carrée** : une grille de mesures fixe, sans valeur au hasard (§ 4).

Sources à ouvrir à côté de ce guide : `app/globals.css` (bloc `.finance-scope`, à partir de la ligne ~1288),
`components/finance/` (le code de référence), `docs/FINANCE-V2.md` (historique des lots),
`docs/ANALYSE-MIDDAY.md` § 1 et § 7.1 (le pourquoi), le proto `docs/protos/finance-midday.html` v8.

---

## 0. Règles d'or (non négociables)

1. **Des tokens, jamais des composants recopiés.** Le style passe par les variables de `app/globals.css` que
   les composants lisent déjà (`--type-*`, `--font-weight-*`, `--radius-*`, `--button-radius`, `--density-*`).
   Interdit : recopier un composant Finance pour l'adapter, ajouter des tailles en dur (`text-[15px]`,
   `rounded-[6px]`, `h-[38px]`), ajouter `.finance-scope` à la main sur des pages.
2. **Un composant commun par pattern.** Si un pattern Finance est fait par un composant de
   `components/finance/` (fiche latérale, lignes de lien, montant signé…), on le **remonte** dans
   `components/ui/` ou `components/shell/` (règles « Composants d'abord » de `CLAUDE.md`), on remplace **toutes**
   ses occurrences, et Finance l'importe de là. Jamais une copie de plus.
3. **La couleur ne dit que la donnée.** Interface noire, blanche, grise. Couleur seulement pour : argent qui entre
   (vert), retard / dépassement / manque (rouge `--error` ou ton danger), avertissement (ambre), sélection (bleu
   `--selection`), teinte d'une catégorie. Aucun bouton, lien, menu ou titre coloré.
4. **Moins de texte.** Pas de titre visible ni de phrase d'intro sur une page liste ; pas de phrase de règle sous
   un titre ; un texte d'aide n'existe que là où il remplace une action (vide, réglage, toast, infobulle).
5. **Une page = une action principale** en noir. Le reste en contour ou dans « ⋯ ».
6. **Les règles métier et les textes ne changent pas.** C'est un travail de forme : aucun calcul, aucune
   donnée, aucune règle de droits ne bouge. Les textes restent dans `lib/i18n/fr/`.
7. **Sombre et téléphone vérifiés à chaque lot** (§ 11). Le style ne touche aucune couleur : `:root.dark`
   continue de marcher tel quel.

---

## 1. Comment c'est construit dans Finance (et comment le généraliser)

Dans Finance, `FinanceFrame` (`components/finance/finance-frame.tsx`) entoure la section d'un
`<div className="finance-scope">`. Dans `app/globals.css`, le bloc `.finance-scope` **redéfinit les tokens**,
exactement comme `:root.dark` redéfinit les couleurs. `Button`, `DataTable`, `Field`, `MetricCard`,
`StatusBadge`… lisent ces tokens : ils prennent le style Finance sans une ligne de code à eux.

Les éléments en portail (modales, menus, fiche latérale, ⌘K) sont hors du `<div>` : ils reçoivent la classe par
`DialogSideProvider className="finance-scope"` et `useSectionThemeClass()` (`components/ui/dialog.tsx`,
`dropdown-menu.tsx`), ou la posent eux-mêmes (`FinanceSheet`, `FinanceSearch`).

**Généraliser = promouvoir, pas propager.** Ne pas poser `.finance-scope` partout. Faire ceci :

1. Recopier les **valeurs** du bloc `.finance-scope` dans `:root` (et dans `@theme` pour `--font-weight-*` et
   `--radius-*`, qui y sont déclarés : voir le piège des références circulaires au § 12). Les valeurs Finance
   deviennent celles de l'app.
2. Faire de même pour les règles de forme du bloc : l'état en point + texte (`[data-slot="status-badge"]`) et les
   chiffres en Geist Mono (`.tabular-nums`). On enlève le préfixe `.finance-scope`.
3. Une fois tout l'app passé, **supprimer** le bloc `.finance-scope` et la classe dans `FinanceFrame`,
   `FinanceLoading`, `FinanceSheet`, `FinanceSearch`, `DialogSideProvider` (Finance n'est plus un écart).
4. Mettre à jour `pnpm ds:tokens` (`design-system/tokens.json`) : `pnpm ds:tokens` puis `pnpm ds:tokens:check`.

Ce qui change alors d'un coup dans toute l'app (tailles, graisses, arrondis) doit être **relu écran par écran**
(§ 11) : une page qui comptait sur 16 px ou sur la pilule peut casser (texte coupé, bouton trop petit pour son
contenu, grille qui saute).

---

## 2. Les tokens exacts (cible = valeurs Finance)

### 2.1 Typographie

| Token | App avant | **Cible (Finance)** | Usage |
| --- | --- | --- | --- |
| `--type-display-xl` / `-lh` | 46 / 52 | **36 / 42** | salutation d'un accueil, une fois par page au plus |
| `--type-display-lg` | 36 / 42 | **28 / 34** | titre de page visible (`PageHeader`), grand chiffre d'une page (solde), montant d'une fiche latérale |
| `--type-display-md` | 28 / 34 | **24 / 30** | chiffre d'une carte (`MetricCard`) |
| `--type-display-module` | 28 / 34 | **24 / 30** | titre d'une étape de module (h1 de `ProjectHeader`/`ModuleHeader`) |
| `--type-display-sm` | 20 / 28 | **18 / 26** | titre d'une fiche latérale, d'un panneau |
| `--type-figure-xl` | 32 / 36 | **28 / 32** | |
| `--type-figure-lg` | 22 / 28 | **20 / 26** | |
| `--type-figure-md` | 16 / 22 | **15 / 20** | |
| `--type-body-xl` | 22 / 30 | **18 / 26** | |
| `--type-body-lg` | 18 / 26 | **16 / 24** | chiffre d'une bande de chiffres (`CardFigures`) |
| `--type-body-md` | 16 / 24 | **15 / 22** | **texte courant, cellules de tableau, champs** |
| `--type-body-sm` | 15 / 22 | **14 / 20** | boutons, éléments de navigation, total sous une liste, état |
| `--type-caption` | 14 / 20 | **13 / 18** | titre gris d'une carte, sous-ligne, légende, libellé d'un fait, axes |
| `--type-micro` | 13 / 18 | **12 / 16** | montant au-dessus d'une barre, solde d'un jour du Planning |
| `--type-colhead` | 14 / 20 | **13 / 18** | (en-têtes de tableau : voir § 6.3, ils lisent `--type-body-md`) |
| `--type-body-tracking` | -0.02em | **-0.01em** | |

Le corps de page (`.finance-scope` lui-même) : `font-size: var(--type-body-md)` (15 px),
`line-height: var(--type-body-md-lh)` (22 px), `font-weight: 450`.

**Plancher : 12 px** (`--type-micro`), réservé aux micro-chiffres d'un graphique ou d'un calendrier. Jamais un
texte de phrase sous 13 px.

### 2.2 Graisses (Google Sans Flex est variable)

| Token | App avant | **Cible** | Ce que ça veut dire |
| --- | --- | --- | --- |
| `--font-weight-normal` | 500 | **450** | texte par défaut |
| `--font-weight-medium` | 500 (`--fw-medium`) | **450** | `font-medium` ne ressort **pas** : il vaut le texte courant |
| `--font-weight-semibold` / `--fw-semibold` | 600 | **550** | ce qui ressort : boutons, nom de la section, titre d'une ligne qu'on veut marquer |
| `--font-weight-bold` / `--fw-bold` | 700 | **650** | rare (un chiffre dans une phrase) |

Conséquence à connaître : la hiérarchie se fait par **taille et gris**, pas par graisse. Un titre de carte est
petit et gris (13 px secondaire), le chiffre est grand ; un nom de ligne est à l'encre, sa sous-ligne en 13 px
gris. Ne pas « réparer » un manque de contraste en ajoutant `font-semibold` partout : on choisit le bon palier
de taille et de gris.

La règle de `@theme` « rien sous medium » (`--font-weight-thin/extralight/light: 500`) passe à **450** pour
ces trois-là aussi : plus rien ne descend sous 450.

### 2.3 Arrondis

| Token | App avant | **Cible** | Où |
| --- | --- | --- | --- |
| `--radius-xs` | 2 | 2 | carré de légende, carré d'un poste, haut d'une barre |
| `--radius-sm` | 4 | 4 | |
| `--radius-md` | 6 | 6 | segment d'un filtre segmenté |
| `--radius-lg` | 8 | **6** | champ, bouton-icône, élément de navigation, ligne cliquable |
| `--radius-xl` | 10 | **8** | tableau (`DataTable`), fiche et panneau de droite, cadre d'un segmenté |
| `--radius-2xl` | 12 | **8** | carte (`MetricCard`, cartes de section), squelettes de carte |
| `--radius-3xl` / `-4xl` | 16 | **12** | modale centrée |
| `--button-radius` | 999 (pilule) | **6** | **tout bouton à libellé** (Sacha, 16/11/2026, commit `c2cfc7f7`) |
| `--radius-pill` | 999 | 999 | badge compteur, puce (`ReasonChips`), interrupteur ; plus jamais un bouton |

### 2.4 Familles

- Texte et titres : **Google Sans Flex** (`--font-sans`, `--font-heading`, `--font-display`).
- Chiffres : **Geist Mono** (`--font-mono`), automatiquement sur tout `.tabular-nums` **sauf** les grands
  chiffres de titre (`text-display-*`, `text-figure-*`), resserrés `letter-spacing: -0.03em`.
  - `tabular-nums` se met **seulement** sur un montant, une date, un compte, une graduation d'axe. Jamais sur
    un nom, une référence, un numéro de facture, un ISRC (ils restent en texte).
  - Dans « Reste 3 400 € », seul le chiffre est en mono : `Reste <span className="tabular-nums">3 400 €</span>`
    (modèle `RestAmount`).

---

## 3. Couleur : ce que chaque couleur veut dire

Aucune nouvelle couleur. Toutes viennent des tokens existants (`--text-*`, `--tone-*`, `--selection`,
`--hue-*`, `--error`).

| Sens | Rendu | Exemple de composant |
| --- | --- | --- |
| Texte principal | `--text-primary` | nom d'une ligne, valeur |
| Secondaire | `--text-secondary` | titre de carte, sous-ligne, légende, axe, en-tête de colonne, total sous liste |
| Tertiaire | `--text-tertiary` | libellé d'un fait (`SheetFacts`), surtitre d'une fiche, placeholder |
| Argent qui entre | `--tone-success-fg` + « + » | `SignedAmount` |
| Argent qui sort | encre + « − » | `SignedAmount` |
| Manque / dépassement / retard sur un chiffre | `--error` (sur **son propre** `<span>`) | `RestAmount`, `MetricCard danger` |
| Avertissement (82 %, sous la réserve) | `--tone-warning-fg` | jauge, point bas du graphique |
| Sélection, focus, proposition retenue | `--selection` / `--selection-bg` | cadre « Correspond à », case cochée |
| Catégorie (poste, type) | carré `size-2.5 rounded-xs` de sa teinte fixe | `PostLabel`, `postShade` |
| Graphique | une seule encre : réel plein, prévu en tirets, sorties hachurées | `TreasuryChart`, `FlowBars` |

La cloche passe son compteur en ton danger **seulement** si une alerte est grave.

---

## 4. Densité : la grille (à respecter au pixel)

### 4.1 Les seules valeurs permises

- **Espacements** (gap, padding, margin) : `2, 4, 6, 8, 12, 16, 20, 24, 32` px
  (Tailwind `0.5, 1, 1.5, 2, 3, 4, 5, 6, 8`). 2 et 6 seulement à l'intérieur d'un petit élément (icône ↔ texte,
  point ↔ mot). Rien d'autre : pas de `gap-2.5`, `p-3.5`, `mt-7`, `py-[9px]`.
  Seules exceptions déjà admises, internes à un composant commun : `px-3.5` (14 px) des cellules de tableau et
  `py-2.5` (10 px) des lignes de lien et des faits. On ne les réutilise pas ailleurs.
- **Hauteurs** de contrôle : **24** (xs), **32** (sm, bouton-icône de barre), **40** (défaut : bouton, champ,
  recherche, filtre, élément de navigation), **44** (en-tête de tableau), **48** (ligne de tableau), **56**
  (bandeau du haut, tête de la colonne de navigation).
- **Icônes** : 16 px partout (`size-4`) ; 14 px dans un bouton `sm` ; 12 px dans un `xs` ; 20 px seulement dans
  la pastille ronde d'une ligne (`size-9` → icône `size-5`).

### 4.2 Les mesures de référence

| Élément | Mesure | Classe / token |
| --- | --- | --- |
| Gouttière de page | 16 téléphone, 32 bureau | `px-4 md:px-[var(--page-gutter)]` (`PageContainer`) |
| Haut / bas de page | 24 téléphone, 32 bureau | `py-6 md:py-8` |
| Espace entre blocs d'une page | **24** | `PageContainer className="gap-6"` (comme `FinanceFrame`) |
| Espace entre cartes d'une grille | **16** | `grid gap-4` |
| Barre d'outils → tableau | **16** | `SearchableList` `gap-4` |
| Entre outils d'une barre | **12** | `gap-3` (`ListToolbar`) |
| Tableau → total dessous | **12** | `gap-3` |
| Carte : padding / entre ses parties | **20 / 20** | `MetricCard` `p-5 gap-5` |
| Carte : chiffre → sa légende | 4 | `gap-1` |
| Bandeau du haut | **56** de haut, filet dessous, collé au défilement | `FinanceTopbar` `h-14 sticky top-0` |
| Colonne de navigation | 200 de large, `p-2`, tête de 56 alignée sur le bandeau | `ContextSidebar` |
| Élément de navigation | **36** (Sacha, 16/11/2026 : 40 faisait étiré, 32 en 14 px beaucoup trop petit ; 38-40 en classique). Barre principale : 15 px, icône 18, 2 px entre deux éléments ; colonne d'une section : 14 px, icône 16 | `navItemClass`, `contextNavItem` |
| Bouton | 40 (défaut et `lg`), 32 (`sm`), 24 (`xs`) ; 14 px semi-bold (550) | `Button` |
| Bouton-icône | 40 (`icon`, `icon-lg`), 32 (`icon-sm`), 24 (`icon-xs`), arrondi 6 | `Button` |
| Champ, recherche | 40, arrondi 6, 15 px | `Field`, `FIELD_CONTROL` |
| Filtre segmenté | cadre arrondi 8, segment 30 de haut (`--density-control-h` − 10), arrondi 6 ; compact : 28 (son `text-xs` en dur passe à `--type-caption`) | `SegmentedControl` |
| En-tête de tableau | 44, bandeau `--surface-soft`, 15 px secondaire | `DataTableHead` `h-11` |
| Ligne de tableau | **48** minimum (aujourd'hui 46 + filet : poser `h-12` sur `DataTableCell`), 15 px, `px-3.5 py-3` | `DataTableCell` |
| Bord de ligne | 16 de chaque côté | `ROW_INSET` |
| Ligne de lien | `py-2.5 px-2`, filet entre lignes, 15 px + sous-ligne 13 px | `LinkRows` |
| Fait d'une fiche | `py-2.5`, libellé 160 max à gauche, 13 px tertiaire | `SheetFacts` |
| Fiche / panneau de droite | 520 de large, à 12 du bord haut, bas et droit, arrondi 8, filet, **pas d'ombre** ; contenu `px-6`, `gap-6` (fiche) / `p-6 gap-5` (formulaire) | `FinanceSheet`, `rightPanel` |
| Modale centrée | 520 (`--dialog-width`), arrondi 12 | `DialogContent side="center"` |
| Infobulle | apparaît en 150 ms | `TooltipTrigger delay` |

Les deux corrections signalées (élément de navigation 36, ligne 48) s'appliquent **aussi dans Finance** : c'est la
même règle partout.

### 4.3 Les tokens `--density-*`

`--density-control-h` (40), `--density-field-h` (40) et `--density-control-pad-x` (18) pilotent les boutons, la
recherche et les segmentés : on les garde. Le mode `[data-density="compact"]` n'est posé nulle part aujourd'hui :
ne pas l'activer pendant ce chantier (il casserait la grille ci-dessus).

---

## 5. La coquille d'une page

### 5.1 Section hors projet (Finance aujourd'hui, à étendre : Réseau, Catalogue, Contrats, Deals, Calls…)

De gauche à droite, tout collé au bord, pleine hauteur :

1. **Barre principale** repliée en icônes (comme dans un projet).
2. **Colonne de la section** (`ContextSidebar`, 200 px) : en tête le nom de la section en 15 px semi-bold
   (`px-2.5 py-2`), puis **une liste plate** d'entrées, chacune avec son **icône** Nucleo (16 px), son libellé
   14 px, et à droite le **nombre de ce qui attend** (`CountBadge`) quand il y en a. Pas de groupes titrés.
   Active : fond `--surface-sunken`, encre ; survol : `--surface-soft`. Sur téléphone, la colonne devient une
   rangée d'onglets (`SectionTabs`).
3. **Bandeau du haut** (`FinanceTopbar` → à remonter en `components/shell/section-topbar.tsx`) : 56 px,
   toute la largeur de la page, filet `--border-hairline` dessous, collé en haut au défilement ; la **recherche ⌘K**
   sans contour sur toute la ligne, à droite la **cloche** (bouton-icône `outline` 32 px) avec son compteur.
4. **La page** (`PageContainer gap-6`) :
   - **pas de titre visible** sur une page de section : le `<h1>` reste pour les lecteurs d'écran
     (`className="sr-only"`) — la colonne dit déjà où l'on est ;
   - l'**action principale** sous le bandeau, **à droite** (ou sur la ligne des onglets / des outils quand la page
     en a, § 6.1) ;
   - une page **sous** une section (un budget, un contact, un titre du Catalogue) **garde** son nom en titre
     visible (`PageHeader`, 28 px), avec le lien de retour **au-dessus** du titre.
5. **Chargement** : `loading.tsx` dessine **le même cadre** (colonne, bandeau, thème) et des squelettes à la forme
   de la page, **sans titre** (modèle `FinanceLoading` → à remonter en `SectionLoading`). Rien ne doit sauter
   quand la page arrive.

### 5.2 Pages d'un projet

Le patron `JourneyLayout` reste (parcours à gauche, `ProjectHeader head={step}` dont le h1 est le titre de
l'étape, `StepPanel`). Il prend les tokens (titre d'étape 24 px, texte 15 px, cartes 8 px) et tous les patterns
du § 6 (tableaux, états, boutons, panneau de droite). Le h1 d'étape reste **visible** : ce n'est pas une page
liste.

---

## 6. Les patterns (chacun le même partout)

### 6.1 Page liste

Ordre, sans rien d'autre au-dessus :

1. **Une ligne d'outils** (`SearchableList` + `ListToolbar`) : la **recherche** à gauche (elle prend la place,
   `flex-[2_1_18rem]`) ; à droite, dans cet ordre : les **filtres** (`UrlFilters`, état dans l'URL), le filtre
   segmenté des vues avec leurs comptes (`DataTableViews segmented`), le menu **« Colonnes »** si le tableau a
   des colonnes optionnelles, puis l'**action** : « + » en bouton-icône noir (`iconOnly`, infobulle 150 ms) ou
   le bouton à libellé de la page.
2. **Le tableau** (§ 6.3).
3. **Le total** de ce qui est listé, sous le tableau, aligné à droite, 14 px secondaire, le nombre puis les
   montants (`tabular-nums`), le total final à l'encre ; il **suit la recherche et les filtres** (modèle `Total`
   de `spends-list.tsx`).

Interdits sur une page liste : titre visible, phrase d'intro, cartes chiffrées au-dessus du tableau (les chiffres
vont dans le total ou sur une page de synthèse), onglets soulignés (remplacés par le segmenté), « Maintenant / à
vous / attendus » (mémoire « Liste = la liste seule »).

Vide : `EmptyState` (icône, titre, une phrase qui dit quoi faire) quand il n'y a **rien du tout**, avec l'action
de la page ; `EmptyNote` quand un filtre ne garde rien. Formulation positive quand c'est une bonne nouvelle
(« Tout est rattaché », « Aucun justificatif en attente »).

### 6.2 Barre d'outils, filtres, segmentés

- Un filtre se place **juste au-dessus de ce qu'il filtre** (le budget d'un camembert dans sa carte, le statut
  au-dessus des postes), jamais en tête de page s'il ne filtre qu'un bloc.
- 2 filtres au plus en ligne (`inline={2}`), les autres dans le bouton « Filtres » (`FilterBar`).
- Un choix de 2 à 4 vues = **segmenté** avec comptes (« À rattacher 12 »), jamais des onglets.
- Horizon d'une page de synthèse (30/60/90 j) : à **gauche** ; les actions : à **droite**.

### 6.3 Tableau (`DataTable`)

Déjà global (`components/ui/data-table.tsx`, `table.tsx`), il prend les tokens. Ce qu'il doit être partout :

- Cadre : filet `--border-default`, arrondi 8, fond carte. Dans une carte de section, il perd cadre et bandeau
  (`table-flat`) ; les pages hors projet le gardent (`framed`).
- En-tête : 44 px, bandeau `--surface-soft`, libellés 15 px `font-medium` (450) **gris secondaire**.
- Lignes : 48 px min (§ 4.2), 15 px, filet `--border-hairline` entre les lignes, **filet vertical** entre les
  colonnes (déjà dans `TableHead`/`TableCell`), 16 px aux deux bouts.
- Colonnes : 192 px fixes, une ou plusieurs `fill` qui prennent le reste ; colonnes secondaires cachées sous un
  point de rupture (`hideBelow`) ; **5 à 6 colonnes visibles** au plus, le reste dans « Colonnes ».
- Montants **à droite** (`align="end"`), en `tabular-nums` ; dates en `tabular-nums`.
- Cellule vide : `—` (`EMPTY_CELL`) quand rien n'est attendu ; le **mot du travail à faire** quand quelque chose
  manque (« Manquant », « Pas encore »).
- Une ligne qui s'ouvre : `DataTableLink` (lien étiré, survol `--control-bg-hover`) ; vers une fiche latérale :
  `onOpen`. Les gestes de la ligne : « ⋯ » à droite (`RowActions`), visibles au survol (`reveal`) ; un bouton de
  ligne est en **contour**.
- Téléphone : la colonne `fill` se tronque (`max-sm:max-w-0`), le montant reste dans le cadre.

### 6.4 État : un point et un mot

`StatusBadge` avec un `tone` de `lib/ui/state-tones.ts` (jamais choisi au cas par cas). Rendu cible :
**point de 6 px + texte 14 px, sans fond, sans hauteur imposée**, `gap: 6px`. Texte à l'encre ; **orange** pour
avertissement, **rouge** pour danger. Couleur du point : tertiaire (neutre), info, succès, sélection (action),
avertissement, danger. Les **teintes de catégorie** (`hue`) gardent leur pastille pleine : ce ne sont pas des
états. L'état dit la **prochaine action** quand il y en a une (« À rattacher », « Sans justificatif »), pas un
état technique.

### 6.5 Carte chiffre (`MetricCard`)

Toute carte qui porte un chiffre a **la même anatomie**, dans cet ordre :

1. en-tête 32 px min : **titre 13 px gris** à gauche (+ `CountBadge` s'il compte des choses), à droite un lien
   « Tout voir » (`MetricCardLink`, 13 px gris, souligné au survol) ou un choix de période ;
2. le **chiffre en grand** (`text-display-md`, 24 px ; `size="lg"` = 28 px pour le chiffre principal de la page),
   en Google Sans, pas en mono ; rouge sur son propre `<span>` si c'est un problème (`danger`) ;
3. **une** ligne de légende 13 px gris ;
4. la légende d'un graphique s'il en suit un ;
5. le détail : un graphique, une bande de 3 chiffres (`CardFigures` : libellé 13 px gris au-dessus, valeur
   16 px), ou 3 à 5 lignes de lien (§ 6.6).

Une carte sans enfants avec `href` devient entièrement cliquable (lien étiré). Une carte **vide n'est pas
dessinée** (pas de « 0 € » ni de « Aucun… » dans une carte de synthèse). Les cartes d'une même rangée ont la
**même hauteur** et leurs chiffres viennent du **même calcul** que la page détaillée (une seule fonction).
`StatTiles` + `PageSection` + `ListCard` mêlés pour montrer des chiffres : remplacés par des `MetricCard`.

### 6.6 Lignes de lien (`LinkRows`, à remonter dans `components/ui/`)

Une liste courte dans une carte : chaque ligne = ce qu'est la chose (15 px, encre) et son détail dessous (13 px
gris), à droite un montant, une date ou un état ; filet entre les lignes ; toute la ligne mène à la page où on
agit (survol `--control-bg-hover`, arrondi 6). Utilisée pour « À surveiller », les alertes, les avances, les
dépôts. Remplace les petites listes maison des autres pages.

### 6.7 Détail d'une ligne : la fiche latérale

Modèle : `FinanceSheet` (`components/finance/finance-sheet.tsx`) → à remonter en `components/ui/side-sheet.tsx`
(avec `SheetHead`, `SheetFacts`), et utilisé pour **toute ligne de liste qu'on consulte** (dépense, opération,
facture, contact, fichier, version audio, tâche…).

- Panneau à droite, **flottant** à 12 px des bords, 520 px, arrondi 8, filet `--border-default`, **sans ombre** ;
  pleine largeur sur téléphone ; entre en glissant de 24 px avec un fondu (`--duration-base`, `--ease-out`).
- Derrière : la liste **reste visible** sous le voile sombre de l'app (`--glass-scrim`), pas un voile clair.
- En tête : le **nom de la ligne** en titre (18 px) à côté de la croix (`ghost icon-sm`). Pas de compteur, pas de
  flèches à l'écran ; **↑ ↓** passent à la ligne voisine au clavier, **Échap** ferme.
- Contenu (`gap-6`) : `SheetHead` (surtitre 13 px tertiaire = où la ligne se range ; montant en 28 px, vert si
  entrée ; ligne d'état dessous), puis `SheetFacts` (libellé / valeur, filet entre chaque), puis les gestes
  (une action principale noire au plus, le reste dans « ⋯ »), puis l'historique de l'enregistrement.
- Une source commune (« Lu dans le PDF ») se dit **une fois** dans le titre de la section, pas sur chaque valeur.

### 6.8 Formulaires et gestes : le panneau de droite

Dans Finance, **toute** modale s'ouvre en panneau à droite (`DialogSideProvider side="right"`), par-dessus la
fiche d'où elle part : on reste où l'on est. Cible : `DialogSideProvider side="right"` posé **au niveau de la
coquille de l'app**, donc `FormDialog`, `ConfirmDialog`, `DialogButton`, `LoadedFormButton` s'ouvrent à droite
partout. Exceptions qui restent centrées (`side="center"`) : la recherche ⌘K, la visionneuse d'images, la
présentation de première connexion, PO ouvert par Espace Espace.

- Même dessin que la fiche (520 px, 12 px des bords, arrondi 8, sans ombre, voile sombre), contenu `p-6 gap-5`,
  croix en haut à droite.
- Pied : `DialogFormActions` (bouton principal d'abord, à gauche, puis « Annuler »). Pas de filet sous le titre.
- Les règles de formulaire de `CLAUDE.md` ne bougent pas (« * » après le libellé, champs en rouge avec leur raison
  au premier essai, `PersonPickerField`, pré-remplissage).
- `rightPanel` (`dialog.tsx`) et `FinanceSheet` répètent aujourd'hui la même suite de classes : la mettre **une
  fois** dans une constante partagée en remontant la fiche.

Cela remplace la règle « Modale : une seule, verre » (`DESIGN.md` § 4) : le verre centré ne reste que pour les
exceptions ci-dessus.

### 6.9 Boutons

- **Une seule action principale** par page et par fiche : bouton **noir** 40 px (`default`). Ses autres gestes
  dans un « ⋯ » (`RowActions size="icon-lg"`) à côté.
- Secondaire : **contour** (`outline`). `ghost` seulement à côté d'un contour, jamais une rangée de `ghost` seuls.
- Dans une ligne de tableau ou une carte : contour `sm` (32 px).
- Bouton-icône seul : toujours une **infobulle** (150 ms) et un nom pour les lecteurs d'écran
  (`DialogButton iconOnly`).
- Arrondi 6 px pour tous (`--button-radius`), libellé 14 px semi-bold (550). Le survol (grossit à 1.05, libellé qui
  roule) ne change pas.
- Le libellé de l'action suit l'état (« Marquer envoyée », puis « Enregistrer un encaissement »).

### 6.10 Montants, dates, chiffres

- Montant signé : `SignedAmount` (« + » vert pour une entrée, « − » encre pour une sortie) → à remonter dans
  `components/ui/` dès qu'un autre domaine montre de l'argent (Budget d'un projet, Deals).
- Reste / dépassement : `RestAmount` — « Reste 3 400 € », ou « Dépassé de 30 778 € » en rouge, **jamais un reste
  négatif**.
- HT / TTC : TTC d'abord, HT dessous dans une fiche.
- Dates : `Timestamp` pour un instant, `formatShortDay` pour un jour ; relatif calculé par le code
  (« il y a 3 j », « dans 5 j »), jamais écrit par l'IA.

### 6.11 Graphiques

- Dessinés **à la taille de leur carte** (pas d'image mise à l'échelle), textes 13 px `--text-secondary`.
- **Une seule encre** : réel en trait plein 2 px `--text-primary`, prévu en tirets `5 4` `--text-tertiary`, grille
  en tirets légers `2 4` `--border-default`, réserve en pointillé ambre `2 7`, point bas = rond 10 px ambre cerclé
  de la carte.
- Barres : entrées en encre pleine, sorties **hachurées** (`repeating-linear-gradient(135deg, …)`), haut arrondi 2,
  largeur max 28, montant 12 px au-dessus, mois à venir plus pâles. Légende en carrés 10 px arrondi 2, au-dessus.
- Camembert : légende **dessous**, couleurs = teintes fixes des catégories.
- `dataviz` (skill) pour tout nouveau graphique, avec ces valeurs.

### 6.12 Menus, infobulles, recherche

- Les menus en portail prennent le thème de la section (`useSectionThemeClass`) — inutile une fois les tokens
  promus dans `:root`.
- ⌘K : modale centrée posée en haut (12 vh) pour ne pas sauter quand la liste change, 560 px ; champ vide =
  propose les gestes de création de la section ; trouve par nom, montant ou numéro et ouvre la fiche
  (`?ouvrir=<id>`).

---

## 7. Vocabulaire et texte

- Un mot par chose dans toute l'app, une fois choisi (Finance : budget, « Autre », entrée, opération, rattacher).
  Un écran qui emploie un ancien mot est corrigé dans `lib/i18n/fr/`.
- Pas de phrase de règle sous un titre ; un total sur une ligne masqué s'il est vide ; actions de ligne dans « ⋯ »
  (mémoire « Moins de texte à l'écran »).
- Les états vides disent « tout va bien » quand c'est le cas.

---

## 8. Ce qui est propre à Finance et ne se généralise pas

- Les écrans métier : Trésorerie, Planning (calendrier), Rapprochement, Justificatifs, moteurs de Financements.
- `FinanceTopbar` ne se recopie pas : il devient le bandeau commun des sections (§ 5.1, cloche = alertes de la
  section ou notifications selon la section ; à trancher par section, sinon la recherche seule).
- Les cartes-phrases (`FinanceHome`, `SentenceCard`, `FinanceBriefCard`, `FinanceAsk`) sont gardées dans le code
  pour la **future vue d'ensemble générale (accueil)** : c'est leur seule cible.
- La boîte « Je veux… » de PO en `flat` (angles droits) : seulement là où elle est aujourd'hui.

---

## 9. Plan de migration (un lot = un commit, `pnpm build` vert, captures avant / après)

| Lot | Contenu | Vérifier |
| --- | --- | --- |
| 0 | **Tokens** : valeurs `.finance-scope` dans `:root` / `@theme` (§ 2), règles état et Geist Mono rendues globales, nav 40 px et ligne 48 px (§ 4.2) ; `pnpm ds:tokens` ; `docs/DESIGN.md` § 2 et § 4 réécrits | toutes les pages principales en clair, sombre, 375 px : rien de coupé, aucun bouton qui déborde |
| 1 | **Composants remontés** : `SideSheet` (+ `SheetHead`, `SheetFacts`), `LinkRows`, `CardFigures`, `SignedAmount`, `RestAmount`, `SectionTopbar`, `SectionLoading`, constante du panneau de droite ; Finance les importe ; `docs/COMPOSANTS.md` à jour | Finance identique pixel pour pixel (comparer au proto capturé, `docs/PROTOS.md` § 8) |
| 2 | **Panneau de droite partout** : `DialogSideProvider side="right"` dans la coquille de l'app, exceptions en `center` | chaque `FormDialog`, `ConfirmDialog`, `DialogButton` ouvert au moins une fois ; PO peut toujours ouvrir le vrai formulaire pré-rempli |
| 3 | **Sections hors projet** (Réseau, Catalogue, Sessions studio, Contrats, Deals, Calls, Équipe, Retours) : coquille § 5.1 (colonne plate à icônes, bandeau, page sans titre), pages listes § 6.1, détail en fiche § 6.7 | chaque liste : recherche, filtres dans l'URL, total, vide |
| 4 | **Pages d'un projet** : tokens et patterns (tableaux, états, cartes chiffre, boutons), `JourneyLayout` gardé | chaque étape de chaque workflow, rôle responsable et DG |
| 5 | **Accueil, Travail, Calendrier, Réglages** | |
| 6 | **Nettoyage** : bloc `.finance-scope` supprimé, plus aucune valeur en dur (`grep -rn "text-\[1[0-9]px\]\|rounded-\[\|h-\[3[0-9]px\]" components app`), `docs/FINANCE-V2.md` dit « style global » | `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm ds:tokens:check` |

À chaque lot : un pattern modifié l'est **partout** dans le même commit (règle 7 de « Composants d'abord ») ;
jamais une option activée sur un seul écran.

### Checklist par écran

- [ ] Texte courant 15 px, rien sous 13 px hors micro-chiffres ; aucune taille en dur.
- [ ] Graisses : 450 partout, 550 pour ce qui ressort, pas de `font-bold` décoratif.
- [ ] Arrondis : cartes et tableaux 8, champs et boutons 6, modale centrée 12, rien d'autre.
- [ ] Mesures de la grille § 4 (gaps 4/8/12/16/20/24/32, hauteurs 24/32/40/44/48/56).
- [ ] Liste : outils → tableau → total, pas de titre ni de phrase, filtres dans l'URL.
- [ ] États en point + mot, ton de `state-tones.ts`.
- [ ] Une seule action noire ; secondaires en contour ; « ⋯ » pour le reste ; bouton-icône avec infobulle.
- [ ] Détail d'une ligne en fiche latérale ; formulaire en panneau de droite.
- [ ] Montants à droite, `tabular-nums` sur montants et dates seulement.
- [ ] Couleur = donnée uniquement.
- [ ] Vide et chargement au format (même cadre, pas de saut).
- [ ] Sombre correct, 375 px sans défilement horizontal, clavier (focus visible, Échap, ↑ ↓).

---

## 10. Ce qui contredit `docs/DESIGN.md` (à réécrire au lot 0)

| `DESIGN.md` dit | Devient |
| --- | --- |
| § 2 : medium (500) minimum, jamais de regular | 450 par défaut, 550 pour ce qui ressort (§ 2.2) |
| § 2 : 16 px courant, 14 px au plus petit | 15 px courant, 13 px légende, 12 px micro-chiffre |
| § 4 « Arrondis » : cartes 12, bouton-icône 8, bouton en pilule | cartes 8, bouton-icône 6, **tout bouton 6** ; pilule réservée aux badges et puces |
| § 4 « Modale : une seule, verre » | panneau de droite pour formulaires et gestes, fiche latérale pour le détail ; verre centré pour ⌘K, visionneuse, présentation |
| § 4 « Finance, nouveau style… » : « écart voulu, limité à Finance », « boutons en pilule », fiche « 560 px » | ce n'est plus un écart ; boutons 6 px ; fiche 520 px |
| `CLAUDE.md` § Design system : « medium minimum, 16 px courant » ; « Une seule modale » | même mise à jour (le fichier doit rester sous 25 000 caractères) |

Et deux commentaires périmés à corriger au passage : la fin du bloc `.finance-scope` de `app/globals.css`
(« bouton en pilule… aucune règle de forme propre à Finance » alors que `--button-radius: 6px` est posé juste
au-dessus) et le lot 2 de `docs/FINANCE-V2.md` (« cellules 14 px », « sans bandeau » : les tableaux ont repris le
bandeau du design system, cellules à 15 px).

---

## 11. Vérifier (à chaque lot, pas à la fin)

- `pnpm lint`, `pnpm typecheck`, `pnpm build` ; `pnpm ds:tokens:check` dès que `globals.css` change.
- Juger en `pnpm start`, jamais en `pnpm dev`.
- Captures avant / après des écrans touchés, en **clair et sombre**, à **1440** et **375** px (Chrome).
- Finance doit rester identique après chaque lot : c'est la référence. Toute différence visible dans Finance est
  une régression.
- Un seul test navigateur à la fois sur la stack locale, jamais deux comptes DG (mémoire « Tests UX »).

---

## 12. Pièges connus

- **Références circulaires** : `--radius-*` et `--font-weight-*` sont déclarés dans `@theme` (Tailwind les publie
  lui-même). Les redéclarer dans `:root` crée une boucle : changer leurs valeurs **dans `@theme`**.
- **`cn` ne garde qu'une classe `text-*`** : une couleur sur un chiffre va sur **son propre** `<span>`, sinon elle
  efface la taille (`MetricCard`, `RestAmount`).
- **`rounded-lg` des boutons-icônes** gagne sur `--button-radius` (fusion par `cn`) : c'est voulu, ils suivent
  `--radius-lg` (6).
- **Éléments en portail** : sans le token global, ils retombent sur le style par défaut ; c'est pour ça que
  Finance passe sa classe par `DialogSideProvider`. Une fois les tokens dans `:root`, le problème disparaît.
- **Safari et `<tr relative>`** : `DataTableRow` garde `[transform:translate(0)]`, ne pas l'enlever.
- **`tabular-nums` sur un nom** le passe en mono : ne le mettre que sur des chiffres.
- **`table-flat` dans une carte de section** : le tableau y perd cadre, bandeau et filets verticaux ; ne pas les
  rajouter à la main, utiliser `framed` si la page en veut.
- **Fichiers longs** : remonter un composant ne doit pas faire passer un fichier au-delà de ~200 lignes ; découper.
- **Travail en parallèle** dans le même dépôt : ne formater et committer que ses fichiers (mémoire).

---

## 13. Les deux styles tant qu'Ibé n'a pas validé (16/11/2026)

Décision de Sacha (16/11/2026) : le nouveau style est posé sur **toute** l'app, mais l'ancien reste **entier**
derrière un interrupteur, pour qu'Ibé compare. S'il valide, on supprime l'ancien ; s'il refuse, on revient à
l'ancien. Le lot 6 (nettoyage) attend donc sa décision.

- **Qui choisit** : chacun, dans **Réglages › Style de l'interface** (Nouveau / Ancien), gardé dans le cookie
  `pds-style` de son navigateur (`components/settings/style-choice.tsx`). **Par défaut : le nouveau.**
- **Comment c'est posé** : la mise en page racine (`app/layout.tsx`) lit le cookie côté serveur et pose
  `<html data-style="classic">` dans le HTML même (`designStyleAttribute`, `lib/ui/design-style.ts`). Rien ne
  clignote, et plus de script en ligne (React 19.2 le signalait, 20/11/2026).
- **Ce qui suit le style** :
  - les **tokens** : les valeurs du § 2 sont celles de `:root` et `@theme` ; les valeurs d'avant sont gardées
    telles quelles dans le bloc `:root[data-style="classic"]` d'`app/globals.css` (la trace de l'ancien
    design) ;
  - les **règles de forme** (état en point + mot, chiffres en Geist Mono) : toute l'app en nouveau style,
    Finance seule en classique ;
  - les **variantes Tailwind** `modern:` (nouveau style seulement) et `classic:` (ancien seulement), pour
    tout écart de structure dessiné par le serveur (titre d'une page liste masqué, bandeau du haut, onglets
    ou segmenté) ;
  - **`useDesignStyle()`** (`components/shell/use-design-style.ts`) pour ce que le client seul dessine : les
    modales s'ouvrent **à droite** en nouveau style, **au centre** (verre) en classique ; ⌘K, la
    visionneuse, la présentation, PO et le menu du téléphone restent centrés dans les deux (`side="center"`).
- **Finance en classique** reste exactement comme le 16/11 au matin : `.finance-scope` et son
  `DialogSideProvider side="right"` sont gardés.
- **Validé** : supprimer le bloc `:root[data-style="classic"]`, `.finance-scope`, toutes les classes
  `classic:` (et le préfixe `modern:` des autres), le script, l'interrupteur et `useDesignStyle`.
  **Refusé** : remettre les valeurs du bloc classique dans `:root`/`@theme`, supprimer les classes `modern:`
  et le reste ci-dessus. Les deux se trouvent par `grep -rn "classic:\|modern:\|useDesignStyle"`.
- **Composants remontés au lot 1** : `SideSheet` (`components/ui/side-sheet.tsx`, ex-`FinanceSheet`, avec
  `SheetHead`, `SheetFacts`), `LinkRows`, `SignedAmount`, `RestAmount` (`components/ui/`), `SectionTopbar`,
  `SectionLoading` (`components/shell/`), la classe du panneau de droite (`components/ui/side-panel-class.ts`,
  `size` de `DialogContent` pour un formulaire long : `medium`, `wide`).
- **Pages listes** : `PageHeader list` (titre pour les lecteurs d'écran seulement en nouveau style, action
  seule à droite), `PageLoading list`, `DataTableViews` en segmenté en nouveau style et en onglets en classique.
