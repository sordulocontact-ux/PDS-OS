# Contrat des composants de base

Ce que chaque composant commun **est** (fichier, variantes, tailles, tokens lus, règles). Inventaire
complet de tous les composants : `docs/COMPOSANTS.md`. Décisions et historique : `docs/DESIGN.md`.
Colonne « Figma » = nom du composant sur la page **Design System** du fichier Figma PDS OS.

Règle commune : un composant ne lit **que** des tokens sémantiques (`--text-*`, `--surface-*`,
`--border-*`, `--tone-*`, `--hue-*`, `--selection*`, `--control-*`, `--nav-*`) ou les classes
Tailwind branchées dessus (`bg-card`, `text-foreground`, `border-border`…). Jamais une primitive
`--po-*`, jamais un hex, jamais une taille en px écrite dans le composant.

---

## Actions

### Bouton — `Button` (`components/ui/button.tsx`) · Figma `Bouton`

| Variante (code → Figma)  | Fond / texte                                                  | Survol                                            |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| `default` → Principal    | `--control-primary-bg` / `--control-primary-fg`               | `--control-primary-bg-hover`                      |
| `outline` → Contour      | `--surface-page`, filet `--border-default` / `--text-primary` | filet `--border-hover`, fond `--control-bg-hover` |
| `secondary` → Secondaire | `--control-bg-soft` / `--secondary-foreground`                | `--control-bg-pressed`                            |
| `ghost` → Fantôme        | aucun / `--text-secondary`                                    | `--control-bg-hover`, texte `--text-primary`      |
| `destructive`, `link`    | encre pleine (pas de rouge) ; lien souligné                   | —                                                 |

| Taille         | Hauteur                                 | Padding x                           | Texte                              |
| -------------- | --------------------------------------- | ----------------------------------- | ---------------------------------- |
| `default` (MD) | `--density-control-h` (40 / 30 compact) | `--density-control-pad-x` (18 / 11) | 15 px semi-gras (`--type-body-sm`) |
| `sm` (SM)      | 32 px                                   | 14 px                               | 14 px semi-gras (`--type-caption`) |
| `xs`, `lg`     | 24 px / densité                         | 10 px / 20 px                       | —                                  |

- Pilule (`rounded-full`, **pas** `rounded-pill` : tri des classes Tailwind). Icône 16 px (`size-4`).
- Désactivé : opacité 40 %. Appui : `scale(.97)`. Survol : `scale(1.05)` + libellé qui roule
  (`ButtonRoll`, `--duration-roll` 500 ms, `--duration-grow` 200 ms, `--ease-out`) ; coupé en mouvement réduit.
- **Un seul Principal par carte.** Un geste secondaire est en **Contour** ; **Fantôme** seulement à
  côté d'un Contour (« Annuler », geste de troisième niveau), **jamais une rangée de fantômes seuls**.
- Modale ou décision : le principal d'abord, à gauche, « Annuler » en dernier (`DialogFormActions`).

### Bouton icône — `Button size="icon" | "icon-sm" | "icon-xs"` · Figma `Bouton icône`

40 / 32 / 24 px, arrondi `--radius-lg` (8 px), icône 20 px (`size-5`). Contour ou Fantôme. Ne roule
pas. Toujours `aria-label` (texte de `lib/i18n/fr/`) + `aria-hidden` sur l'icône. Trois boutons ou
plus dans une rangée dense = boutons-icônes avec infobulle.

### Menu « ⋯ » — `RowActions` / `RecordMenu` · (pas de composant Figma)

Les actions d'une ligne vivent dans le menu, pas en boutons visibles.

---

## Pastilles et compteurs

### Pastille — `StatusBadge` (`components/ui/status-badge.tsx`) · Figma `Pastille`

| Ton (code → Figma) | Tokens                      | Sens                               |
| ------------------ | --------------------------- | ---------------------------------- |
| `neutral` → Neutre | `--tone-neutral-bg` / `-fg` | rien à faire, écarté               |
| `info` → Info      | `--tone-info-*`             | en cours, **À vérifier**           |
| `warning` → Alerte | `--tone-warning-*`          | attend quelqu'un, **À faire**      |
| `success` → Succès | `--tone-success-*`          | **Fait**, validé, en ligne         |
| `danger` → Danger  | `--tone-danger-*`           | bloqué, refusé, en retard          |
| `action` → Action  | `--tone-action-*` (gris)    | une validation attend une décision |

- `md` 24 px, padding 10 ; `sm` 20 px, padding 8 (lignes denses). 13 px semi-gras (`--type-micro`).
  Point de 6 px en option (`dot`).
- Le ton se choisit dans `lib/ui/state-tones.ts`, **jamais au cas par cas**.

### Pastille catégorie — `StatusBadge tone="<teinte>"` · Figma `Pastille catégorie`

Dix teintes `--hue-{sky,indigo,violet,pink,orange,yellow,lime,teal,sand,slate}-bg|fg`, choisies dans
`lib/ui/category-hues.ts`. Dit « laquelle » (étape, type), **jamais un état**.

### Compteur — `CountBadge` (`components/ui/count-badge.tsx`) · Figma `Compteur`

Pilule d'encre (`bg-foreground`, `text-background`), `md` 20 px, `sm` 16 px, `--type-eyebrow` semi-gras.
Ce qui attend quelqu'un se compte ici, jamais dans un bandeau.

### Avatar — `Avatar` (`components/ui/avatar.tsx`) · Figma `Avatar`

Rond 32 px, initiales 14 px semi-gras `--text-tertiary` sur `--surface-sunken`.

---

## Formulaires

### Champ — `Field` (`components/auth/field.tsx`) + `Input` (`components/ui/input.tsx`) · Figma `Champ`

| Partie    | Valeur                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------- |
| Pile      | libellé, champ, aide ou erreur ; écart 6 px                                                         |
| Champ     | 40 px (`--density-field-h`), arrondi 8, filet `--border-field`, fond `bg-card`, padding x 10, 16 px |
| Focus     | filet `--selection` + anneau 3 px `ring/50`                                                         |
| Erreur    | filet `--error` + anneau `error/20` ; `FieldError` 14 px `--error`                                  |
| Désactivé | opacité 50 %                                                                                        |

- **Obligatoire = « * »** après le libellé (`RequiredMark`, `--text-tertiary`) ; facultatif = rien,
  jamais le mot « facultatif ».
- Tous les champs d'un formulaire : 40 px et **toute la largeur** de la colonne
  (`formFieldControlClassName`, `components/ui/select.tsx`) ; un menu hors formulaire garde 32 px.
- À la validation : chaque manque en rouge avec sa raison, `FormMessage` qui compte, focus sur le
  premier ; jamais avant le premier essai, **jamais de bouton désactivé** pour ça.
- Désigner une personne = `PersonPickerField`, jamais un champ texte libre.
- Variantes du même contrat : `TextareaField`, `OptionSelect`, `SearchSelect` (> 10 choix),
  `DatePicker` (jamais le sélecteur natif).

### Case à cocher — `Checkbox` / `CheckboxField` (`components/ui/checkbox.tsx`) · Figma `Case à cocher`

`md` 20 px arrondi 6, `sm` 16 px arrondi 4. Cochée = `--selection` plein, coche blanche.

### Cartes de choix — `ChoiceCards`, `StartChoices` · (pas de composant Figma)

Sélection = `--selection-border` + `--selection-bg`. Départ d'une étape : la carte « Recommandé » en
premier, à gauche, bouton plein à son pied ; la carte entière est la cible.

---

## Listes et navigation dans une page

### Filtre — `FilterChip` (`components/ui/filter-chip.tsx`) · Figma `Filtre`

Pilule, min 36 px, padding 14, 16 px. Inactif : filet `--border-default`, fond `bg-background` ;
actif : encre pleine (`bg-primary`). Roule et grossit au survol. **Une pastille = un filtre**, jamais
« autre page ». Rangée recherche + filtres : `ListToolbar` / `FilterBar`.

### Onglet — `TabBar` (`components/ui/tab-bar.tsx`) · Figma `Onglet`

Texte 16 px, actif `--text-primary`, inactif `--text-secondary` ; trait d'encre 2 px qui glisse
(`--duration-slide`, `--ease-standard`) ; filet `--border-hairline` sous la rangée.
`SegmentedControl` : même rôle en segments (cadre arrondi `--radius-xl`, segment `--radius-md`).

### Tableau — `DataTable` (`components/ui/data-table.tsx`) · Figma `Ligne de tableau`

Cadre arrondi 12, filet `--border-default`, `bg-card`. En-tête 44 px sur `--surface-soft`, 16 px
`--text-secondary`. Cellule 16 px medium, ligne secondaire 14 px `--text-tertiary`, filet hairline
entre lignes, survol `--control-bg-hover` si la ligne est un lien. **Tout tableau** passe par lui
(onglets `DataTableViews`).

### Carte liste — `ListCard` (`components/ui/list-card.tsx`) · (liste de l'Accueil dans Figma)

Arrondi 12, filet `border-border`, `bg-card`, padding 12 ; libellé 14 px gris, lignes 16 px.

### Fait — `FactRow` / `FactRows` (`components/ui/fact-row.tsx`) · Figma `Fait`

Cadre arrondi 12, filet hairline, `bg-card`. Ligne : padding 14 × 11, libellé + valeur 15 px, **source
sous la valeur** en 14 px tertiaire, pastille d'état à droite (À faire / À vérifier / Fait).
« Modifié par … » en `--selection` ; personne non désignée = « À choisir » en `--error`.

### Barre de progression — `ProgressBar` / `ProgressRing` · Figma `Barre de progression`

Piste `--surface-sunken`, remplissage encre ; `--tone-success-fg` une fois fini, `--error` en retard.
L'anneau pour l'avancement d'un workflow (Vue d'ensemble).

### État vide — `EmptyState` / `EmptyNote` (`components/shell/empty-state.tsx`) · Figma `État vide`

Icône 24 px, une phrase, le geste qui remplit (bouton Contour). Fond de carte, jamais un contour seul.

---

## Retours et fenêtres

### Encart — `ToneCallout` (`components/ui/tone-callout.tsx`) · Figma `Encart`

Arrondi 10 (`--radius-xl`), padding 14 × 12, 15 px, **icône du ton à gauche** (cadenas pour une étape
verrouillée). Mêmes six tons que la Pastille. Un blocage : `BlockerCallout` (sa raison + où le lever).

### Toast — `toast` (`components/ui/toast.ts`, maison) · Figma `Toast`

380 px, arrondi 12, fond du thème (`--toast-bg`), filet `--border-default`, ombre à trois couches,
15 px + seconde ligne 14 px. Reprend le verbe du bouton. Pile de trois ; 4 s succès, 5 s info, 6 s
alerte, 8 s erreur. Erreur annoncée en `role="alert"`.

### Modale — `Dialog` / `FormDialog` / `ConfirmDialog` / `DialogFormActions` · Figma `Modale`

**Une seule apparence : le verre.** Voile `--glass-scrim` + flou `--glass-blur` ; panneau
`--surface-glass` (88 % de `--surface-raised`), flou `--glass-panel-blur`, filet `--border-default`,
arrondi 16, ombre `--elevation-modal`. Largeur `--dialog-width` 520 / `--dialog-width-medium` 640 /
`--dialog-width-wide` 900. Mobile : en bas, pleine largeur, monte du bord. Un geste qui demande une
saisie ouvre une modale ; plus de panneau latéral.

---

## Coquille

### Élément de navigation — `NavItem` (`components/shell/sidebar.tsx`) · Figma `Élément de navigation`

40 px, arrondi 8, icône 20 px, 16 px. Actif `--nav-item-active-bg`, survol `--nav-item-hover-bg`,
sans page = `--nav-fg-muted`, non cliquable, jamais retiré.

### Barre latérale — `Sidebar` · Figma `Barre latérale` (Dépliée / Repliée), `Barre du projet`

Collée au bord, pleine hauteur, sans arrondi ni ombre, filet `--nav-border` à droite.
`--nav-width` 218 / `--nav-width-collapsed` 68 ; logo en carré `--nav-brand-bg` ; compte et cloche
(point `--nav-unread-dot`) sur un filet. Barre du projet (`components/projects/project-sidebar.tsx`) :
`--project-nav-width` 200, sélecteur de projet de `--project-bar-height` 55, groupes Workflows et Pilotage.

### Étape du parcours — `JourneySpine` / `StepPanel` (`components/shell/journey/`) · Figma `Étape du parcours`

Parcours : carte arrondie 16, filet hairline, padding 12, 272 px dès 1280 px (240 dès 900), collé en
haut. Étape : grille 24 px + texte, padding 8, arrondi 8, ouverte sur `--surface-sunken`.
À droite : h1 28 px (`--type-display-module`) = titre de l'étape, échéance en légende, pourquoi en
16 px secondaire, le geste du lecteur en tête (`StepPanel lead`), puis l'étape **sans carte**.

### Carte Maintenant — `NowCard` (`components/shell/journey/now-card.tsx`) · Figma `Carte Maintenant`

Arrondi 12, filet hairline, sans ombre, padding `--density-card-pad`. Accueil, Travail, Vue
d'ensemble, activations ; **jamais dans un module**.
