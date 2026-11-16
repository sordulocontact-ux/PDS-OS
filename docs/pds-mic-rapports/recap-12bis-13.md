# Lots 12 bis et 13 : passe dans Chrome

14/11/2026, application en local (base Supabase locale : données de démo, données des lots 6 à
13 sur « PDS MIC #5 »). Donnée ajoutée pour la passe
(`scratchpad/lot12bis-13-data.sql`) : la session studio de PDS MIC #5 enregistre aussi Lumière
(Iris Moon, contrat non signé).

Comptes, par « Voir comme » : Claire Morel (direction) et Lina Haddad (cheffe de projet). Grand
écran (1 477 px), 390 px (page dans un cadre de 390 px : la fenêtre de Chrome ne descend pas sous
500 px), thème sombre puis clair (classe `dark` posée dans le cadre).

## Écrans vérifiés

| Écran | Lot | Ce qui a été fait |
| --- | --- | --- |
| Production › Visuel Néons › Tournage (Lina) | 12 bis | Parcours : « Tournage », marqué bloqué, « À vous : faire signer les contrats avant le tournage » ; encart « Tournage bloqué : contrat non signé de Nadia Sel… ». |
| Travail (Lina) | 12 bis | « Faire signer les contrats avant le tournage » pour les deux livrables bloqués, plus de « Lancer le tournage ». |
| Participations et contrats (Claire) | 12 bis | Dérogation de tournage accordée à Nadia Sel ; libellés élidés (« Dérogations d'Iris Moon »). |
| Production › Visuel Néons › Tournage (Claire) | 12 bis | Débloqué : « Lina Haddad : lancer le tournage », plus de marque ni d'encart ; le Teaser du collectif reste bloqué (Iris Moon, Malo). |
| Master › Brief | 12 bis | Encart « Contrats de participation non signés » : tournage bloqué pour Iris Moon et Malo (Nadia Sel couverte par sa dérogation), sortie bloquée pour les trois ; lien vers « Participations et contrats ». |
| Session studio | 12 bis | Encart « Contrats de participation non signés · PDS MIC #5 » limité au titre que la session enregistre (Lumière, Iris Moon). |
| Historique du master | 12 bis | « Fichiers demandés à Nadia Benali (« Marina ») · le message », « Fichier demandé reçu : Marina - session.wav (« Marina ») · Nadia Benali · suite à : Fichiers demandés à Nadia Benali ». |
| Sorties (Claire) | 13 | Mode « Sorties individuelles puis compilation », 7 sorties de titres, la compilation et ses 7 titres, dates « À fixer », « Échéance du projet » pour la compilation, contrats manquants par sortie ; aucun geste (direction, projet d'une responsable). |
| Sorties (Lina) | 13 | « Modifier la date » de Marina (4 déc. 2026, les autres inchangées) ; « Modifier l'UPC » de Ballade du port (enregistré sur elle seule) ; mode « Sorties individuelles » (la compilation disparaît, « Compilation · Aucune »), « Compilation finale » (une seule sortie, ses titres), retour à « Sorties individuelles puis compilation » : les mêmes sorties reviennent, date et UPC gardés. |
| Distribution d'un projet classique (« Minuit pile ») | 13 | Inchangée : « Sortie Ven. 22/01/2027 », pas d'entrée « Sorties » ; « Modifier » l'UPC (sans sélection de sortie) enregistre, puis remis à vide. |
| 390 px | 12 bis, 13 | Sorties (sombre et clair), parcours de la Production bloqué (sombre et clair). |
| Thème clair | 12 bis, 13 | Sorties (grand écran et 390 px), parcours bloqué (390 px). |

## Défauts trouvés et corrigés

| Défaut | Lot | Correction |
| --- | --- | --- |
| À 390 px, la colonne « État » des sorties prenait la place du nom : « Sortie bloquée : contrat non signé de … » sur quatre lignes | 13 | Colonne masquée sous 640 px, l'état passe à côté du nom. |
| Le bouton d'en-tête « Mode de sortie » répétait le libellé du fait juste à côté | 13 | « Modifier le mode » (le lecteur d'écran lit « Modifier le mode de sortie »). |

## Ce que `/layers-surface` a changé

- **Vocabulaire / hiérarchie** : le bouton du mode dit l'action, le fait dit l'état.
- Relevé sans changement :
  - **Historique du master** : il nommait les titres par leur nom au Catalogue (« Velours »),
    alors que le Master et la demande disent « Ballade du port ». Tranché et corrigé ensuite
    (commit séparé), pour tout l'Historique d'un collectif : le titre est nommé comme le projet
    (`projectTitleLabel`), le nom au Catalogue en second seulement s'il diffère (« Ballade du
    port · Velours au Catalogue ») ; un projet simple garde le nom au Catalogue.
  - « Pas d'ISRC » sur chaque sortie : l'ISRC se donne au Catalogue, pas ici ; il reste dit en
    gris, sans geste.

## Ce qui n'a pas pu être vérifié

- **Un UPC refusé** dans la modale « UPC » : même contrôle que les Paramètres de distribution
  (`upcError`) ; l'UPC essayé était valide par hasard (clé de contrôle juste).
- **Le refus de changer de mode** (`compilation_submitted`, `single_released`) : aucune sortie
  livrée ni compilation soumise dans ces données ; couvert par `title-releases.test.sql`.
- **L'information avant « Prête pour tournage »** et **le lancement refusé en base** : les fiches
  de test sont déjà prêtes et la Production n'est pas en cours ; couverts par les tests SQL des
  lots 12 et 13.
- **La détection par UPC** (Deezer, iTunes) : pas d'appel réseau réel en local ; le choix de la
  clé (ISRC du titre, UPC de la compilation) est dans `releaseLookups`.
- Une erreur serveur `project_view_cache` (`cookies()` dans `after()`) sur plusieurs pages, déjà
  là avant ces lots (même famille que le test `project-view-cache` rouge).

## Tests après la passe

Aucune migration modifiée pendant la passe. `title-releases`, `participation-waivers`,
`legal-participations`, `master-file-requests` et les fichiers Distribution, collectifs et plan
passent ; `visible-project-ids` : seul le n° 24, déjà rouge. Typecheck, lint, prettier (fichiers
modifiés seulement) : propres.
