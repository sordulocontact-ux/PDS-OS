# Retours BUG + UX restants (lots 6 à 11 et UX-01)

> **Fichier temporaire.** Il reprend, mot pour mot, les retours du document « PO — Retours
> consolidés BUG + UX » (11/10/2026) qui ne sont **pas encore codés**. Les lots 1 à 5 sont
> faits (`docs/ARCHITECTURE.md` § 4 et § 6, bilans dans la conversation du 11/10/2026).
>
> **Quand un lot est codé** : retirer sa section de ce fichier. **Quand tous le sont** :
> supprimer ce fichier **et** la note « Retours BUG + UX restants » de `CLAUDE.md`.

## Ordre à suivre (index du document)

| Ordre | Lot | Type | Périmètre |
|---:|---|---|---|
| 6 | UX-06 + UX-07 | UX — P1 | Corrections du Brief, versions et plan opérationnel |
| 7 | BUG-05 | BUG — P0 pour l'export PDF | Contrôle des versions et export PDF |
| 8 | BUG-08 | BUG — P0 si désynchronisation | Retours Mixage, synchronisation et validation ingénieur |
| 9 | UX-08 + UX-09 | UX — P1 | Brief Mix/Master, transmission, lien privé et accusé de réception |
| 10 | BUG-07 + BUG-09 | BUG — P1 | Dates, champs contact et transmission au prestataire |
| 11 | BUG-06 + BUG-10 | BUG — P0 pour l'accès au master final | Master, Catalogue et Distribution |
| — | UX-01 | UX — P1 | Liste des projets (absent de l'index du document : à confirmer avec Sacha) |

## Règles de travail du document

Traite **un seul lot à la fois**, dans l’ordre choisi ci-dessous. Inspecte le code avant de modifier. Pour chaque ticket, distingue les faits observés, les comportements à vérifier et les améliorations demandées. N’invente pas de règles métier et n’annonce aucun test réussi sans l’avoir exécuté.

### Garde-fous communs

- Utiliser les retours PO comme source de vérité fonctionnelle et inspecter les causes racines avant de coder.
- Limiter les changements au lot actif, sauf dépendance technique indispensable. Éviter les refactorings hors périmètre.
- Préserver les données, l’historique, les permissions et les comportements non concernés.
- Ne pas créer de fausse action métier, de fausse validation, de fausse sauvegarde ou de faux succès.
- Ne pas modifier le contenu documentaire de Catalogue ou Réseau. Les intégrations, liens et lectures de données entre modules peuvent être corrigés lorsque les tickets le demandent.
- Ajouter/adopter les tests de régression pertinents ; signaler explicitement les points qui nécessitent un test manuel ou une décision métier.
- À la fin de chaque lot : résumer brièvement les causes corrigées, fichiers modifiés, tests exécutés et résultats, points restant à confirmer et dépendances. Ne pas commencer le lot suivant sans demande explicite.

### Optimisation des tokens

- Inspecter uniquement les fichiers et composants concernés au départ.
- Réutiliser les constats et mécanismes déjà établis dans les lots précédents.
- Éviter de relire tout le dépôt, de répéter les consignes et de produire des résumés inutiles.
- Regrouper les corrections qui partagent une cause racine sans élargir le périmètre.

## Déjà décidé pendant les lots 1 à 5 (à réutiliser)

- Provenance d'une valeur du Cadrage : `SourceLine` (état + source + lien vers le passage de
  la transcription ou « Source introuvable »).
- Contradictions avant le Brief : `lib/framing/conflicts.ts` ; Brief obsolète signalé au-dessus
  du plan : `briefDrift` / `BriefDrift` (instantanés `schema: 2` seulement).
- Synthèse du Brief (décisions, points ouverts, risques, prérequis, responsables) : `summaryOf`.
- Ordre du jour d'un call : `AgendaEditor`.
- Points à trancher déjà notés dans `docs/CONTEXTE-PROJET.md` § 2 (« retours BUG + UX
  consolidés ») : règle rôle → document, « Continuer sans enregistrement ».
- Base locale : `edits.test.sql` échoue sur un ISRC déjà présent dans les données de test
  (`masters_org_isrc_key`), sans lien avec ces lots.

---

# Lot 6 — UX-06 + UX-07

PO — PROJ-UX-06 — Gérer corrections ciblées, commentaires et historique du Brief
Nature : UX / amélioration fonctionnelle
Priorité : P1
Section historique : Brief et validation
PROBLÈME PRÉCIS
• La validation fonctionne en lecture seule côté valideur et conserve l’historique, mais les corrections doivent être ciblées par dimension/question, les commentaires rendus visibles dans le contexte et les versions comparables.
PARCOURS DE REPRODUCTION
• Soumettre un Brief.
• Depuis la DG, commenter plusieurs points et demander des corrections.
• Depuis le chef de projet, ouvrir les commentaires et corriger.
• Renvoyer puis comparer V1/V2.
• Consulter l’historique des décisions.
CONSTATS FACTUELS
• Lecture seule côté valideur confirmée.
• Commentaires visibles sur les deux comptes.
• Historique et validation du Brief confirmés.
• Le ciblage fin et la comparaison des versions restent insuffisants.
MODIFICATION DEMANDÉE
• Ancrer chaque demande à une dimension, question ou champ.
• Permettre la correction directe depuis le Brief en renvoyant vers la source.
• Afficher statut, auteur, date et résolution.
• Fournir comparaison V1/V2 et filtre « demandes encore ouvertes ».
• Distinguer cadrage complet de prérequis réellement satisfaits.
COMPORTEMENT ATTENDU ET RÈGLES MÉTIER
• Une correction du Brief modifie la donnée source ou crée une divergence explicite.
• Résoudre une demande exige une modification ou une justification.
• Le valideur ne modifie pas directement les données s’il est en lecture seule.
• Toutes les décisions restent historisées.
CRITÈRES D’ACCEPTATION
• Chaque commentaire ouvre le bon champ.
• Le chef de projet voit immédiatement les demandes ouvertes.
• La DG compare les changements avant validation.
• Les deux comptes voient le même état.
• La complétude du cadrage n’est pas confondue avec la readiness opérationnelle.HORS PÉRIMÈTRE / GARDE-FOUS
• Ne pas créer de fausse action dans PO.
• Ne pas modifier les documents Catalogue ou Réseau.
• Ne pas présumer d’un comportement non observé : les éléments à confirmer sont explicitement classés comme tests.

---

---

PO — PROJ-UX-07 — Rendre le plan opérationnel pilotable
Nature : UX / amélioration fonctionnelle
Priorité : P1
Section historique : Plan opérationnel
PROBLÈME PRÉCIS
• Les colonnes « Focus », « Ensuite », « Pendant ce temps » et « À anticiper » ne suffisent pas à comprendre l’état réel, les dépendances, le pilote, l’exécutant et les échéances. Le plan doit pouvoir être ajusté et lancer les workflows avec confirmation.
PARCOURS DE REPRODUCTION
• Valider le Brief puis ouvrir le plan.
• Comparer les colonnes à l’avancement réel.
• Chercher étapes terminées/en cours/restantes, dépendances, pilote, exécutant et échéance.
• Ajouter ou modifier une étape.
• Tester avec DG et chef de projet.
• Lancer Master, Juridique, Marketing et Distribution.
CONSTATS FACTUELS
• Lisibilité et adaptation au réel insuffisantes.
• Les erreurs de cadrage peuvent se propager.
• Les permissions doivent différer selon le rôle.
• Le lancement des workflows nécessite une confirmation.
MODIFICATION DEMANDÉE
• Afficher statut, pilote, exécutant, échéance, dépendances et prérequis par étape.
• Permettre ajout/modification/réordonnancement avec historique.
• Adapter les colonnes au statut réel et signaler les incohérences.
• Afficher une revue avant activation des workflows.
• Tracer qui a confirmé le lancement.
COMPORTEMENT ATTENDU ET RÈGLES MÉTIER
• Pilote et exécutant peuvent être différents.
• Une étape bloquée identifie la dépendance.
• Une échéance de cadrage alimente le bon workflow.
• Une erreur amont marque l’étape dérivée comme à revoir.
• La DG et le chef de projet n’ont que les actions autorisées.
CRITÈRES D’ACCEPTATION
• Étapes terminées, en cours, suivantes et bloquées sont évidentes.
• Les dépendances sont navigables.
• Une étape peut être ajoutée/modifiée sans perdre l’historique.
• Le lancement demande confirmation et liste les workflows activés.
• Les permissions des deux comptes sont testées.HORS PÉRIMÈTRE / GARDE-FOUS
• Ne pas créer de fausse action dans PO.
• Ne pas modifier les documents Catalogue ou Réseau.
• Ne pas présumer d’un comportement non observé : les éléments à confirmer sont explicitement classés comme tests.

---

# Lot 7 — BUG-05

### PROJ-BUG-05 — Bloquer une V2 inchangée et réparer l'export PDF

**Priorité :** P0 pour l'export PDF ; P1 pour le contrôle de version.

Les tickets établissent deux bugs avérés : une V2 inchangée a pu être renvoyée puis validée, et l'export PDF a échoué. Ces constats ne doivent pas être traités comme de simples hypothèses.

### Objectif
Empêcher les nouvelles versions sans modification pertinente ni dérogation tracée, empêcher une validation qui ignore les demandes obligatoires ouvertes et réparer l'export PDF.

### A. Contrôle des versions
1. Tracer le parcours existant entre soumission V1, commentaires de la direction, demande de modification, génération V2, renvoi et validation finale.
2. Comparer le contenu de la nouvelle version à la dernière version soumise, en tenant compte des modifications réellement pertinentes.
3. Bloquer le renvoi d'une version identique lorsqu'aucune modification pertinente n'a été détectée, sauf dérogation explicite et tracée.
4. Afficher un comparatif V1/V2 indiquant les changements réels.
5. Lier les commentaires à leur version et à un statut : ouvert, résolu ou rejeté. Une résolution ou un rejet doit être explicite et conserver son motif.
6. Avant validation finale, présenter les demandes non résolues. Bloquer la validation si une demande obligatoire reste ouverte, sauf décision motivée lorsque le métier autorise cette dérogation.
7. Conserver l'historique et les commentaires existants.

### B. Export PDF
1. Reproduire l'échec actuel depuis le bouton « Export PDF » du Brief.
2. Identifier la cause réelle dans le chemin de génération, les données transmises, le rendu, le stockage ou le téléchargement. Ne pas remplacer le mécanisme sans avoir localisé le défaut.
3. Corriger la génération afin de produire un PDF lisible et complet correspondant exactement à la version consultée.
4. Afficher un état de génération explicite, puis permettre le téléchargement lorsque le fichier est réellement disponible.
5. En cas d'échec, journaliser une erreur exploitable et afficher un message explicite. Ne pas créer de fichier vide et ne jamais afficher un faux succès.

### Tests d'acceptation
- Une V2 identique est bloquée ou fait l'objet d'une dérogation explicite et tracée.
- Le comparatif des versions montre les changements réels.
- Le valideur voit les demandes non résolues avant de décider.
- L'export produit un PDF lisible, complet et conforme à la version consultée.
- Les erreurs de génération et de téléchargement sont identifiables.

### Garde-fous
Ne supprime pas les anciennes versions et ne contourne pas les permissions de validation. Distingue la réussite de la génération de celle du téléchargement. Priorise le correctif P0 de l'export, puis le contrôle de version P1.

---

---

# Lot 8 — BUG-08

### PROJ-BUG-08 — Synchroniser retours Mixage et validation côté ingénieur

**Priorité :** P0 en cas de désynchronisation, sinon P1.

### Objectif
Créer un flux cohérent de retours et de versions entre le chef de projet et l'ingénieur, sans doublons ni divergence de statut.

### Travail demandé
1. Identifier les deux mécanismes actuels : l'espace de retours dédié et le bouton « Demander une modification ».
2. Les unifier dans un flux logique unique. Un commentaire saisi une fois ne doit apparaître qu'une fois, même si plusieurs actions de l'interface permettent de le créer.
3. Synchroniser l'affichage des nouveaux retours côté ingénieur sans rechargement manuel. Réutiliser le mécanisme temps réel existant ou mettre en place un polling visible si nécessaire.
4. Associer chaque retour à une version précise, à son auteur, à son statut et, lorsque disponible, à un timecode.
5. Conserver V1, V2 et les versions suivantes dans l'historique. Les fichiers doivent rester téléchargeables selon les permissions.
6. Après validation du mix, afficher à l'ingénieur une confirmation claire avec la date, l'auteur et l'étape suivante.
7. Maintenir une distinction explicite entre validation du Mix et validation du Master. L'une ne doit pas valider automatiquement l'autre.
8. Contrôler le type et le nom des fichiers déposés et refuser les fichiers non conformes avec un message précis.

### Tests d'acceptation
- Un retour créé par le chef de projet apparaît côté ingénieur sans rafraîchissement manuel.
- Une demande de modification ne duplique pas le retour initial.
- La validation est visible côté ingénieur avec date et auteur.
- Les versions antérieures restent consultables et téléchargeables selon les permissions.
- Les fichiers non conformes sont refusés avec une erreur compréhensible.
- Les statuts internes et externes sont cohérents.

### Garde-fous
Ne confonds pas synchronisation des retours et validation métier. Ne supprime aucun historique. Vérifie l'idempotence des opérations pour empêcher les doublons lors des répétitions de requêtes.

---

---

# Lot 9 — UX-08 + UX-09

PO — PROJ-UX-08 — Clarifier et sécuriser le Brief Mix/Master
Nature : UX / amélioration fonctionnelle
Priorité : P1
Section historique : Master — Brief
PROBLÈME PRÉCIS
• Le Brief Mix/Master est difficile à repérer et son objectif n’est pas expliqué. Les instructions artistiques, conditions de prestation et livrables sont mélangés ; l’enregistrement manque de confirmation et reste possible sans modification.
PARCOURS DE REPRODUCTION
• Depuis Master, chercher le Brief Mix/Master.
• Ouvrir et renseigner les sections.
• Enregistrer puis observer le retour d’état.
• Sans modifier, essayer d’enregistrer à nouveau.
• Poursuivre vers la sélection de l’ingénieur et la transmission.
CONSTATS FACTUELS
• Brief peu identifiable.
• Objectif insuffisamment expliqué.
• Confirmation après enregistrement insuffisante.
• Bouton d’enregistrement actif sans changement.
• Le guidage vers la transmission doit être amélioré.
MODIFICATION DEMANDÉE
• Rendre le Brief visible comme étape nommée avec description du résultat attendu.
• Séparer « Direction artistique », « Conditions de prestation », « Livrables et formats », « Dates » et « Message ».
• Afficher sauvegarde réussie et dernière mise à jour.
• Désactiver « Enregistrer » sans modification.
• Proposer l’étape suivante après sauvegarde.
COMPORTEMENT ATTENDU ET RÈGLES MÉTIER
• Aucune sauvegarde fantôme.
• Les champs obligatoires sont visibles avant soumission.
• Les dates sont structurées et réutilisées dans le dossier externe.
• Le Brief reste éditable jusqu’à transmission selon permissions.
CRITÈRES D’ACCEPTATION
• Le Brief est trouvable depuis la vue Master.
• Sections non ambiguës.
• Après sauvegarde, confirmation visible et bouton inactif jusqu’à changement.
• Les données réapparaissent dans le dossier transmis.
• L’utilisateur sait comment continuer.HORS PÉRIMÈTRE / GARDE-FOUS
• Ne pas créer de fausse action dans PO.
• Ne pas modifier les documents Catalogue ou Réseau.
• Ne pas présumer d’un comportement non observé : les éléments à confirmer sont explicitement classés comme tests.

---

---

PO — PROJ-UX-09 — Sécuriser transmission, lien privé et accusé de réception
Nature : UX / amélioration fonctionnelle
Priorité : P1
Section historique : Mixage — transmission
PROBLÈME PRÉCIS
• Avant transmission, PO doit confirmer la complétude du dossier, expliquer le lien privé et distinguer les états « lien créé », « ouvert », « prise en charge » et « version livrée ». Le lien doit pouvoir être copié/renvoyé et son expiration gérée.
PARCOURS DE REPRODUCTION
• Préparer le dossier Mix avec et sans stems.
• Transmettre à l’ingénieur et créer le lien privé.
• Copier puis renvoyer le lien depuis Mixage.
• Ouvrir le lien côté ingénieur et confirmer ou non la prise en charge.
• Laisser expirer/révoquer le lien puis consulter l’historique.
CONSTATS FACTUELS
• Les stems manquants doivent être signalés avant envoi.
• L’accusé de réception peut être oublié.
• Les statuts du lien et de la prestation sont confondus.
• Historique, renvoi et expiration sont nécessaires.
MODIFICATION DEMANDÉE
• Ajouter une revue du dossier avant envoi.
• Expliquer destinataire, portée et durée du lien.
• Afficher timeline : créé, envoyé, ouvert, prise en charge confirmée, fichier reçu.
• Ajouter copier, renvoyer, révoquer et renouveler.
• Historiser chaque transmission.
COMPORTEMENT ATTENDU ET RÈGLES MÉTIER
• Un lien ouvert n’équivaut pas à une prise en charge.
• Un prérequis manquant bloque ou exige une dérogation tracée.
• Un lien renouvelé invalide l’ancien selon politique affichée.
• L’accusé de réception est une action explicite de l’ingénieur.
CRITÈRES D’ACCEPTATION
• Checklist avant transmission.
• Statuts séparés et horodatés.
• Copie/renvoi disponibles depuis Mixage.
• Expiration visible avant qu’elle ne surprenne.
• Historique complet par destinataire et version.HORS PÉRIMÈTRE / GARDE-FOUS
• Ne pas créer de fausse action dans PO.
• Ne pas modifier les documents Catalogue ou Réseau.
• Ne pas présumer d’un comportement non observé : les éléments à confirmer sont explicitement classés comme tests.

---

---

# Lot 10 — BUG-07 + BUG-09

### PROJ-BUG-07 + PROJ-BUG-09 — Sécuriser le dossier Mix et la transmission au prestataire

**Dépendance :** lot 5 pour les versions et statuts de validation.

### Objectif
Garantir que le bon dossier est transmis au bon prestataire, avec les dates pertinentes, les bonnes permissions et un fichier explicitement confirmé.

### A. Dates et contacts — PROJ-BUG-07
1. Tracer le chemin des dates entre le Brief Mix/Master et le dossier externe destiné à l'ingénieur.
2. Corriger le mapping et l'affichage pour que toutes les dates pertinentes du Brief soient visibles dans le dossier Mix.
3. Conserver la signification de chaque date : livraison souhaitée, échéance, sortie ou autre type effectivement défini par le métier. Ne pas fusionner des dates de nature différente.
4. Contrôler les incohérences d'échéances avant transmission et afficher une alerte explicite.
5. Aligner les contraintes de validation côté interface et côté serveur.
6. Afficher les champs obligatoires avant soumission et rattacher chaque erreur au champ concerné, sans effacer la saisie déjà effectuée.
7. Autoriser un nom professionnel comme identité d'affichage du contact. Ne demander nom et prénom civils que lorsque cela est réellement nécessaire selon les règles existantes.

### B. Continuité Mixage → Mastering — PROJ-BUG-09
1. Identifier comment sont créés les liens ou espaces d'échange avec le prestataire de mixage et celui de mastering.
2. Si la même personne assure les deux prestations, réutiliser le lien et conserver l'historique.
3. Si le prestataire change, créer un espace distinct avec les permissions appropriées. Le nouveau prestataire ne doit pas accéder aux échanges auxquels il n'est pas autorisé.
4. Remplacer « Message pour le mixeur » par « Message pour l'ingénieur mastering » ou un libellé réellement adapté à l'étape.
5. Distinguer sélection du fichier et transmission. Ajouter un sas de confirmation avec fichier sélectionné, métadonnées, possibilité d'écouter ou de prévisualiser, possibilité de remplacer, puis action explicite « Confirmer l'envoi ».
6. Garantir que le fichier envoyé est exactement celui confirmé par l'utilisateur.
7. Afficher les validations pertinentes côté prestataire, en distinguant celles du Mix et du Master.

### Tests d'acceptation
- Les dates du Brief apparaissent dans le dossier Mix avec leur signification et leurs valeurs exactes.
- Une date incohérente déclenche une alerte avant transmission.
- Les champs obligatoires sont visibles et les erreurs sont associées au bon champ.
- Un contact peut utiliser un nom professionnel comme libellé.
- Même prestataire : lien et historique continus.
- Prestataire différent : espace séparé et permissions correctes.
- Aucun libellé « mixeur » au stade Mastering.
- Le fichier ne part pas au simple dépôt ; la confirmation explicite est requise.
- Un accusé d'envoi confirme la transmission réelle.

### Garde-fous
Ne modifie pas les documents Catalogue ou Réseau. Ne réutilise pas un lien uniquement parce que deux profils ont le même nom : utilise l'identité stable du prestataire et les permissions existantes. Préserve la saisie en cas d'erreur.

---

---

# Lot 11 — BUG-06 + BUG-10

### PROJ-BUG-06 + PROJ-BUG-10 — Adapter Master à la source réelle et rendre le master final accessible

**Priorité :** P0 pour l'accès au master final ; P1 pour l'adaptation du workflow Master.

### Objectif
Assurer la continuité de l'audio depuis la source réellement disponible jusqu'au master final, au Catalogue et à Distribution, sans ressaisie injustifiée ni duplication de fichier.

### A. Diagnostic initial de Master — PROJ-BUG-06
1. Examiner le démarrage du workflow Master et identifier les données disponibles dans le projet et Catalogue.
2. Ajouter ou corriger le diagnostic initial pour identifier la source audio, l'état du mix, les stems, la version, les ingénieurs et les crédits.
3. Préremplir les métadonnées communes depuis Catalogue, avec confirmation, sans imposer une ressaisie injustifiée.
4. Distinguer explicitement « mix à faire », « mix en cours » et « mix terminé ».
5. Adapter ou sauter les étapes inutiles. Un mix final disponible doit pouvoir alimenter le mastering sans imposer un nouveau mixage.
6. Ne pas bloquer un workflow qui n'en a pas besoin au seul motif que des stems sont absents.
7. Signaler les divergences entre le projet et Catalogue, sans écraser silencieusement une valeur.
8. Conserver un identifiant commun pour la source audio et tracer la version utilisée jusqu'au master final.

### B. Conclusion Master et Distribution — PROJ-BUG-10
1. Examiner la fin du workflow Master, la validation finale et la manière dont le fichier est enregistré et rattaché au Catalogue.
2. Créer ou corriger la conclusion Master afin d'afficher le fichier final, sa version, son état de validation, son écoute et son téléchargement.
3. Rattacher le master final à l'entrée Catalogue et réutiliser la même référence de fichier dans Master et Distribution.
4. Dans Distribution, permettre d'écouter et de télécharger directement le master final sans demander un nouvel import.
5. Identifier les prérequis de Distribution, notamment l'ISRC, leur état et leur source.
6. Lorsqu'un prérequis manque, permettre d'ouvrir la bonne fiche pour le corriger, puis revenir automatiquement au même projet et à la même étape, en conservant le contexte de navigation.
7. Respecter les permissions de lecture et de téléchargement.
8. Distinguer clairement la validation du mix de celle du master. La fin du workflow doit confirmer le rattachement au Catalogue et indiquer la prochaine étape.

### Tests d'acceptation
- Les parcours « mix à faire », « mix en cours » et « mix terminé » sont adaptés à la situation réelle.
- La source audio et sa version sont confirmées et traçables.
- Des stems absents ne bloquent pas inutilement un workflow qui n'en a pas besoin.
- Les métadonnées communes proviennent de Catalogue et les divergences sont signalées.
- Le master final est écoutable et téléchargeable depuis Master et Distribution.
- Catalogue, Master et Distribution utilisent la même référence du fichier.
- Aucun nouvel import n'est demandé pour accéder au même master final.
- Après correction d'un ISRC manquant, l'utilisateur revient au même projet et à la même étape.
- Les validations Mix et Master restent distinctes.

### Garde-fous
Ne crée pas de copie indépendante du master final pour chaque module. Ne modifie pas les documents Catalogue ou Réseau. Réutilise les références, permissions et mécanismes de stockage existants si possible. Ne déclare pas le workflow terminé tant que le rattachement au Catalogue n'est pas effectivement confirmé.

---

---

# UX-01 (hors index)

PO — PROJ-UX-01 — Piloter la liste des projets, recherche et statuts
Nature : UX / amélioration fonctionnelle
Priorité : P1
Retours historiques : 01, 02, 03, 04
PROBLÈME PRÉCIS
• La page Projets reste lisible avec peu de lignes, mais ne permet pas de piloter 30 à 50 projets : le responsable et l’échéance ne sont pas visibles, aucune recherche ni filtre n’est disponible, un brouillon apparaît avec les actifs alors que le compteur « Actifs (1) » semble l’exclure, et la colonne « Où en est le projet » mélange état administratif et phase opérationnelle.
PARCOURS DE REPRODUCTION
• Ouvrir la page Projets.
• Observer les lignes « Projet sans titre — — — Musical — Brouillon » et « Sauvée — dioo — Musical · Single — Transmis, à accepter ».
• Comparer les deux lignes visibles au compteur « Actifs (1) ».
• Chercher une barre de recherche, des filtres, le responsable et l’échéance.
• Comparer le statut administratif à la phase opérationnelle du projet.
CONSTATS FACTUELS
• Colonnes observées : « Titre », « Artiste », « Type », « Où en est le projet ».
• Aucune barre de recherche ni filtre combinable observé.
• Le nom d’Alizée, responsable du projet « Sauvée », n’apparaît pas dans la liste.
• Le compteur et le contenu de l’onglet donnent une lecture ambiguë des brouillons.
• La simplicité générale, les statuts visibles, la distinction Actifs / Archivés et le bouton « Nouveau projet » sont à conserver.
MODIFICATION DEMANDÉE
• Remplacer la structure par « Projet | Responsable | Type | Échéance | Statut », avec artiste en sous-ligne pour un projet musical.
• Ajouter le placeholder « Rechercher un projet, un artiste, un responsable... ».
• Ajouter des filtres combinables : Type, Responsable, Statut, Échéance.
• Proposer « Tous | Brouillons | Actifs | Archivés » avec compteurs exacts.
• Afficher séparément « Statut » et « Phase », avec des phases adaptées au type de projet.
COMPORTEMENT ATTENDU ET RÈGLES MÉTIER
• Tous exclut les archives ; Brouillons contient les projets non transmis ; Actifs contient les projets transmis, à accepter ou en cours ; Archivés contient les projets archivés.
• Un brouillon n’est pas compté comme actif.
• Les filtres se combinent et la recherche porte au minimum sur projet, artiste et responsable.
• La phase n’utilise pas le workflow musical pour un projet Contenu ou Événement.
• Une échéance inconnue s’affiche « Non définie ».
CRITÈRES D’ACCEPTATION
• Les compteurs correspondent exactement aux lignes affichées.
• Le cas « projets musicaux gérés par Alizée avec sortie dans les 30 jours » est filtrable.
• Le responsable et l’échéance sont visibles sans ouvrir le projet.
• Statut administratif et phase opérationnelle sont compréhensibles simultanément.
• Aucune régression sur Actifs / Archivés, types de projet et « Nouveau projet ».HORS PÉRIMÈTRE / GARDE-FOUS
• Ne pas créer de fausse action dans PO.
• Ne pas modifier les documents Catalogue ou Réseau.
• Ne pas présumer d’un comportement non observé : les éléments à confirmer sont explicitement classés comme tests.
