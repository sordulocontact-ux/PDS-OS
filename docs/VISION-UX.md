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

**Une page liste n'est qu'une liste.** Réseau, Contrats, Fichiers, Calls, Artistes, Catalogue :
onglets, recherche et filtres, tableau. Ni « Maintenant », ni « Aussi à vous », ni « Ce que vous
attendez », ni pastille « n attendus » dans une colonne : le travail vit dans l'Accueil, Travail
et la fiche de l'objet, qui garde son « Maintenant ». En tête d'une fiche, l'état se met à côté
du titre et le reste dans « Informations », pas dans une ligne de faits grise. *(Sacha, 29/10,
proto des pages : « On est là pour juste regarder la liste. »)*

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
┌ Parcours ────────┐ ┌ Étape ouverte ───────────────────────────── avant le … ┐
│ ✓ Source         │ │ Pourquoi                                                │
│   Version confir.│ │ [À vous · action] en tête, si la personne a un geste    │
│ ● Brief Mix…     │ │ [PO] ce que PO a pré-rempli et d'où                     │
│   À vous · …     │ │ Faits pré-remplis, avec source        [Modifier/Changer]│
│ ◌ Mixage         │ │ [Action principale] [Issue avec motif]                  │
│   Après : Brief  │ │ Déjà fait : …                                           │
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
- **Étape ouverte** (à droite). Titre et échéance, pourquoi, puis, dans cet ordre et
  seulement s'ils existent : « Se débloque quand X est fait », le motif d'un retour, l'encadré PO, les faits, ce
  qui manque encore, l'action (ou « En attente de X (lien privé) : … »), le résultat final, et
  **tout en bas l'historique « Déjà fait »** : ce qui est fait ferme l'étape, sous tout ce qui
  compte encore *(Sacha 17/10)*. **Ni pastille d'état (« En cours », « Fait »…), ni grille « Exécute / Coordonne / Valide / Prérequis /
  Ensuite », ni ligne « À vous : … » sous le pourquoi** : Ibé trouvait que ça faisait trop de
  bruit (cases vides, redites). Le Parcours dit déjà qui agit et sur quoi, « Qui fait quoi »
  donne les rôles, le cadenas dit ce qu'une étape attend, et l'encadré « À vous · … » en tête
  reste quand la personne a un geste à faire *(Ibé et Sacha, 03/11/2026)* — sans cadre ni fond bleu : la pastille « À vous » et le nom du geste suffisent *(Sacha, 04/11/2026)*. **Sauf quand toute l'étape est le geste** (tout le Juridique : quand c'est à la personne, le
  contenu entier de l'étape passe en tête, question de PO, plan, demande d'autorisation…) : la ligne
  « À vous · … » ne ferait que répéter le Parcours et la section du geste avec son bouton ; le contenu
  garde sa place en tête et son ancre `#a-vous`, sans titre *(Sacha, 06/11/2026 ;
  `StepPanel leadTitle={false}`, posé par `LegalStepFrame`)*.
- **On arrive au bon endroit.** Ouvrir un module ouvre l'étape qui attend la personne, sinon
  l'étape en cours. Quand la personne a un geste à faire, **il passe en tête de l'étape**
  (« À vous · Valider le Mix V1 » : la version, ses retours et la décision ; ou la question qu'on
  lui pose), les informations secondaires repliées dessous (qui fait quoi, versions précédentes,
  tarif, lien privé, échanges), et **un clic dans Travail ouvre ce geste**, pas le haut de la page
  ni celle du projet. *(Ibé, lot 4 « l'action principale en haut », 22/10)* Une page qui n'a plus de raison d'être (ancienne fiche à onglets) redirige
  vers cette étape.
- **Les étapes verrouillées sont visibles et lisibles**, jamais cachées : on voit ce qui vient. On
  ne peut rien y faire : ni action, ni « Modifier », ni question posée avec son champ de réponse
  (Ibé 01/11/2026 : sous le cadenas, il se croyait dans l'étape).

Les écrans transverses reprennent les mêmes briques : la **Vue d'ensemble** a une carte par
workflow (statut, barre, « Étape n sur N », qui fait quoi), **Travail** la liste de **mes**
actions tirées des parcours (« Module › Étape », pour quand), **Validations** les mêmes filtrées
sur les actions de type *valider* (le type de l'action, jamais le verbe de son libellé),
**Activité** le journal horodaté de tous les gestes. *(Correction du 18/10/2026, proto « Projet
complet » : Travail n'est plus « une carte par personne » ; qui on attend se lit dans
« Maintenant » et la Vue d'ensemble.)* Le **Travail global** s'ouvre sur son propre « Maintenant » (l'action
la plus pressée, son pourquoi, qui valide, ce qu'elle débloque), puis range les autres **par
échéance** (en retard, cette semaine, plus tard, sans échéance), sans jamais répéter la première.
Le **Calendrier** montre les dates que PDS OS connaît déjà dans tous les projets (sorties, dates
du master, tournages, temps forts, calls, étapes datées) ; on n'y saisit rien, chaque date
s'ouvre là où elle se décide. *(Sacha 27/10/2026.)* L'**Accueil** répond aux mêmes questions pour
toute la personne : sous la salutation, ce qui l'attend compté (« 3 actions vous attendent, dont une
à valider ») ; puis le même « Maintenant » que Travail (un projet à accepter passe avant tout, puis
le retard, puis l'échéance), trois actions « Aussi à vous » et le lien vers Travail ; **« Ce que vous
attendez »** (qui, sur quoi, pour quand : tout pour la direction, sinon ses projets et ce qu'on
validera ensuite) ; **« Vos projets »** par échéance avec ce que chacun demande : l'action la plus
pressée (« Valider le Mix V1 +3 »), jamais un simple compte, sinon le statut de transmission ou « Suivi ». Plus d'activité ni de cartes juxtaposées. *(Sacha 29/10/2026,
proto `docs/protos/accueil.html`.)*

**En-tête de module** (au-dessus de « Maintenant ») : fil d'Ariane « Projet › Module ›
[sous-module ›] Étape », pilules des sous-modules (Marketing seul), titre du module, « Qui fait
quoi » à droite, ligne de faits (`docs/DESIGN.md` § 4, « En-tête de module »).

## 5. Règles d'interaction

Chaque règle vient d'une décision de Sacha ou d'Ibé, ou d'une correction faite en testant. Elles
valent partout, dans l'app comme dans les protos.

1. **Tout ce que PDS OS sait est pré-rempli, avec sa source.** La source est écrite à droite de la
   valeur : « Catalogue · 02/10 », « Lu par le code », « Calculé : 6 jours avant le master final »,
   « Brief de cadrage › Équipe » (le nom de la rubrique, jamais un code comme « dimension 04 »),
   ou la citation exacte du call (« « 18 pour le clip » »). L'action principale est alors de
   **confirmer**, pas de remplir. *(Ibé 13/10 ; CLAUDE.md « Formulaires : ne jamais faire
   retaper »)*
   Une valeur saisie ou choisie **dans l'étape même** ne cite pas l'étape (« Saisi dans le Brief »
   sur le Brief) : « Modifié par … » suffit. Une étape ne répète pas non plus les faits de l'en-tête
   (projet, sortie) ni l'historique (prise en charge, départ). *(Ibé, « beaucoup de bruit pour
   rien », 01-02/11/2026)*
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
   bouge plus. **Le bandeau s'affiche là où on a cliqué**, dans l'étape, juste au-dessus du geste,
   jamais seulement en haut de page où on ne le voit pas. Pendant le geste, le bouton dit qu'il
   travaille (« Envoi en validation… »). Si la suite revient à la même personne sur une autre étape,
   elle **s'ouvre toute seule** avec le bandeau (« Étape ouverte pour vous : … ») ; sinon le bandeau
   et l'étape disent **qui on attend** et sur quoi (« En attente de Lina Haddad : valider le Brief
   de cadrage »). *(Ibé, lot 3 « confirmation et passage à la suite », 22/10)* Une suite d'états déclarés (un
   distributeur qui reçoit, accepte, livre) se montre en **frise** dont chaque point se coche avec
   sa date, et se déclare en **un seul geste** (on coche ce qu'on a appris), pas un bouton par
   état. *(Sacha 18/10, proto Distribution)*
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
    (marketplace). *(Ibé 14/10, choix du MVP)* Comme dans l'app, **le geste du moment passe en
    tête** (prendre en charge, déposer, répondre), encadré « À vous », les détails et les
    échanges en dessous, et la page change avec l'avancement. *(Ibé, lot 6, 22/10)*
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
14. **Une décision se remplace, elle ne s'efface pas.** Un parcours n'est pas linéaire : un lieu, un
    devis, une proposition déjà validés peuvent changer. La nouvelle version devient une nouvelle
    décision ; l'ancienne reste dans l'historique avec sa validation ; ce qui en dépend est marqué
    « à revoir » (choisi à la main pour le MVP). **Avant le tournage, un changement structurant
    rouvre le contrôle** : un nouveau lieu, une nouvelle date, une révision du devis ou une nouvelle
    version de la proposition demandés après « Préparation validée » la rouvrent, et le tournage
    attend un nouveau contrôle (le reste du parcours continue). Une fois le tournage commencé, rien ne
    se rouvre. Une information notée (appel, WhatsApp, e-mail) est « à confirmer » tant qu'une
    personne ne l'a pas décidée ; deux informations contradictoires restent toutes les deux, et tant
    qu'aucune ne fait foi, c'est un blocage. *(Ticket d'Ibé du 15/10, « Retours prototype Artefact »,
    qui disait « tout le reste continue » ; puis recette Marketing V1 du 23/10, MKT-PROD-001, qui
    interdit de tourner avec l'ancienne proposition : le dernier retour fait foi. Proto
    `docs/protos/production-v2.html` ; app : migration `20261026300101`. Dans l'app, « une étape
    validée est définitive » devra évoluer dans ce sens.)*
15. **Une décision non prise n'est pas une tâche.** Les points « À décider » ne sont jamais
    assignés ni datés.
16. **Les mots sont ceux de l'app.** Libellés repris de `lib/i18n/fr/`, verbes précis
    (« Confirmer la version source », pas « Valider »), le même mot du bouton au toast et au
    journal.
17. **Agir ne déplace rien.** Une carte, une section ou un bouton garde sa place après qu'on
    s'en est servi : seule sa pastille change (« À vous » → « Suivi »). Les étapes d'un lien
    privé suivent l'ordre du parcours **inversé**, la plus récente en haut (on ne descend pas de
    plus en plus loin), et ce qui est attendu se résume en haut avec un lien vers chaque carte.
    Une action qui retire ou lève quelque chose (un blocage) passe par la modale avec son
    explication, jamais par un simple « Êtes-vous sûr ? ». Un bouton « Ajouter » vit dans l'en-tête de sa liste, pas sous la liste, qui
    grandit. Les versions anciennes se replient, la dernière et la retenue restent ouvertes.
    *(Sacha 17/10, carte Lieux du lien de la société)*
18. **Le document qu'on décide passe en tête.** Un contrat, une licence, un bulletin : sa carte
    commence par le fichier (nom, version, « Voir le PDF »), puis les valeurs qui le remplissent,
    chacune avec sa source. Après un aller-retour, une ligne dit ce qui a changé depuis la version
    d'avant (« Changé depuis la v1 : Part de composition 50 % → 40 % (Lina Haddad) »). Le
    document se voit et se télécharge à chaque étape qui le suit (le bulletin SACEM de sa
    génération au résultat). Le modèle d'un contrat se **choisit** dans un geste à part
    (proposé d'après le rôle, « Pas d'accord nécessaire » avec motif) ; sans modèle qui
    convient, on le crée dans la modale « Nouveau modèle de contrat » (fichier, nom, rôles
    auxquels il s'applique, ce que PO a repéré) : c'est un objet de la bibliothèque, pas ce
    contrat. La direction le valide dans l'étape avant toute génération. *(Sacha 17/10, proto Juridique)*
21. **Les retours restent dans l'équipe ; l'externe reçoit ce qui est décidé.** Sur une version
    (mix, master, montage), chacun commente avec son minutage, artiste comprise par son lien ;
    l'ingénieur ne reçoit que la demande de modification du valideur, ou des retours que le
    responsable lui transmet explicitement (« Transmettre les retours sans décider »). L'écran le
    dit sous les retours. *(Sacha 18/10, proto Master)* Les retours sont **rangés dans leur
    version** (minutage, contenu, auteur, quand), marqués « Interne » ; ce que l'ingénieur a reçu
    est un encadré à part, « Demande de modification envoyée à Karim » / « Envoyé à Karim », signé
    et daté ; la version suivante s'ouvre sur « Corrections reçues : répond à la demande sur le
    Mix V1 » avec ses mots, et le lien de l'ingénieur montre la demande au-dessus de son dépôt.
    *(Ibé, lot 7, 22/10)*
22. **Une désignation dit d'où elle vient.** Une personne présélectionnée (ingénieur, valideur)
    porte la vraie raison (« Désigné au Cadrage › Équipe », citation), le Réseau n'étant qu'un
    complément ; « Changer » ouvre la liste et recalcule ce qui en dépend (tarifs, révisions).
    Personne de désigné : « À choisir », jamais une supposition. *(Sacha 18/10, proto Master)*
20. **On ne redemande que ce qui manque.** Une personne déjà connue (Réseau, fiche artiste) ne
    reçoit pas une fiche complète : son lien ne demande que les valeurs absentes du contrat, et
    montre le reste en lecture. Ce que PDS fixe (une rémunération convenue) lui est montré à
    confirmer, jamais à écrire. Ses réponses complètent sa fiche Réseau. *(Sacha 17/10, proto
    Juridique)*
19. **Ce que PDS OS sait envoyer, il l'envoie.** Le destinataire est connu (fiche, Réseau) : on
    ne fait pas recopier une adresse puis raconter l'envoi. L'étape montre l'e-mail que PDS OS
    enverra (destinataire avec sa source, objet, pièce jointe, message modifiable), et l'envoi
    est lui-même la preuve, gardée dans l'historique. « Je l'ai remis autrement » (main propre,
    outil de signature) reste en recours, avec sa date. **L'aperçu montre le lien privé tel que la
    personne le recevra**, dans un bloc fixe sous le message (ou « lien privé créé à l'envoi »
    s'il n'existe pas encore). Ce qui revient signé revient par le lien
    privé de la personne quand elle en a un ; sinon (ayants droit d'un emprunt), **la réponse
    revient dans le fil de l'e-mail** et PDS OS la rattache seul (réponse lue par PO avec ses
    citations, licence signée en pièce jointe déposée dans l'étape, l'e-mail reçu faisant
    preuve) ; coller la réponse reste le recours. Cela suppose l'accès en lecture à la boîte de
    PO (Gmail, OAuth), pas seulement l'envoi. Si PDS OS n'a pas l'adresse (c'est la fiche de
    renseignements qui la recueille), on crée le lien, on le copie, puis « Marquer comme
    envoyée » : l'étape ne passe en attente qu'à ce moment. **Un seul lien par personne : sa page du projet** (`/c/…`, la carte `PersonLinkCard`, la même au Master et
    au Juridique), jamais celui d'un workflow à côté ; **attendre quelqu'un s'écrit en bleu** (« En attente de X :
    remplir sa fiche. », comme « … : valider le Mix V1 ») *(Sacha, 06/11/2026)*. **Un lien privé reste visible dans
    son étape** (lien, « Copier le lien », « Relancer », « Nouveau lien » qui révoque l'ancien,
    créé et envoyé quand et par qui), jamais seulement dans un bandeau qu'on ferme : là où il
    sert (dans l'attente de la personne, ou pendant qu'on l'envoie), sinon en référence sous
    l'action, au-dessus de « Déjà fait ».
    Dans l'app, cela suppose de garder le jeton récupérable (chiffré), plus seulement son
    empreinte. *(Sacha 17/10, proto Juridique ; dépend du branchement de l'e-mail,
    `docs/CONTEXTE-PROJET.md` § 2)*
21. **Une proposition se tranche une par une.** Ce que PO tire d'un call (réponses de la Stratégie,
    intentions de la Conception, tâches d'un call de présentation) arrive **rangé là où il sert**
    (par dimension, par livrable), jamais en liste à cocher : rien n'est coché d'avance. Chaque
    proposition a « Confirmer », « Modifier » (corrigée, elle est confirmée et dit « Modifié par … »,
    la citation restant dessous) et « Écarter » ; chaque groupe dit son état (« À arbitrer », mot
    d'Ibé) et « n à confirmer », et
    ce dont personne n'a parlé se voit (« Rien n'a été dit pendant l'échange »). « Ajouter » est
    dans l'en-tête du groupe. Le call est une **source** des étapes, pas une étape à confirmer.
    *(Sacha 18/10, proto Marketing)*
    **Exception, le Cadrage** *(Sacha 29/10, proto « Suite du Cadrage »)* : PO ne pose en question que
    ce qui manque ; ce qu'il a compris se lit « À vérifier » dans sa dimension, rien de coché d'avance,
    et se confirme **une dimension à la fois** (« Confirmer les n », après lecture) ; une ligne se
    corrige d'un clic dessus. Les parties juridiques et les contradictions restent une par une.
22. **Pas d'onglets sous les chevrons.** Une information notée (appel, WhatsApp, e-mail) s'affiche
    dans l'étape qu'elle concerne, avec « Noter une information » à côté de « Signaler un blocage » ;
    la liste complète s'ouvre dans la modale depuis la pastille « n informations à confirmer ». Les
    tâches et le journal sont dans la barre du projet (Travail, Activité) et dans le « Déjà fait » de
    l'étape ; les rôles et les liens privés dans la modale « Qui fait quoi », à côté du titre. Le
    sélecteur de livrable de la Production reste à part du parcours. *(Ibé, ticket « Architecture
    globale » ; Sacha 18/10)*
23. **Ce qui vient de l'extérieur est lu, daté, et jamais confondu avec ce que PDS a décidé.** Le
    tableau d'une agence est relié (lecture seule), ses colonnes sont confirmées une fois, et
    « Actualiser » montre d'abord ce qui change (ajouts, modifications, lignes retirées gardées,
    erreurs à corriger chez l'agence) avant d'importer un instantané numéroté. Le statut de
    l'agence s'affiche tel quel à côté de la décision PDS, qui ne bouge jamais à l'import ; un écart
    (« Contacté » sans décision) est signalé, pas corrigé. Seul un changement sur ce que PDS a
    décidé (tarif, audience, angle) rouvre la question. Une déclaration (publication, retombée,
    bilan d'agence) reste « déclarée » jusqu'à une vérification à part, avec sa méthode. Un créateur
    ou une personne sans compte agit par son lien privé ; dans le proto, son geste est simulé par un
    bouton « Proto : … ». *(Ibé, tickets « Activations / Influence » et « Relations presse » ;
    Sacha 18/10)*

## 6. Les parcours de référence

Le détail est dans le proto `docs/protos/pds-app.html` (toute l'application) et
`docs/protos/production.html` (la Production en interne et en externe). Le Marketing complet, sur le patron
de la Production V2 (chevrons cliquables, Décisions, Tâches, Historique, Rôles et liens), est dans
`docs/protos/marketing.html` *(17/10)*. Ce qu'Ibé demande pour chaque partie du Marketing, et ce qui
reste à faire : `docs/MARKETING-METIER.md` *(18/10)*.

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
| « Maintenant » et « Ce que vous attendez » en tête de la liste du Réseau ou des Contrats (29/10) | On vient regarder la liste ; le travail y est en double | La liste seule ; le travail dans Accueil, Travail et la fiche |
| Un encadré PO qui affirme des faits avant toute réponse, avec un « 40 % » inventé | On ne sait pas d'où ça vient, et l'IA ne produit pas de chiffre | Question, réponse, « Ce que PO a compris » avec citations (règle 12) |
| « Déposer le Mix V1 » comme simple bouton | Ce qui se livre, c'est un fichier audio qu'on écoute | Dépôt audio et versions écoutables (règle 13) |
| Une action ou « Modifier » sur une étape verrouillée | On prépare sur des prérequis pas faits | Lecture seule et « Se débloque quand… » |
| Un « proto » qui est une page de présentation | On ne peut pas sentir le parcours | Le produit cliquable (`docs/PROTOS.md`) |

## 8. Quand une règle manque

Prendre la décision la plus cohérente avec ce fichier et les règles non négociables, l'écrire ici
(ou dans le doc métier concerné), et la signaler dans le bilan. Une règle métier ne s'invente pas :
elle part d'un ticket, d'un message d'Ibé ou de la loi, sinon c'est un « point à trancher »
(`docs/CONTEXTE-PROJET.md` § 2).
