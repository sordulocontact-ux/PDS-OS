<!-- Imported from Ibé's PO repository (po/DESIGN.md), unchanged: source of truth for the look of PDS OS. -->

# PO — DESIGN SYSTEM

Source de vérité pour toute question d'apparence. À lire avant la création ou la modification d'un écran.

**Le principe** : une seule couleur, le noir. Tout le reste est un gris ou du blanc. Aucune teinte décorative. Les états se distinguent par le contraste, jamais par la teinte.

---

# 1 — COULEURS

## Encre et gris

| Token | Valeur |
|---|---|
| `--po-black` / `--po-ink-900` | `#000000` |
| `--po-ink-800` | `#111111` |
| `--po-ink-700` | `#1c1c1c` — fond d'entrée de rail active |
| `--po-ink-600` | `#282828` — survol du primaire |
| `--po-grey-600` | `#5e5e5e` |
| `--po-grey-500` | `#767676` |
| `--po-grey-400` | `#8f8f8f` |
| `--po-grey-300` | `#afafaf` |
| `--po-grey-200` | `#d4d4d4` |
| `--po-grey-150` | `#e2e2e2` |
| `--po-grey-100` | `#ececec` |
| `--po-grey-50` | `#f4f4f4` |
| `--po-white` | `#ffffff` |

## Texte

| Token | Valeur |
|---|---|
| `--text-primary` | `#000000` |
| `--text-secondary` | `#5e5e5e` |
| `--text-tertiary` | `#767676` |
| `--text-muted` | `#afafaf` |
| `--text-on-dark` | `#ffffff` |
| `--text-on-dark-secondary` | `#8f8f8f` |
| `--text-link` | `#000000`, souligné. **Jamais de bleu** |

## Surfaces

| Token | Valeur |
|---|---|
| `--surface-page` · `--surface-raised` | `#ffffff` |
| `--surface-soft` | `#f4f4f4` |
| `--surface-sunken` | `#ececec` |
| `--surface-pressed` | `#e2e2e2` |
| `--surface-inverse` | `#000000` |
| `--surface-inverse-raised` | `#1c1c1c` |

## Bordures

| Token | Valeur | Usage |
|---|---|---|
| `--border-hairline` | `#ececec` | lignes de tableau |
| `--border-default` | `#d4d4d4` | boutons, cartes |
| `--border-strong` | `#000000` | focus, erreur |
| `--border-field` | `#dcdcdc` | champs |
| `--border-on-dark` | `#2a2a2a` | séparations sur fond noir |

## Rail de navigation

*Écart assumé par rapport à la base : le rail est noir.*

| Token | Valeur |
|---|---|
| `--nav-bg` | `#000000` |
| `--nav-fg` | `#ffffff` |
| `--nav-fg-muted` | `#8f8f8f` |
| `--nav-section-fg` | `#767676` |
| `--nav-item-hover-bg` | `#141414` |
| `--nav-item-active-bg` | `#1c1c1c` |
| `--nav-item-active-rail` | `#ffffff` |
| `--nav-divider` | `#242424` |

## Traitements d'état — trois, et seulement trois

| État | Fond | Texte | Bordure |
|---|---|---|---|
| **Bloquant** (`blocked`) | `#000000` | `#ffffff` | `#000000` |
| **Normal** (`normal`) | `#ececec` | `#111111` | transparent |
| **En attente** (`pending`) | transparent | `#5e5e5e` | `#d4d4d4` |

## Jauges et contrôles

**Jauges** — `--meter-track #e2e2e2` · `--meter-fill #afafaf` · `--meter-fill-over #000000`

**Contrôles** — `--control-fg #000000` · `--control-bg #ffffff` · `--control-bg-soft #ececec` · `--control-bg-hover #f4f4f4` · `--control-bg-pressed #e2e2e2` · `--control-primary-bg #000000` · `--control-primary-fg #ffffff` · `--control-primary-bg-hover #282828` · `--focus-ring #000000` · `--overlay-scrim rgba(0,0,0,.4)`

---

# 2 — TYPOGRAPHIE

**Familles** — Display : Geist (600, 700). Texte : Inter (400, 500, 600). Mono et identifiants : Geist Mono (400, 500). Chargées depuis Google Fonts. Ce sont des substitutions assumées, pas des réglages provisoires.

**Graisses** — `--fw-regular` 400 · `--fw-medium` 500 · `--fw-semibold` 600 · `--fw-bold` 700

| Rôle | Token | Taille / interligne |
|---|---|---|
| Display XL | `--type-display-xl` | 40 / 44 px |
| Display LG | `--type-display-lg` | 32 / 36 px |
| Display MD | `--type-display-md` | 24 / 30 px |
| Display SM | `--type-display-sm` | 18 / 24 px |
| Chiffre XL | `--type-figure-xl` | 28 / 32 px |
| Chiffre LG | `--type-figure-lg` | 20 / 24 px |
| Chiffre MD | `--type-figure-md` | 14 / 20 px |
| Corps MD | `--type-body-md` | 14 / 20 px |
| Corps SM | `--type-body-sm` | 13 / 18 px |
| Légende | `--type-caption` | 12 / 16 px |
| Eyebrow (nav) | `--type-eyebrow` | 11 / 14 px, tracking `.09em` |
| Tête de colonne | `--type-colhead` | 12 / 16 px, tracking `.01em` |

**Règles**
- Titres display à 700, tracking serré : `−0.025em` entre 32 et 40 px
- Aucune italique
- Aucun letter-spacing sur les tailles de texte
- Chiffres toujours tabulaires
- Casse de phrase partout. La seule majuscule du système est l'eyebrow de nav à 11 px

---

# 3 — ESPACEMENT

| Token | Valeur |
|---|---|
| `--space-0` … `--space-32` | 0 · 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 px |
| `--page-gutter` | 32 px |
| `--page-max` | 1440 px |
| `--nav-width` | 232 px |
| `--nav-width-collapsed` | 64 px |
| `--stack-tight` / `--stack-default` / `--stack-loose` | 4 / 8 / 16 px |
| `--section-gap` | 32 px |

## Densité

| Token | Confortable *(défaut)* | Compacte `data-density="compact"` |
|---|---|---|
| `--density-row-h` | 58 px | 38 px |
| `--density-cell-pad-y` | 15 px | 7 px |
| `--density-cell-pad-x` | 18 px | 12 px |
| `--density-control-h` | 38 px | 30 px |
| `--density-control-pad-x` | 16 px | 11 px |
| `--density-field-h` | 40 px | 32 px |
| `--density-toolbar-gap` | 12 px | 8 px |
| `--density-card-pad` | 22 px | 14 px |
| `--density-nav-item-h` | 42 px | 32 px |
| `--density-section-gap` | 36 px | 20 px |
| `--density-meter-h` | 2 px | 2 px |

---

# 4 — ARRONDIS

`--radius-none` 0 · `--radius-xs` 2 px · `--radius-sm` 4 px · `--radius-md` 6 px (badges) · `--radius-lg` 8 px (champs, boutons carrés) · `--radius-xl` 10 px (cartes, modales) · `--radius-pill` 999 px · `--radius-circle` 50 %

**Rien n'est plus arrondi que 10 px, sauf une pilule.** La pilule est réservée aux éléments interactifs : boutons, chips de filtre, pistes segmentées, jauges. Tables et rail restent à 0.

---

# 5 — BORDURES ET ÉLÉVATION

| Token | Valeur |
|---|---|
| `--hairline` | `1px solid #ececec` |
| `--hairline-strong` | `1px solid #d4d4d4` |
| `--elevation-0` | none — défaut : cartes, tables, rail |
| `--elevation-1` | `0 1px 2px rgba(0,0,0,.06)` — menus, popovers |
| `--elevation-2` | `0 4px 16px rgba(0,0,0,.12)` — panneaux flottants |
| `--elevation-3` | `0 12px 32px rgba(0,0,0,.16)` — modales |

**La séparation se dessine, elle ne s'ombre pas.**

- Tables : filets horizontaux uniquement. Pas de règles verticales, pas de zébrures
- Aucune ombre intérieure
- La profondeur vient de l'inversion de polarité : encre contre blanc
- Transparence utilisée une seule fois : le voile de modale `rgba(0,0,0,.4)`, sans flou

---

# 6 — ANIMATION

| Token | Valeur |
|---|---|
| `--ease-standard` | `cubic-bezier(.2,0,.2,1)` |
| `--ease-out` | `cubic-bezier(0,0,.2,1)` |
| `--duration-instant` | 80 ms |
| `--duration-fast` | 120 ms — retour de contrôle |
| `--duration-base` | 180 ms — transitions de panneau |
| `--transition-control` | `background-color, border-color, color` en 120 ms / `--ease-standard` |

**Couleur et fond uniquement.** Rien ne s'agrandit, ne rebondit, ne glisse, ni n'apparaît en fondu au chargement. Les données s'affichent instantanément.

---

# 7 — COMPOSANTS ET ÉTATS

## core/

| Composant | États et variantes |
|---|---|
| **Icon** | Lucide, trait 1.75, monochrome `currentColor`. Tailles 14 (contrôles compacts), 15 (champs), 16 (boutons, chips, cellules), 18 (nav), 22 (états vides) |
| **Button** | `primary` (pilule noire, survol `#282828`), `secondary` (contour, survol fond `#f4f4f4` + bordure `#afafaf`), `ghost` (survol fond `#f4f4f4`, texte pleine encre). Tailles sm / md. Disabled. Icône en tête ou en fin |
| **IconButton** | mêmes variantes, carré 8 px de rayon. Disabled. Label obligatoire |
| **Input** | repos, survol, focus (bordure 1 px encre + anneau 1 px), erreur (`--border-strong`), disabled. Icône optionnelle. Placeholder en `--text-muted` |
| **Select** | repos, ouvert, focus, disabled. Chevron `chevron-down` |
| **Checkbox** | décoché, coché (glyphe check), disabled. Rayon 4 px |
| **SegmentedControl** | piste pilule, 2 à 4 segments, un actif. Tailles sm / md |

## data/

| Composant | États et variantes |
|---|---|
| **StatusBadge** | trois traitements seulement : `blocked` (encre pleine), `normal` (gris doux), `pending` (contour vide). Tailles sm / md. Point optionnel |
| **ProgressMeter** | filet 2 px gris sous 100 %. 3 px encre avec chiffre semibold au-delà (dépassement). Alignement gauche ou droite. Valeur affichable ou masquée |
| **Amount** | tailles sm / md / lg / xl. Chiffres tabulaires, alignés à droite, format fr-FR avec € final |
| **TwoLineCell** | nom semibold + ligne secondaire grise |
| **Avatar** | initiales sur gris. Tailles libres (24, 30, 32…). Ton clair ou dark pour le rail. **Jamais de photographie** |
| **FilterChip** | pilule. Repos, survol, active (encre pleine). Compteur optionnel |
| **DataTable** | filets horizontaux, survol de ligne en `#f4f4f4`, tri de colonne, lignes à deux niveaux, densité pilotée par tokens |
| **Pagination** | page courante, précédent/suivant désactivables, libellé de plage (« 1–30 sur 45 projets ») |

## navigation/

| Composant | États |
|---|---|
| **Sidebar** | rail noir 232 px, marque + sous-titre, groupes à eyebrow, pied utilisateur. Scroll propre |
| **NavItem** | repos (texte `#afafaf`), survol (texte blanc, fond `#141414`), active (fond `#1c1c1c` + filet blanc), disabled. Compteur à droite, icône optionnelle |

## layout/

| Composant | Notes |
|---|---|
| **PageHeader** | titre + ligne de contexte. **Un seul chiffre proéminent par en-tête** (28 px / 700, tabulaire) |
| **KeyFigure** | libellé mute + chiffre. Variante inverse (carte noire) |
| **Toolbar** | recherche, filtres, compteur de résultats. Ne défile pas |
| **Card** | rayon 10 px, filet, élévation 0 par défaut |
| **EmptyState** | icône 22 px, titre, instruction à l'impératif |
| **Modal** | rayon 10 px, élévation 3, voile `rgba(0,0,0,.4)` |

## Focus et état pressé

**Focus global** — contour 2 px encre pleine à 2 px d'offset. Les champs prennent une bordure 1 px encre + anneau 1 px. Jamais de halo, jamais de couleur.

**Pressé** — remplissage `#e2e2e2` sur contrôles clairs, sans changement d'échelle ni d'ombre.

---

# 8 — ABSENTS VOLONTAIREMENT

Ni Toast, ni Tooltip, ni Tabs, ni Switch, ni Accordion. Aucun écran validé n'en montre.

Si un besoin apparaît, il se discute avant d'être ajouté au système. **Ne crée pas de composant hors de cette liste sans me le signaler explicitement.**

---

# 9 — RÈGLES D'APPLICATION

- **Utilise toujours les composants existants dans `/components/ui`.** N'en crée un nouveau que si aucun ne convient, et signale-le
- Toute nouvelle page reprend la structure d'une page déjà validée
- Chaque écran prévoit ses trois états : chargement, vide, erreur. Un écran vide n'est jamais une page blanche : il porte une phrase et un bouton de création
- Densité confortable par défaut, compacte disponible en option
- Interface en français, code en anglais
