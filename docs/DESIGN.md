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

`lucide-react` est l'ancienne famille : elle est à remplacer, on n'y ajoute plus rien.

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
| Bouton, navigation, champ               | `size-5` |
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
