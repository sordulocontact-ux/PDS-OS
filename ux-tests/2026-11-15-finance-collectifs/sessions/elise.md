# Journal d'Élise Fabre (Finance / business)

Fenêtre : le redimensionnement a répondu « ok » mais la capture fait environ 808x821, donc j'ai travaillé dans une fenêtre plus étroite que prévu (à noter).

## Présentation

Je suis Élise, chargée business chez PDS depuis un an : factures clients, relances. J'ouvre l'app parce que j'ai du retard sur les factures et que je veux tout remettre à jour avant le point de lundi.

## Préparation

Adresse de départ : http://localhost:3000/app. La barre du bas affichait « Voir comme Malik Durand » ; j'ai choisi Élise Fabre dans la liste. Accueil : « Bonjour Élise, 2 actions vous attendent ».

## T1 — la partie argent

Je cherche dans le menu de gauche. Je clique sur « Finance » (pas « Dépenses », qui est juste au-dessus). Adresse : /app/finance. L'écran met environ 10 s à s'afficher complètement.
Ce que je comprends : « Vue d'ensemble », solde du compte 95 900 €, un graphique avec une courbe qui descend puis remonte, une réserve de 30 000 €, « À encaisser 37 700 € ». Un tableau de bord de la trésorerie. Un gros bouton noir « Entrée prévue » : je ne sais pas trop ce que c'est exactement (de l'argent qui doit rentrer ?). Le graphique saute aux yeux, mais je ne comprends pas tout de suite le trait plein / pointillé.
Réussi, note 6. Le plus pénible : le chargement long et le mot « Entrée prévue ».

## T2 — facture FA-2026-040 pour Renault Media

Je m'attends à un bouton « Nouvelle facture ». Il n'y en a pas : en haut, seulement « Entrée prévue ». Je vais dans « Factures & encaissements » (/app/finance/encaissements). Écran blanc avec des barres grises, ~10 s d'attente.
Dans la liste je vois « Synchro pub Renault, Prestation · Renault Media, 15/12/2026 », sans numéro de facture. Je clique sur la ligne : rien ne se passe. Le tableau est coupé à droite : je dois le faire défiler sur le côté pour voir l'état (Prévue) et un petit « ⋯ ». Détour.
Menu « ⋯ » : Enregistrer un encaissement / Noter une relance / Modifier / Annuler l'entrée. Rien qui dise « facture envoyée ». J'essaie « Modifier ». Un formulaire avec une zone « Facture » tout en bas (il faut défiler) : numéro, date d'émission, échéance, envoyée le, PDF.
Je tape FA-2026-040, date d'émission 15/11/2026 (le calendrier s'ouvre et recouvre le reste, je clique sur le 15 pour le fermer), « Envoyée le » 15/11/2026 aussi (même histoire). Je laisse l'échéance vide. Enregistrer.
Message « Entrée modifiée », la ligne passe en « Envoyée » avec FA-2026-040 ; les chiffres du haut changent (Prévu 0 €, À encaisser 37 700 €). Je pense avoir réussi. Note 4 : j'ai dû deviner que « Modifier » était le bon chemin, la ligne n'est pas cliquable, et le tableau est coupé.

## T3 — prélèvement de 1 080 € Studio Ingé Son

Je pense à « Rapprochement » (comme sur Qonto). Adresse /app/finance/rapprochement. Je vois directement « Studio Ingé Son, 11/11, Facture 4471, −1 080 € » avec une proposition et un bouton « Valider ». La proposition est tronquée (« Ingé s… Dépens… »), je ne vois pas exactement à quoi elle correspond, mais ça ressemble à la dépense du studio. Je valide. « Transaction rapprochée », le compteur passe à 8 080 € rapprochés ce mois. Rapide. Petit doute : je n'ai pas pu relire la proposition en entier avant de valider.
Réussi, note 6.

## T4 — solde dans 3 mois et moment le plus tendu

Je vais dans « Trésorerie » (/app/finance/tresorerie), ~8 s. En haut, avec 90 jours sélectionné : « Solde dans 90 jours 167 031 € », « Point bas 43 415 € le 20/11 », réserve 30 000 €. Réponse : dans trois mois environ 167 000 € sur le compte ; le moment le plus tendu est le 20 novembre, environ 43 400 €, qui reste au-dessus de la réserve de 30 000 €. Je suis sûre de moi. Note 6.

## Questionnaire

1:4, 2:2, 3:4, 4:2, 5:4, 6:2, 7:4, 8:2, 9:3, 10:2

## Fin

Raconté : j'ai ouvert Finance, trouvé la facture Renault, mis son numéro, rapproché le prélèvement du studio, lu le solde à 3 mois.
Agacée : les écrans qui chargent longtemps et le tableau coupé sur le côté avec le « ⋯ » caché ; pas de bouton « facture envoyée ».
Pas sûre : pour le rapprochement, je n'ai pas bien vu à quoi la proposition était rattachée ; et pour la facture, je ne savais pas si « Modifier » était le bon geste.
Pratique : la proposition toute prête avec « Valider » et le point bas dans la page Trésorerie.
Utiliserais : oui probablement, si c'est plus rapide à charger, parce que tout est au même endroit.
Un mot : prometteur.
