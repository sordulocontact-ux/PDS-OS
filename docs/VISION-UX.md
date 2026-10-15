# Vision produit et UX de PDS OS

Écrite le 14/10/2026, après les retours d'Ibé (13/10 et 14/10) et la refonte de la Production en
parcours. Sacha l'a validée comme **la** référence : toute nouvelle page, toute retouche d'UX et tout
proto partent d'ici. Les valeurs visuelles (tokens, typo, icônes) sont dans `docs/DESIGN.md`, le
métier de la Production dans `docs/PRODUCTION-METIER.md`, la méthode pour faire un proto dans
`docs/PROTOS.md`. Les deux protos de référence sont dans `docs/protos/`.

---

## 1. Le problème qu'on corrige

Ibé, après son test (13/10) : il avait surtout l'impression de **remplir des formulaires, sans
comprendre pourquoi, qui devait s'en occuper ni ce qui allait se passer ensuite**. Les
fonctionnalités existaient, mais en onglets juxtaposés : aucune ne disait à qui c'était le tour,
ni ce que son enregistrement débloquait.

Sa demande (14/10) : PO accompagne la production de A à Z. **Chaque étape a une logique, un
responsable, des prérequis et une suite claire**, et quand quelque chose est terminé, PO guide vers
la prochaine action sans qu'on la cherche dans les onglets. L'expérience change selon le rôle.

En une phrase : **PDS OS n'est pas une collection de formulaires, c'est un ensemble de parcours
où chacun voit ce qu'il doit faire maintenant.**

## 2. La promesse : cinq questions auxquelles chaque écran répond

Pour la personne connectée, sans qu'elle cherche :

1. **Qu'est-ce que je dois faire maintenant ?** Une action, un verbe, un bouton.
2. **Pourquoi ?** Une phrase, celle de l'étape (« La version de départ du mix, confirmée, jamais un
   master final »).
3. **Qui d'autre ?** Qui est responsable, qui valide, et qui on attend si ce n'est pas moi.
4. **De quoi ai-je besoin ?** Tout ce que PDS OS sait déjà est là, pré-rempli, avec sa source.
5. **Que se passe-t-il ensuite ?** Ce que l'action débloque, et qui agit après.

Un écran qui ne répond pas à l'une de ces questions n'est pas fini.

## 3. Le modèle : tout est un parcours d'étapes

```
Projet
 └─ Workflows : Lancement · Cadrage · Plan du projet · Master · Juridique
                · Marketing (Stratégie, Conception, Production, Activations, Suivi & bilan)
                · Distribution · Clôture
     └─ Étapes
         └─ Actions, dans l'ordre, chacune faite par une personne
```

**Une étape**, c'est toujours :

| Élément | Contenu |
| --- | --- |
| Titre et « pourquoi » | Un nom court, une phrase qui dit à quoi elle sert |
| Responsable | La personne qui la porte (nom et rôle ; « lien privé » si c'est un externe) |
| Validation | Qui valide, ou « Aucune » |
| Prérequis | Les étapes qui doivent être faites avant, **même dans un autre module** (la Distribution attend le Master final et le sample sécurisé) |
| Ensuite | Les étapes qu'elle débloque |
| Faits | Ce qui est déjà connu, pré-rempli, chacun avec sa source |
| Actions | La suite ordonnée des gestes (« Transmettre au mixeur » → « Déposer le Mix V1 » → « Valider le mix »), chacun avec qui le fait |
| Issues | Ce qu'on peut répondre d'autre que oui : modification, précision, refus, toujours avec motif |

**Les statuts sont calculés, jamais saisis ni stockés** : une étape est *faite*, *en cours* (ses
prérequis sont faits) ou *plus tard* (verrouillée). Un workflow est *Non démarré*, *En cours*,
*En attente* (ne reste qu'une validation) ou *Terminé*. « Qui doit agir maintenant » est la
personne de l'action suivante d'une étape en cours. C'est la règle n° 6 du projet appliquée à
l'UX : le code dit où on en est, personne ne le coche.

**Une seule source.** L'Accueil, la page Travail, les Validations, l'Activité, les pastilles « À
vous » de la barre latérale et les cartes de la Vue d'ensemble sont tirés des mêmes parcours. On
n'ajoute jamais une liste de tâches à part.

## 4. Le patron d'écran unique

Tous les modules (Lancement, Cadrage, Master, Juridique, chaque chevron du Marketing,
Distribution, Clôture) ont la même forme. On l'apprend une fois.

```
Titre du module                                   [chevrons des sous-modules]
┌ Maintenant ───────────────────────────────────────────────────────────────┐
│ [À vous]  Lina Haddad · Master › Mixage                                   │
│ Transmettre au mixeur                                                      │
│ Pourquoi, en une phrase.                       [Ouvrir l'étape]           │
│ En attente de Nadia Benali : valider la pochette                          │
└────────────────────────────────────────────────────────────────────────────┘
┌ Parcours ────────┐ ┌ Étape ouverte ───────────────────────────── [En cours] ┐
│ ✓ Source         │ │ Pourquoi                                                │
│   Version confir.│ │ Responsable │ Validation │ Prérequis ✓/○ │ Ensuite      │
│ ● Brief Mix…     │ │ [PO] ce que PO a pré-rempli et d'où                     │
│   À vous · …     │ │ Faits pré-remplis, avec source        [Modifier/Changer]│
│ ◌ Mixage         │ │ Déjà fait : …                                           │
│   Après : Brief  │ │ [Action principale] [Issue avec motif]                  │
└──────────────────┘ └─────────────────────────────────────────────────────────┘
```

- **Maintenant** (en haut). Trois états : « À vous » (l'action, son pourquoi, « Ouvrir l'étape ») ;
  « À vous, ailleurs » (rien ici, mais une action attend dans un autre module, avec le lien) ;
  « Rien à faire pour vous » (et qui on attend, sur quoi). **Il ne répète jamais l'étape déjà
  affichée en dessous** : si l'étape ouverte est celle de la personne, la carte disparaît, et ne
  revient que pour une *autre* action, sous la mention « Aussi à vous ».
- **Parcours** (à gauche). Une ligne par étape : rond coché (faite), point bleu (en cours), cadenas
  sur cercle pointillé (verrouillée). Le sous-titre dit le **résultat** si c'est fait, **« Personne ·
  action »** si c'est en cours, **« Après : X »** si c'est verrouillé. « À vous · » en couleur de
  sélection sur ses propres étapes.
- **Étape ouverte** (à droite). Titre et pastille d'état, pourquoi, les quatre colonnes
  Responsable / Validation / Prérequis / Ensuite, puis, dans cet ordre et seulement s'ils
  existent : « Se débloque quand X est fait », le motif d'un retour, l'encadré PO, les faits, ce
  qui manque encore, l'historique « Déjà fait », l'action (ou « En attente de X (lien privé) :
  … »), le résultat final.
- **On arrive au bon endroit.** Ouvrir un module ouvre l'étape qui attend la personne, sinon
  l'étape en cours. Une page qui n'a plus de raison d'être (ancienne fiche à onglets) redirige
  vers cette étape.
- **Les étapes verrouillées sont visibles et lisibles**, jamais cachées : on voit ce qui vient. On
  ne peut rien y faire : ni action, ni « Modifier ».

Les écrans transverses reprennent les mêmes briques : la **Vue d'ensemble** a une carte par
workflow (statut, barre, « Étape n sur N », qui fait quoi), **Travail** une carte par personne,
**Validations** ce qui attend chaque valideur, **Activité** le journal horodaté de tous les
gestes.

## 5. Règles d'interaction

Chaque règle vient d'une décision de Sacha ou d'Ibé, ou d'une correction faite en testant. Elles
valent partout, dans l'app comme dans les protos.

1. **Tout ce que PDS OS sait est pré-rempli, avec sa source.** La source est écrite à droite de la
   valeur : « Catalogue · 02/10 », « Lu par le code », « Calculé : 6 jours avant le master final »,
   « Brief de cadrage › Équipe » (le nom de la rubrique, jamais un code comme « dimension 04 »),
   ou la citation exacte du call (« « 18 pour le clip » »). L'action principale est alors de
   **confirmer**, pas de remplir. *(Ibé 13/10 ; CLAUDE.md « Formulaires : ne jamais faire
   retaper »)*
2. **Corriger reste toujours possible** : « Modifier » sur chaque valeur pré-remplie. Le champ
   s'ouvre sur place, la proposition et sa source restent écrites dessous pour comparer, Entrée
   enregistre, Échap annule. Une fois corrigée, la ligne dit **« Modifié par Lina Haddad »** à la
   place de la source, et l'Activité garde la trace. Seul le responsable de l'étape, ou la
   personne qui doit agir, voit le bouton, et seulement sur l'étape en cours. *(Sacha 14/10)*
3. **Un fichier ou une personne se choisit, ne se retape jamais.** « Changer » ouvre la liste : les
   versions audio du titre (la dernière détectée proposée, chacune avec « Écouter », « Importer
   une version »), les paquets de stems, les ingénieurs du Réseau (les personnes déjà liées au
   projet d'abord, « Ajouter au Réseau »), les membres de l'équipe pour un compte. Après choix : «
   Choisi par … ». *(Sacha 14/10, étape Source)*
4. **Une date est dite en entier et éditée comme une date.** « Mix V1 attendu le · Dim. 15/11/2026
   », jamais « Mix V1 · 15/11 » : le libellé dit ce que la date signifie, la valeur porte le jour de
   la semaine et l'année. On la change dans un champ date, et le code refuse ce qui casse l'ordre
   (« Les dates doivent se suivre : Mix V1, Mix final, Mastering, puis Master final. »). *(Sacha
   14/10)*
5. **On décide sur pièce.** Une étape de décision (accepter un projet, valider un Brief, un devis,
   une proposition de réalisation) montre **sur place, en lecture seule, tout ce qu'on décide**,
   et dans un encadré à part **ce qui n'est pas encore connu**. Pas de clic pour aller relire
   l'étape d'avant. Et pas de « Modifier » sur les informations d'un autre : on accepte, on
   demande une précision ou on refuse. *(Sacha 14/10, étape Acceptation)*
6. **Toute décision a ses issues, et toute issue autre que oui a un motif.** Valider, Demander une
   modification, Demander une précision, Refuser. Le motif est obligatoire (erreur rouge sinon,
   jamais de bouton désactivé). Il revient **en tête de l'étape de la bonne personne**, signé («
   Lina Haddad (demander une précision) : « Le budget inclut-il le clip ? » »), et son bouton
   devient « Répondre et transmettre à nouveau ».
7. **Après chaque geste, la suite est dite.** Un bandeau de résultat dit ce qui est fait et **qui
   doit agir ensuite** ; le toast reprend le même verbe que le bouton (« Confirmer » →
   « confirmée ») ; l'Activité l'horodate. On ne laisse jamais la personne devant une page qui ne
   bouge plus.
8. **Pas de cul-de-sac.** Rien à faire dans ce module ? « Maintenant » renvoie vers l'action
   ailleurs. Un bloquant (Distribution) dit ce qui manque et propose **« Corriger dans X »** avec le
   lien.
9. **Chacun voit sa part.** Les mêmes données, un « Maintenant » différent selon le rôle.
   Dans un projet lancé, le responsable écrit ; le DG lit et valide ; le chargé de production
   organise ; la directrice créative valide la création. On ne fait pas remplir au chef de projet
   ce qui revient à un autre. *(Ibé 14/10)*
10. **Les externes n'ont pas l'app, ils ont un lien privé vers leur seule part** : le mixeur
    (`/m/…`, son dossier du master), la société de production (`/p/…`, son espace : devis, lieux
    proposés, avancement), le co-auteur (`/f/…`, sa fiche de renseignements). Leur page s'ouvre
    sur « Ce que PDS attend de vous ». Les vrais comptes prestataires viendront plus tard
    (marketplace). *(Ibé 14/10, choix du MVP)*
11. **PO propose, l'humain décide.** Après un call, PO propose des actions tirées du compte rendu,
    **chacune avec la phrase qui la justifie** ; on les attribue ou on les décoche, puis on
    confirme, et elles arrivent chez chacun. PO ne valide, ne transmet, ne signe jamais, et
    n'écrit ni état, ni date, ni montant : il les recopie, le code les vérifie.
12. **Ce que PO a compris vient toujours d'une parole visible.** PO ne montre jamais une
    information sortie de nulle part : elle vient d'une réponse que la personne vient de donner
    (tapée ou dictée), d'un compte rendu de call ou d'un document, et **chaque élément porte sa
    citation mot pour mot**. Le code écarte ce qui n'est pas écrit tel quel dans la source. Aucun
    chiffre déduit (une part, un pourcentage) : seulement ce qui a été dit. Au Cadrage juridique,
    PO pose une question à la fois (calculée par le code d'après ce qui manque, avec son
    pourquoi), la réponse part de ce qui est déjà connu, puis « Ce que PO a compris » : on retire
    le faux, on enregistre. *(Sacha 14/10 : « d'où viennent ces infos de PO ? »)*
13. **Ce qu'on livre est le vrai fichier, et on l'écoute avant de décider.** Le mixeur dépose un
    fichier audio par son lien (WAV, AIFF, FLAC, MP3, M4A, AAC ou OGG, refusé sinon, avec la
    raison) ; chaque version (Mix V1, V2…, Master V1…) a son lecteur, son statut (« À valider »,
    « Modification demandée » avec le motif, « Validée ») et reste visible de tous, mixeur
    compris. Le Master final montre le fichier validé. *(Sacha 14/10)*
14. **Une décision non prise n'est pas une tâche.** Les points « À décider » ne sont jamais
    assignés ni datés.
15. **Les mots sont ceux de l'app.** Libellés repris de `lib/i18n/fr/`, verbes précis
    (« Confirmer la version source », pas « Valider »), le même mot du bouton au toast et au
    journal.

## 6. Les parcours de référence

Le détail est dans le proto `docs/protos/pds-app.html` (toute l'application) et
`docs/protos/production.html` (la Production en interne et en externe).

- **Lancement** : le DG crée le projet (type, format, titres du Catalogue, sortie, budget,
  priorité, chef de projet) et le transmet ; le chef de projet accepte, demande une précision ou
  refuse, en voyant tout ce qui a été saisi.
- **Cadrage** : préparer l'échange (ordre du jour calculé), le call a lieu, relecture des 6
  dimensions pré-remplies depuis la transcription (chaque valeur citée ou « Lu par le code »),
  Brief créé, validé ou renvoyé par le DG.
- **Plan du projet** : ce qui est en focus, ensuite, pendant ce temps, à anticiper ; le lancer ouvre
  les workflows.
- **Master** : Source (version détectée, confirmée ou changée) → Brief Mix et Master (ingénieur,
  valideur, calendrier calculé depuis le master final) → Mixage (versions déposées par le mixeur
  par son lien, validées par la directrice créative) → Mastering → Master final.
- **Production** (un livrable) : **« Qui produit ? »** d'abord, interne ou externe, **par contenu** ;
  les rôles proposés d'après la fiche du livrable et le Réseau. *Externe* : call de présentation,
  devis déposé par la société, vérifié point par point par le chargé de production, validé par le
  DG ; proposition de réalisation validée par la direction créative ; préproduction tenue par la
  société ; lieux proposés en moodboard, avis puis validation. *Interne* : proposition de
  réalisation, call technique (actions proposées par PO), matériel du chef op, lieux, devis et
  budget, feuille de service. Puis, dans les deux cas : contrôle avant tournage, tournage,
  postproduction, livraison.
- **Distribution** : bloquée tant que le Master final, le sample sécurisé, la pochette validée,
  l'ISRC et la date ne sont pas là ; chaque manque a son « Corriger dans ».
- **Clôture** : bilan, puis archivage.

## 7. Ce qu'on ne refait plus

Erreurs trouvées en testant, chacune corrigée le 14/10 :

| Erreur | Pourquoi c'est faux | À la place |
| --- | --- | --- |
| Des formulaires en onglets, sans responsable ni suite | On remplit sans savoir pourquoi ni pour qui (Ibé) | Le patron d'écran du § 4 |
| Une valeur pré-remplie impossible à corriger | La machine se trompe, l'humain doit avoir le dernier mot | « Modifier » (règle 2) |
| Un champ texte pour un fichier, une personne, une date | On renomme au lieu de choisir ; le lien est perdu | Une liste, le Réseau, un champ date (règles 3 et 4) |
| « Mix V1 · 15/11 » | On ne sait pas si c'est une date, ni ce qu'elle veut dire | « Mix V1 attendu le · Dim. 15/11/2026 » |
| Accepter un projet sans voir le projet | On décide à l'aveugle, ou on revient en arrière | Tout en lecture seule sur place (règle 5) |
| « Modifier » sur les informations d'un autre | Celui qui accepte réécrirait ce que le DG a transmis | Demander une précision ou refuser |
| Un refus sans motif, ou pas d'issue « Refuser » | La personne ne sait pas quoi corriger | Règle 6 |
| « Maintenant » qui répète l'étape affichée, avec « Ouvrir l'étape » vers la page où on est déjà | Bruit, et un bouton qui ne mène nulle part | La carte disparaît ; « Aussi à vous » pour une autre action |
| Un encadré PO qui affirme des faits avant toute réponse, avec un « 40 % » inventé | On ne sait pas d'où ça vient, et l'IA ne produit pas de chiffre | Question, réponse, « Ce que PO a compris » avec citations (règle 12) |
| « Déposer le Mix V1 » comme simple bouton | Ce qui se livre, c'est un fichier audio qu'on écoute | Dépôt audio et versions écoutables (règle 13) |
| Une action ou « Modifier » sur une étape verrouillée | On prépare sur des prérequis pas faits | Lecture seule et « Se débloque quand… » |
| Un « proto » qui est une page de présentation | On ne peut pas sentir le parcours | Le produit cliquable (`docs/PROTOS.md`) |

## 8. Quand une règle manque

Prendre la décision la plus cohérente avec ce fichier et les règles non négociables, l'écrire ici
(ou dans le doc métier concerné), et la signaler dans le bilan. Une règle métier ne s'invente pas :
elle part d'un ticket, d'un message d'Ibé ou de la loi, sinon c'est un « point à trancher »
(`docs/CONTEXTE-PROJET.md` § 2).
