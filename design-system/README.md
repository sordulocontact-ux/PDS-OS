# Design system de PDS OS

Point d'entrée unique du design system : ce qu'il contient, où vit chaque valeur, comment le
modifier ou le remplacer. Écrit pour servir de base à un skill.

| Fichier                              | Rôle                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `docs/DESIGN.md`                     | **Décisions** (le pourquoi, qui a décidé, quand). Fait foi.                   |
| `app/globals.css`                    | **Valeurs** (tokens CSS). Seule source des valeurs.                           |
| `design-system/tokens.json`          | Les mêmes valeurs au format W3C Design Tokens, **généré** (jamais à la main). |
| `design-system/components.md`        | Contrat des composants de base : variantes, tailles, tokens lus, règles.      |
| `docs/COMPOSANTS.md`                 | Inventaire complet de tous les composants du code.                            |
| Figma PDS OS, page « Design System » | Variables, styles et composants miroirs ; page « Écrans clés ».               |

---

## Les trois couches

```
Primitives            --po-ink-900, --po-grey-500, --po-white…          (palette brute)
   │  alias
Sémantique            --text-*, --surface-*, --border-*, --nav-*,       (le sens)
                      --tone-*, --hue-*, --selection*, --control-*,
                      --meter-*, --error ; :root.dark redéfinit les mêmes noms
   │  lue par
Composants            components/ui/, components/shell/…                (la forme)
```

- Un composant ne lit **que** la couche sémantique, ou les classes Tailwind branchées dessus dans
  `@theme inline` (`bg-card`, `text-foreground`, `border-border`, `bg-primary`…). Le pont shadcn
  (`--background`, `--primary`… bloc 2 de `globals.css`) est lui aussi branché sur la sémantique.
- Le thème sombre (`:root.dark`) ne touche que la couche sémantique, jamais `--po-*` ni un composant.
- La densité (`[data-density="compact"]`) ne touche que `--density-*`.
- Les teintes `--hue-*` et les tons `--tone-*` sont des valeurs brutes, chacune avec son pendant sombre.

**Écarts à résorber** (composants qui lisent une primitive) : `text-grey-400` dans
`components/ui/list-card.tsx:44`, `components/ui/day-groups.tsx:46`,
`components/catalog/artist-profile/release-card.tsx:19` → à remplacer par un token sémantique
(`--text-tertiary` est proche) le jour où on y touche.

---

## Chaîne de vérité

```
docs/DESIGN.md  →  app/globals.css  →  pnpm ds:tokens  →  design-system/tokens.json  →  Figma
  (décision)         (valeur)            (génère)            (export lisible)            (miroir)
```

Jamais dans l'autre sens : une valeur changée dans Figma ou dans `tokens.json` n'existe pas tant
qu'elle n'est pas dans `globals.css` (et sa décision dans `DESIGN.md`).

```bash
pnpm ds:tokens         # régénère design-system/tokens.json depuis app/globals.css
pnpm ds:tokens:check   # code 1 si tokens.json est en retard (pour un hook ou la CI)
```

`tokens.json` : un token = `$value`, `$type`, `$description` (commentaire CSS), `$extensions["pds.css"]`
(le nom CSS d'origine) et `$extensions["pds.modes"]` (`dark`, `compact`). Une référence
`var(--po-grey-600)` devient l'alias `{color.po.grey.600}`.

---

## Changer de design system

Tout se fait dans `app/globals.css` (et `app/layout.tsx` pour la police). Dans l'ordre :

1. **Palette** : `--po-*` (encre, gris, blanc). La sémantique claire suit par alias.
2. **Accent de sélection** : `--selection` (et `--selection-bg`, le même à 7 %) ; sombre : `:root.dark`.
3. **Tons d'état** `--tone-*-bg|fg` et **teintes** `--hue-*-bg|fg`, en clair **et** en sombre
   (contraste ≥ 4,5:1 texte sur fond).
4. **Thème sombre** : bloc `:root.dark`, mêmes noms que la sémantique claire.
5. **Police** : `next/font` dans `app/layout.tsx` (variable `--font-google-sans-flex`) puis
   `--font-sans`, `--font-heading`, `--font-display`, `--font-mono` dans `@theme inline`.
6. **Échelle typographique** : `--type-*` (taille, interligne), `--type-display-tracking`,
   `--type-body-tracking`, graisses `--fw-*`.
7. **Arrondis** : `--radius-*` dans le bloc `@theme` littéral (pas dans `:root`, sinon référence
   circulaire) + `--radius` (shadcn).
8. **Élévations** `--elevation-*` (clair et sombre), **verre** `--glass-*`, **toast** `--toast-*`.
9. **Densité** `--density-*` (confortable dans `:root`, compacte dans `[data-density="compact"]`).
10. **Mouvement** : `--duration-*`, `--ease-*` (`@theme` pour `--ease-standard`, `--ease-out`).
11. Puis `pnpm ds:tokens`, mettre à jour les variables Figma (mêmes noms, voir ci-dessous) et
    `docs/DESIGN.md`.

Suit tout seul : le pont shadcn, les classes Tailwind (`@theme inline`), tous les composants.

**Pièges connus**

- Graisses : `font-normal`, `font-light`… sont ramenées à 500 dans `@theme` (rien sous medium). Une
  nouvelle police doit avoir un 500 réel.
- `Button` utilise `rounded-full` et non `rounded-pill` : Tailwind trie les arrondis par nom et
  `rounded-pill` passerait après le `rounded-lg` des tailles icône.
- L'espacement des lettres (-2 %) est posé **sur chaque élément**, pas hérité de `body` : un `em`
  hérité se figerait à la taille de `body`.
- `.surface-glass` ne réinverse plus rien ; seul `--popover` y reste opaque. Un nouveau token n'a
  rien à y déclarer, mais un token lu dans une modale doit exister pour la surface verre.
- `components.json` déclare encore `"iconLibrary": "lucide"` : un composant ajouté par `shadcn add`
  arrive avec des imports Lucide, à remplacer par Nucleo Sharp (`docs/DESIGN.md` § 1).
- Icônes : `currentColor`, jamais de couleur en dur ; licence Nucleo limitée à 250 icônes par projet.
- Pas de `localStorage` pour un réglage de thème ou de densité partagé : ce qui doit suivre la personne
  passe par Supabase (règle 7 de `CLAUDE.md`).

---

## Figma

Fichier : https://www.figma.com/design/m53Pg64HxLmuTNSebK5kgl/PDS-OS?node-id=451-3371

**Variables** (noms = chemins sémantiques, syntaxe de code WEB = `var(--nom-css)`) :

| Collection    | Modes                      | Contenu                                                                                       |
| ------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `Primitives`  | Valeur                     | `po/*` (15), cachées des sélecteurs                                                           |
| `Couleurs`    | **Clair / Sombre**         | `text/*`, `surface/*`, `border/*`, `nav/*`, `selection/*`, `control/*`, `meter/*`, `tone/*/bg | fg`, `hue/*/bg | fg`, `error` (80) ; le clair aliase les primitives |
| `Espacement`  | Valeur                     | `space/*` (0 à 64), `layout/*` (largeurs de barre, contenu, modales)                          |
| `Densité`     | **Confortable / Compacte** | `density/*` (hauteur de contrôle, de champ, de ligne, marges)                                 |
| `Arrondis`    | Valeur                     | `radius/none` à `radius/pill`                                                                 |
| `Typographie` | Valeur                     | `font/sans` (la police de tout le fichier), `size/*`, `line-height/*`                         |

Changer la police de tout le fichier Figma = changer `font/sans` ; passer un écran en sombre ou en
compact = choisir le mode de la collection sur son cadre.

**Styles** : 20 styles de texte (`Display/*`, `Chiffre/*`, `Texte/*`, `Légende`, `Micro`, `Surtitre`,
`En-tête de colonne`) liés aux variables de `Typographie` ; 8 styles d'effet (`Élévation/*`, `Verre/*`).

**Composants** (page « Design System », cadre « Composants ») : Bouton, Bouton icône, Pastille,
Pastille catégorie, Compteur, Avatar, Champ, Case à cocher, Filtre, Onglet, Encart, Barre de
progression, Élément de navigation, Étape du parcours, Fait, Ligne de tableau, Carte Maintenant,
Toast, État vide, Modale, Barre latérale, Barre du projet. Icônes : le jeu `Icones` existant (Nucleo
Sharp, page « Projet - Vue d'ensemble »), branché en `INSTANCE_SWAP`, traits liés à `text/primary`.

**Écrans clés** (page « Écrans clés ») : Accueil, Projets, Projets en sombre, Étape de projet
(Master › Mixage), la même avec une modale ouverte. Faits uniquement d'instances des composants.
