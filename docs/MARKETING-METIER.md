# Marketing : ce qu'Ibé demande, module par module

Relu le 18/10/2026 dans les tickets du Drive (dossier public des tickets du DG) : « Architecture globale
des projets PO », « Workflow Stratégie complet », « Workflow Conception complet », « Workflow
Production complet », « Retours prototype Artefact » (15/10), « Activations — Vue d'ensemble et
pilotage », « Activations / Influence », « Activations / Relations presse », « Bilan, validation et
clôture ». Les fixtures de ses tickets (Piégée / Dioo / Alka, ATYR) ne sont jamais des données : le proto
utilise « Néons ». Proto de référence : `docs/protos/marketing.html` (test : `docs/protos/tests/marketing.cjs`).

## Transverse (architecture globale)

- Stratégie, Conception, Production, Activations, Suivi & bilan : une **organisation**, pas une séquence ;
  les Activations avancent dès que leurs prérequis réels sont là.
- Une seule barre de chevrons par workflow (active noire, autres grises), **aucune deuxième navigation qui
  la double**, un **fil d'Ariane discret** (Projet › Marketing › Étape).
- **Noir, blanc, gris, sans violet**, accent de statut seulement quand il aide à comprendre.

## Stratégie

Demandé : entrée simple (« Commencer la stratégie » / « Préparer un échange ») ; les 8 dimensions en liste
(nom, résumé, état **À compléter / En cours / À arbitrer / Complété**) ; narratif en 5 parties ; calendrier
en temps forts modifiables **et vue par canal** ; échéances amont calculées ; budget interne ; Brief de
sortie qui ne met en évidence que ce qui reste à arbitrer ; validation (états, commentaires, **relance**,
historique) puis Brief V1 figé ; **écran « Stratégie validée »** : Brief V1, Plan de sortie et Dossier de
presse « à générer », et les conséquences vers Conception, Activations, Planning (lancer la Conception
n'est pas obligatoire) ; **générateur interactif du Plan de sortie** (8 étapes, dont l'univers visuel) ;
générateur du Dossier de presse ; suivi avant / après la sortie avec recommandations.
Pas demandé : un « plan d'exécution » à confirmer (retiré du proto le 18/10).

## Conception

Demandé : accueil avec **deux chemins** (préparer un échange créatif / commencer directement) et la liste
compacte des livrables (confirmés / à qualifier, ajout de dernière minute avec provenance et motif) ; le
**chef de projet désigne** le responsable créatif et celui de chaque fiche (une suggestion n'est jamais une
affectation) ; intentions proposées puis confirmées (modifier, compléter, fusionner, dissocier) ;
**moodboards et références par livrable** (image, PDF, vidéo, lien, notes ; une référence pour plusieurs
livrables sans doublon ; « À rattacher » ; propositions jusqu'à validation) ; direction artistique soumise
par sections (Valider / Demander des modifications / Refuser) ; Brief créatif global versionné ; Fiches
Livrables complètes (concept, intention, durée, ratios, sous-titres, déclinaisons, notes, dates de
tournage et de postproduction, livraison, budget prévisionnel engagé ou non, dépendances, points à préciser
en Production, provenance), **séries** (5 capsules = 5 sous-livrables suivis à part), validation par fiche ;
**chaque fiche validée part en Production seule**.

## Production

Demandé : une production **par fiche livrable**, interne, externe ou hybride, choisie par contenu
(« Qui produit ? ») ; brief réalisateur ; équipes image, son et musiciens séparées ; call technique
décision par décision ; plan de préproduction approuvé avant toute tâche ; devis et captures dont les lignes
restent « à vérifier » ; rétroplanning et budget ; feuille de service et contrôle avant tournage ; tournage,
**rushes récupérés et sauvegarde vérifiée séparés**, incidents, retour du matériel ; références de
postproduction ; versions illimitées, **retours horodatés** (timecode, catégorie, statut de la correction),
« soumettre pour retours » ≠ « soumettre à validation finale » ; **validation créative, contrôle technique
des exports et livraison : trois décisions distinctes** ; transmission confirmée aux Activations (livré ≠
publié).

## Activations

Demandé : vue d'ensemble (type, mode, responsable, statut, preuve, statistiques, échéance, prochaine action,
blocage, dépendances), vues enregistrées ; trois axes jamais confondus (opérationnel, preuve, mesure) avec
les statuts « Brouillon, Prête, Suspendue », « En vérification », « Partielle » ; une activation est **créée
ou rattachée par une personne** ; une prochaine action ne crée jamais de tâche sans clic.
**Influence** et **Relations presse** sont de vrais modules à deux modes (gestion interne / agence externe
lue depuis son Google Sheets, décision PDS séparée, « Actualiser ») : fiche Collaboration par créateur,
concept validé, négociation, accord express par lien, droits organiques ≠ publicitaires, paiement
administratif ; cadrage RP, dossier de presse, ciblage, messages, relances, interviews, retombées.

## Suivi & bilan

Demandé : tableau de bord vivant (déclaré / vérifié / inconnu séparés), rapport figé et versionné, bilan
provisoire **possible avec des activations encore ouvertes**, réserves arbitrées (à lever, à suivre,
limite définitive, non applicable, **doublon**), clôture Marketing distincte de la clôture du projet,
**réouverture** motivée.

## Ce que le proto couvre et ce qui reste (18/10/2026)

Codé : fil d'Ariane, plus de violet, « À arbitrer » / « À confirmer » ; Stratégie (8 dimensions à
confirmer, Brief en 4 blocs, relance, écran « Stratégie validée ») ; Conception complète selon le ticket
(accueil, deux chemins, responsables désignés, intentions, références par livrable, direction par sections,
Brief créatif, fiches modifiables champ par champ, séries, transfert fiche par fiche) ; Production par
livrable avec « Qui produit ? » (clip externe = parcours V2, interne = parcours générique, pochette =
dépôt d'image contrôlé par le code, teasers déclinés du clip), sauvegarde des rushes séparée, contrôle
technique et livraison distincts pour les livrables hors clip externe ; leviers proposés à la création ;
bilan sans verrou, « Doublon », réouverture.

Activations (18/10, parties 1 à 4) : vue d'ensemble avec vues enregistrées, statuts complets (Prête,
Suspendue, Annulée, Partielle, Sans objet) et relevés de statistiques datés ; **Influence en interne**
(créateurs du Réseau avec historique, concept par créateur validé par la direction, brief et proposition,
négociation, accord express par lien privé `/i/…`, droits organiques ≠ publicitaires, versions avec retours
horodatés, publication déclarée puis vérifiée, paiement administratif sans virement) ; **Influence en
agence** et **Relations presse en agence** sur un même moteur (Google Sheets relié en lecture, correspondance
des colonnes, « Actualiser » avec aperçu et instantané, statut agence ≠ décision PDS, écart signalé, message
récapitulatif, bilan « données agence, non vérifiées », bilan d'agence validé provisoirement avec réserves
relevées par le code) ; **Relations presse** communes (cadrage RP et dossier de presse versionné, complétude ≠
validation ≠ envoi) et **en interne** (ciblage depuis le Réseau avec alertes, modèle commun puis brouillon par
média, validation, envoi déclaré confirmé, relances bloquées après refus, interview proposée → créneau →
réalisée → diffusion déclarée, brief sans réponse inventée, retombées déclarées puis vérifiées avec méthode).
Scénarios du proto : « influence confiée à une agence », « relations presse en interne ».

Production (18/10) : à l'entrée, avec « Qui produit ? », le choix **Préparer directement avec PO / Préparer
un call de production / Importer une organisation existante** (clip et teasers produits à part ; sans
objet pour un livrable décliné ou une pochette). L'étape qui suit porte le nom du choix. Call : préparé
(objectif, participants par fonction, documents, points ouverts, ordre du jour modifiable, date et heure),
puis PO range ce qui a été dit par point (décision, hypothèse, action proposée, point à arbitrer, avec la
phrase exacte) ; un point de l'ordre du jour sans rien de dit le reste à l'écran. En interne, le plan de
préproduction est approuvé avant que les actions deviennent des tâches et que les points à arbitrer
entrent dans « Informations à confirmer ». En externe, le call de production avec la société remplace
l'ancien « call de présentation ». Chaque réunion (échange stratégique, échange créatif, call de production) a son
**compte rendu** dans la modale : date, format, participants, puis l'ordre du jour point par point avec la
phrase citée et ce qui en a été fait ; un point sans rien de dit le reste. Scénario « Production : début,
qui produit ? » pour partir des fiches transférées. Les **participants** du call sont préremplis d'après « Qui fait quoi », dans un champ à la
Teams / Outlook : une pastille par personne (« externe » le cas échéant, × pour retirer), on tape un nom pour
l'ajouter (Entrée ajoute, Retour arrière retire la dernière), au moins deux personnes. Quelqu'un hors du Réseau : taper son adresse
propose « Inviter … » (fiche créée dans le Réseau), taper son nom propose « Créer la fiche » (modale : nom,
e-mail, structure, fonction) ; il reste dans le Réseau. Les points de l'ordre du jour se modifient sur place
(icône crayon, Entrée / Échap), se retirent (icône corbeille) et se déplacent (poignée à glisser, flèches
du clavier sur la poignée, boutons monter / descendre sur écran tactile). **Réalisateur** (clip externe) : personne n'est désigné d'avance. La tâche du call « Proposer un
réalisateur » devient un geste sur la page de la société (nom, lien du showreel, pourquoi lui ; plusieurs
propositions possibles) ; la cheffe de projet en retient un dans l'étape du call (« Retenir »), il reçoit le
rôle « Réalisation » et son lien privé, les autres restent visibles « Non retenu ». La tâche n'est plus proposée
quand un réalisateur est déjà désigné. « Organisation et rôles » n'est plus une étape : c'est la modale « Qui
fait quoi » (règle 22). **Page privée d'un externe** triée : « À vous » d'abord (échéance la plus proche en tête), puis
« En attente de PDS », puis « Fait » replié ; un formulaire facultatif déjà utilisé se réduit à un bouton. Une
tâche dite pendant le call passe en « Fait » quand son geste réel a lieu (devis V1 déposé, réalisateur proposé),
avec ce qui l'a close. Le message de confirmation d'un externe ne montre que la suite de la production qui le
concerne, jamais le reste du travail de PDS. **Quelle société ?** (clip) : séparé de « Interne / Externe ». Sous « Externe », les sociétés de
production du Réseau, la suggestion de PO en tête avec sa raison, et « Créer la fiche d'une société » (nom,
e-mail du contact, contact). La société retenue devient la production exécutive et la postproduction, avec son
lien privé ; les teasers déclinés la suivent. « Changer qui produit » propose aussi une autre société : le
parcours externe repart (organisation, call, devis, réalisateur), l'ancien reste dans l'historique avec ce qui
était fait. Mettre plusieurs sociétés en concurrence sur devis : à trancher avec Ibé.

Stratégie (18/10) : **page d'entrée** du ticket (§ 1) en première étape, « Démarrer la stratégie » : le contexte
(projet, sortie, statut) et deux choix. « Commencer la stratégie » ouvre les 8 dimensions sans proposition ;
« Préparer un échange » reprend le formulaire du call de production (participants en pastilles, date / heure /
format, ordre du jour prérempli des 8 dimensions, modifiable et déplaçable, objectif et documents envoyés avec
l'invitation). Tout call ou échange passe par un **récapitulatif avant création** (« Confirmer et inviter »,
« Modifier » garde ce qui était saisi). Après l'échange, PO range ses propositions par dimension, datées du vrai
échange. Scénarios « … : début » pour chaque module (Stratégie, Conception, Production, Activations, Suivi &
bilan).

**Page Activations refaite** (18/10, « j'ai rien compris ») : plus de tableau à 9 colonnes, de tuiles ni de
parcours. À gauche, une liste (une ligne par activation : type, mode, responsable, échéance, une **frise**
Préparer → Réaliser → Prouver → Mesurer → Clôturer, et une phrase « À vous · … » ou « Nom · … »), filtrée par
« À moi », « En cours », « À mesurer », « Terminées » ; à droite, l'activation ouverte : sa frise, un encadré
« Maintenant » qui liste toutes ses actions (les vôtres d'abord), puis le module (influence, presse), les
informations repliées. Les leviers à transformer sont un bandeau au-dessus. Une activation qu'on vient de
traiter reste dans la liste même si elle change de filtre. Les statuts « opérationnel / preuve / statistiques »
restent calculés et visibles dans « Informations ».

**Résumé de réunion pour les participants** (échange stratégique, call de production externe ou interne) : dès
que les points sont tranchés, PO prépare un message avec ce qui a été décidé (décisions, à confirmer,
prochaines étapes avec qui et quand), sans phrase citée, sans point écarté, sans point à arbitrer ni budget
interne. La cheffe de projet le corrige et l'envoie ; une société le voit sur son lien privé, un contact du
Réseau le reçoit par e-mail, l'équipe dans l'étape. « Corriger et renvoyer » crée une version 2, la précédente
est gardée.

**Preuve d'une campagne** (influence et presse en interne) : plus de lien unique pour toute la campagne. La
phase « Prouver » est calculée par le code à partir des publications vérifiées dans chaque fiche créateur
(« 3 publications vérifiées sur 4 créateurs engagés », avec ce qui manque) ou des retombées vérifiées ; elle
est prouvée quand tout ce qui a été publié est vérifié (pour l'influence, par tous les créateurs engagés). Une
campagne ne peut être déclarée réalisée qu'après une première publication (influence) ou un premier message
envoyé (presse). Le lien unique reste pour les activations simples et pour une activation confiée à une agence
(son bilan). Le proto s'ouvre et « Recommencer » repart toujours sur « Stratégie : début ».

**Suivi & bilan complété** (ticket « Bilan, validation et clôture ») : tableau de bord vivant aux chiffres
séparés et cliquables (activations par étape de la frise, publications déclarées / vérifiées / liens manquants,
retombées déclarées / vérifiées / à vérifier, statistiques déclarées / vérifiées / partielles / indisponibles,
budget estimé / engagé / payé pour la cheffe de projet et la direction, réserves), filtres par type et
responsable ; chaque chiffre ouvre sa liste et sa règle de calcul, une source absente affiche « — ». Écran de
préparation : période, périmètre (activation décochée = exclue et nommée), sections, puis ce qui manque. Le
rapport est une photographie figée à la génération (empreinte) au contenu du ticket : résumé, stratégie source,
récapitulatif des activations, résultats déclarés et vérifiés séparés, statistiques avec leur source, budget,
écarts et recommandations, annexes de preuves ; « Exporter en PDF » imprime le rapport. Simplifié le 18/10 (« énormément d'information ») : en haut, « Où on en est » en quatre phrases
cliquables (activations clôturées, preuves, statistiques, budget) ; le détail chiffré est replié sous « Voir le
détail » ; la préparation tient en deux champs (résumé, recommandations) plus « Ce qui manque » en lecture,
période, périmètre, sections et réserves étant repliés dans « Options du rapport ». Le formulaire suit
l'ordre d'une invitation : participants, date / heure / format, ordre du jour, puis ce qui part avec
l'invitation. À la création, un externe avec lien privé (Studio Ressac) voit l'invitation sur sa page (date,
lien de la visio, participants, ordre du jour) ; un contact du Réseau sans lien est invité par e-mail. Après le
call, sa page ne montre que ce qui lui a été demandé, une fois confirmé par PDS : jamais le compte rendu interne
(règle 21). Télécharger le compte rendu en PDF : proposé, non fait. Le **nombre de jours de tournage** (montant prévu pour les lieux, comparaison avec le lieu
retenu) se calcule depuis la date de tournage de la Fiche Livrable et chaque jour ajouté par une décision
confirmée (« Tournage possible le 24/10 en plus du 23/10 ») ; il n'est plus fixé dans le code. Un externe n'a pas accès à la Fiche Livrable : sa page montre les dates de tournage, pas la
source interne. Les échéances dites pendant le call (« un devis lundi prochain ») suivent la vraie date du
call, et l'échéance du devis sur la page du studio est celle de cette tâche.

Reste, chacun à faire séparément : générateur du Plan de sortie et du Dossier de presse ; suivi de la
Stratégie, vue par canal, narratif en 5 parties ; fusion / dissociation des intentions ; changement de mode
interne ↔ agence en cours de campagne, fusion de fiches Réseau (médias, journalistes), dépôt d'un plan
Excel ou PDF (seul Google Sheets est simulé), bilan d'agence importé comme document ; pour le clip externe, retours horodatés, contrôle technique des exports
et retour du matériel.


## Cadrage (18/10/2026, ticket « Cadrage intelligent d'un projet »)

Porté par le même moteur que le Marketing (module `framing`, « Cadrage » dans la navigation du projet), avant la
Stratégie : **Démarrer le cadrage** (contexte, « Ce que le projet sait déjà » connu / à confirmer / manquant,
« Commencer le cadrage » ou « Préparer un échange » avec « Recommandé » et sa raison) ; **Les 6 dimensions**
(Objectif, Temporalité, Budget & contraintes, Équipe, État de départ, Cadre juridique) : une question de PO à la
fois, « M'aider à définir » (trois formulations sourcées), « Écrire moi-même », Confirmer / Modifier, « Non
applicable » avec motif, « À définir plus tard » avec une tâche ; après un échange, chaque proposition garde sa
phrase et son échange ; **Brief de cadrage** versionné, figé pendant la relecture, validé par la direction ou
renvoyé en cochant les dimensions à revoir (seules celles-là rouvrent), version 2 ; **Plan du projet** (Focus,
Ensuite, Pendant ce temps, À anticiper ; « Modifier le plan » change colonne et pilote ; « Lancer le plan »
démarre les workflows). La Stratégie attend le plan lancé. Scénarios « Cadrage : début », « Cadrage : Brief en
validation », « Plan du projet à lancer ».