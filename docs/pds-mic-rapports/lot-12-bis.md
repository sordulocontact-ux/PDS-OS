# Lot 12 bis : trois trous bouchés

Compte rendu du 14/11/2026. Vérification dans Chrome regroupée après le lot 13
(`recap-12bis-13.md`). Pas de migration.

## Ce qui est fait

1. **Le parcours de la Production dit ce qui bloque le tournage.**
   - Pour un collectif, quand la fiche est prête pour le tournage et qu'une participation
     confirmée des titres visés n'a ni contrat signé ni dérogation de tournage ouverte, l'étape
     suivante n'est plus « Lancer le tournage » mais « Faire signer les contrats avant le
     tournage ».
   - Son explication nomme les contrats (« Tournage bloqué : contrat non signé de Nadia Sel
     (Néons nocturnes)… Faites-les signer, ou demandez à la direction une dérogation de
     tournage. ») et mène à « Participations et contrats ».
   - L'étape « Tournage » du parcours est marquée bloquée ; Travail et la carte de l'étape
     suivante disent la même chose (même calcul, `lib/production/next`).
   - Une production externe ne propose plus « Confirmer que le tournage a eu lieu » tant que le
     contrat bloque.
   - Une dérogation accordée, ou le contrat signé, et le parcours revient à « Lancer le
     tournage ».
2. **L'avertissement « contrat non signé », sans bloquer** :
   - **Brief du Master** d'un collectif : l'encart « Contrats de participation non signés »
     (même encart que la Vue d'ensemble), au-dessus du Brief ;
   - **page d'une session studio** qui concerne un collectif : un encart par projet collectif,
     nommé (« Contrats de participation non signés · PDS MIC #5 ») ; si la session nomme des
     titres de ce projet, seulement les leurs, sinon tous. La session reste modifiable et
     l'enregistrement continue.
3. **« Demander des fichiers » dans l'Historique du master**, sur le titre concerné (donc aussi
   dans « Déjà fait » de la Source de ce titre) :
   - « Fichiers demandés à Nadia Benali (« Marina ») · le message », par l'auteur ;
   - « Fichier demandé reçu : Marina - session.wav (« Marina ») », par la personne qui l'a
     déposé, suite à la demande ;
   - ou « Demande de fichiers à … annulée » / « … remplacée ».

## Mes choix

- **Ce qui est dit dans le Brief et les sessions** : les contrats que le tournage et la sortie
  refuseraient (même règle que les verrous), plutôt qu'une liste à part : un contrat couvert
  par une dérogation n'y apparaît plus pour le périmètre qu'elle couvre.
- **Sessions** : l'encart est sur la page de la session (vue depuis le menu ou depuis le
  projet), pas dans le formulaire « Nouvelle session ».
- **Historique** : lu depuis les lignes de la demande elle-même (aucun journal écrit à la main),
  comme le reste de l'Historique du master.

## Tests

- Pas de migration ni de fonction SQL nouvelles : les tests des lots 9 bis à 12 restent valables.
- Le calcul de l'étape suivante reçoit les contrats manquants par la même fonction que le
  verrou (`list_contract_gaps`).
- Typecheck, lint, prettier (sur les fichiers modifiés seulement) : propres.

## Ce qui reste à faire

- Vérification dans Chrome (après le lot 13).

## Questions pour toi

Aucune.
