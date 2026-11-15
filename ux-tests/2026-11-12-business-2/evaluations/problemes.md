# Problèmes du second passage (12/11/2026, build de production, après le commit 79b0c855)

Contexte : PDS OS, outil interne d'un label (3 à 5 personnes). Parcours testé : un projet collectif « PDS MIC » (plusieurs artistes invités sur des titres), la négociation (deal) avec un invité, sa validation par la direction, et le budget des artistes. Un deal d'invité doit être lié à sa participation au titre (une seule source pour son contrat).
Participants simulés : Claire (DG, aisance 2, prudente), Malik (business manager, pressé), Élise (business developer, exploratrice), Lina (cheffe de projet, clavier et lecteur d'écran seulement).

## Q1 — Un PDS MIC se crée sans ses invités, et le deal de l'invitée part sans lien avec sa participation, sans alerte

- Claire (T1 succès difficile, SEQ 4 ; premier essai abandonné) crée « PDS MIC 5 » : le formulaire ne propose aucun champ pour les artistes invités (ils viennent d'une sélection d'artistes, ou s'ajoutent ensuite titre par titre). Le projet est créé avec trois titres et aucun invité.
- Claire (T2 succès, SEQ 6) ouvre ensuite la négociation de Sélène Vega par « un projet ou un artiste » : le deal est créé, mais sans participation. Rien ne lui dit qu'elle devrait d'abord inviter l'artiste.
- Verbatim : « Aucun champ ne permet d'indiquer les artistes invités. »

## Q2 — Formulaire « Nouveau projet » : l'erreur s'affiche hors de l'écran

- Claire (deux sessions) clique « Créer le projet » en bas : le bouton tourne 3 s puis rien de visible ; l'erreur « il faut au moins un titre » est en haut de page.
- Verbatim : « Est-ce que c'est enregistré, là ? Il ne se passe rien. »

## Q3 — Créer une artiste « sans Deezer » a rempli le profil d'un autre artiste

- Claire, premier essai : dans « Nouvel artiste », « Créer sans Deezer » puis le nom « Kaya Mendès » a affiché le profil « Max Mendes », puis « Simple Minds » avec « Signé » coché. Elle abandonne, de peur d'enregistrer une mauvaise artiste. (Rien n'a été enregistré. Non reproduit par l'analyste.)
- Verbatim : « Max Mendes ? Ce n'est pas du tout Kaya Mendès. »

## Q4 — Au clavier, aucun bouton n'a de contour de focus visible

- Lina (lecteur d'écran et clavier) ne voit pas où est le focus sur « Enregistrer » / « Annuler » : elle valide le mauvais bouton, la fenêtre se ferme sans rien enregistrer ; au deuxième essai ses saisies sont perdues. Elle réussit au troisième essai (SEQ 3).
- Vérifié par l'analyste : les boutons de toute l'app n'avaient plus de contour de focus.

## Q5 — Après « Utiliser » (poste suggéré), le focus saute en haut de la fenêtre

- Lina : le bouton disparaît avec la suggestion, le focus repart en haut de la fenêtre de dépense.

## Q6 — La validation nomme la mauvaise personne

- Claire (T3, succès, SEQ 6) : « le texte parle d'Élise Fabre alors que c'est Malik qui a confirmé les chiffres » (le deal avait changé de mains après la proposition). Elle aurait aussi voulu une confirmation avant de valider.

## Q7 — Dans Dépenses, le nom de l'artiste ne mène nulle part

- Claire (T4, succès difficile, SEQ 4) clique le nom de Mona Lys puis une dépense : rien. Elle trouve le budget par le filtre artiste (la carte d'enveloppe s'affiche alors).
- Verbatim : « Ce n'est pas cliquable. Je vais peut-être devoir demander. »

## Q8 — La fiche d'un deal s'appelle « PDS OS » dans l'onglet

- Lina : le titre d'onglet ne dit pas quel deal est ouvert (vérifié).

## Q9 — Deux totaux qui ne s'accordent pas dans le budget d'un artiste

- Lina : la tuile « Dépensé » dit 47 478 € (dont 400 encore estimés, comptés à part) ; le tableau du bas dit 47 878 € (estimations comprises).
- Verbatim : « les chiffres ne s'accordent pas ».

## Q10 — Avant les termes, le bouton principal propose « Le call est prévu » alors que le call a eu lieu

- Malik (T2, succès difficile, SEQ 5) : il doit descendre aux termes ; une fois les termes confirmés, « Proposer l'accord de principe » vient en un geste.

## Q11 — Premiers affichages lents

- Ouverture de « Nouveau projet » : écran gris 3 à 4 s (Claire). Page Projets pour Élise : plus de 4 s pour afficher « Aucun projet pour l'instant ». Création du projet : 3 s. Aucun geste des deals ou des dépenses au-delà de 2 s. (Build de production local, machine chargée.)
