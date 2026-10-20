# Production : comment se passe un tournage (référence métier)

Source : messages d'Ibé du 13/10/2026 (16:30 et 16:52), écrits après son test de la Production,
**avant** les tickets détaillés qu'il annonce. Ce fichier n'est pas un ticket : c'est le cadre
dans lequel lire ces tickets et refaire les écrans. Une règle écrite ici sans citation d'Ibé est
une hypothèse, soumise à Ibé au § 9.

**Mise à jour du 14/10/2026** : Ibé a précisé la logique (message du 14/10, 13:45) ; ses réponses
sont au § 0 et remplacent les hypothèses contraires plus bas (hybride abandonné, comptes plus tard).

Code existant : `docs/ARCHITECTURE.md` § 8 nonies. Exemple suivi : un clip musical. La même logique
doit valoir pour une capsule réseaux, une interview, etc.

---

## 0. Ce qu'Ibé a tranché le 14/10/2026

1. **Deux types seulement : interne et externe** (plus d'hybride). Une production **interne** peut
   faire intervenir des freelances (cadreurs, monteurs, réalisateurs) : elle reste interne parce
   que **PDS la pilote**.
2. **Interne** : PDS organise et pilote ; chacun intervient dans PO **sur ce qui le concerne**,
   au lieu que le chef de projet remplisse tout :
   - réalisateur : proposition créative, découpage, besoins artistiques ;
   - chef op / directeur technique : besoins techniques, dont le matériel ;
   - chargé de production : lieux, devis, locations, planning, logistique ;
   - chef de projet : suit l'avancement, coordonne, s'assure que les décisions sont prises et
     validées.
3. **Externe** : la production est confiée à une société. Déroulé :
   1. brief créatif déjà validé chez PDS ;
   2. **premier call** avec la société : projet, attentes, contraintes, budget ;
   3. la société envoie **un devis** (pas forcément de proposition de réalisation : le réalisateur
      n'est parfois pas encore trouvé) ;
   4. le **chargé de production** vérifie devis, délais et cohérence avec l'enveloppe, puis le
      **soumet à son supérieur hiérarchique** pour validation ;
   5. devis validé → la société avance sur la préproduction et l'organisation du tournage ;
   6. un **échange réalisateur ↔ partie créative de PDS** pour la proposition de réalisation et le
      découpage ;
   7. à partir du découpage, **la société** organise les calls techniques, le matériel, les
      locations, les équipes, la logistique ;
   8. elle **propose des lieux** (moodboard dans PO), PDS donne son avis et **valide un lieu** ;
   9. la société gère l'opérationnel jusqu'au tournage ; **PDS suit et valide** ce qui doit l'être.
4. **Comptes** : à terme, un **vrai compte prestataire** (future marketplace : missions, briefs,
   moodboards, réunions, planning, consignes du réalisateur, tâches, historique). **Pour le MVP,
   des liens privés** donnant accès à certaines parties du projet, comme le mixeur du Master. Une
   société de production peut ainsi proposer ses lieux, déposer ses documents et mettre à jour ce
   qui la concerne, sans voir toute l'organisation PDS. Ibé demande si un compte prestataire
   simplifié serait rapide à faire (réponse proposée au § 10).
5. **L'accompagnement de PO** : après chaque étape (devis validé, call technique…), PO sait la
   suite, ce qui manque, qui doit intervenir, ce qui demande une validation ; il propose les
   actions d'un compte rendu, préremplit et attribue après confirmation. Chaque étape a une
   logique, un responsable, des prérequis et une suite claire. **L'expérience change selon le
   rôle** (réalisateur, chargé de production, cadreur, monteur). « Les fonctionnalités sont déjà
   en grande partie présentes, mais il faut maintenant les relier pour créer un véritable
   parcours de production, plutôt qu'une succession de formulaires. » Les corrections précises
   viendront en tickets.

## 1. Ce qu'Ibé reproche à l'écran actuel

> « J'avais surtout l'impression de remplir des formulaires, sans toujours comprendre pourquoi,
> qui devait s'en occuper ou ce qui allait se passer ensuite. »

Les cinq règles qu'il en tire (ce sont des critères de recette pour toute la Production) :

1. **Accompagner plutôt que faire tout remplir.** PO exploite ce qui existe déjà (projet, Brief,
   calls, documents) pour pré-remplir et proposer ; l'humain valide.
2. **Un workflow vivant, selon l'organisation.** Interne, externe ou hybride : les étapes et les
   responsabilités changent.
3. **Chacun voit ce qui le concerne.** Réalisateur, chef de projet, chargé de production, monteur :
   les bonnes informations et les bonnes actions, pas tout au même endroit.
4. **Chaque étape débouche sur une suite claire.** Quand quelque chose est terminé, PO le comprend,
   dit ce qu'il reste et propose la prochaine action, sans que l'utilisateur cherche où aller.
5. **La question à se poser pour chaque écran** : pour cet intervenant, qu'est-ce qu'il doit faire
   maintenant, de quoi a-t-il besoin, et comment PO lui facilite le travail ?

## 2. Les rôles

Une personne peut **cumuler** plusieurs rôles (petite production) ; une grosse production en
répartit davantage. Le rôle n'est donc pas une personne : c'est une mission qu'on attribue.

| Rôle | Sa mission (Ibé) | Ce qu'il doit trouver dans PDS OS | Ce qu'il produit |
| --- | --- | --- | --- |
| **Chef de projet** (label) | Pilote côté label : budget global, échéances, validations, coordination | L'état de chaque production, ce qui bloque, ce qu'il doit valider | Décisions, validations |
| **Réalisateur** | Vision de réalisation : mise en scène, découpage, façon de raconter | Le brief créatif validé, les retours sur sa proposition | Traitement, découpage, références, intentions ; avis artistique sur les lieux ; retours sur les versions |
| **Directeur / chargé de production** | Organise concrètement : équipes, prestataires, planning, moyens, dépenses | Les besoins exprimés par les métiers, les devis, les disponibilités, les manques avant tournage | Devis, réservations, planning, feuille de service, avis faisabilité / coût / autorisations des lieux |
| **Chef opérateur** (directeur de la photo) | Choix de lumière, caméra, image, avec le réalisateur | Le concept et le traitement du réalisateur | Liste caméra et lumière ; avis technique sur les lieux |
| **Responsables techniques** (son, lumière…) | Besoins en matériel et techniciens de leur domaine | Le concept, les contraintes du lieu | Leurs besoins (le directeur technique, s'il existe, coordonne, **ne décide pas seul**) |
| **Régisseur** | Logistique terrain, accès, besoins pratiques | Le lieu, les horaires, les accès | Infos pratiques de la feuille de service |
| **Techniciens** | Mettent en œuvre les dispositifs le jour J | Leur convocation (feuille de service) | — |
| **Monteur, étalonneur, son post, responsable post** | Transforment les rushes en contenu final | Les rushes, les documents, les retours à corriger | Versions (V1, V2…), exports |

## 2 bis. Qui a un compte PDS OS

Décision déjà écrite dans `docs/CONTEXTE-PROJET.md` (§ 4, principe 4, et « Hors V1 ») : **pas de
compte pour les intervenants externes** ; les comptes, ce sont les 3 à 5 personnes du label (DG,
chefs de projet, directeurs créatifs). Un réalisateur, un chef op, un régisseur ou un monteur
est en général un **contact du Réseau**, sans compte.

« Chacun retrouve ce qui le concerne » (Ibé) se lit donc ainsi :

- **Le chef de projet** a la page Production de l'app : il voit tout, il sollicite, il valide.
- **Chaque intervenant externe** reçoit un **lien privé à son rôle** (modèle déjà en place : la
  fiche de renseignements du Juridique `/f/[token]`, le dossier du mixeur `/m/[token]`). Sa page
  ne montre que sa part : le brief et de quoi déposer sa proposition pour le réalisateur, le
  concept et sa liste caméra / lumière pour le chef op, les rushes, les retours et le dépôt de
  version pour le monteur.
- **Ce qu'il renvoie arrive en proposition** ; le chef de projet relit et valide, comme une
  proposition de PO.
- **Le chef de projet peut toujours saisir à sa place** (petite production, intervenant qui ne
  passe pas par le lien) ou importer le document qu'il a envoyé (import existant). C'est le
  recours, pas le chemin par défaut.
- **Exception** : un rôle tenu par quelqu'un du label (le directeur créatif qui réalise, par
  exemple) se fait dans l'app avec son compte, comme aujourd'hui pour le brief réalisateur.

## 3. L'organisation de la production : interne, externe

> 14/10 : l'hybride est abandonné (§ 0) ; « Hybride » ci-dessous est l'ancienne hypothèse.

C'est **la première décision** de la Production, avant toute préparation (Ibé, étape 1 « Définir
l'organisation »).

- **Interne** : l'équipe du label produit. Tous les rôles du § 2 sont tenus par des gens du label
  ou engagés par lui ; PDS OS porte toute la préparation.
- **Externe** : une société de production gère tout. Elle prend en charge l'essentiel de
  l'organisation. Le chef de projet côté PDS **suit** : décisions, échéances, **budget convenu**,
  livrables. La préparation détaillée (matériel, techniciens, feuille de service) n'est pas à
  saisir dans PDS OS.
- **Hybride** : le travail est réparti entre plusieurs intervenants. Chaque partie dit qui la porte.

## 4. Le déroulé, de la conception à la livraison

Chaque étape : qui agit, ce qui entre, ce qui sort.

| # | Étape | Qui | Entrée | Sortie |
| --- | --- | --- | --- | --- |
| 0 | **Conception** (déjà dans `/design`) | DA, réalisateur, artiste, call créatif | Une idée, un besoin du projet | **Brief créatif validé** = point de départ de la Production |
| 1 | **Organisation** | Chef de projet | Le brief | Interne / externe / hybride, et qui tient chaque rôle |
| 2a | **Proposition du réalisateur** | Réalisateur | Le brief | Traitement, découpage, références, intentions de mise en scène |
| 2b | **Call technique** | Réalisateur, chef op, production, son, lumière, régie… | Concept + traitement | Besoins exprimés **par chaque métier** : caméras, optiques, lumière, mouvements, son direct ou playback, techniciens, temps d'installation, contraintes du lieu |
| 2c | **Repérages** | Production (recherche), réalisateur, chef op | Besoins + concept | **Plusieurs lieux** (photos, vidéos, contraintes, tarifs), chacun avec trois avis (artistique, technique, faisabilité / coût / autorisations), comparés, **un retenu** |
| 2d | **Équipes et matériel** | Chargé de production | Besoins du call, liste du chef op | Disponibilités, devis des loueurs, locations, réservations **confirmées après validation** |
| 2e | **Planning** | Production + réalisateur | Séquences, lieu, équipe | Séquences, horaires, installations, déplacements, pauses, contraintes ; délais de post anticipés pour tenir la livraison |
| 2f | **Feuille de service** | Production | **Les infos déjà validées** | Convocations, horaires, lieu, contacts, déroulé, consignes — **pas rédigée de zéro** |
| 2g | **Contrôle avant tournage** | Production, chef de projet | Tout ce qui précède | Lieu, équipes, matériel, autorisations, horaires confirmés ; pour chaque manque : **qui le règle** et **est-ce bloquant** |
| 3 | **Tournage** | Chacun selon sa fonction ; production et régie tiennent la journée | Feuille de service | Imprévus avec leurs conséquences (retard, matériel manquant, séquence impossible, modification) ; ce qui a été réellement tourné ; rushes récupérés, sauvegardés, prêts à transmettre |
| 4 | **Postproduction** | Monteur (+ étalonneur, son, post) | Rushes + documents | V1 → retours → V2… jusqu'à validation ; puis finitions (étalonnage, son, sous-titres, habillage, exports) |
| 5 | **Livraison** | Chef de projet | Version validée | Fichiers définitifs aux formats demandés, conformité vérifiée, transmis à la diffusion ; Production close, documents et décisions conservés |

## 5. La circulation des informations

Ibé donne quatre chaînes explicites ; ce sont les endroits où l'on ne doit **jamais retaper** :

1. Besoins techniques du **call** → **demandes de devis** (lignes de matériel / techniciens).
2. **Réservations confirmées** → **préparation du tournage** (contrôle avant tournage).
3. **Horaires et lieux confirmés** → **feuille de service**.
4. **Rushes récupérés** → **postproduction**.

Et une règle générale : PO **sollicite les bonnes personnes** (le chef op pour sa liste, le
réalisateur pour son traitement, le monteur pour sa version), au lieu que le chef de projet
saisisse tout lui-même.

---

## 6. Ce que PDS OS fait déjà (13/10/2026)

| Besoin d'Ibé | Existant | Où |
| --- | --- | --- |
| Partir du brief créatif validé | Oui : la Fiche Livrable transférée par la Conception, héritage lu, jamais recopié | `lib/production/fiche.ts`, `sheet.ts` |
| Proposition du réalisateur | En partie : « Brief réalisateur » (intention, découpage, caméra, son…), écrit par le responsable **ou** le réalisateur s'il est membre | `save_production_brief` |
| Call technique | Oui : sujets calculés depuis ce qui manque, compte rendu → éléments cités (décisions, actions, points à arbitrer) | `call-prep.ts`, `preprod/fill-from-call.ts` |
| Besoins humains, affectations | Oui : cinq familles, postes, disponibilités | `production_needs`, `production_assignments` |
| Matériel, devis, réservations | Oui : Besoin → Devis reçu → … → Réservé confirmé → Récupéré → Rendu | `production_equipment` |
| Planning | Rétroplanning à décalages fixes (J-21…J+1) ; pas de planning de séquences | `preprod/schedule.ts` |
| Feuille de service | Équipe et matériel lus dans leurs tables ; horaires, contacts, séquences, consignes **en texte libre** | `production_call_sheets` |
| Contrôle avant tournage | Oui : sept contrôles, « prête » refusée tant qu'un requis manque | `production_readiness_checks` |
| Tournage, rushes, incidents | Oui : trois déclarations (rushes, audio, sauvegarde), incidents avec impact | `lib/production/shoot/` |
| Post : versions, retours, validation | Oui : versions illimitées, retours horodatés, décision du validateur créatif | `lib/production/post/` |
| Livraison, conformité, transmission | Oui : contrôle par fichier attendu, transmission à Activations | `lib/production/delivery/` |
| Phase de chaque livrable | Oui, calculée (À préparer → … → Transmise) | `lib/production/phase.ts` |

## 7. Ce qui manque (écart avec la vision)

- **E1. Aucun mode d'organisation.** Les « trois modes » actuels (direct / call / import) disent
  *comment remplir*, pas *qui produit*. En externe, la Production affiche quand même matériel,
  techniciens et feuille de service à saisir.
- **E2. Un seul acteur.** Tout s'écrit par le responsable du projet (seul le brief réalisateur
  s'ouvre au réalisateur s'il a un compte). Pas de chargé de production, de chef op, de régisseur
  ni de monteur comme rôles ; personne ne voit « ce qui me concerne ». Pas de lien pour un
  intervenant **sans compte** (§ 2 bis), alors que le Master le fait déjà pour le mixeur
  (`/m/[token]`).
- **E3. Pas de prochaine action.** La phase est calculée mais aucune page ne dit « voici ce qui
  reste, voici la suite » ; la Préproduction présente ses neuf parties d'un coup. La Conception a
  déjà ce mécanisme (`lib/design/journey-next.ts`) : le modèle à suivre.
- **E4. Un seul lieu.** `location_status` (à trouver / à vérifier / confirmé) sur la fiche : pas
  de repérages comparés ni d'avis par métier.
- **E5. Les chaînes du § 5 sont coupées.** Le compte rendu du call produit des éléments de call,
  pas des lignes de matériel à chiffrer ; la feuille de service redemande horaires, contacts et
  séquences en texte libre ; le contrôle avant tournage ne dit pas **qui** règle un manque.
- **E6. Le monteur ne dépose pas lui-même.** Les versions de postproduction sont saisies dans
  l'app par un membre ; pas de dépôt par le monteur.

## 8. Ordre proposé pour retravailler (à confirmer par les tickets d'Ibé)

Chaque lot reste une étape à part ; aucun n'est commencé.

1. **Organisation + prochaine action** (E1, E3) : choisir interne / externe / hybride à l'ouverture
   d'une fiche, qui décide des parties affichées ; un bandeau « où on en est / la suite » par
   fiche et sur la liste, calculé par le code comme `journey-next.ts`. C'est ce qui répond le plus
   directement à « je ne sais pas pourquoi je remplis, ni ce qui se passe ensuite ».
2. **Rôles de production** (E2) : attribuer les rôles du § 2 à des contacts du Réseau ou à des
   membres (cumul possible) ; la page du chef de projet dit, pour chaque rôle, ce qu'on attend
   de lui et où il en est.
3. **Chaînes d'information** (E5) : besoins du call → lignes de matériel / postes en brouillon ;
   feuille de service composée depuis lieu, planning et affectations confirmés ; chaque manque du
   contrôle avec son responsable et son caractère bloquant.
4. **Repérages comparés** (E4).
5. **Une page par rôle, par lien privé** (§ 2 bis, E2, E6) : sur le modèle de `/m/[token]`
   (réalisateur pour sa proposition, chef op pour sa liste, monteur pour ses versions) ; ce qui
   revient est une proposition que le chef de projet valide.

## 8 bis. Les tickets d'Ibé : PROD-001 à PROD-040 (13/10/2026)

Déposés dans le dossier Drive des retours, repris dans Notion « Retours ». **Ils confirment les § 1
à 8** : prochaine action et transitions (001, 007, 018, 024, 038, 040), un responsable, un
validateur et des droits par rôle pour chaque action (002), préremplissage sourcé (003, 027),
compte rendu → tâches (005), plan et rétroplanning générés (006, 010), lieux comparés avec avis et
décideur distincts (011 à 013), chaînes devis → matériel → contrôle → retour (014, 015, 017, 022),
feuille de service structurée et versionnée (016), postproduction adaptée au contenu (025), et
surtout **le prestataire dépose lui-même** ses versions et exports, sur « son espace » (026, 028,
032, 036). Nouveautés par rapport au § 8 : **dérogation** tracée (motif, auteur) quand un
prérequis manque (008, 017, 022) ; **un seul cycle par version** au lieu de « retours » et
« validation finale » séparés (033) ; numéro de version automatique, sans champ libre (029) ;
extraction IA des devis (014, sortie du MVP jusqu'ici) ; envoi **effectif** au prestataire, avec
l'état envoyé / consulté / traité (031). Le call technique doit aussi être fiabilisé (004 : création,
ouverture, enregistrement).

**Ce que les tickets ne disent pas** : interne / externe / hybride (seulement dans son message),
compte ou lien pour le prestataire (« son espace », « l'accès nécessaire »), qui décide (« la
personne autorisée », « le décideur »), qui est le « responsable de tournage », par quel canal
partent les notifications à un externe.

## 9. Questions à Ibé

Version courte (14/10/2026), revue après lecture des tickets PROD : n° 1+3, 41 (canal d'envoi), 8+10+12,
5+16+20+34 (qui décide), 2 (responsable de tournage), 13. Les n° 30 et 33 sont tranchés par PROD-028
(lien Frame.io, Drive, Vimeo ou fichier). Sans réponse à ce jour.

Chaque question donne **notre hypothèse** : un « oui » suffit si elle est juste. Les blocs A et B
conditionnent tous les écrans ; le reste peut attendre ses tickets. Reporter chaque réponse ici
(« Réponse d'Ibé, JJ/MM : … ») puis dans les § 2 à 8.

**Réponses du 14/10 (§ 0)** : n° 1 (interne : PDS pilote, freelances possibles ; externe : une
société), 3 (liens privés pour le MVP, comptes plus tard), 8 à 12 (deux types, pas d'hybride ;
déroulé externe complet ; la société a son accès pour lieux, documents et ce qui la concerne), 20
(en externe, la société propose les lieux, PDS valide), 22 (le chargé de production vérifie le
devis et le soumet à son supérieur).

**Réponses d'Ibé, 14/10 (22:14)** : **le DG valide les devis** ; le chargé de production les recueille,
vérifie leur cohérence avec le budget et les délais, puis les soumet au DG (n° 7, 22). **Le chargé de
production peut être salarié ou freelance**, selon le projet : seul son rôle compte (n° 2). **Interne ou
externe se choisit par contenu**, pas par projet : un clip en externe et des capsules en interne sur une
même sortie (n° 8, 9). Reste ouverte : n° 13 (contenus sans tournage).

**Question du 17/10 (lieu et devis), sans réponse** : le devis est validé avant que la société propose
les lieux. Son premier devis prévoit-il un montant pour les lieux, et le lieu retenu doit-il y tenir ?
Qui décide d'un dépassement (le chef de projet demande une révision, ou le DG valide) ? *Hypothèse,
codée dans le proto V2 : la société indique au dépôt « dont montant prévu pour les lieux », la
vérification le contrôle ; le code compare le tarif du lieu (× jours de tournage) à ce montant et
affiche « Compris dans le devis » ou « Dépasse de X € : révision du devis à prévoir » ; au
remplacement d'un lieu, la case « Budget » n'est pré-cochée qu'en cas de dépassement, la demande
reste un choix humain.*

**Décisions prises dans le proto V2 le 17/10, faute de réponse (à confirmer par Ibé)** :
- *Rushes* : un seul geste « Rushes reçus » (lien qui fonctionne et fichiers complets ; sinon un
  blocage). Le transfert à la postproduction (§ 14 du ticket : à envoyer, envoyé, reçu) n'existe que
  si le rôle « Postproduction » est tenu par quelqu'un d'autre que la société qui a tourné ; sinon le
  montage commence directement.
- *Livraison* : plusieurs destinataires, pré-cochés selon ce que PDS OS sait (Distribution,
  Activations, valideur externe), les autres choisis dans le projet et le Réseau. Ibé ne dit pas qui
  les reçoit.
- *Informations à confirmer* : elles reviennent au responsable du projet (bloc « Maintenant », ligne
  de la synthèse avant tournage avec le lien vers Décisions). Remplacer un lieu propose de confirmer
  l'information de l'étape Lieux qui en est le motif (pré-cochée, motif pré-rempli).

### A. Qui utilise PDS OS (bloquant)

1. Réalisateur, chef op, directeur / chargé de production, régisseur, monteur : ce sont des
   **externes** (freelances, boîte de prod) ? Ou certains sont **salariés du label** ?
   *Hypothèse : tous externes.*
2. Le **chargé de production** fait l'essentiel de la préparation. Chez PDS, c'est un salarié (il
   lui faut alors un compte, donc un nouveau poste dans l'app), un externe, ou le chef de projet
   lui-même sur les petites productions ? *Hypothèse : le chef de projet sur les petites, un
   externe sur les grosses.*
3. Pour les externes : un **lien privé sans compte** pour chaque rôle (comme le mixeur dans le
   Master), ça vous va ? Ou vous voulez qu'ils aient un vrai compte ? *Hypothèse : le lien. Les
   comptes externes sont hors V1.*
4. Le **chef de projet de la Production** est-il toujours le responsable du projet (celui de la
   Stratégie et de la Conception) ? *Hypothèse : oui.*
5. Le **directeur créatif (DA)** : quel rôle en Production ? Il valide la proposition du
   réalisateur, les lieux, les versions du montage ? *Hypothèse : il valide les versions, et donne
   un avis sur le reste.*
6. **L'artiste** intervient-il en Production (avis sur le traitement, le lieu, les versions) ?
   Directement ou via le chef de projet ? *Hypothèse : via le chef de projet.*
7. **Le DG** : doit-il valider quelque chose en Production (un devis, un dépassement de budget, le
   tournage) ? Au-delà de quel montant ? *Hypothèse : seulement un dépassement de l'enveloppe.*

### B. Interne, externe, hybride (bloquant)

8. Le mode se choisit **par contenu** (ce clip en externe, ces capsules en interne) ou **pour tout
   le projet** ? *Hypothèse : par contenu.*
9. Qui le choisit, et à quel moment (dès la Conception, au début de la Production) ? Peut-il
   changer en cours ? *Hypothèse : le chef de projet, au début de la Production, modifiable.*
10. **Externe** : concrètement, que doit suivre le chef de projet dans PDS ? Le devis global signé,
    les dates clés, la date de tournage, les versions à valider, la livraison ? Rien d'autre ?
11. **Externe** : la boîte de prod doit-elle aussi avoir un lien (pour déposer ses versions, son
    planning, sa feuille de service pour info) ? *Hypothèse : oui, un lien unique pour la boîte.*
12. **Hybride** : peux-tu donner un exemple réel ? La répartition se fait-elle par étape (on
    tourne nous-mêmes, une boîte fait le montage) ou par poste (on loue une équipe image à une
    boîte) ?
13. La Production couvre-t-elle aussi les contenus **sans tournage** (cover, visuels, photos,
    motion) ? Si oui, quelles étapes leur restent ? *Hypothèse : oui, sans call technique, sans
    repérages ni feuille de service.*
14. Capsule réseaux, interview : mêmes étapes en plus court, ou un parcours à part ? Lesquelles
    sauter ? *Hypothèse : même parcours, et le chef de projet décoche ce qui ne sert pas.*

### C. Préproduction

15. **Proposition du réalisateur** : c'est un document qu'il dépose (PDF du traitement), des
    champs à remplir, ou les deux ? *Hypothèse : il dépose son document et PO en tire les champs.*
16. Qui **valide** cette proposition ? Peut-elle faire plusieurs allers-retours (V1, V2) avant
    accord ? *Hypothèse : le chef de projet et le DA, plusieurs versions possibles.*
17. **Call technique** : toujours une vraie réunion (visio ou présentiel) ? Un seul ou plusieurs ?
    Qui l'organise : le chargé de production ou le chef de projet ?
18. On peut l'**enregistrer dans PDS** comme les autres calls, pour que PO en tire les besoins ?
    (S'il est en présentiel à six : un téléphone posé sur la table suffit ?)
19. Les **besoins de chaque métier** (liste caméra et lumière du chef op, besoins son…) arrivent
    sous quelle forme : un fichier (Excel, PDF), un message, ou dits pendant le call ?
20. **Repérages** : qui cherche les lieux ? Combien de lieux comparés en général ? Faut-il les
    trois avis (réalisateur, chef op, production) avant de choisir ? Qui tranche ?
21. **Autorisations de tournage** (mairie, propriétaire, lieu public) : PDS doit-il les suivre
    comme des documents à obtenir ? *Hypothèse : oui, un contrôle avant tournage existe déjà.*
22. **Devis** : qui demande les devis, qui les valide avant de réserver ? « Confirmer après les
    validations nécessaires » : lesquelles exactement ?
23. Faut-il **comparer plusieurs devis** pour un même besoin dans PDS, ou on garde seulement le
    retenu ?
24. **Budget** : l'enveloppe vient de la Stratégie. En cas de dépassement, qui arbitre ? On
    bloque ou on signale seulement ? *Hypothèse : on signale, le chef de projet arbitre.*
25. **Planning** : à quel niveau de détail (par jour, par séquence, à l'heure) ? Un tournage peut
    durer plusieurs jours, sur plusieurs lieux ? *Hypothèse : oui, plusieurs jours possibles.*
26. On a mis un **rétroplanning par défaut** (brief J-21, lieu J-14, équipe J-10, location J-7,
    feuille de service J-2, sauvegarde J+1 ; validation du montage L-3, exports L-1). Ces délais
    sont-ils réalistes ?
27. **Feuille de service** : envoyée comment (PDF par mail, lien, WhatsApp) ? À qui ? Combien de
    jours avant ? Elle peut changer après l'envoi ?
28. **Contrôle avant tournage** : la liste est-elle bonne (lieu, équipe, matériel, planning,
    budget, feuille de service, autorisations) ? Il manque quoi ? Qui dit « on est prêts » ? Avec
    un manque non bloquant, on tourne quand même ?

### D. Tournage

29. Le jour J, **quelqu'un utilise PDS sur place** (téléphone) pour noter les imprévus et ce qui
    est tourné, ou tout se renseigne après coup ? Qui ?
30. **Rushes** : où sont-ils stockés (disques, Drive, Frame.io, WeTransfer…) ? Quel volume ?
    *Hypothèse : PDS garde un lien et la déclaration « sauvegardé », pas les fichiers eux-mêmes.*
31. Faut-il une **double sauvegarde** déclarée (règle courante en tournage) ?
32. **Matériel loué** : qui le récupère et le rend ? PDS doit-il suivre le retour, la caution, la
    casse ?

### E. Postproduction et livraison

33. Les **versions du montage** : le monteur les envoie avec quel outil aujourd'hui (Frame.io,
    Vimeo, Drive, WeTransfer) ? PDS remplace cet outil, ou garde le lien et les retours ?
34. **Qui fait des retours** sur une version (chef de projet, DA, réalisateur, artiste) ? Les
    retours de l'artiste passent-ils par le chef de projet ? Qui a le dernier mot ?
35. Le **réalisateur** valide-t-il le montage avant que le label le voie ?
36. **Étalonnage, mixage son, sous-titres, habillage** : ce sont des personnes et des étapes
    séparées, chacune avec ses versions, ou c'est fait dans le montage ?
37. **Formats de livraison** : qui les fixe ? Ce sont ceux des Activations (formats réseaux) ?
38. « Transmettre aux personnes chargées de la **diffusion** » : c'est l'équipe Activations dans
    PDS, ou aussi des externes (distributeur, chaîne YouTube de l'artiste, média) ?
39. **Clôturer une production** exige quoi : matériel rendu, factures reçues, techniciens payés,
    rushes archivés ? Les factures et les paiements des techniciens sont-ils dans le périmètre ?
    *Hypothèse : non, hors V1.*

### F. Contrats et droits liés au tournage

40. **Contrats des techniciens**, droit à l'image de l'artiste et des figurants, autorisation du
    lieu : gérés dans la Production ou dans le Juridique ? *Hypothèse : le Juridique, la
    Production vérifie qu'ils sont signés avant le tournage.*

### G. Ce que PO fait tout seul

41. « PO **sollicite** les bonnes personnes » : par quel canal ? Aujourd'hui PDS n'envoie aucun
    e-mail (le chef de projet copie le lien). On garde ça, ou PDS doit envoyer lui-même ?
42. PO doit-il **relancer** un intervenant qui n'a pas répondu ? Au bout de combien de temps ?
43. « PO **comprend** quand c'est terminé » : il peut le déduire d'un dépôt (le monteur dépose =
    version prête) ou il faut toujours une confirmation humaine ? *Hypothèse : un dépôt fait
    avancer, une décision (valider, réserver, déclarer prêt) reste humaine.*

### H. Pour la suite

44. Les **tickets détaillés** de ton test : pour quand ? On attend, ou on commence par
    « organisation interne/externe + prochaine action à chaque étape » ?
45. Les **trois écrans** qui t'ont le plus gêné pendant ton test ?
46. Un **vrai tournage** récent ou à venir qu'on pourrait suivre comme exemple (mode, taille de
    l'équipe, nombre de jours, budget) ?
47. Une production PDS **type** : combien de personnes, de jours de tournage, quel budget ?
    Plutôt clips ou plutôt capsules ?

## 10. Écart avec la branche `feat/production-ibe` (14/10/2026)

Les 40 tickets PROD et 7 BUG sont codés (`docs/AVANCEMENT.md`, lots 1 à 14). Ce qui y répond déjà
au § 0 : la prochaine action par fiche (calculée, avec qui est attendu), le préremplissage sourcé,
le compte rendu du call → actions planifiées et attribuées après confirmation, les lieux comparés
avec avis par rôle, le cycle de version, l'espace prestataire `/p/[token]` (mission, corrections,
dépôt de versions et d'exports, avis sur les lieux), la feuille de service `/fs/[token]`.

Ce qui manque encore :

- **M1. Interne / externe n'existe pas.** Les modes d'ouverture (direct / call / import) disent
  comment remplir, pas qui produit. L'externe doit dérouler son propre parcours (§ 0.3) : call avec
  la société, devis global, validation du devis, échange réalisateur ↔ créatif, puis la société
  qui organise.
- **M2. Pas de validation de devis par le supérieur.** Le matériel et le budget ont des états, mais
  aucun « soumettre le devis → validé / refusé » par une personne autorisée, qui débloquerait la
  suite.
- **M3. Le lien prestataire est étroit.** Il couvre la postproduction et l'avis sur les lieux. En
  externe, la société doit pouvoir **proposer des lieux**, **déposer son devis et ses documents**,
  et tenir matériel, équipes, planning et feuille de service ; en interne, le réalisateur
  (découpage), le chef op (matériel) et le chargé de production (lieux, devis, planning) ont
  chacun leur part.
- **M4. La prochaine action parle au chef de projet.** Elle nomme qui est attendu, mais chaque
  rôle n'a pas « ce que j'ai à faire » sur sa propre page.

Réponse proposée à Ibé sur le **compte prestataire simplifié** : pas pour le MVP. Un compte
change la sécurité de toute la base : aujourd'hui, un compte est un membre de PDS, et dès qu'il est
rattaché à un projet il en lit toutes les tables (budget, contacts, juridique…) par
`can_see_project` ; un prestataire connecté demanderait un nouveau type de compte restreint à sa
mission, table par table, à revoir partout. Le lien privé obtient l'essentiel sans ce risque. Étape intermédiaire possible et
rapide : **un lien par prestataire** (et non plus par mission) qui rassemble toutes ses missions
en cours, sur tous les projets — l'expérience d'un compte (« mes missions ») sans connexion ; le
jour où les comptes arrivent, ce lien devient son espace connecté.

Fait le 14/10 (proto validé par Sacha, `docs/ARCHITECTURE.md` « Production en parcours ») : M1, M2,
M3 (société, réalisateur, chef op par lien ; le chargé de production a un compte) et M4 (« Maintenant »
et « À vous » selon la personne). Les réponses d'Ibé du 14/10 confirment le DG comme validateur des
devis et le choix interne / externe par livrable (déjà le cas). **Écart restant** : un chargé de
production **freelance** n'a pas de compte ; il faudrait soit lui ouvrir un compte limité à ce rôle,
soit lui donner sa part par lien privé (lieux, devis, planning, feuille de service). À trancher.



## 11. Décisions du lot 5 « Projet complet » (19/10/2026)

- **La Production s'ouvre au transfert de la fiche**, sans étape à démarrer ni validation de la Production
  entière par le DG : chaque décision (devis, proposition, montage, livraison) est validée dans son étape.
  L'étape `production` de `project_stages` reste le verrou technique, démarrée par l'ouverture de la fiche.
- **Contenus sans tournage** (question 13) : le proto y répond par un parcours léger (versions, contrôle
  technique, livraison) ; non construit dans ce lot (reste PR-13, fait le 20/10 : § 12).
- **Lieu et devis** (question du 17/10) : hypothèse du proto retenue — le devis dit le montant prévu pour les
  lieux, le lieu retenu y est comparé pour un jour de tournage ; un dépassement se lit « révision du devis à
  prévoir » et le remplacement du lieu peut la demander.
- **Validation créative externe** (management) : pas de lien Production pour le management en V1 ; la
  proposition et le montage restent validés en interne (reste PR-11, fait le 20/10 : § 12).
- **Société suggérée** : calculée par le code depuis ce que PDS a produit avec chaque société, jamais par PO.

## 12. Ce qui restait de la Production (20/10/2026, branche `pc/r2-production`)

Décisions prises en codant le reste du proto (`docs/protos/production-v2.html`, `src/mk.js`), à revoir
avec Ibé si elles ne lui conviennent pas :

- **Proposition de réalisation en versions** (externe) : le réalisateur dépose V1, V2… avec trois
  pièces — traitement, moodboard (facultatif), découpage technique — sous forme de **liens vers les
  PDF**, comme le « Devis (PDF) » de la société (un fichier déposé sur un lien privé ne pourrait pas être
  ouvert par le management, qui n'a pas de compte). La version retenue est la dernière validée en interne
  **et**, quand « Qui fait quoi » en nomme une, en externe ; « Demander une nouvelle version » la garde
  retenue jusqu'à la suivante (règle 14). L'interne garde le brief réalisateur des tickets PROD.
- **Validation créative externe** (management de l'artiste) : un contact du Réseau nommé dans « Qui fait
  quoi » (le responsable du projet), qui reçoit un lien privé de la fiche (rôle `creativeExt`) et y décide
  la proposition et le montage, en plus de la validation interne, jamais à sa place. Il ne voit ni devis,
  ni lieux, ni enveloppe. « Pas de validation externe » : ce qui l'attendait n'est plus attendu.
- **Pochette** (titre « pochette / cover / artwork », la règle de `distribution_cover`) : parcours léger
  Versions de la pochette → Contrôle technique → Livraison, interne ou externe (photographe / graphiste du
  Réseau, dépôt sur son lien). Le code lit le format et le poids dans le stockage, les dimensions dans le
  navigateur au dépôt (comme le proto) ; contrôles : 3000 × 3000 px, JPG ou PNG, carré et **10 Mo au plus**
  (limite choisie pour ce lot, à confirmer avec The Orchard). La base refuse « Confirmer : fichiers
  conformes » sur une pochette non conforme.
- **Teasers « Décliné du Clip officiel »** (titre « teaser / extrait », un clip en Production) : ils suivent
  la production du clip (organisation et société, qui suivent aussi un changement) et leurs versions
  attendent « Montage du clip validé ». Interne : le parcours tournage interne des tickets reste.
- **Montage d'une production externe** : la société dépose chaque version sur son lien sans étape de post à
  créer ; elle dépose aussi le lien du fichier final de la version validée. Validation créative, contrôle
  technique des exports et livraison restent trois décisions distinctes.
- **Destinataires de la livraison** (tout livrable) : pré-cochés la Distribution (responsable du projet),
  les Activations (la personne à qui le livrable est confié) et la validation externe, puis les membres,
  le Réseau ou un nom seul ; les membres sont prévenus. Parcours léger : la transmission aux Activations
  suit la livraison ; clip : elle reste confirmée à part. Livré ne veut pas dire publié.
- **Date et horaires du tournage** : une décision datée (responsable du projet) qui remplace la précédente,
  gardée dans l'historique. Sans décision, la ligne « Date et horaires » du contrôle n'est pas prête (proto).
  Un changement crée la tâche « Mettre à jour le planning et la feuille de service » (société en externe,
  responsable de production en interne) et, si la préparation était confirmée, la remet « À revoir » : elle
  se confirme de nouveau, la synthèse précédente reste dans l'historique.
