# Production : comment se passe un tournage (référence métier)

Source : messages d'Ibé du 13/10/2026 (16:30 et 16:52), écrits après son test de la Production,
**avant** les tickets détaillés qu'il annonce. Ce fichier n'est pas un ticket : c'est le cadre
dans lequel lire ces tickets et refaire les écrans. Une règle écrite ici sans citation d'Ibé est
marquée « décision » ou « à trancher ».

Code existant : `docs/ARCHITECTURE.md` § 8 nonies. Exemple suivi : un clip musical. La même logique
doit valoir pour une capsule réseaux, une interview, etc.

---

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

## 3. L'organisation de la production : interne, externe, hybride

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
  ni de monteur comme rôles ; personne ne voit « ce qui me concerne ». Pas d'accès pour un
  intervenant **sans compte**, alors que le Master le fait déjà pour le mixeur (`/m/[token]`).
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
2. **Rôles de production** (E2) : attribuer les rôles du § 2 à des membres ou à des contacts du
   Réseau (cumul possible), une vue « Ma part » par rôle, droits d'écriture par rôle (RLS).
3. **Chaînes d'information** (E5) : besoins du call → lignes de matériel / postes en brouillon ;
   feuille de service composée depuis lieu, planning et affectations confirmés ; chaque manque du
   contrôle avec son responsable et son caractère bloquant.
4. **Repérages comparés** (E4).
5. **Intervenants sans compte** (E2, E6) : lien à usage unique sur le modèle de `/m/[token]`
   (réalisateur pour sa proposition, chef op pour sa liste, monteur pour ses versions).

## 9. À trancher

- **Externe** : que garde-t-on exactement côté PDS (le devis global de la boîte de prod comme
  budget convenu ? ses livrables intermédiaires ? un interlocuteur unique ?).
- **Hybride** : la répartition se fait-elle par partie (préprod / tournage / post) ou par rôle ?
- **Qui valide** la proposition du réalisateur et le choix du lieu : le chef de projet seul, ou
  aussi le directeur créatif ?
- **Droits** : un chef op ou un régisseur membre de l'app écrit-il seulement « sa part », ou
  aussi la feuille de service ? (règle actuelle : dans un projet lancé, seul le responsable écrit —
  `CLAUDE.md`, « Permissions » ; l'ouvrir par rôle est une décision de direction.)
- **Autres contenus** (capsule, interview) : mêmes étapes en version courte, ou gabarits
  distincts ?
