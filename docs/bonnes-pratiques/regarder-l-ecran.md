# Regarder l'écran et le parcours à chaque modification

**Règle** : `docs/DESIGN.md` § 0.

## Le geste

À chaque modification d'interface, même petite :

1. Faire une capture de chaque état dans le navigateur :
   - avant, pendant et après le geste ;
   - vide ;
   - erreur.

   Si le serveur de Sacha est éteint, en lancer un soi-même.
2. Critiquer chaque capture comme si Sacha l'envoyait avec « c'est pas bon là ». Points à vérifier :
   - un élément qui contredit l'état de l'écran ;
   - du texte en trop ;
   - un alignement cassé ;
   - un défilement nécessaire pour atteindre l'action ;
   - un champ inutile dans ce cas précis.
3. Rejouer le parcours autour :
   - ce qui vient avant et ce qui vient après ;
   - le retour en arrière ;
   - les autres écrans qui utilisent le même composant.
4. Compter comme un échec tout résultat retombé sur la valeur par défaut.
5. Dire en tête du bilan ce qui n'a pas pu être vu.

## Pourquoi

Le 26/11/2026, « Nouveau contrat » a été livré avec un build qui passait et une logique testée, mais
sans avoir regardé l'écran après le dépôt du fichier. Sacha a envoyé la capture : cinq défauts sont
apparus en une minute. Ils étaient tous visibles avant la livraison :

- la zone de dépôt revenait vide alors que le fichier était déposé ;
- la phrase sous le titre contredisait l'écran ;
- le titre venait du nom du fichier ;
- les dates étaient mal alignées ;
- le formulaire était trop long.

Ce qui avait manqué :

- le build et les tests ont été pris pour une preuve que l'écran était bon ;
- un formulaire existant a été réutilisé sans relire son rendu dans le nouveau parcours ;
- un cas de test retombé sur la valeur par défaut a été compté comme réussi ;
- le serveur éteint a fait remettre la vérification à plus tard, signalée en fin de bilan.

Sacha : « tu as tout bon, pourquoi tu ne l'as pas fait dès le début ? », puis : vérifier le design
et le parcours à chaque modification, pour voir si le reste est fluide, « c'est important ».

Retour d'origine : `retours-design.md`, entrée du 26/11/2026.
