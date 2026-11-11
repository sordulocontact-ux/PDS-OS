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
14 px au moins. Le titre d'une page de module (h1 de `ModuleHeader`) est à **28 px** (30 px jusqu'au 10/11/2026, réduit quand il est devenu le nom de l'étape, Sacha)
(`--type-display-module`, classe `text-display-module`), et c'est aussi le titre de l'étape ouverte ;
la carte « Maintenant » à 22 px (`text-figure-lg`).

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

- **État d'une information** (un fait, un champ, une dimension, une valeur) : trois mots et
  trois tons, les mêmes dans tous les modules (Ibé, 01/11 : « « à faire » serait plus
  compréhensible » ; Sacha, 06/11/2026) : **À faire** (`warning`, il manque quelque chose),
  **À vérifier** (`info`, connu mais pas encore confirmé par une personne : proposé, déduit,
  déclaré, noté), **Fait** (`success`). « Plus tard », « Non applicable » en `neutral`.
  Plus de « Manquant », « Connu », « À renseigner », « À compléter », « À confirmer » comme
  état d'une ligne ; la provenance (déclaré, déduit…) se dit dans la source sous la valeur.
  **Une information manquante n'est jamais rouge** : `danger` reste aux refus, échecs et
  blocages, et au champ manquant après un essai d'enregistrement (§ 4). **Une attente n'est jamais rouge non
  plus** (Sacha, 10/11/2026) : décision requise, en attente de quelqu'un, modifications ou corrections
  demandées, retard transmis à la direction sont en `warning` ; la colonne du parcours dit « À vous : … »
  quand l'étape attend la personne qui la regarde. Les cycles de vie
  d'un objet (versions, plans, déclarations, matériel…) gardent leurs propres mots.
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
« en cours ». Les pastilles `FilterChip` (filtres qui se combinent) restent en encre pleine :
un filtre actif n'est pas une sélection de formulaire. Un choix unique (`ChipChoice`) est un
`SegmentedControl` gris (§ 4, « Onglets et filtres de liste »). **Une ligne ouverte ou
sélectionnée** (une ligne de liste ouverte sur place, la ligne dont l'objet est ouvert dans
l'encadré de PO : `FactRow current`) est **gris clair** (`--surface-sunken`, comme la page ouverte
de la navigation), jamais teintée de bleu (Sacha 09/11/2026) ; le bleu reste au contrôle coché.

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
(« Le projet », « Informations initiales », « Équipe »), sans la carte dans une modale. **Fiche à beaucoup de champs facultatifs en modale** (contact du Réseau, Sacha
05/11/2026 : « trop d'informations d'un coup » ; Attio, Linear) : une colonne (`FormDialog
size="medium"`, 640 px), l'essentiel toujours affiché, les autres champs affichés seulement s'ils
ont une valeur, les vides réduits à des boutons « + E-mail », « + TikTok »… sous les champs, qui
ouvrent le champ et y mettent le focus ; un champ refusé par le serveur reste ouvert. Pas de texte
d'aide sous un champ dont le libellé suffit. Essayés puis écartés le même jour : deux colonnes, puis
blocs titrés avec le titre à gauche (toujours trop de champs à la fois).

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
**Exception, les tableaux hors projet** (Sacha, 06/11/2026) : sur les pages hors d'un projet
(fiche titre et fiche artiste du Catalogue, page de session studio, fiche contact du Réseau), un
tableau dans une carte **garde son cadre, sa bande d'en-tête et sa marge de 16 px**
(`DataTable framed`), exactement comme la liste des projets : sans marge, le survol d'une ligne
collait au texte, et sans en-tête on ne savait plus ce que disait chaque colonne. Leurs listes
de lignes (`SectionRows`, supprimé) sont devenues ces tableaux. Les pages d'un projet gardent le
tableau sans cadre pour l'instant : Sacha les reprend à part.
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
  pose la classe `.dark` sur `<html>` avant le premier
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
- En haut, le monogramme PDS OS (`PdsLogo`, `Logo.svg` du 30/10/2026, 36 px de large, couleur
  `--nav-brand-fg`) dans un carré noir de 60 px arrondi 16 px (`--nav-brand-bg`) et le bouton pour replier / déplier (icône 20 px). Dessous, la navigation
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
     dernier (`aria-current="page"`) en `--text-primary` ; **un segment qui a des frères porte un
     double chevron** (`IconChevronExpandY`, `CrumbSwitcher`, Sacha 10/11/2026, comme le sélecteur
     de projet) : le sous-module du Marketing (les cinq parties, avec la coche verte et le compteur
     « à vous » des pilules), l'activation ouverte (les autres activations, type · phase), le
     livrable de la Production (les autres livrables, qui produit · livré). Le libellé reste un lien
     vers sa page (sous une activation ou un livrable, « Activations » / « Production » remonte à la
     liste, jamais là où le sous-module s'ouvre), le chevron est un bouton à part qui ouvre la
     liste (recherche au-delà de 8) ; sur le dernier segment, libellé et chevron forment un seul
     bouton ;
  2. **pilules des sous-modules**, Marketing seul (Stratégie · Conception · Production ·
     Activations · Suivi & bilan) : pilule 36 px, fond `--surface-soft`, texte
     `--text-secondary` 15 px ; active = encre pleine (`--surface-inverse`) ; sous-module fait =
     rond vert 16 px coché avant le libellé ; compteur « à vous » (rond bleu `--selection`) après ;
  3. **ligne de titre** : h1 à **28 px** (`text-display-module`, 30 px avant le 10/11/2026). **Sur une page à parcours, c'est
     le titre de l'étape ouverte** (retour d'Ibé du 07/11, Sacha 10/11/2026 : le fil nomme déjà le
     module), son échéance en légende à droite (rouge en retard, `StepDue`), puis son pourquoi
     dessous en 16 px `--text-secondary` (`why`, 68 caractères au plus) ; ailleurs le titre du
     module. Pastille de statut facultative à côté (Distribution, hors étape), actions à droite
     (« Qui fait quoi » en `ghost sm`, « Ajouter une dépense » du Budget) ; une page ouverte depuis
     une étape sans en être une (Plan de sortie) a la flèche de retour avant son titre, comme la
     page d'une activation ;
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
  **Pilotage** (Travail, **Calls**, Validations, Activité, **Budget**, ticket MKT-S1-15). Calls y
  revient le 05/11/2026 (Sacha) : seconde porte vers les mêmes calls, comme Travail (un call
  ouvert là reste dans le projet, fil « Calls / titre » ; ouvert depuis Calls de la barre
  principale, il reste dans Calls avec « Projet : X › »). Équipe, Planning, Livrables et Fichiers
  sortent de la barre : leurs routes restent, joignables depuis leurs étapes. **Mobile** : la navigation du projet en **puces horizontales** défilantes
  au-dessus du contenu. Exception assumée à « une pastille = un filtre » (§ « Onglets et
  filtres ») : ces puces sont des liens de navigation, signalés comme tels (`nav`,
  `aria-current`), jamais mêlées à des filtres sur la même ligne.
- **Patron d'étape** (`JourneyLayout`, `JourneySpine`, `StepPanel`, `docs/VISION-UX.md` § 4 ;
  proto « Mise en page des modules », Sacha 10/11/2026) : colonne de contenu de **1180 px** au
  plus. Le **parcours tient toute la hauteur à gauche** (carte, `[240 px | 1fr]` écart 24 px dès
  900 px, `[272 px | 1fr]` écart 32 px dès 1280 px), collé en haut quand on fait défiler, titré
  « Parcours » seul ; à sa droite l'en-tête (`ProjectHeader head`), les puces d'attention, puis
  l'étape **sans carte** (écart 14 px). Sous 900 px : l'en-tête, le parcours, puis l'étape. **Pas
  de carte « Maintenant » dans un module** ; elle reste en tête de l'Accueil, du Travail, de la Vue
  d'ensemble et des activations, avec le même filet que les autres cartes, `--border-hairline`,
  **sans ombre** (Sacha, 30/10/2026).
- **Tout cadre et tout champ ont un fond** (Sacha, 10/11/2026) : l'étape n'est plus dans une
  carte, donc le fond de l'app (`--surface-app`) passe dessous. Un bloc dessiné par son contour
  (liste, carte de document, zone de dépôt, état vide) prend `bg-card`, jamais un contour seul ; un
  champ (`Input`, `Textarea`, `Select`, `DatePicker`, éditeurs) aussi, en clair comme en sombre,
  pour rester lisible sur un cadre plus foncé (`--surface-soft`, `--surface-sunken` : le bulletin
  SACEM). Un nouveau composant en contour naît avec `bg-card`.
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
- **« + Dépense » dans l'en-tête du téléphone** (BUD 4, 11/11/2026 : « t'es dans le rush, tu ajoutes
  une dépense après avoir commandé au grec ») : bouton contour `sm` à gauche de la cloche, sur toutes
  les pages, pour qui peut saisir une dépense (`read_artist_budgets` ou `pilot_projects`). Pas de
  bouton flottant ; sur ordinateur, l'entrée est sur la page Dépenses et dans chaque Budget. Le
  formulaire est celui de toute dépense, dans l'ordre justificatif (photo) → montant → libellé →
  poste → projet ou artiste (les derniers utilisés en tête) → statut (Payé par défaut) et date.
- Barre principale repliée (dans un projet) : le carré du logo (40 px, rayon 12, monogramme 24 px) reste
  toujours visible au-dessus du bouton de dépliage ; « Travail » porte le nombre de mes actions
  du projet ouvert (`CountBadge size="sm"` 16 px au coin de l'icône).

### Barre de défilement

- **La nôtre, jamais celle du système** (retour du 09/11/2026), partout : page, barre latérale,
  modales, menus. Piste transparente, pouce en pilule de 6 px dans une largeur de 12 px
  (`--scrollbar-size`), couleur `--scrollbar-thumb` (= `--border-hover`), `--scrollbar-thumb-hover`
  (= `--text-tertiary`) au survol ; le thème sombre suit par ces tokens. `app/globals.css`, bloc base.
- **Sa place est toujours réservée** (`scrollbar-gutter: stable` sur `html`) : une page qui devient
  plus haute que l'écran (passer d'« Actions des projets » à « Mes tâches », ouvrir un pli) ne saute
  plus de côté, ni à l'ouverture d'une modale.

### Écran d'entrée

Une seule fois par onglet, en arrivant sur `/`, `/login`, `/signup` ou `/app…` ; jamais sur
une page partagée par lien, ni au rechargement, ni en naviguant dans l'app. Demande de Sacha
d'après une vidéo de référence (30/10/2026), dont les temps de mouvement sont mesurés image
par image.

- Fond noir (`--po-black`, comme l'icône de l'app, quel que soit le thème), monogramme blanc de
  72 px au centre, qui apparaît en 150 ms (opacité + flou de 8 px). Il reste 1 s au total :
  raccourci par rapport à la vidéo (2,4 s), puisqu'on le voit chaque jour et qu'il ne fait
  pas attendre plus que le chargement.
- Le logo rejoint **le logo de la page à sa place et à sa taille** (carré de la barre latérale,
  en-tête mobile ou écran de connexion) en 370 ms (`--ease-entry`), sans rotation, sa couleur
  allant vers celle du logo d'arrivée. À 160 ms, le noir s'efface et le contenu (`main`) monte de
  24 px en 250 ms. Dès ce départ, la page reçoit les clics.
- Page lente : le logo attend celui de la page ; au bout de 3 s sans lui, l'écran s'efface
  sur place. Sans JavaScript ou si le script échoue, la page revient seule à 8 s (CSS).
- Mouvement réduit : ni flou ni trajet, 400 ms puis fondu.
- `components/shell/entry-splash.tsx` : décision avant le premier affichage (script en ligne,
  `sessionStorage`, préférence d'affichage et non donnée métier), `entryLanding` sur `PdsLogo` =
  logo d'arrivée ; tokens `--duration-entry-*`, `--delay-entry-reveal`, `--ease-entry`.

### Présentation de la première connexion

D'après la maquette HTML du 30/10/2026. Quatre écrans dans la modale de l'app, large :
qui vous êtes ici, chaque projet est un parcours, ce qui est à vous vient à vous (avec
l'activation des notifications du navigateur), PO prépare et vous décidez. Remplace la carte
« Bienvenue » de l'accueil.

- **Quand** : à l'arrivée sur l'accueil d'un membre approuvé depuis moins de 30 jours qui ne l'a
  pas terminée (`member_welcomes`), après l'écran d'entrée. Terminée ou passée, elle ne
  revient plus. Fermeture : « Passer », « C'est parti » ou Échap, jamais un clic à côté.
- **Revoir** : « Revoir la présentation » dans le menu du compte et le tiroir mobile, sur place,
  sans rien écrire.
- **Texte** choisi par permission (`welcomeVariantOf`), jamais par le nom ; le poste est dit
  avec le libellé de l'app (« Votre poste : Chef de projet »), jamais accordé à une personne.
- **Visuels** : le nom et le poste de la personne sont les vrais. Le reste est un projet
  inventé, marqué « Exemple » ; ses dates sont calculées depuis aujourd'hui pour ne pas vieillir.
- **Mouvement** : le texte glisse dans le sens de la lecture (260 ms), le parcours avance seul
  en boucle. Mouvement réduit : fondu, parcours immobile.
- **À la fermeture**, « Maintenant » s'allume une fois (1,8 s) quand la page en a un.
- Clavier : ← →, Échap ; le focus reste sur le bouton principal.

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

- `PageHeader` (« Ajouter une tâche » en contour à droite, qui ouvre la modale d'une tâche de « Mes tâches » ; « Voir le calendrier » retiré le 09/11/2026, le Calendrier reste dans la barre), puis **« Maintenant »** : le cadre de
  `NowCard` (`NowFrame`), l'action la plus pressée — en tête les **étiquettes du projet et du
  module** à leur teinte (`ProjectTag`, `ModuleTag`, les mêmes que le tableau ; plus de « À vous » :
  tout le bloc est à vous), « En retard », « À valider », puis « Étape · avant le Sam. 05/12/2026 »
  (l'étape omise quand l'action la dit déjà), l'action en titre et son pourquoi collés (`TitleBlock`,
  comme le « Maintenant » des modules), une ligne « Validation : … · Ensuite : … » plus discrète
  (`caption`, valeurs en encre sans gras ; « · vous » quand l'étape suivante vous revient), le bouton plein
  « Ouvrir » (le geste, `actionHref`).
- **Une action se lit seule** (retour d'Akili du 01/11/2026) : son intitulé (`JourneyActor.todo`,
  `lib/i18n/fr/*-journey.ts`) dit le verbe **et son objet** (« Démarrer le cadrage », « Valider le
  dossier de distribution V2 », « Confirmer le dossier juridique »), jamais un geste qui ne se
  comprend que dans la page du module (« Choisir comment démarrer », « Valider la V2 ») : le même
  texte paraît dans Travail, l'Accueil et « Maintenant ». Deux modules n'ont jamais le même intitulé.
  Une démarche juridique nomme **son geste et sa personne ou son œuvre** (« Préparer le contrat de
  Sami Kader », « Proposer la répartition de « Néons » », `lib/legal/demarches/todo.ts`), jamais
  « Faire avancer la démarche » seul ; le contexte ne répète alors plus « Sami Kader · fiche et
  contrat » (`JourneyStep.subject`). Le geste d'une personne extérieure reste court, son nom le
  précède (« Sami Kader · remplir sa fiche »).
  Rien à faire : « Rien à faire pour vous », et la Vue d'ensemble de chaque projet dit qui on
  attend.
- Dessous, **Tout / À faire / À valider en contrôle segmenté** (nombre en gris ; plus des onglets depuis le
  09/11/2026 : deux barres d'onglets l'une sous l'autre sous « Actions des projets | Mes tâches » faisaient
  une double navigation), puis **un tableau** (`DataTable`, Sacha 28/10 :
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
- **Mes tâches** (onglet à côté des actions, retour du 09/11/2026) : la **matrice d'Eisenhower par
  défaut**, la liste en second. **Chaque case est son propre cadre**
  (« une frame pour chaque partie ») : contour `--border-default`, rayon 12, fond carte, au moins 192 px
  de haut ; en tête, sur bande douce `--surface-soft`, son nom en `body-md` semi-gras, son nombre en
  tertiaire et son sens en `caption` ; puis ses tâches collées au cadre, filets entre elles (la liste n'a
  pas de contour à elle : rien d'encadré dans une carte). Les deux cases d'une rangée ont la même hauteur ;
  une tâche glissée dessus fonce le contour. **Une tâche mène à sa page** (retour du 09/11/2026) : son intitulé est un
  lien (flèche ↗ discrète) vers la page de son projet qu'elle concerne, dite dessous (« Minuit pile ›
  Budget ») ; sans page, la Vue d'ensemble du projet ; sans projet, pas de lien. Une ligne = case à cocher, intitulé
  `body-md` medium, échéance et réunion d'origine en `caption`. Les actions des réunions arrivent
  **sans validation** ; ajouter à la main est secondaire (bouton de l'en-tête, modale).

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
  Distribution) · Fichiers. Fiche artiste, 12/11/2026 (BIZ 10) : Budget et Deals fusionnés dans
  « Business » (Deals puis Budget), sans ajouter d'onglet. Dans une page fusionnée, une section vide est une `EmptyNote`,
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
- **Contrôle segmenté** (`SegmentedControl`, `SegmentedLinks`, référence de Sacha « Spans | Traces »
  du 05/11/2026) : **tout choix unique parmi quelques-uns**, dans un formulaire (`ChipChoice` : type
  d'un contact, format, priorité) comme pour une vue de page dans l'URL (`ViewToggle`, historiques,
  versions). Un cadre à filet `border` sur `--control-bg`, rayon `--radius-xl`, 4 px de marge ;
  segments 36 px, 14 px medium, encre secondaire ; le choisi en encre pleine sur `--control-bg-soft`,
  rayon `--radius-md`, fond qui **glisse** d'un segment à l'autre (`clip-path`, `--duration-slide`,
  `--ease-standard`, posé d'un coup si le mouvement est réduit). Remplace les pastilles pour ces cas.
- **Pastilles** (`FilterChip`) : seulement des filtres ou des choix **qui se combinent**.
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
  « X » au Réseau » en modale sans quitter le formulaire ; « Garder « X » comme simple nom »
  en dernier recours, **dernière ligne de la liste de résultats** dès qu'un nom est tapé, jamais
  un bouton sans contour sous le champ, qu'on prenait pour du texte mal aligné (Sacha, 07/11/2026). On enregistre l'id (`contact_id`), jamais un lien deviné par le nom. Les
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
La phrase qui présente une section passe par `description` : **2 px sous le titre, puis 12 px
avant le contenu** (Sacha, 09/11/2026 : « le titre et la description sont trop décollés »).
Le `TitleBlock` d'une carte suit la même règle depuis le 10/11/2026 (Figma de Sacha, étape
« Déclaration SACEM », « partout ») : **4 px entre le titre et sa phrase**. Le titre d'une étape
ouverte est le h1 de la page depuis le 10/11/2026 (`ModuleHeader`, 6 px avant son pourquoi, 24 px
avant le contenu de l'étape) ; la date d'échéance à droite du titre en `--text-muted`, plus
discrète que la phrase (en retard, elle reste en rouge). Dans une étape, la phrase écrite en simple paragraphe était à la même
distance du titre que du champ suivant, donc rien ne se regroupait ; le couple titre + phrase
doit toujours être plus serré que ce qui le sépare du contenu.

**Cadre dans des cadres** (Sacha, 10/11/2026, Figma du bulletin SACEM) : un cadre posé dans une
carte elle-même dans une carte (participant, éditeur, blocs de catégorie et « Parts Phono entre
catégories » de la Répartition, aperçu des DEP et DR, ligne « Aucun éditeur musical ») est
**rempli un cran plus clair que la carte, avec un fin contour blanc** (`--border-hairline`, `nestedCardClass`,
`components/ui/nested-card.ts`, fond `--surface-tint`) : en sombre, plus clair se lit au-dessus,
le contour fin le détache sans alourdir. Un cadre directement dans une carte garde son contour. Le fond
de l'app à la place (plus sombre, « un trou dans la carte ») a été essayé puis refusé le même jour.

### Boutons, pastilles, encarts, toast, dates (décisions C0 du 18/10/2026)

D'après le proto « Projet complet » (`docs/protos/projet.html`), qui fait foi :

- **Bouton** (`Button`) : 40 px, padding 18, **15 px semi-gras (600)**, pilule ; `sm` 32 px,
  padding 14, 14 px ; `ghost` en `--text-secondary`, encre au survol. À l'appui,
  `scale(.97)` (`--ease-out`), coupé quand le mouvement est réduit. Les autres
  variantes ne changent pas.
- **Bouton secondaire** (Sacha, 06/11/2026) : un geste secondaire est en **contour** (`outline`),
  jamais en texte seul, tant qu'aucun autre secondaire plus important n'est à côté ; `ghost` est réservé
  au troisième niveau (un geste de plus à côté d'un secondaire déjà en contour, « Annuler », un geste
  dans une ligne ou un menu). Appliqué d'abord à « Modifier mes rôles » (fiche publique) ; à reprendre
  écran par écran. **Jamais une rangée de boutons texte sans contour** (Sacha, 07/11/2026 : « on dirait
  des textes qui volent ») : un `ghost` ne sert qu'à hiérarchiser, donc seulement à côté d'un bouton en
  contour. Exemple : une proposition = « Modifier » en contour, « Écarter » en texte à côté.
- **Livrables engagés** (Sacha, 07/11/2026, « on se perd ») : chaque levier et le formulaire « Nouveau
  livrable » sont séparés par un **filet** (`--border-hairline`), jamais encadrés (« pas une card
  complète, juste un contour qui le sépare »). Un menu (`OptionSelect`) ne dépasse jamais sa
  colonne : libellé long coupé par « … ».
- **Largeur d'un champ** (Sacha, 07/11/2026) : dans un formulaire, **chaque champ prend toute la largeur
  de sa colonne** (texte, nombre, date, menu `OptionSelect fill`) ; seul un menu hors formulaire (une
  ligne, un filtre) garde la largeur de sa valeur. Appliqué d'abord à « Nouveau livrable » ; à reprendre
  écran par écran. Dans la liste d'un menu, une option longue passe à la ligne (jamais sous la coche).
- **Hauteur d'un champ** (Sacha, 11/11/2026) : dans un formulaire, **tous les champs ont la même hauteur,
  40 px** : texte, date, menu (`OptionSelect fill`, `SearchSelect fill`, `OptionSelect` des projets). Une
  seule source : `formFieldControlClassName` (`components/ui/select.tsx`). Un menu hors formulaire (ligne,
  filtre) garde 32 px, la hauteur des boutons `sm` à côté desquels il se tient.
- **Type d'un choix dans un menu** (Sacha, 11/11/2026) : quand une liste mêle deux sortes d'objets (projets
  et artistes dans « Pour » d'une dépense), la sorte est un **badge dans sa teinte** après le nom
  (`SearchSelect badge`, `budgetTargetHue`), jamais un suffixe « · projet » ; la recherche lit le nom seul.
- **Menu à longue liste** (retour du 09/11/2026) : au-delà d'une dizaine de choix, le menu est un
  `SearchSelect` : à l'ouverture, on est directement dans un champ de recherche, les choix filtrés dessous
  (« restau » ne laisse que Restauration). Premier cas : le Poste d'une ligne de budget, dont la modale met
  aussi Statut, Levier et Livrable sur toute la largeur.
- **Citation** (Sacha, 07/11/2026) : la phrase exacte d'un échange se détache du texte, filet de 2 px à
  gauche (`--border-default`) **et** fond un peu plus clair (`--surface-soft`), coins droits arrondis,
  texte 15 px secondaire (`ProposalSource`).
- **Survol d'un bouton** (repris du site Raw Studio, Sacha, 04/11/2026) : le bouton grossit
  à `scale(1.05)` (`--duration-grow`, 200 ms) et son libellé **roule** : il monte et sort par
  le haut pendant qu'une copie entre par le bas (`--duration-roll`, 500 ms, `--ease-out`).
  C'est `ButtonRoll` (`ui/button.tsx`) : `Button` l'applique seul, sauf aux boutons-icônes ;
  un lien stylé par `buttonVariants()` enveloppe son contenu dans `<ButtonRoll>`. La copie
  est `aria-hidden` ; tout est coupé quand le mouvement est réduit (seules les couleurs
  changent).
  **Étendu aux contrôles qui agissent comme des boutons** (Sacha, 10/11/2026), même roulement,
  mêmes durées : segments (`SegmentedControl`, `SegmentedLinks`), onglets (`TabBar`) et pilules de
  sous-modules (`SubModuleTabs`) roulent **sans grossir** (le fond ou le trait qui glisse resterait
  décalé), et jamais sur le segment ou l'onglet ouvert ; `FilterChip` et les pastilles
  `AttentionChips` cliquables roulent **et** grossissent (`buttonGrow`, `ui/button.tsx`). Pas sur
  la navigation latérale, les éléments de menu, les lignes et cartes cliquables ni les liens texte.
- **Pastille** (`StatusBadge`) : 24 px, padding 10, **13 px semi-gras** (`--type-micro`) ;
  `sm` garde 20 px pour les lignes denses.
- **Encart** (`ToneCallout`) : rayon 10, padding 12/14, 15 px, **icône du ton à gauche**
  (info, alerte, stop, coche ; un cadenas pour une étape verrouillée, prop `icon`).
- **Toast** (maison depuis le 03/11/2026, `components/ui/toast.ts`, plus de `sonner`) : **fond
  du thème** (`--toast-bg` = `--surface-raised` en clair, `#1f1f1f` en sombre, un cran au-dessus
  des cartes ; plus de fond inversé depuis le 09/11/2026, Sacha), rayon 12, 15 px, filet
  `--border-default` et ombre plus marquée qu'une carte (trois couches), en bas à droite, 380 px ; il reprend le verbe du bouton (« Confirmer » →
  « Proposition confirmée. »). Icône du ton à gauche (succès, erreur, alerte, info ; aucune
  pour un message neutre), seconde ligne en 14 px secondaire (`description`), un geste au
  plus (`action`, pilule, ferme le toast). **Pile** : le plus récent devant, les autres
  dépassent de 10 px au-dessus, trois au plus ; survol ou focus = la pile s'ouvre en colonne
  et toutes les minuteries s'arrêtent (aussi quand l'onglet est caché). Durées : 4 s
  (succès, neutre), 5 s (info), 6 s (alerte), 8 s (erreur, ou avec un geste). Le même message
  encore affiché revient devant au lieu d'être doublé. Fermer : croix au survol ou au
  clavier, Échap, balayage vers la droite. Entrée par le bas (320 ms,
  `--toast-ease`), sortie par le bas plus vite (220 ms) ; mouvement réduit = fondu seul.
  Une erreur est annoncée en `role="alert"`, le reste en `status`.
- **Dates** : une date de fait se dit en entier, « Sam. 05/12/2026 » (`formatDay`,
  `lib/utils/day.ts`, Europe/Paris) ; dans une source ou un historique, en court :
  « le 14/10 », et avec l'heure « 19/10, 11:16 » (`formatShortDay`, `formatShortInstant`).
  `Timestamp` reste pour les instants détaillés (« 11 oct. 2026 à 16:42 »).
- **Champ date** (Sacha 07/11/2026 : le calendrier natif du navigateur « pas très beau ») :
  `Input type="date"` dessine `DatePicker` (`components/ui/date-picker.tsx`), jamais le
  sélecteur du navigateur. Au repos le champ lit « Sam. 05/12/2026 » ; au focus il passe en
  « 05/12/2026 », tout sélectionné, se tape au clavier (barres posées toutes seules, « 5/12 »
  ou « 5/12/26 » compris en quittant le champ, illisible = on revient au dernier jour bon) et
  le calendrier s'ouvre dessous (`Calendar`, popover du système). Mois en titre, flèches à
  droite, lundi en premier, **six semaines toujours** (la hauteur ne saute pas d'un mois à
  l'autre), jours hors du mois en `--text-tertiary` ; jour choisi = sélection bleue
  (`--selection-border` + `--selection-bg`, § 3 bis, jamais un rond plein) ; aujourd'hui =
  chiffre semi-gras et point d'encre dessous (le rond d'encre reste au Calendrier, où rien
  n'est choisi) ; hors `min`/`max` = gris barré, inaccessible au clic. Pied : « Aujourd'hui »
  en contour (absent si hors limites), « Effacer » en fantôme quand le champ n'est pas
  obligatoire. Clavier : ↓ entre dans les jours, flèches, Début/Fin, Page préc./suiv. (Maj :
  un an), Entrée choisit, Échap ferme sans fermer la modale. Aucune animation propre : le
  popover garde `popupMotion`. Les champs heure (`type="time"`) restent natifs.
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
  ouverte d'un parcours (`StepPanel`) dit qui agit maintenant et quoi : le geste du lecteur
  en tête (son bouton le dit, sans ligne « À vous · … »), sinon « En attente de Nadia : … »
  en tête du contenu (`StepWaiting`, 10/11/2026) ; « Ensuite » nomme qui reprend l'étape suivante (« Mixage · Karim »), lu
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
  placée **en premier, à gauche** (Sacha, 29/10/2026) et la raison, calculée par le code, est écrite **sous les cartes, sur toute la largeur**. Chaque carte dessine
  un bouton à son pied (Figma 304:20801, **partout** depuis le 06/11/2026 : Cadrage, Stratégie, Brief du
  Master, Conception) : plein sur la recommandée, contour sur l'autre, libellé = le titre sauf `action` ;
  c'est un dessin, la carte entière reste la seule cible. Pendant le départ, `pending` rend la carte
  choisie occupée et l'autre inerte, sur tous les écrans. **Le départ peut toujours changer** : une étape
  démarrée en direct garde ses cartes tant qu'elle est ouverte, sous « Continuer ou changer de départ »
  (« Reprendre … » avec « Commencé(e) le … », ou l'échange) — Cadrage (01/11) et Stratégie (06/11/2026). La règle « l'échange est toujours plein » ci-dessus
  vaut pour les cartes à bouton qui restent ; une entrée migrée vers `StartChoices` n'a plus de
  bouton. Un choix de formulaire qui ne déclenche rien = `ChoiceCards variant="list"`.
- **Dimensions d'une étape = `DimensionList`** (Cadrage, Stratégie, Sacha 06/11/2026) : un seul cadre,
  une dimension par ligne repliable (nom, pastilles, chevron), une seule ouverte au départ. **Jamais un
  pli dans un pli** : ce qu'une dimension ouverte contient s'affiche sous son titre, pas sous un
  chevron de plus (« des chevrons dans des chevrons, ça cache des informations »). Une même chose ne
  s'affiche qu'une fois dans une dimension : une seule phrase vide, un seul « Ajouter », et une ligne
  retenue d'une dimension en liste vit dans sa liste détaillée, pas aussi en ligne au-dessus. L'essai « une
  dimension à la fois, liste à gauche » du même jour a été refusé par Sacha.
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
- **Plus de panneau latéral** (Sacha, 07/11/2026 : « quand on ouvre quelque chose, je veux que
  ça ouvre une modale normale ») : formulaire proposé par PO, ligne de budget, dépense, préparation
  d'un échange, autorisation d'utilisation, historique de PO sur téléphone s'ouvrent dans
  `Dialog` / `FormDialog`, **menu de navigation du téléphone compris** (`shell/mobile-nav.tsx`,
  Sacha, 07/11 : « pas un tiroir, un drawer qui vient d'en bas »). `components/ui/sheet.tsx` est
  supprimé.
- **Sur téléphone** (sous `sm`), la modale est posée en bas, pleine largeur, et **monte du bord
  bas** (`translate-y` 100 % → 0, `--duration-base`, `--ease-out`) au lieu de grandir de .97 ;
  elle redescend en sortant. Mouvement réduit : fondu seul.
- Hors périmètre : les menus et listes déroulantes en portail (`Select`, `DropdownMenu`,
  `Popover`, `Tooltip`).
- **Entrée** : opacité et `scale(.97 → 1)` (montée du bord bas sur téléphone) en `--duration-base` (180 ms) `--ease-out`, le flou
  de la page monte avec le panneau ; sortie en opacité, `--duration-fast`. Mouvement réduit :
  opacité seule. **Sauf une modale ouverte au clavier** (la fenêtre de PO, Espace Espace) :
  `DialogContent instant`, aucune transition, elle est là dès la touche (Sacha, 03/11/2026).
- **Menus, popovers et info-bulles** (`DropdownMenu`, `Popover`, `Tooltip`, Sacha 03/11/2026,
  `components/ui/popup-motion.ts`) : ouverts des dizaines de fois par jour, donc presque rien.
  Menu et popover sortent de leur bouton (`transform-origin` = `--transform-origin` de Base UI) :
  opacité et `scale(.97 → 1)` en `--duration-fast` (120 ms) `--ease-out`, sortie en opacité,
  `--duration-instant` (80 ms). Info-bulle : fondu de 120 ms, aucun quand elle s'ouvre aussitôt
  depuis une voisine (`data-instant`). Mouvement réduit : opacité seule. Le contenu replié
  (`Fold`) reste sans animation (choix du 03/11/2026).
- **Boutons d'une modale ou d'une décision** (décision C0) : le **principal d'abord, à
  gauche**, puis les secondaires (« Annuler » en dernier), comme le proto. Un seul endroit :
  `DialogFormActions` et `ReasonForm` ; aucune modale ne range ses boutons à la main.

### Pochette d'un projet (10/11/2026)

Retour d'Akili du 05/11, proto « Vue d'ensemble » validé par Sacha. Un projet a une image : celle
importée pour lui (à la création, ou ensuite par son responsable), sinon la pochette de son premier
titre au Catalogue, sinon **rien de coloré** : le disque sur fond gris des titres du Catalogue
(`ProjectCover`, `ReleaseCover`), partout (Sacha, 10/11/2026 : ni visuel par défaut coloré dans les
listes ni sur la Vue d'ensemble). 80 px (64 px en mobile ; réduite le 10/11) en tête de la Vue d'ensemble, à gauche du
nom et de « Artiste · Type » ; 36 px devant le nom dans les listes de projets ; 64 px en aperçu de
formulaire. La changer : bouton rond en verre sur l'image (au survol à la souris, toujours
au toucher) ou « Informations ». Écart voulu : la Vue d'ensemble ne montre **aucune pastille
d'état** (étapes en fil, workflows en anneau `ProgressRing`) et sépare ses blocs par l'espace, pas
par des traits.

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

### E-mails (09/11/2026)

Sacha : « tous les e-mails qu'on reçoit doivent être un minimum designés ». **Un seul cadre** pour
tous, `lib/email/layout.ts` : fond `--po-grey-50`, carte blanche bordée (`--po-grey-150`, arrondi
16 px), logo PO 40 px en tête de carte, pied gris centré. Les clients mail ne lisent ni variables CSS
ni feuilles externes : les valeurs des tokens y sont recopiées en ligne, dans des tableaux (Outlook),
avec un thème sombre pour Apple Mail (`prefers-color-scheme`). Google Sans Flex chargée depuis Google
Fonts (Apple Mail, iOS, Outlook Mac, Thunderbird ; Gmail et Outlook Windows retombent sur la police
système), medium minimum, 16 px courant, 14 px au plus petit. Une seule action, en
pilule noire comme le bouton principal de l'app, suivie du lien écrit en entier pour un client qui
bloquerait le bouton. Logo lu sur l'adresse de production (`EMAIL_LOGO_URL`) : un e-mail parti du
local arrive aussi dans une vraie boîte.

- **E-mails d'un membre** (dossier, page par personne, message) : une lettre, pas une notification.
  Pas de titre ; son message d'abord, le bouton (« Ouvrir votre dossier »), la validité, sa signature ;
  pied « Envoyé avec PDS OS au nom de … Répondez à cet e-mail pour lui écrire. ». Le texte brut reste
  envoyé à côté, inchangé (`lib/email/compose.ts`).
- **E-mails de Supabase Auth** (confirmation d'adresse, mot de passe oublié) : titre, « Bonjour
  <prénom>, » (métadonnées de l'inscription), une phrase, le bouton, ce qui suit, puis « Vous n'avez
  rien demandé ? ». Générés par `pnpm email:templates` dans `supabase/templates/` (textes :
  `lib/i18n/fr/emails.ts`), **à recoller dans Supabase prod et pré-prod** après chaque changement
  (Authentication › Emails › Templates). Prettier ne les touche pas : il couperait les balises Go.

