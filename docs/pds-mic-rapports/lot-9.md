# Lot 9 : Master, vue consolidée et titres abandonnés

Compte rendu du 13/11/2026. Vérification dans Chrome regroupée après le lot 10
(`recap-7-10.md`).

## Ce qui est fait

- **Vue consolidée en tête du Master d'un collectif**, sur chaque étape : quatre tuiles
  (patron `StatTiles`) « Attendent leur source », « Attendent un mix », « Attendent un
  mastering », « Attendent une validation », avec le nombre de titres et leurs noms dessous
  (les trois premiers, puis « et N autres »). Une tuile ouvre le premier de ses titres sur
  l'étape concernée (la validation : le Mixage ou le Mastering de la version en attente). Les
  titres abandonnés ne comptent pas.
- **Un titre abandonné sort des comptes « tous les titres »**, sans être délié (son master reste
  relié, ses versions et son historique sont gardés, la réactivation le ramène) :
  - **étape Master terminée et état du workflow** : le Master ne lit plus ses titres abandonnés
    (paquet envoyé à l'ingénieur compris) ;
  - **facture de l'ingénieur** (migration `20261113190101_abandoned_titles_counts`) : demandée
    quand chaque titre encore compté a son Master final ; **l'abandon du dernier titre en attente
    l'envoie** ;
  - **contrôles de Distribution** : contexte, parcours, clôture, paramètres et validation
    comptent les titres sans les abandonnés.
- Le sélecteur de titre du Master (lot 8) ne propose plus les titres abandonnés, et leur ligne
  dans « Titres et artistes » n'ouvre plus le Master.

## Ce qui n'est pas fait : « Demander des fichiers »

Je ne l'ai pas construit : le plan ne dit ni **à qui** on demande, ni **quoi**, et les deux
changent ce que voit l'utilisateur (règle d'arrêt). Rien d'autre du lot n'en dépend, ni le
lot 10. Voir les questions plus bas.

## Mes choix

- **Où les titres abandonnés sortent** : aux entrées du Master, de l'état des workflows et de la
  Distribution (`countedTitlesProject`), pas dans `getProject` lui-même : le formulaire
  d'édition d'un collectif renvoie la liste complète de ses titres, et `update_project` refuse
  qu'on en retire un (on l'abandonne) ; vider la liste à la source aurait cassé ce formulaire.
- **Le Juridique garde tous les titres** pour l'instant : il passe par participation au lot 11.
- **La détection « en ligne »** (ISRC du premier titre, `lib/release/isrc.ts`) n'est pas
  touchée : c'est le lot 13 (sorties par titre).
- **Les quatre états** sont déduits de l'état Master de chaque titre (même règle que « Titres et
  artistes ») et de sa source confirmée : sans source → source ; source sans version → mix ;
  version en attente → validation ; mix validé → mastering ; retour demandé → nouvelle version du
  même tour.

## Ce que le skill a fait changer

Pas de `/layers-interaction-flow` pour ce lot. `/layers-surface` passe après la vérification
dans Chrome (récapitulatif 7-10).

## Tests

- `supabase/tests/collective-master.test.sql` étendu (12) : le Master final de A seul ne demande
  pas la facture tant que B attend ; B abandonné, la facture de l'ingénieur part ; le master de
  B reste relié et sa version est gardée.
- `master-invoices`, `project-invoices` verts (la facture d'un projet simple ne change pas).
- Collectifs, deals, Master, Distribution, sorties : 44 fichiers verts. `plan-all-workflows`
  échoue sur la base locale **chargée des données de démo** (le test suspend les autres
  directeurs généraux, que la vitrine a créés sans motif) : sans rapport avec le lot, à
  reconfirmer sur base propre.
- Typecheck, lint (2 avertissements préexistants hors lot), prettier : propres.

## Ce qui reste à faire

- Vérification dans Chrome (après le lot 10).
- « Demander des fichiers », selon tes réponses.

## Questions pour toi

1. **« Demander des fichiers » : à qui ?**
   - (a) à **un membre de l'équipe** (directeur créatif, ingénieur interne, autre chef de
     projet) : notification et « À vous », il dépose sur chaque titre depuis l'app ; simple,
     faisable tout de suite ;
   - (b) à **un contact externe** (artiste, manager, producteur) : il faudrait un dépôt de
     fichiers sans compte sur sa page privée (portail des contacts, qui ne sait pas encore
     recevoir de fichier audio) ; plus gros, et c'est une surface ouverte sans compte.
2. **Quels fichiers ?** La source de chaque titre (sessions, voix, pistes), ou aussi des
   livrables de l'ingénieur (instrumental, pistes séparées) ?

Ma proposition, si tu valides (a) avec la source : une table de demandes avec **une ligne par
titre** (même demande pour plusieurs titres), qui se marque « reçue » toute seule quand un
fichier audio arrive sur ce titre ; bouton « Demander des fichiers » à côté des tuiles, la
tuile « Attendent leur source » disant « dont N demandés ».
