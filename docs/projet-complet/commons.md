# Briques communes — proto « Projet complet » ↔ app PDS OS

Zone : ce qui revient dans **tous** les modules du proto `docs/protos/projet.html` (Cadrage, Marketing,
Master, Juridique, Distribution, Vue d'ensemble, pages privées). But : dire **quels composants uniques
construire d'abord**, avec leur rendu exact, avant que les zones métier (Master, Juridique, Marketing,
Distribution, Cadrage) ne s'en servent.

Sources lues (lecture seule, worktree `PDS-OS-projet-complet`, branche `feat/projet-complet`) :
proto `docs/protos/marketing.html` (bloc `<style>` = socle CSS qui fait foi, 425 lignes),
`docs/protos/src/mk.js` (+ script complet de `marketing.html` = `production-v2.html` patché),
`master-v2.html`, `juridique-v2.html`, `distribution.html` (scripts en ligne),
`docs/protos/src/global/host.js`, `master-patch.js`, `build-global.py` ; captures
`scratchpad/shots/*.png|txt` ; `docs/VISION-UX.md` § 3 à 7, `docs/PROTOS.md` § 6, `docs/DESIGN.md`,
`docs/COMPOSANTS.md`, `app/globals.css`, `lib/ui/journey.ts`, `components/shell/journey/*`,
`components/legal/legal-step-frame.tsx`, `components/production/journey/*`, `components/calls/*`,
`lib/calls/*`, `components/ui/*`, `app/(app)/app/projects/[projectId]/layout.tsx`, migrations `calls`.

Légende écart : **OK** · **DIFFÉRENT** · **MANQUANT** · **EN TROP**. Effort : S < ½ j, M 1–2 j, L > 2 j.

---

## 0. Ce qu'il faut retenir (ordre de construction)

1. **Le cadre d'étape** (`ModuleFrame` = en-tête du module + « Maintenant » + parcours + étape ouverte) est
   à moitié là (`NowCard`, `JourneySpine`, `StepPanel`), mais n'est branché que sur la **Production** et
   le **Juridique**. Master, Marketing (Stratégie, Conception, Activations, Suivi), Distribution et
   Cadrage ont chacun leur page à eux : c'est la plus grosse source d'écart. Il faut d'abord **compléter
   le patron** (en-tête unifié, colonnes Exécute/Coordonne, prérequis inter-modules, états « à revoir »
   et « en attente », « Signaler un blocage », « Noter une information », « Déjà fait », bandeau de
   résultat dans l'étape), puis chaque zone y range ses étapes.
2. **Un seul « Maintenant »** : un type `JourneyStep` par workflow (loader serveur par workflow, comme
   `lib/production/journey` et `lib/legal/journey.ts`), un agrégateur projet (`loadProjectJourneys`)
   qui alimente la carte du module (avec « À vous, ailleurs »), la Vue d'ensemble, Travail,
   Validations et la page privée. `boardActions` (`lib/workflow-status/board.ts`) devient une
   lecture de ces étapes, plus une logique parallèle.
3. **Le formulaire de call commun** (`CallPrepForm`) : aujourd'hui **cinq** variantes
   (`ParticipantsField`, `AttendeesField`, `AgendaEditor`, `AgendaTopicsField`, `CallFields`/
   `CallSlotFields`, `CallRecap`, `PrepareCallSheet`, `PrepareExchangeButton` du Master) ; le proto en a
   **un**, dans l'étape (pas en panneau latéral), avec pastilles, ordre du jour à poignée et
   récapitulatif « Confirmer et inviter ».
4. **La proposition tranchée une par une** (`ProposalRow` + `ProposalGroup`) : existe en Conception
   (`ProposalCard`), ailleurs non (la Stratégie « pré-coche » et a « Tout accepter », contraire à la
   règle 21).
5. **Compte rendu + résumé aux participants** (`MeetingReportDialog`, `MeetingSummaryBlock`) : socle SQL
   présent (`call_closures` versionné, `call_report_shares`), rendu et parcours à refaire.
6. **Page privée unique par personne**, triée « À vous » / « En attente de PDS » / « Fait » replié :
   l'app a six pages publiques séparées par workflow (`/m`, `/p`, `/f`, `/s`, `/i`, `/fs`).
7. Petites briques transverses à créer : `ResultBanner` (règle 7), `FactRow` avec source et
   « Modifier » sur place (règle 2), `PickList` « Changer » (règle 3), `formatDay` « Sam. 05/12/2026 »
   (règle 4), `VersionCard` repliable, `ChoiceCardButtons` « Recommandé », toast noir.

**Effort total des briques communes : ~16 à 22 jours** (détail § 11). Migrations : 3 petites
(résumé versionné, informations notées par étape, blocages par étape) + 1 optionnelle (jeton de page
privée par personne et par projet).

---

## 1. Tokens : proto (`marketing.html <style>`) ↔ `app/globals.css`

Le proto dit « Tokens mirror app/globals.css ». C'est vrai pour la plupart ; les écarts sont listés.

| Proto | Valeur clair / sombre | Token app le plus proche | Écart |
| --- | --- | --- | --- |
| `--app` | #fbfbfb / #0a0a0a | `--surface-app` | OK |
| `--page` | #fff / #0f0f0f | `--surface-page` | OK |
| `--raised` | #fff / #161616 | `--surface-raised` | OK |
| `--soft` | #f4f4f4 / rgb(255 255 255/.05) | `--surface-soft` | OK |
| `--sunken` | #ececec / rgb(255 255 255/.08) | `--surface-sunken` | OK |
| `--inverse`, `--inverse-fg` | #000 / #ededed | `--surface-inverse`, `--control-primary-*` | OK |
| `--text`, `--text-2`, `--text-3`, `--muted` | #000 #5e5e5e #767676 #afafaf | `--text-primary/secondary/tertiary/muted` | OK |
| `--hair`, `--border`, `--field`, `--hover-border` | #ececec #d4d4d4 #dcdcdc #afafaf | `--border-hairline/default/field/hover` | OK |
| `--sel`, `--sel-bg` | #155dfc, rgb(21 93 252/.07) | `--selection`, `--selection-bg` | OK |
| `--info/warn/ok/bad-bg/-fg` | mêmes hex | `--tone-info/warning/success/danger-*` | OK |
| `--act-bg`, `--act-fg` | **#ececec / #111 (gris)** | `--tone-action-*` = **#ece1fb / #4c1d9e (violet)** | **DIFFÉRENT** : la pastille « Valide » du proto et le badge « ✦ PO » (`.po`) sont gris, l'app a un ton action violet. Dans le proto, « action » = neutre. |
| `--neutral-bg/fg` | #ececec / #111 | `--tone-neutral-*` | OK |
| `--glass` (barre du proto) | rgb(24 24 24/.86) | `--surface-glass` (.82) | sans objet (barre du proto) |
| `--shadow` | `0 1px 2px rgb(0 0 0/.04), 0 8px 24px rgb(0 0 0/.06)` | `--elevation-2` = `0 4px 16px rgba(0,0,0,.12)` | **DIFFÉRENT** : ombre du proto plus douce et en deux couches. Ajouter `--elevation-card` (ou réaligner `--elevation-2`). |
| `--ease` | cubic-bezier(.23,1,.32,1) | `--ease-standard` (.2,0,.2,1), `--ease-out` | **DIFFÉRENT** (léger) |
| `--font` | Google Sans Flex, 500, 16 px, ls −.02em | `--font-sans`, `--fw-medium`, `--type-body-tracking` | OK |
| h1 `.h1` | 30 px, ls −.04em | `--type-display-md` 28 px | DIFFÉRENT (2 px) |
| `.now h2`, `.dhead h2` | 22 px | `--type-display-sm` 20 px / `--type-figure-lg` 22 px | DIFFÉRENT |
| `.card h2` | 20 px | `--type-display-sm` 20 px | OK |
| `.card h3`, `.vcard h3` | 16 px / 600 | `--type-body-md` + `--fw-semibold` | OK |
| `.pill` | **13 px / 600**, h 24, px 10 | `StatusBadge md` 16 px / 500, h 26, px 12 ; `sm` 14 px, h 20, px 8 | **DIFFÉRENT** |
| `.src`, `.row .src`, `.meta .k`, `.fact .k`, `.step .s` | **13 – 14 px** (13, 13.5, 14) | `--type-caption` 14 px (plancher de DESIGN.md) | **DIFFÉRENT** : le proto descend à 13 px ; DESIGN.md impose 14 px au plus petit. **Point à trancher** (§ 12) : proposition = 13 → 14 px. |
| `.cap`, `.note` | 14 px / 14.5 px, `--text-2` | `--type-caption` / `--type-body-sm` 15 | OK à ±0,5 px |
| `.btn` | h 40, px 18, **15 px / 600**, pilule, `:active scale(.97)` | `Button` default h 38, px 16, 16 px / 500, sans échelle ; `lg` h 40, px 20, 18 px | **DIFFÉRENT** : graisse 600 et taille 15 du proto, appui en échelle (DESIGN.md interdit le scale). |
| `.btn.sm` | h 32, px 14, 14 px | `Button sm` h 32, px 12, 15 px | DIFFÉRENT (léger) |
| `.btn.ghost` | texte `--text-2` | `ghost` texte `--foreground` | DIFFÉRENT (léger) |
| `.card` | radius 12, padding 20, bordure `--hair`, gap 14 | `rounded-2xl` 12 px, `p-5` 20 px | OK |
| `.callout` | radius 10, padding 12/14, 15 px, **icône à gauche** | `ToneCallout` radius 12, px 16 py 12, 16 px, sans icône | DIFFÉRENT (icône manquante) |
| `.rows` / `.row` / `.irow` | bordure `--hair`, radius 10, ligne padding 11–12/14, 15 px, filet entre lignes | `FactList` (radius 12, p-4, gap-3, sans filets) | DIFFÉRENT |
| `.in` (champ) | min-h 40, bordure `--field`, radius 8, padding 8/12 | `Input` (h `--density-field-h` 40, radius 12 « 2xl ») | DIFFÉRENT (radius 8 vs 12) |
| `dialog.modal` | **verre clair** : `color-mix(--raised 88%)`, blur 20, bordure `--border`, radius 16, ombre `0 24px 60px rgb(0 0 0/.3)`, **voile rgb(0 0 0/.35)**, entrée `scale(.97)` 180 ms, largeur 520 / 900 (wide) | `Dialog` : **verre sombre** `--surface-glass` rgb(24 24 24/.82), blur page 4 px **sans voile**, panneau blur 24, radius 16, largeur 512 / 672 | **DIFFÉRENT — point à trancher** (§ 12) : DESIGN.md (décision de Sacha du 27/09) dit verre sombre ; le proto dit verre clair. |
| `.toast` | **fond encre** (`--inverse`), texte blanc, radius 12, 15 px, en bas à droite, 3,6 s | `Toaster` sonner : fond `--popover` (blanc), bordure, radius 10, icône | **DIFFÉRENT** |

Conclusion tokens : ajouter `--elevation-card`, décider `--tone-action` (gris comme le proto, ou garder le
violet et changer le proto), décider verre clair / sombre et plancher 13/14 px. Le reste se fait avec
les tokens existants.

---

## 2. Brique 1 — Le patron d'écran (cadre de module)

### 2.1 Ce que montre le proto (ordre vertical, `shell()` de chaque moteur)

```
crumbs        « Néons › Marketing › Stratégie › Les 8 dimensions »   14 px, --text-3
chevrons      [Stratégie ①] [Conception] [Production] [Activations] [Suivi & bilan]   (Marketing seul)
headrow       h1 « Stratégie » (30 px)                              [Qui fait quoi] (btn ghost sm)
facts         Néons · Mona Lys · Single   Budget **25 000 € HT**   Responsable **Lina Haddad**   Sortie **Sam. 05/12/2026**
flash         (bandeau de résultat, voir § 9)
Maintenant    carte .now
strip         pastilles « n blocages » · « n éléments à revoir » · « n informations à confirmer »
layout        [spine 300 px] [card : étape ouverte]
```

**a) Fil d'Ariane** `.crumbs` : 14 px, `--text-3`. Marketing : texte simple `Néons › Marketing › <sous-module> ›
[livrable ›] <étape>` ; Cadrage : `Néons › Cadrage › <étape>` ; Master : boutons `Néons` (toast) › `Master`
(revient au parcours) › étape en `aria-current` couleur `--text` ; Juridique : `Néons › Juridique` (bouton
qui ouvre l'étape à moi) `› <b>étape</b>` ; Distribution : **pas de fil d'Ariane** (incohérence du proto) ;
Vue d'ensemble : `Néons › Vue d'ensemble`. Bug du proto : le Master colle les segments (« Néons›Master›Source »,
pas de `gap`). **À retenir** : `Projet › Module › [sous-module ›] [livrable ›] Étape`, chaque segment sauf le
dernier cliquable, séparateur « › », 14 px gris, dernier segment `--text`.

**b) Chevrons des sous-modules** `.chevrons` / `.chev` (Marketing seul) : **pilules**, pas des flèches :
h 36, padding 0 14, radius 999, fond `--soft`, texte `--text-2` 15 px, gap 4 px ; **active = fond encre
`--inverse`, texte blanc** ; sous-module entièrement fait → rond 16 px `--ok-bg`/`--ok-fg` avec coche avant le
libellé ; compteur « à vous » `.mine` (rond 18 px bleu `--sel`, 11 px, 700) après le libellé, `aria-label
"n à vous"` ; `aria-pressed`. Une seule barre, au-dessus du titre (sous le fil d'Ariane). Le Master, le
Juridique et la Distribution **n'ont pas de chevrons** : leurs étapes sont dans le parcours.

**c) En-tête** `.headrow` : h1 30 px (ls −.04em) + à droite `btnrow` : pastille du livrable en Production
(« Clip officiel · Externe · Studio Ressac ») et **« Qui fait quoi »** (`btn ghost sm`) qui ouvre la modale
« Qui fait quoi » (rôles : libellé, pastille Exécute/Coordonne/Valide, titulaire avec avatar, « lien
privé », « Changer » pour le responsable ; puis « Liens privés » : n° de lien, Révoquer, Nouveau lien ;
historique des changements de rôle « ↺ »). Distribution : pastille de statut du workflow à côté du h1
(`.h1row`, « En attente »). Master / Juridique : ni « Qui fait quoi » ni pastille (incohérence du proto :
la règle 22 bis met « Qui fait quoi » partout).

**d) Ligne de faits** `.facts` : flex-wrap, gap 6 × 18 px, 15 px `--text-2`, valeurs en `<b>` 600 `--text`.
Marketing/Cadrage : `Néons · Mona Lys · Single` · `Budget 25 000 € HT` · `Responsable Lina Haddad` ·
`Sortie Sam. 05/12/2026` ; Production externe : `Clip « Néons »` · `Enveloppe interne 18 000 € HT` ·
`Tournage visé Ven. 23/10/2026` · `Livraison Sam. 28/11/2026` · Sortie ; Master/Juridique :
`« Néons » · Mona Lys · single` · `Master final attendu le Sam. 21/11/2026` · `Sortie Sam. 05/12/2026` ;
Distribution : + `Distributeur The Orchard`. Dates toujours « Jjj. JJ/MM/AAAA » (règle 4).

**e) « Maintenant »** `.card.now` : bordure `--border` (plus marquée), ombre `--shadow`, padding 20, gap 14.
- Sourcil `.eyebrow` (14 px `--text-2`) : pastille `info` « À vous » / « Aussi à vous » / « À vous,
  ailleurs » (action dans un autre sous-module que celui affiché) ou pastille neutre « Rien à faire pour
  vous » ou `bad` « Blocage à lever » ; puis `Lina Haddad · Marketing › Les 8 dimensions · pour le 16/10`.
- h2 22 px = l'action (« Confirmer ou écarter 10 propositions de PO ») ; `.note` = le pourquoi de l'étape.
- `btnrow` : bouton principal « Ouvrir l'étape » (ou « Ouvrir les décisions ») + `.cap` « Et 2 autres :
  a (Étape) · b (Étape) ».
- Si blocages à lever par moi : `callout bad` « n blocages à lever par vous : … ».
- **Disparaît** si la seule action à moi est l'étape affichée (« Il ne répète jamais l'étape affichée »).
- Rien à moi : h2 « Le Marketing avance sans vous pour l'instant » (« Le Master avance… », « Le master
  final est au Catalogue », « Tout est à jour ») + jusqu'à 3–4 lignes `.wr` (fond `--soft`, radius 8,
  padding 10/12, 15 px) : avatar 24 px · « En attente de **Claire Morel** (lien privé) : valider la V1 ·
  Étape » · bouton ghost sm « Voir ». Master : une attente sans personne (une date) a une horloge à la
  place de l'avatar.
- Vue d'ensemble (`host.js nowCardH`) : même carte, **toutes les actions du projet**, Cadrage d'abord,
  bouton « Ouvrir », h2 20 px, « Et n autres : x (Master) · y (Juridique) » ; vide : « Tout ce qui vous
  concerne est fait » + « Les autres avancent ; la Vue d'ensemble dit qui est attendu. ».
- **Point connu** : il y a aujourd'hui une fonction `nowCard()` par moteur + `nowCardH()` dans la
  coquille, chacune avec sa logique. Il en faut **une**, déclinée par workflow sans dupliquer : même
  calcul (`allActions` = acteurs des étapes en cours + informations à confirmer), filtré par module pour
  la carte du module, non filtré pour la Vue d'ensemble.

**f) Pastilles d'attention** `.strip` / `.chipbtn` (Marketing) : h 34, radius 999, bordure `--hair`, 14 px,
point 8 px coloré (`bad`, `warn`, `info`) : « 2 blocages » (ouvre l'étape bloquée), « 1 élément à revoir »
(ouvre Travail), « 3 informations à confirmer » (ouvre la modale « Informations et décisions », large).

**g) Parcours (spine)** `.spine` : sticky top 20, padding 12, fond `--raised`, bordure `--hair`, radius 12 ;
titre h2 15 px `--text-2` « Parcours » (Master, Juridique, Distribution) ou « Parcours · Stratégie »
(Marketing, Cadrage) ; Juridique et Distribution : **intertitres de groupe** (`.sect`, « Dossier »,
« Suivi · démarches proposées ») ; pied (Master, Juridique) : `.linkbtn` souligné « Historique du master »
/ « Historique du dossier ».
Chaque étape `.step` (bouton, grille 24 px + texte, padding 9/8, radius 8, filet vertical 2 px `--hair`
entre les ronds ; sélectionnée = fond `--sunken`, survol `--soft`) :
| État | Rond `.mark` 24 px | Titre `.t` 15/600 | Sous-titre `.s` 13.5 px |
| --- | --- | --- | --- |
| fait | fond `--ok-bg`, coche `--ok-fg` | normal | le **résultat** (« Échange du 05/10 », « 5 démarches lancées ») |
| en cours | bordure `--sel`, fond `--sel-bg`, point bleu 8 px | normal | « Nom · action » |
| en cours à moi (`.me`) | rond plein `--sel`, point blanc | normal | « **À vous ·** action » en `--sel` 600 |
| en attente d'un retour (`.waitst`, Master/Jur./Distr.) | bordure + fond `--warn-*`, point `--warn-fg` | normal | « En attente de X · … » en `--warn-fg` |
| à revoir (`.rework`, Production) | bordure `--warn-fg`, fond `--warn-bg` | normal | « À revoir · … » |
| verrouillée (`.blocked`) | bordure **pointillée**, cadenas 12 px `--text-3` | 500, `--text-3` | « Après : X, Y » |
| obsolète (Juridique) | bordure pleine, ✕ | barré, `--text-3` | — |
| réserve (Distribution) | `--warn-*` | — | — |
| blocage signalé | — | + icône stop `--bad-fg` après le titre | — |
| alerte (Jur./Distr.) | — | — | `.s.bad` rouge 600 « Échéance dépassée · … », « Décision requise · … » |

**h) Étape ouverte** `section.card` (tout dans **une** carte) :
- `.dhead` : h2 22 px + pastille d'état : « Fait » (ok), « En cours » (info), « En attente d'un retour »
  (warn), « À revoir » (warn), « Plus tard » (neutre), Distribution : « Prêt pour contrôle », « Incomplet »,
  « Clôturée normalement »…
- `.note` 14.5 px : le pourquoi.
- **Grille méta** fond `--soft`, radius 10, padding 14, gap 12, `.k` 13 px `--text-3`, `.v` 15 px
  (nom + `.cap` rôle dessous) :
  - **Cadrage et Marketing : 5 colonnes** `.meta5` — **Exécute / Coordonne / Valide / Prérequis / Ensuite**
    (« Aucune validation » ; « À désigner » ; « Responsable de l'activation »).
  - **Master, Juridique, Distribution : 4 colonnes** `.meta` — **Responsable / Validation / Prérequis /
    Ensuite** (« Aucune » ; « Calculé par le code · à chaque ouverture » ; « avant le Jjj. JJ/MM/AAAA » en
    rouge si dépassé).
  - Prérequis : `✓` vert (`--ok-fg`) ou `○` gris par ligne ; **préfixe du module s'il est ailleurs**
    (« Marketing › Échange stratégique ») ; prérequis externes avec leur source dessous
    (« Plan du projet lancé · Plan du projet · fait le 18/10 ») ; Distribution : chaque source « Master final
    · Master ».
  - Ensuite : titres, préfixés du module s'ils sont ailleurs ; Juridique : « et n autres » au-delà de 3.
  - 2 colonnes sous 1200 px.
- Verrouillée : `callout info` cadenas « Se débloque quand X et Y sont faits. » (Marketing : « S'ouvre
  quand … »). Distribution : « Ce qui viendra » (liste numérotée des gestes, avec qui).
- Puis, **dans cet ordre et seulement s'ils existent** : motif d'un retour (`callout warn` signé, règle 6),
  blocages (`callout bad` « **Bloqué** · texte · Débloque : **X** · prochaine action : … · signalé le … par
  … » + « Lever le blocage » (modale avec explication obligatoire) ou « Choisir ce qui fait foi »),
  « À revoir après un changement : … », encadré PO (`.callout.info` + badge `.po` « ✦ PO »), faits,
  manques, l'action ou « En attente de X (lien privé) : … » (`.wr`), le **bandeau de résultat**
  (Distribution seule, au-dessus du geste), le résultat final (`callout ok`), « Informations notées »
  (lignes de décision de l'étape, contradictions signalées), puis
- **« Signaler un blocage »** et **« Noter une information »** (`btn ghost sm`, côte à côte ; membres de
  l'équipe seulement ; ni sur une étape verrouillée, ni Marketing clôturé). Chacun ouvre sur place une
  carte fond `--soft` :
  - Blocage : « Ce qui bloque * » (textarea), « Qui débloque * » (liste des personnes), « Prochaine
    action * », boutons « Signaler » / « Annuler ».
  - Information : « Ce qui a été dit * », « Source » (Appel, WhatsApp, E-mail, Réunion, Autre), « Statut »
    (Information / À confirmer / En attente de décision / Décidé), « Étape concernée », « Contredit »
    (Rien / une autre information), « Noter » / « Annuler ».
- **« Déjà fait »** (Master, Juridique, Distribution) **tout en bas** : h3 15 px `--text-2`, liste `.hist`
  14 px « ✓ texte · qui · quand · suite à : cause ». **Absent du Marketing et du Cadrage** dans le proto
  (le journal y est dans Activité) — VISION § 4 le demande partout.

### 2.2 Ce qui existe dans l'app

| Élément | Composant / fichier | Usages |
| --- | --- | --- |
| Type d'étape | `lib/ui/journey.ts` (`JourneyStep` : key, href, title, why, status `done/current/blocked/upcoming`, owner, validator, prereq[], next[], actor, summary ; `nowOf`) | Production (`lib/production/journey/*`), Juridique (`lib/legal/journey.ts`, `journey-context.ts`) |
| Maintenant | `components/shell/journey/now-card.tsx` (`NowCard`, textes `lib/i18n/fr/journey.ts`) | `production/[deliverableId]/layout.tsx` (**sans `shownKey`** : répète l'étape), `legal-step-frame.tsx` |
| Parcours | `components/shell/journey/journey-spine.tsx` (`JourneySpine`, lien de pied « Historique ») | mêmes 2 |
| Étape ouverte | `components/shell/journey/step-panel.tsx` (`StepPanel`) | 13 pages de la Production + Juridique |
| Cadre | `components/legal/legal-step-frame.tsx` (Juridique), layout de la Production | — |
| Titre + fil d'Ariane | `components/projects/project-page-title.tsx` (`ProjectPageTitle`, `projectTrail`) dans `app/(app)/app/projects/[projectId]/layout.tsx` | toutes les pages d'un projet |
| Chevrons | `components/projects/section-steps.tsx` → `components/ui/process-steps.tsx` (flèches `clip-path`, `.process-step` de `globals.css`) ; `lib/ui/marketing-steps.ts`, `master-steps.ts`, `distribution-steps.ts`, `legal-steps.ts` | layout projet : Marketing, Distribution **et Master** |
| Qui fait quoi | `production/journey/who-does-what.tsx`, `design/roles/*` (`RightsMatrix`) | Production, Conception seulement |
| Blocages | `activations/pilot/blocker-buttons.tsx` (`ReasonForm`), `overview/BlockersCard` | Activations seulement |
| Informations notées | rien de générique (Production : décisions `production_*`) | — |
| Historique | `legal/history/*` (`HistoryView`), `DayGroups`, `project-history/ActivityTimeline` | pages séparées |
| Statut workflow | `lib/workflow-status/*` (`loadWorkflowStates`, `boardActions`) | Vue d'ensemble, sidebar |

### 2.3 Écarts

| Point | Écart | Détail |
| --- | --- | --- |
| Couverture | **MANQUANT** (L) | Master (`components/master-workflow/*`, pages `master/*`), Marketing (Stratégie, Conception, Activations, Suivi), Distribution, Cadrage n'utilisent pas le patron. Chaque zone doit fournir son loader `JourneyStep[]`. |
| Fil d'Ariane | **DIFFÉRENT** (S) | App : dans le h1 à 28 px (« Juridique / Plan d'action / … », séparateur « / »). Proto : ligne à part 14 px gris au-dessus, séparateur « › », dernier segment = l'étape, h1 = nom du module seul. |
| Chevrons | **DIFFÉRENT** (S) | App : flèches emboîtées h 44 sous le titre, actif encre, **aussi pour le Master** et la Distribution. Proto : **pilules** h 36 au-dessus du titre, compteur « à vous », coche verte ; **Marketing seul** (Master et Distribution : leurs étapes sont dans le parcours, les chevrons du Master sont EN TROP). |
| En-tête | **DIFFÉRENT** (S) | App : pas de ligne de faits, pas de « Qui fait quoi » à droite (seul `AddExpenseButton`). |
| Ligne de faits | **MANQUANT** (S) | Aucun composant `ModuleFacts`. |
| Maintenant — états | **DIFFÉRENT** (M) | App : « À vous » / « Aussi à vous » / « Rien à faire pour vous ». Manquent « À vous, ailleurs », « Blocage à lever », le callout des blocages, l'échéance dans le sourcil, le préfixe `Module ›` dans le sourcil, le libellé par module (« Le Master avance sans vous… »). Rendu : ombre `elevation-2` au lieu de `--shadow`, h2 20 au lieu de 22. Production ne passe pas `shownKey`. |
| Maintenant — source | **DIFFÉRENT** (M) | Le point connu : une seule logique. Aujourd'hui `nowOf` par module + `NextActionsCard`/`boardActions` pour la Vue d'ensemble + Travail/accueil (`home-cards`) : trois calculs. |
| Pastilles d'attention | **MANQUANT** (S) | `strip` (blocages, à revoir, informations à confirmer). |
| Parcours — états | **DIFFÉRENT** (S) | App : done / current / blocked / upcoming. Manquent : « en attente d'un retour » (warn), « à revoir » (warn), obsolète, réserve, icône de blocage, sous-titre rouge (échéance dépassée / décision requise), intertitres de groupe. Titre « Parcours · Stratégie ». |
| Étape — carte | **DIFFÉRENT** (S) | App : en-tête dans une carte, contenu (`children`) **hors carte** dessous. Proto : tout dans une carte. |
| Étape — méta | **DIFFÉRENT** (M) | App : 4 colonnes fixes Responsable/Validation/Prérequis/Ensuite. Proto : 5 colonnes Exécute/Coordonne/Valide/Prérequis/Ensuite au Cadrage/Marketing, 4 ailleurs ; prérequis **d'un autre module** (préfixe, source dessous) impossibles aujourd'hui (`of(key)` ne cherche que dans le même parcours) ; plusieurs valideurs. |
| Étape verrouillée | **DIFFÉRENT** (S) | App : « Normalement après X. **Vous pouvez déjà préparer cette étape.** » et le contenu reste actif. Proto + VISION § 4 et § 7 : « Se débloque quand X est fait. », lecture seule, rien à faire. |
| Signaler un blocage | **MANQUANT** (M, migration) | Hors Activations. Table générique `step_blockers` à créer. |
| Noter une information | **MANQUANT** (M, migration) | Table générique `step_notes` (informations notées, statut, source, contradiction, étape) à créer ; pastille « n informations à confirmer » + modale. |
| Déjà fait | **DIFFÉRENT** (S) | App : historique sur une page à part (lien de pied). Proto : bloc en bas de l'étape. Composant `StepHistory` lisant le journal filtré par étape (l'app a `marketing_events`, journal Juridique, `activity`…). |
| Qui fait quoi | **DIFFÉRENT** (M) | Composants propres à la Production et à la Conception ; à généraliser en modale commune (rôles + liens privés + historique). |

### 2.4 À construire (composants uniques)

- `components/shell/module/module-header.tsx` — `ModuleHeader` : `crumbs` (segments `{label, href?}`),
  `chevrons?` (`SubModuleTabs`), `title`, `status?` (pastille), `actions` (slot « Qui fait quoi »),
  `facts` (`ModuleFacts` : `{label?, value}` avec `<b>`). Remplace `ProjectPageTitle` + `SectionSteps`
  dans le layout projet. Sans état client : `"use client"` seulement sur les pilules si `aria-pressed`.
- `components/shell/module/sub-module-tabs.tsx` — pilules (variante de `ProcessSteps` ? non : forme
  différente, nouveau composant ; `ProcessSteps` reste pour d'autres usages ou est retiré s'il n'en a plus).
- `lib/ui/journey.ts` étendu : `status` + `"waiting" | "rework" | "obsolete"`, `alert?: "overdue" |
  "decision"`, `group?: string`, `module: WorkflowKey | "framing"` (+ sous-module), `prereq` en
  `{key, module?, label, done, source?}` (pré-requis inter-modules résolus par le loader), `roles` :
  `{kind: "exec"|"coord"|"valid"|"owner", person, role, viaLink}[]` → la grille choisit 4 ou 5 colonnes
  selon les rôles présents (pas une prop « Cadrage » : **une variante = une prop** `meta="roles5"|"owner4"`
  ou déduite), `due?`, `blocked?: boolean` (blocage signalé).
- `NowCard` étendu : `elsewhere` (actions du viewer dans d'autres modules, avec `module › étape`),
  `blockers`, libellés par module ; `shownKey` obligatoire.
- `lib/journey/project.ts` — `loadProjectJourneys(projectId)` (serveur, `cache()`), qui appelle le loader
  de chaque workflow et rend `{ steps par module, mine, waiting }` : source unique de la carte du module,
  de la Vue d'ensemble, de Travail/Validations, des pastilles de la barre (règle « Une seule source »).
- `StepPanel` : contenu **dans** la carte ; slots ordonnés `retour`, `blockers`, `review`, `po`, `children`,
  `result` (bandeau), `notes`, `tools` (« Signaler un blocage » / « Noter une information »), `history`
  (« Déjà fait ») ; verrouillée → `children` non rendus (ou rendus en lecture seule) + « Se débloque
  quand… ».
- `components/shell/module/step-tools.tsx` (`BlockerForm`, `NoteForm`, `LiftBlockerDialog` sur
  `FormDialog` + `ReasonForm`), `AttentionChips`, `NotesDialog`, `RolesDialog`.
- `components/shell/module/step-history.tsx` (`StepHistory`, « Déjà fait »).

Migrations : `step_blockers` (projet, module, étape, texte, qui débloque, prochaine action, signalé par/le,
levé par/le + explication) ; `step_notes` (projet, module, étape, texte, source, statut, contredit,
écartée/remplacée, décidée par/le) — RLS projet, écriture du responsable / membres selon `can_see_project`,
entrer dans `delete_project_row`. Effort total brique 1 : **L (5–7 j)**, hors branchement de chaque zone.

---

## 3. Brique 2 — Cartes de choix de départ « Recommandé »

### Proto
`.choices2` (grille 2 colonnes, 1 sous 640 px, gap 12) de **boutons** `.choice` : padding 18, bordure
`--border`, radius 12, fond `--raised`, texte à gauche ; survol bordure `--text-3` + fond `--soft` ; focus
anneau 2 px `--sel`. Contenu : `.eyebrow` = **titre 16 px gras** + pastille `info` **« Recommandé »** ;
dessous `.src` 14 px `--text-2` (ce que fait le choix). **La raison** du « Recommandé » est une ligne
`.src` **sous la grille** : « Il manque 4 informations et 2 sont à confirmer : un échange ira plus vite
que des questions une à une. » (Cadrage), « Il manque X, Y et Z : un échange ira plus vite que des
questions séparées. » (Master). Cliquer la carte **choisit et avance** (pas de radio + « Confirmer »).
Mots : Cadrage « Commencer le cadrage » / « Préparer un échange » ; Conception « Préparer un échange
créatif » (Recommandé) / « Commencer directement » ; Master Brief « Commencer directement » / « Préparer un
échange » (recommandé si ≥ 2 manques, calculé par le code). Incohérences du proto : la Stratégie
(`stratgo`) n'a **pas** de « Recommandé » ; « Comment organiser la préproduction ? » (Production) est une
liste radio `.opts` + « Confirmer » (« Ce choix ne déclenche rien à l'extérieur »), et « Qui produit ? »
aussi (`.opts`, `pick`). Dans le Master d'origine, les cartes portaient leur propre bouton ; le patch
global les a remplacées par les `.choice` cliquables.

### App
- `components/framing/intel/framing-entry.tsx` : deux cartes `li` (bordure, radius 16, p-4) avec titre,
  `StatusBadge` « Recommandé », corps, raison **dans** la carte recommandée, et un vrai bouton par carte
  (`FramingCallSheet` / « Commencer le cadrage ») ; textes `lib/i18n/fr/framing-intel.ts` `entry.ways`,
  `entry.why`, `entry.recommended`.
- `components/ui/choice-cards.tsx` (`ChoiceCards`, radios natifs + conséquence, 46 usages) — c'est
  l'équivalent de `.opts`, pas de `.choice`.
- Master : `components/master-workflow/brief-header.tsx`/`prepare-exchange-button.tsx` (bouton « Préparer un
  échange », pas de cartes) ; Stratégie : `components/strategy/strategy-entry*` ; Conception :
  `components/design/start-conception-form.tsx`.

### Écart et à faire
**DIFFÉRENT** (S) : créer `components/ui/start-choices.tsx` — `StartChoices` : `choices: {value, title,
body, href | onChoose | formAction}[]`, `recommended?: value`, `reason?: string` (calculée par le code,
affichée sous la grille), carte entière cliquable (`<button>` ou `<Link>`), `columns` 2. Remplacer
`framing-entry.tsx`, le départ de la Stratégie (ajouter « Recommandé » : décision à écrire dans
`docs/` — la règle est la même qu'au Cadrage), de la Conception et du Brief Master. Garder `ChoiceCards`
pour les choix de formulaire (« Qui produit ? », organisation de la préproduction), qui sont des `.opts`
dans le proto : à vérifier le rendu `.opt` (padding 12/16, filets, fond `--sel-bg` coché, radius 10
du groupe) ≈ `ChoiceCards` (cartes séparées gap 8, radius 8) → **DIFFÉRENT léger** : ajouter une variante
`variant="list"` (lignes jointes dans un cadre). Pas de migration.

---

## 4. Brique 3 — Le formulaire de call commun

### Proto (mk.js `prepGate`, `whoChips`, `agendaRow`, `moveAgenda`, `newPersonModal` ; master-patch.js `mxPrep`)
Rendu **dans l'étape**, sous la ligne `Départ · Préparer un échange · choisi par Lina Haddad le 14/10
[Changer]` (`.kv` 180 px / valeur, `Changer` tant que rien n'est créé ni tranché).

1. h3 **« Nouvel échange »** (Cadrage, Stratégie, Conception, Master) / **« Nouveau call »** (Production).
2. **Participants \*** `.attend` > `.chips` (champ façon Teams/Outlook : min-h 44, padding 6/8, bordure
   `--field`, radius 8, focus anneau `--sel`) :
   - pastille `.chip` h 30, radius 999, fond `--soft`, 14 px : avatar 24 + nom + `cap` « externe » +
     ✕ `.chipx` 24 px (« Retirer X ») ; info-bulle « Fonction · Équipe / Invitation sur son lien privé /
     Invitation par e-mail » ;
   - champ `.chipin` « Ajouter » / « Ajouter des participants » ;
   - liste `.sugg` (ouverte au focus, absolue, max-h 280, radius 10, ombre `0 8px 24px rgb(0 0 0/.18)`) :
     avatar · **Nom** · rôle · « Équipe » / « Externe » ; filtrage à la frappe (nom + rôle) ;
   - dernière ligne `.newwho` : tapé une adresse → « **Inviter x@y.fr** · par e-mail, une fiche est créée
     dans le Réseau » ; un nom inconnu → « **Créer la fiche de « X »** · dans le Réseau, puis l'inviter »
     → **`newPersonModal`** « Nouvelle fiche dans le Réseau » : Nom \*, E-mail \*, Structure, Fonction dans
     le call ; « Créer et inviter » / « Annuler » (variante « Nouvelle société dans le Réseau ») ;
   - clavier : **Entrée** ajoute la meilleure correspondance (mot qui commence par la saisie, sinon
     contient, sinon « créer »), **↓** descend dans la liste, **Retour arrière** sur champ vide retire la
     dernière pastille ; focus gardé dans le champ après ajout/retrait ;
   - pré-rempli par fonction depuis « Qui fait quoi » (`cfg.who` : Projet, Direction, Création,
     Production, Management…), des **ids**, jamais des noms tapés ;
   - sous le champ : « Externes : Jade Petit (invitation par e-mail), … » ;
   - erreur : « Un échange réunit au moins deux personnes. ».
3. `.grid3` : **Date \*** (`type=date`), **Heure \*** (`type=time`), **Format** (Visio / Sur place).
4. **Ordre du jour** (h3) : `.rows` de `.irow.agrow` (draggable) :
   `[⋮⋮ poignée .ib.grip 32 px] 1. Point [↑][↓ (tactile seulement, pointer:coarse)][✎ Modifier][🗑 Retirer]`
   - **Glisser** par la poignée seulement (sinon le texte est sélectionnable) ; pendant le glisser, la ligne
     source à 45 % d'opacité, la cible soulignée d'un trait 2 px `--sel` au-dessus ou au-dessous ;
   - **clavier** : flèches ↑/↓ sur la poignée déplacent, le focus suit la ligne ;
   - **tactile** : boutons Monter / Descendre (`data-touch`, visibles en `pointer:coarse`) ;
   - **Modifier sur place** : champ `#agE` dans la ligne, ✓ Enregistrer, ✕ Annuler ; Entrée enregistre,
     Échap annule ; libellés « Modifier « X » », « Retirer « X » », « Déplacer « X » (flèches haut et bas) » ;
   - ajout : champ « Ajouter un point » + `btn out sm` « Ajouter » ;
   - **pas de durées** par point dans le proto.
   - Pré-rempli par le code : Cadrage = les dimensions qui ont un manque ou un « à confirmer » ;
     Stratégie = les 8 dimensions ; Conception = « Direction de la sortie », « Intentions : <livrable> »…,
     « Références » ; Production externe = 4 points fixes ; Master = ce que le Brief ne sait pas.
5. **Envoyé avec l'invitation** (h3) : `.kv` Objectif (calculé), Documents, Sujets / Points ouverts (avec
   source « · Fiche Livrable › Points à préciser ») ; note « L'ordre du jour vient de ce que le Brief ne
   sait pas encore. ».
6. Boutons : **« Voir le récapitulatif »** (+ Master : ghost sm « Commencer directement plutôt »).
7. **Récapitulatif avant création** (même place) : `.kv` Quand (« Mar. 20/10/2026 à 14:00 · Visio »),
   Participants (pastilles en lecture), Ordre du jour (« 1. … · 2. … »), Objectif ; `.src` « Les
   invitations partent à la confirmation : Jade Petit est externe. » ; **« Confirmer et inviter »** /
   **« Modifier »** (ghost).
8. Après : `.kv` « Échange prévu · Mar. 20/10/2026 à 14:00 · Visio · créé par Lina Haddad le 14/10 »,
   « Lien de la visio », Participants, Ordre du jour ; note « L'échange s'enregistre dans PDS OS. À la fin,
   PO propose ce qui a été dit, point par point, avec la phrase exacte. » ; proto : bouton pointillé
   « Proto : l'échange a eu lieu, compte rendu reçu ».
9. Non responsable : la même chose en lecture + « En attente de Lina Haddad : préparer le call … ».

**Point connu** : le Master (`master-patch.js mxPrep`) a encore des boutons ↑/↓ **toujours visibles** et
**pas de poignée ni de clavier**, pas de `newwho`/`newPersonModal`, pas de navigation ↓ dans la liste.
Il faut la même interaction partout (poignée + clavier + boutons sur tactile).

### App (5 familles qui font la même chose)

| Composant | Fichier | Usages | Ce qu'il fait |
| --- | --- | --- | --- |
| `ParticipantsField` | `components/calls/participants-field.tsx` | Conception, Production (prép. et technique), Cadrage, Stratégie (5) | pastilles `FilterChip` + `SearchPicker` séparé + `CreateContactDialog` ; `{name, contactId}` (les membres par **nom**, pas par id) |
| `AttendeesField` | `components/calls/attendees-field.tsx` | `CallPlanForm` (Nouveau call, Nouvelle réunion) | façon Teams (membres, Réseau, e-mail tapé, une recherche) — le plus proche du proto |
| `AgendaEditor` | `components/calls/agenda-editor.tsx` | Cadrage (`framing-call-sheet.tsx`), `CallAgenda` | points en cartes, titre + **durée** + **questions**, ↑/↓ (`IconChevronUp/Down`) toujours visibles, total |
| `AgendaTopicsField` + `MinutesInput` | `components/calls/agenda-topics-field.tsx` | Stratégie, Conception, Production ×2 (4) | sujets de PO **cochés/décochés**, durée par sujet, « Préparer en détail » (questions), ajout ; **pas d'ordre** |
| `CallFields`, `CallFormatField`, `CallSlotFields`, `MeetField` | `components/calls/` | 6 / 4 / 2 / … | titre, date-heure (`datetime-local`), format (`ChoiceCards`), lien Meet |
| `CallRecap` | `components/calls/call-recap.tsx` | 4 | récapitulatif en `FactList` (titre, quand, format, lien, objectif, participants, sujets · durées) |
| `PrepareCallSheet` | `components/calls/prepare-call-sheet.tsx` | 4 | le formulaire est dans un **panneau latéral `Sheet`** ouvert par un bouton |
| `PrepareExchangeButton` | `components/master-workflow/prepare-exchange-button.tsx` | Brief Master | « Préparer un échange » en **modale** avec ordre du jour du code |
| `MoveButtons` | `components/ui/move-buttons.tsx` | Plan de sortie (3) | ↑/↓ génériques |
| lib | `lib/calls/prepare.ts` (`buildAgenda`, `agendaRecap`), `prepare-schema.ts`, `first-call-agenda.ts`, `plan-call.ts`, `invite.ts`, `participants.ts` | | |
| SQL | `calls`, `call_attendees`, `call_guests`, `framing_calls`, `strategy_calls`, `design_calls`, `production_calls`, `master_brief_calls` | | |

### Écarts
- **DIFFÉRENT (L)** : cinq façons de choisir les participants et deux d'éditer l'ordre du jour ; aucune
  n'a la poignée + clavier + tactile ; l'app ajoute des **durées** et des **questions** par point et des
  cases à cocher (EN TROP par rapport au proto : la durée vient d'un ticket — PROJ-UX-03, « durée de chaque
  sujet modifiable » — donc **à garder repliée** ou à trancher ; les questions par point sont « Préparer en
  détail » : garder replié).
- **DIFFÉRENT** : panneau latéral / modale au lieu de « dans l'étape ».
- **DIFFÉRENT** : date + heure en un `datetime-local` (proto : deux champs + Format).
- **DIFFÉRENT** : récapitulatif sans « Confirmer et inviter » / « Modifier », avec un titre de call (le
  proto n'en demande pas : nom calculé).
- **MANQUANT** : « Envoyé avec l'invitation » (objectif, documents, sujets avec source) comme bloc ; la
  phrase « Externes : … (invitation par e-mail / sur son lien privé) » ; « Commencer directement plutôt ».

### À construire
`components/calls/prep/` :
- `AttendeeChips` (un seul champ de participants, **base = `AttendeesField`**, rendu `.chips` ci-dessus,
  ids de membres et de contacts, création « Créer la fiche de « X » » / « Inviter x@y » via
  `CreateContactDialog` existant, clavier Entrée / ↓ / Retour arrière) → remplace `ParticipantsField` et
  `AttendeesField`.
- `AgendaList` (un seul éditeur d'ordre du jour : poignée glisser + flèches au clavier + Monter/Descendre
  en `pointer:coarse`, modifier sur place Entrée/Échap, retirer, ajouter ; option `minutes` repliée si la
  durée est gardée) → remplace `AgendaEditor` et `AgendaTopicsField` ; `MoveButtons` réutilisé pour le
  tactile. Hook `use-reorder.ts` (glisser + clavier) partagé.
- `CallPrepForm` (participants, date, heure, format, ordre du jour, « Envoyé avec l'invitation »,
  « Voir le récapitulatif » → `CallPrepRecap` → « Confirmer et inviter » / « Modifier ») ; rendu **dans
  l'étape** ; reçoit `defaults` (participants par fonction, ordre du jour, objectif, documents) calculés
  côté serveur par la zone ; une seule Server Action `createPreparedCall(kind, …)` qui écrit `calls` +
  `call_attendees`/`call_guests` + la table de lien du module (déjà là).
- `PlannedCallFacts` (« Échange prévu … créé par … », lien, participants, ordre du jour, note sur
  l'enregistrement).
- Retirer `PrepareCallSheet`, `PrepareExchangeButton`, `CallRecap`, `ParticipantsField`,
  `AgendaTopicsField` une fois les 6 usages migrés.
Effort **L (3–4 j)**. Migration : aucune obligatoire (colonnes existantes) ; si l'ordre du jour perd ses
durées, rien à migrer (garder la colonne). Risque : `lib/calls/prepare.ts` recalcule les durées côté
serveur (`buildAgenda`) — adapter le schéma zod (`prepare-schema.ts`) si les durées deviennent facultatives.

---

## 5. Brique 4 — Compte rendu structuré et résumé aux participants

### Proto
- Dans l'étape, `.kv` « Échange stratégique · Lun. 05/10/2026 à 14:00 · Visio · Lina Haddad, Claire Morel,
  Nadia Benali » + « Compte rendu » → `btn ghost sm` **« Lire le compte rendu »** (`crBtn`).
- **`crModal`** (modale large 900 px) : h2 « Compte rendu · Échange stratégique » ; `.kv` Date, Format
  (« Visio · 48 min »), Participants (« Projet : Lina Haddad · Direction : Claire Morel · … »), Ordre du
  jour (call de production), **Source « Enregistré dans PDS OS, transcrit, puis rangé par PO »** ; puis
  **une section par point de l'ordre du jour** (h3 « 1. Positionnement ») avec ses lignes `crLine`, ou
  « Rien n'a été dit sur ce point. » ; « Tâches dites pendant le call » (production externe) ; « Ajouté
  après la réunion » ; pied « Les phrases sont citées telles quelles. Ce qui fait foi, ce sont les
  décisions confirmées dans l'étape. ».
- `crLine` (`.irow`) : `cap` « Décision / Hypothèse / Action proposée / Point à arbitrer · Tom Mercier · pour
  le 13/11 » ; **texte d'origine** en gras (barré si écarté) ; citation « « … » » ; « Devenu : « … » » si
  corrigé ; pastille à droite : « Confirmé par Lina Haddad » (ok) / « Corrigé et confirmé par … » (ok) /
  « Écarté par … » (neutre) / « À confirmer » (warn).
- **Résumé pour les participants** (`summaryBlock`, quand tout est tranché) : boîte `.sumbox` (bordure
  `--hair`, radius 12, padding 16) : h3 « Résumé pour les participants » (« · version 2 ») ; note
  « Préparé par PO à partir de ce qui a été tranché, sans les phrases citées ni ce qui a été écarté.
  Relisez et corrigez avant d'envoyer. » ; textarea « Message » (12 lignes) pré-rempli (`sumDraft` :
  « Bonjour à tous, / Merci pour le call du 15/10. Voici ce qui a été décidé. / Décisions : — … / À
  confirmer : — … / Prochaines étapes : — … · Tom Mercier, pour le 13/11 / Lina Haddad ») ; Destinataires
  (pastilles en lecture) + « Jade Petit par e-mail, Studio Ressac sur son lien privé ; l'équipe dans
  PDS OS. » ; **« Envoyer aux participants »** (+ « Annuler » en correction).
- Envoyé : h3 « Résumé envoyé aux participants » + pastille ok « Envoyé · version 1 », texte (interligne
  1.55), « Envoyé par … le … à 4 participants · versions précédentes gardées. », **« Corriger et
  renvoyer »** (ghost sm) → même formulaire titré « version 2 », pré-rempli du dernier texte.
- Côté participant (`summaryFor`, page privée) : « Résumé de la réunion », dernier texte, « Envoyé par …
  le … · version 2 ».
- Non responsable : « En attente de Lina Haddad : envoyer le résumé de la réunion ».

### App
- `components/calls/closure/call-closure-section.tsx`, `call-closure-card.tsx` (« Compte rendu et
  clôture » : cinq sorties, « Clôturer le call », **version figée, correction = version suivante**),
  `share-report-form.tsx` (partage complet / synthèse aux membres notifiés et par e-mail), `report-view.tsx`
  (`ReportView`, aussi page `/app/calls/[callId]/report`), `call-outcomes.tsx` + `call-action-list.tsx`
  (décisions et actions → tâches), `call-results.tsx`, `call-processing.tsx`, `call-workspace.tsx` ;
  lib `lib/calls/closure*.ts`, `outcomes.ts`, `report-mapping.ts`, `pipeline.ts`.
- SQL : `call_reports`, `report_items` (kind, what, who, why, quote, located, start/end), `call_closures`
  (version, `content` jsonb {summary, decisions, actions, open}, note, closed_by/at), `call_report_shares`
  (scope full/summary, recipients, recipient_person_ids).
- Le compte rendu vit **sur la page du call** (`/app/projects/[id]/calls/[callId]`), pas dans l'étape.

### Écarts
- **DIFFÉRENT (M)** : le compte rendu n'est pas rangé **par point de l'ordre du jour**, ni rapproché de ce
  qui a été tranché dans l'étape (pastilles « Confirmé par / Corrigé / Écarté / À confirmer »). À faire :
  `MeetingReportDialog` (modale large) qui lit `report_items` + les propositions tranchées de l'étape
  (`ProposalRow`, § 6) par `topic`.
- **DIFFÉRENT (M)** : le résumé aux participants de l'app est un **partage du compte rendu** (complet ou
  synthèse), pas un **message rédigé par PO, corrigé et versionné**. Le socle de versions existe
  (`call_closures.version`). Migration : `call_report_shares.message text` (le texte envoyé) **ou** table
  `call_summaries (call_id, version, text, sent_by, sent_at, recipients)` ; le brouillon est **écrit par le
  code** depuis les éléments confirmés (règle 6 : PO ne produit ni date ni montant, le code recopie).
  `MeetingSummaryBlock` (rédiger / envoyé / « Corriger et renvoyer » = version n+1) + `MeetingSummaryFor`
  (page privée).
- **MANQUANT (S)** : « Lire le compte rendu » dans l'étape (`MeetingFacts` : date, format, durée,
  participants, bouton).
Effort **M (2–3 j)**, migration S.

---

## 6. Brique 5 — Proposition à trancher une par une

### Proto (`itemRow`, `groupHead`, `addForm`, `counter`, `versionCard`)
- Groupe = `versionCard` (§ 7) : titre (dimension, livrable, « Tâches proposées », « Ce qui a été dit, point
  par point »), pastille d'état du groupe « À trancher » / « À arbitrer » (warn) / « Complété » (ok) /
  « À compléter » (neutre), méta à droite « 1 à confirmer » / « rien de dit ».
- `groupHead` : bouton `btn out sm` **dans l'en-tête de la liste, aligné à droite** : « Ajouter une
  réponse », « Ajouter un public », « Ajouter un levier », « Ajouter une intention », « Ajouter une
  tâche », « Ajouter un point » → `addForm` s'ouvre **à sa place** (carte fond `--soft`, padding 14) :
  champs selon le groupe (levier = liste ; livrable + format ; temps fort + J±n ; ligne + montant ;
  intention + question ; tâche + qui + échéance), « Ajouter » / « Annuler ».
- Ligne `itemRow` (`.irow`, flex-wrap, padding 12/14, 15 px, filet) : `cap` contexte (« Influence »,
  « Décision · Son », « Pour : Studio Ressac · pour le 21/10 ») ; **texte en gras** (barré si écarté) ;
  `.src` « « citation » · Échange stratégique du 05/10 » ou la source (« Brief de cadrage › Besoins »),
  « Modifié par Lina Haddad · … » ; « Confirmé / Écarté par … » ; à droite : `proposed` → **« Confirmer »**
  (out sm) **« Modifier »** (ghost sm) **« Écarter »** (ghost sm) ; `kept` → pastille ok « Confirmé » +
  Modifier + Écarter ; `discarded` → pastille « Écarté » + « Confirmer » (ghost) ; sans droit → pastille
  seule (« À confirmer » warn).
- **Modifier** : champ sur place pré-rempli + « Proposé : <texte d'origine> » dessous ; « Enregistrer » /
  « Annuler » ; enregistré = **confirmé** et « Modifié par … », citation gardée.
- Encadré PO au-dessus : « PO a rangé dans chaque dimension ce qui a été dit pendant l'échange, avec la
  phrase exacte. Confirmez, corrigez ou écartez chaque proposition, et ajoutez ce qui manque : rien n'entre
  dans la Stratégie sans vous. » ; compteur « 0 complétées · 8 à arbitrer · 0 à compléter ».
- Ce dont personne n'a parlé : « Rien n'a été dit sur ce livrable : il héritera de la direction. », « Rien
  n'a été dit pendant le call sur : … ».
- Rien n'est coché d'avance ; le call est une **source**, pas une étape à confirmer.
- Variante leviers (Stratégie › Dispositif) : « Retenir » / « Ne pas retenir » + pastilles « Retenu »,
  « À arbitrer », « Non retenu ».

### App
- `components/design/work/proposal-card.tsx` (`ProposalCard` : Confirmer / Modifier → « Confirmer ainsi »
  / Écarter, provenance, `callHref`, « Concerne aussi », « Diffère de la réponse déjà posée »),
  `mergeable-proposals.tsx` ; textes `lib/i18n/fr/conception-work.ts`. → le plus proche.
- Stratégie : `components/strategy/suggestion-list.tsx`, `strategy-choices.tsx`, `lever-row.tsx` —
  « Accepter » / « Écarter » / **« Tout accepter »**, « PO **pré-coche** les réponses… » (`strategy.ts`) :
  **contraire à la règle 21** (EN TROP : « Tout accepter » et le pré-cochage).
- Cadrage : `framing/intel/question-screen.tsx` (Confirmer / Modifier / Passer / Écarter), `SourceLine`,
  `ProposedBadge`, `SourceQuote`.
- Juridique : `legal/intake/proposal-review.tsx` (« Ce que PO a compris », retirer).
- Production : `production_call_items` + `PlanCallActionButton` (« Planifier » / « Confirmer et
  planifier »).
- `DraftCard` (assistant) : autre chose (brouillon de PO → formulaire).

### Écart et à faire
**DIFFÉRENT (M)** : créer `components/ui/proposal-row.tsx` (`ProposalRow` : contexte, texte, citation +
source, état, Confirmer / Modifier sur place / Écarter, « Modifié par », lecture seule sans droit) et
`ProposalGroup` (= `VersionCard` + compteur « n à confirmer » + bouton « Ajouter … » en tête + formulaire
d'ajout fourni par l'appelant + « Rien n'a été dit… ») ; type commun `Proposal { id, text, original,
quote, source, state: "proposed"|"kept"|"discarded", decidedBy, editedBy, context }` ; ton
`proposalTone` dans `lib/ui/state-tones.ts`. Brancher Conception (remplace `ProposalCard`), Stratégie
(retirer « Tout accepter » et le pré-cochage), Production (préparation, call technique), Master (réponses
du Brief tirées d'un échange). Chaque zone garde **sa** table (pas de table générique : les états sont
déjà stockés par domaine, `design_intention_choices`, `production_call_items`…). Pas de migration commune ;
vérifier pour chaque table qu'elle a `original_text`/`edited_by` (sinon colonne à ajouter par la zone).

---

## 7. Brique 6 — Cartes de versions repliables, décision avec motif, modale verre

### 7.1 Cartes de versions (`versionCard`, `.vcard`)
Proto : `<details>` fond `--raised`, bordure `--hair`, radius 12 ; `summary` min-h 52, padding 10/14,
flex-wrap : chevron 20 px `--text-3` (rotation 90° à l'ouverture, 160 ms) · h3 16/600 · pastille d'état ·
méta `.cap` **poussée à droite** (« Généré par … le … », « 1 à confirmer ») ; corps padding 4/16/16, gap 12.
Ouverte par défaut : la dernière et la retenue (règle 17) ; l'état ouvert/fermé est gardé quand on agit
(`S.vopen`). Utilisée pour : dimensions de la Stratégie, groupes d'intentions, fiches, rapports du bilan,
versions de devis/proposition/montage, « Voir tous les contrôles » (Juridique).
App : `PageSection collapsible` (chevron à droite), `FileVersionsDialog`, `BriefDocumentCard`,
`SheetVersionCard`, `AudioVersionList`, `SplitCard`, `DeclarationHistory`… — chacun replie à sa façon.
**DIFFÉRENT (S)** : créer `components/ui/version-card.tsx` (`VersionCard` : `title`, `status`, `meta`,
`defaultOpen`, chevron à gauche, `<details>` natif, état gardé via `key` stable) et l'employer pour toute
liste de versions et tout groupe de propositions.

### 7.2 Décision avec motif (`reasonModal`, issues règle 6)
Proto : deux formes. (a) **Dans l'étape** « Votre décision » : textarea « Commentaire » (« Obligatoire pour
des réserves ou une modification ») puis `btnrow` à gauche : principal « Valider le Brief de sortie », out
« Valider avec réserves », ghost « Demander une modification » ; le motif revient en tête de l'étape de la
bonne personne en `callout warn` « **Claire Morel (demander une modification)** : « … » » et le bouton
devient **« Répondre et transmettre à nouveau »** (textarea « Votre réponse * »). (b) **En modale**
(`reasonModal`, `liftModal`, `pqChangeModal`) : h2 « Annuler <activation> » / « Suspendre … » / « Lever le
blocage », note de conséquence, textarea « Motif * », boutons **principal d'abord** (« Annuler
l'activation ») puis ghost « Retour » / « Annuler », alignés à gauche. Erreur rouge sous le champ, jamais
de bouton désactivé.
App : `components/ui/reason-form.tsx` (`ReasonForm`, 21 usages ; boutons **à droite, « Annuler » outline
d'abord**, puis principal), `DecisionForm` ×5 (Production post, Stratégie, Suivi & bilan, agence),
`DecisionControls` (Conception), `MixDecision` (Master), `ConfirmDialog` (38).
**DIFFÉRENT (M)** : (1) ordre et alignement des boutons ; (2) cinq `DecisionForm` différents → un seul
`DecisionPanel` (issues configurables : Valider / Valider avec réserves / Demander une modification /
Demander une précision / Refuser ; motif obligatoire hors « oui » ; libellés exacts par étape) +
`ReturnCallout` (motif signé en tête) + « Répondre et transmettre à nouveau ». Décider si l'ordre
« principal d'abord, à gauche » du proto remplace la convention `DialogFormActions` (Annuler + principal à
droite) : **point à trancher** (§ 12).

### 7.3 Modale verre
Proto : `dialog.modal` (voir § 1) : `mhead` (h2 20 px + ✕ `.mx` rond 36 px), `mbody` padding 20, gap 14 ;
largeur 520, `wide` 900 (Informations et décisions, Qui fait quoi, Compte rendu, Rapport) ; le Master
d'origine avait sa propre `.dialog` (580, verre clair 90 %). Focus sur le premier champ / `#pkQ` à
l'ouverture.
App : `Dialog` / `FormDialog` (94 usages) / `ConfirmDialog` (38) / `LinksDialog` ; verre sombre.
**DIFFÉRENT** : couleur (clair vs sombre), voile, largeurs (512/672 vs 520/900), animation (scale vs
fondu). Si Sacha tranche pour le proto : changer `--surface-glass` et le bloc `.surface-glass` de
`globals.css` (valeurs claires), ajouter `--overlay-scrim` au `Backdrop`, `size="wide"` → `sm:max-w-[900px]`
(S en code, **mais 130 modales changent d'aspect** : à vérifier visuellement). Sinon : garder l'app et noter
l'écart dans `docs/PROTOS.md`.

---

## 8. Brique 7 — Pages privées triées

### Proto
- **Une page par personne** (`host.js portalPage`) réunissant les cartes de chaque workflow qui lui
  demande quelque chose : barre `.pbar` (logo PDS · « « Néons » · Mona Lys » · à droite cadenas « Lien
  privé · sans compte »), `.pwrap` max 820 px, sur-titre « Néons · Mona Lys · single · <rôle> », h1
  **« Ce que PDS attend de vous »** / « Rien à faire pour l'instant » / « Votre prochain rendez-vous avec
  PDS » (invité à un call) ; puis par workflow un intertitre `.pgroup` (15 px 600 `--text-3`) « Master »,
  « Juridique »… ; carte finale « Votre contact chez PDS » (avatar · **Lina Haddad** · Cheffe de projet).
- Tri (`portalCards`) : **« À vous »** d'abord (triées par échéance `dueKey`), puis intertitre **« En
  attente de PDS »**, puis `<details class="pdone">` **« Fait · n »** replié (chevron CSS). Chaque carte :
  `dhead` titre de l'étape + pastille « À vous » (info) / « En attente de PDS » (neutre) / « Fait » (ok) ;
  ligne « **Déposer le devis** · avant le 22/10 » ; corps = le corps de l'étape (lecture/geste externe).
- Résumé en tête si plusieurs actions : `.rowlist` de `.wr` « **action** · échéance · Étape » + « Voir »
  (ancre `#ps-<étape>`, `scroll-margin-top 16`).
- Ordre des cartes : parcours **inversé** (la plus récente en haut) ; agir ne déplace rien, seule la
  pastille change (règle 17). (Le Master d'origine fait `cards.reverse()`, même règle.)
- Cartes de call (`portalCalls`) : « Call de production » + « Invité » (Quand, Où, Participants, Ordre du
  jour, « Invitation envoyée par … ») ; après : résumé reçu (`summaryFor`) + « Ce qui vous a été
  demandé » (tâches, « Confirmé par PDS après le call », À faire / Fait) ou « PDS confirme les suites du
  call ; ce qui vous concerne apparaîtra ici. ».
- Bandeau de résultat (flash) aussi sur la page privée.

### App
Une page publique **par objet et par workflow** : `/m/[token]` (mixeur, `PublicPackageView`,
`PublicVersions`, `PublicRefresh`, `DeliverVersion`), `/p/[token]` (prestataire, `ProviderSpaceView`,
`LinkJourneyView`), `/f/[token]` (fiche, `PublicForm`), `/s/[token]` (répartition, `PublicSplit`),
`/i/[token]` (accord d'influence, `PublicAgreement`), `/fs/[token]` (feuille de service), `/l/[token]`
(smartlink, sans rapport). Jetons : `share_links` + tables propres (empreinte seule, VISION règle 19 note
« jeton récupérable »).

### Écart et à faire
- **DIFFÉRENT (L)** : pas de page unique par personne. Deux options : (A) garder un lien par workflow mais
  les **habiller pareil** (`PortalShell` : barre, sur-titre, h1, contact, tri `PortalSections`) — M ;
  (B) un **lien par personne et par projet** `/x/[token]` qui agrège les parts de chaque workflow — L,
  migration `person_links (project_id, contact_id, token_hash, …)` et un agrégateur
  `loadPortalCards(contact, project)` qui interroge chaque module avec les **mêmes droits** que les liens
  actuels (RLS par jeton : fonctions `security definer` par workflow déjà existantes à réutiliser). Le
  proto montre (B). Recommandation : faire (A) d'abord (composants communs), (B) quand toutes les zones
  exposent `portalCards` ; signaler le choix.
- Composants : `components/portal/portal-shell.tsx`, `portal-sections.tsx` (« À vous » triées par
  échéance / « En attente de PDS » / « Fait · n » replié), `portal-card.tsx` (titre + pastille + action),
  `portal-todo-summary.tsx`, `portal-contact.tsx`, `portal-call-card.tsx`. Effort **M (A) / L (B)**.

---

## 9. Brique 8 — Bandeau de résultat, toast, historique

### Proto
- `S.flash` → `.flash` (`role="status"`) : fond `--ok-bg`, texte `--ok-fg`, radius 12, padding 14/16 ;
  icône ✓ ; **titre gras** = le geste au participe (« Échange créé », « Proposition confirmée ») ; lignes
  « Ensuite : **Claire Morel** (lien privé) · valider la V1 (Étape) » et « Débloqué : **Mixage** · Karim
  Haddou · déposer le Mix V1 » (Master : liste des étapes passées de verrouillée à en cours, 4 lignes au
  plus) ; ✕ « Fermer ». Effacé au changement de rôle, d'étape, de module.
- **Placement (règle 7)** : « là où on a cliqué, dans l'étape, juste au-dessus du geste ». Seule la
  **Distribution** le fait (`S.flash.step === S.sel` → dans `detail()`, avant `actionBlock`) ; Marketing,
  Master, Juridique le mettent **en haut de page** (incohérence du proto : la règle gagne).
- Toast (`toast()`) : même verbe que le bouton + « . » (« Échange créé. »), 3,6 s, noir.
- Historique : par étape « Déjà fait » (§ 2) ; par module « Historique du master / du dossier » (vue
  `history`) ; projet : page Activité (`host.js activityPage` : « • **Master** · texte · qui quand »).

### App
- `useWriteSubmit` (`components/ui/use-write-submit.ts`) → `toast.success(message)` sonner (fond blanc) ;
  `useLegalAction` ; pas de bandeau de résultat ; pas de « Ensuite » ni « Débloqué ».
- Historique : `HistoryView` (Juridique), `ActivityTimeline` + `DayGroups` (Activité du projet),
  `MarketingHistory`, `JournalSection`, `ActivityLog`.

### Écart et à faire
- **MANQUANT (M)** : `ResultBanner` (`components/shell/module/result-banner.tsx`) + contrat de retour des
  Server Actions : `WriteResult` étendu à `{ ok: true, done: string, next?: {who, viaLink, todo, step}[],
  unlocked?: {step, who, todo}[] }` — **calculé par le code** après l'écriture en relisant le parcours
  (`loadProjectJourneys` avant/après, comme `snap()`/`after()` du proto). Affichage : dans l'étape,
  au-dessus de la zone d'action (slot `result` de `StepPanel`) ; passage par l'URL (`?fait=`) ou un état
  client `useResultBanner` gardé jusqu'à la prochaine navigation. Toast : même verbe.
- **DIFFÉRENT (S)** : toast noir (`Toaster` : `--normal-bg: var(--surface-inverse)`, texte
  `--text-on-dark`, sans bordure, radius 12, 15 px).
- **DIFFÉRENT (S)** : `StepHistory` (§ 2) ; l'Activité du projet garde `ActivityTimeline` (préfixe du
  module en gras à ajouter).

---

## 10. Brique 9 — Ligne de fait avec source, « Modifier » sur place, « Changer », date en entier

### Proto
- **Ligne de fait** `fact(k, v, src, {side, edit, cls})` (Master, Juridique, Distribution) dans `.rows` :
  `.k` 13.5 px `--text-3` (libellé) / `.v` valeur (souvent `<b>`) / `.src` 13 px `--text-3` (**source sous
  la valeur**, malgré « à droite » écrit dans VISION — le CSS final passe la grille à une colonne) ;
  `.side` = pastille d'état à droite (« À faire », « Prête », « Pas encore ») ou bouton ; `.missing` →
  valeur rouge `--bad-fg` (« À choisir ») ; `.changed` → source en `--sel` (« Modifié par Lina Haddad »).
  Marketing/Cadrage : `.row` (grille valeur | action) avec `cap` libellé, `<b>` valeur, `<br>` `.src`.
  Sources : « Catalogue · 02/10 », « Lu par le code · 12 pistes · Stems_Neons_v3.zip », « Calculé : 6 jours
  avant le master final », « Brief de cadrage › Temporalité · la date dont tout le reste dépend », « Call
  de cadrage du 16/10 · « on refait la voix… » », « Désigné au Cadrage › Équipe · « Karim fait le mix… » ».
- **Modifier sur place (règle 2)** : `btn ghost sm` « Modifier » à droite (responsable / acteur, étape en
  cours seulement) → la ligne devient : champ (`type=date` pour une date) avec `data-autofocus`, dessous
  « Proposition : Dim. 15/11/2026 · <source> — Entrée enregistre, Échap annule. », côté « Enregistrer »
  (sm) / « Annuler » (ghost sm) ; refus du code en rouge (« Les dates doivent se suivre : Mix V1, Mix
  final, Mastering, puis Master final. ») ; ensuite source = « Modifié par Lina Haddad » en bleu, trace
  dans l'Activité.
- **Changer (règle 3)** : `btn ghost sm` « Changer » → liste **sur place** (`.edit` > `.opts` : une ligne par
  option, nom gras + description, « Choisir » ou pastille « Choisie ») ou modale `pickerModal`
  (« Ajouter un destinataire » : recherche `#pkQ`, groupes « Liées au projet » puis « Réseau », lignes
  avatar · nom · rôle, « Créer un contact », « Garder seulement le nom ») ; versions audio en radios avec
  lecteur ▶ (`.opt` + `.play`), la détectée cochée ; après : « Choisi par … ». Personne désignée : « À
  choisir » en rouge, jamais une supposition.
- **Date dite en entier (règle 4)** : `frDate` → « Sam. 05/12/2026 » (jour abrégé + point, JJ/MM/AAAA) ;
  libellé qui dit le sens : « Mix V1 attendu le », « Master final attendu le », « Tournage visé ».

### App
- `FactList` (`components/ui/fact-list.tsx`, 44 usages : libellé / valeur, sans source ni action) ;
  `FactTable` (Juridique, Master : élément, source, état, action en colonnes, `DataTable`) ; `SourceLine`,
  `LineSources` (Cadrage) ; `ProposedBadge` ; `CallRecap` ; `BriefCalendarFields` (« Utiliser ces
  dates », formulaire) ; `PersonPickerField` (16 usages : Réseau, liés d'abord, création en modale, « Garder
  seulement le nom ») ; `ChoiceCards` (versions audio de `ConfirmSourceButton`) ; `SearchPicker`.
- Dates : pas de formateur commun « Jjj. JJ/MM/AAAA ». ~40 fichiers définissent leur `Intl.DateTimeFormat`
  (`lib/release/format.ts` « 5 décembre 2026 », `lib/calls/format.ts`, `lib/insights/dates.ts`,
  `lib/utils/instant.ts` pour les instants…).

### Écarts et à faire
- **MANQUANT (M)** : `components/ui/fact-row.tsx` — `FactRows` (cadre `.rows`) + `FactRow` (`label`,
  `value`, `source` (texte ou `{quote, from, href}`), `state?` (pastille via ton), `missing?`, `changedBy?`,
  `action?` : « Modifier » (édition sur place : `input` / `date` / `select` passé en prop, Entrée/Échap,
  proposition + source dessous, erreur serveur) ou « Changer » (ouvre `PickList`)). Server Action par
  champ fournie par la zone ; trace `Modifié par` stockée par la zone (colonne `…_by` existante ou
  journal). `FactList` reste pour les fiches sans source ; `FactTable` reste pour l'État des lieux.
- **MANQUANT (S)** : `PickList` (liste sur place ou en modale : groupes « Liées au projet » / « Réseau »,
  recherche, « Choisir » / « Choisie », création, « Garder seulement le nom ») — **à bâtir sur
  `PersonPickerField`/`SearchPicker`** pour les personnes, `ChoiceCards variant="list"` pour les fichiers.
- **MANQUANT (S)** : `lib/utils/day.ts` — `formatDay(iso)` → « Sam. 05/12/2026 » (Europe/Paris), +
  composant `DayText`; à employer dans `ModuleFacts`, `FactRow`, méta d'étape, cartes de call ; convertir
  progressivement les autres formateurs (`Timestamp` reste pour les instants : « 11 oct. 2026 à 16:42 » —
  écart avec le proto « le 14/10 » à trancher, § 12).

---

## 11. Simulations du proto (boutons pointillés `.protobtn` « Proto : … ») touchant les briques communes

| Bouton du proto | Brique | Vrai événement de l'app |
| --- | --- | --- |
| « Proto : l'échange a eu lieu, compte rendu reçu » / « … le call a eu lieu… » (`prepheld`) | Formulaire de call, compte rendu, propositions | Call enregistré dans l'app (`CallRecorder`, `call_recording_takes/_pieces`) → transcription (Groq, `lib/ai/transcribe.ts`) → compte rendu (`pipeline.ts`, `call_reports`, `report_items`) → propositions rangées par point de l'ordre du jour dans l'étape (zone). Notification au responsable. |
| Gestes d'un externe sur sa page privée (« Proto : la société dépose… », le mixeur dépose…) | Pages privées, résultat | Geste réel sur `/m`, `/p`, `/f`… (ou `/x` unique) par jeton ; l'app relit le parcours (`ProjectLive`), notifie (`notifications` par trigger + `schedulePendingPushes`). |
| « Lien externe, non ouvert dans le proto » (`nolink`, toast) | Faits, call | Lien réel (Meet, fichier signé). |
| Toast « Ouverture de X.pdf » (`open`) | Faits documentaires | `PdfExportButton` / fichier signé. |
| Toast « Ouvre la Vue d'ensemble du projet. » (fil d'Ariane du Master) | Fil d'Ariane | Lien `ViewLink` vers `/app/projects/[id]`. |
| « Voir comme » (barre du proto) | Maintenant, rôles | La session de l'utilisateur ; pas d'équivalent (ne pas construire). |

---

## 12. Points à trancher (à remonter à Sacha, une ligne chacun)

1. **Modale** : verre **clair** du proto ou verre **sombre** de l'app (DESIGN.md, décision du 27/09) ?
2. **Plancher de taille** : le proto descend à 13 px (pastilles, sources, méta) ; DESIGN.md dit 14 px.
   Proposition : 14 px partout (le proto suit).
3. **Ton « action »** : gris dans le proto (`--act-*`), violet dans l'app (`--tone-action-*`).
4. **Boutons d'une décision / d'une modale** : principal d'abord à gauche (proto) ou « Annuler » puis
   principal à droite (app, `DialogFormActions`, `ReasonForm`) ?
5. **Graisse des boutons** : 600 / 15 px (proto) ou 500 / 16 px (app, « medium minimum ») ?
6. **Durées et questions** par point d'ordre du jour (app, PROJ-UX-03) absentes du proto : garder
   repliées (proposé) ou retirer ?
7. **Page privée** : un lien par personne et par projet (proto) ou un lien par workflow habillé pareil ?
8. **« Le 14/10 »** (proto, date courte dans les sources) vs `Timestamp` « 14 oct. 2026 à 16:42 » (app)
   pour « créé par … le … ».
9. **Chevrons du Master et de la Distribution** (app) : à retirer (le proto met leurs étapes dans le
   parcours) — proposé : retirer.

---

## 13. Découpage en sous-lots (chacun livrable et testable seul)

| # | Sous-lot | Contenu | Migration | Effort | Risques |
| --- | --- | --- | --- | --- | --- |
| C0 | Décisions de design | Trancher § 12 ; écrire dans `docs/DESIGN.md` / `docs/VISION-UX.md` | — | S | Aucun |
| C1 | Tokens et primitives | `--elevation-card`, toast noir, `ToneCallout` + icône, `StatusBadge` taille proto, `Button` (selon C0), `formatDay`, `VersionCard`, `StartChoices`, `ChoiceCards variant="list"` ; `docs/COMPOSANTS.md` | — | M | Changement visuel global (boutons, pastilles) : passer les écrans clés en revue |
| C2 | En-tête de module | `ModuleHeader` (fil d'Ariane 14 px, pilules de sous-modules, h1, « Qui fait quoi », `ModuleFacts`) à la place de `ProjectPageTitle` + `SectionSteps` ; retirer les chevrons du Master/Distribution (selon C0) | — | M | Toutes les pages de projet ; `projectTrail` testé ; garder `ProcessSteps` si encore utilisé |
| C3 | Patron d'étape complet | `JourneyStep` étendu, `JourneySpine` (états warn/rework/obsolete/groupes/alertes), `StepPanel` (tout dans la carte, 4/5 colonnes, prérequis inter-modules, verrouillée en lecture seule, slots ordonnés, `StepHistory`) ; Production et Juridique migrés (non-régression) | — | M | Production : pages qui comptaient sur « Vous pouvez déjà préparer » → vérifier chaque page `production/[deliverableId]/*` |
| C4 | Un seul « Maintenant » | `loadProjectJourneys` + loaders existants (Production, Juridique) ; `NowCard` (« À vous, ailleurs », blocages, échéance, libellés) ; Vue d'ensemble, Travail, Validations, pastilles de la barre relus depuis là ; `boardActions` dérivé | — | M | Perf : un aller-retour (`allInOrder`, `cache()`) ; double calcul tant que Master/Marketing/Distribution n'ont pas leur loader → loader minimal par zone en attendant |
| C5 | Résultat après un geste | `WriteResult` étendu (`next`, `unlocked`), `ResultBanner` dans l'étape, toast au même verbe ; branché sur 2–3 actions (Juridique, Production) | — | M | Toutes les Server Actions retournent `WriteResult` : extension rétrocompatible |
| C6 | Blocages et informations notées | `step_blockers`, `step_notes` (RLS, `delete_project_row`, pgTAP), `BlockerForm`, `LiftBlockerDialog`, `NoteForm`, `AttentionChips`, `NotesDialog` ; Activations migre son blocage vers la table commune (ou garde la sienne, à décider) | 2 tables | M | Doublon avec `activation_blockers` et décisions Production : migrer les données ou les lire ensemble |
| C7 | Qui fait quoi | `RolesDialog` commun (rôles, liens privés : copier, relancer, nouveau lien, historique) ; Production et Conception migrées | — | M | Liens privés : jeton seulement en empreinte aujourd'hui (règle 19) — afficher le lien suppose le jeton chiffré (hors lot) |
| C8 | Formulaire de call commun | `AttendeeChips`, `AgendaList` (+ `use-reorder`), `CallPrepForm`, `CallPrepRecap`, `PlannedCallFacts`, action `createPreparedCall` ; migrés : Cadrage, Stratégie, Conception, Production ×2, Master | — (option : durées facultatives) | L | 6 formulaires et leurs tests ; `prepare-schema.ts` ; la Sheet disparaît (layout des pages à ajuster) |
| C9 | Propositions une par une | `ProposalRow`, `ProposalGroup`, `proposalTone` ; Conception puis Stratégie (retrait de « Tout accepter » et du pré-cochage) | par zone si `original_text`/`edited_by` manquent | M | La Stratégie change de comportement (tickets MKT) : à signaler |
| C10 | Compte rendu et résumé | `MeetingFacts`, `MeetingReportDialog` (par point), `MeetingSummaryBlock` (brouillon écrit par le code, versions, « Corriger et renvoyer »), `MeetingSummaryFor` | `call_summaries` (ou `call_report_shares.message`) | M | Ne pas casser `CallClosureSection` (page du call) : elle reste, l'étape en montre la version pour l'étape |
| C11 | Décision avec motif | `DecisionPanel` + `ReturnCallout` + « Répondre et transmettre à nouveau » ; remplacer les 5 `DecisionForm` au fil des zones | — | M | Libellés exacts par étape (règle 16) |
| C12 | Faits avec source | `FactRows`/`FactRow` (Modifier sur place, Changer), `PickList` ; d'abord Master (dates du Brief), Distribution | par zone (`…_by`) | M | Droits : seul le responsable ou l'acteur, étape en cours (RLS déjà par colonne) |
| C13 | Pages privées | (A) `PortalShell`, `PortalSections`, `PortalCard`, `PortalCallCard`, `PortalContact` sur `/m`, `/p`, `/f`, `/s`, `/i` ; (B, option) `/x/[token]` par personne | (B) `person_links` | M (A) / L (B) | Sécurité des jetons : réutiliser les fonctions `security definer` par workflow, jamais `service_role` |

Ordre conseillé : C0 → C1 → C2 → C3 → C4 → C5, puis C8 et C9 (dont dépendent le Cadrage, la Stratégie, la
Conception et le Master), C10, C6, C11, C12, C7, C13. Les zones métier peuvent commencer à brancher leurs
étapes dès C3 + C4.

**Total briques communes : ≈ 16 à 22 jours** (C0 0,5 · C1 1,5 · C2 1,5 · C3 2 · C4 2 · C5 1,5 · C6 2 ·
C7 1,5 · C8 3,5 · C9 1,5 · C10 2 · C11 1,5 · C12 1,5 · C13 1,5 à 4). Migrations : `step_blockers`,
`step_notes`, `call_summaries` (ou une colonne), option `person_links` ; à pousser en production avec
accord (Vercel ne pousse pas les migrations).

Risques transverses : `CLAUDE.md` est ignoré par git et peut décrire du code absent de la branche ;
travail parallèle d'autres zones dans le même dépôt (ne formater que ses fichiers) ; chaque composant
commun modifié doit être revu dans tous ses usages (FormDialog 94, ToneCallout 117, FactList 44,
ChoiceCards 46) ; `docs/COMPOSANTS.md` à tenir à jour dans la même tâche.
