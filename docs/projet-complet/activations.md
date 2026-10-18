# Inventaire — zone « Activations » (proto ↔ app)

Dépôt lu : le worktree de la branche `feat/projet-complet`, lecture seule.
Sources proto : `docs/protos/src/mk.js` (l. 174-188 ACT_DEF/ACT_WHY, 679 AC0, 685 actStep, 885-893 `BODY_MK.ac0`,
938-1040 tronc commun, 1042-1141 Influence interne + portail créatrice, 1146-1319 agence, 1285-1487 RP, 1824-1868
page Activations, 1921-1946 preuve calculée), `mk-actions.js` l. 36-46, 105-106, 119-226, `mk-scen.js` (scénarios
`actstart`, `acts`, `agency`, `rpint`), `docs/protos/tests/marketing.cjs` l. 36-45 et 92-104 (cahier de recette).
Captures : `scratchpad/shots/marketing_{actstart,acts,agency,rpint}.png|.txt` + captures complémentaires prises pour ce
rapport dans `scratchpad/actrun/` (`rpint_rp` = RP interne ouverte, `acts_rp_agency` = RP en agence, `acts_clip`,
`acts_playlists`, `acts_filter_{mine,measure,done}`, `portal_lea` = page privée de Léa Moreau).
Tickets (Drive public, lus en txt, copies dans `scratchpad/act_tickets/{pilotage,influence,rp}.txt`).

App : `app/(app)/app/projects/[projectId]/activations/**`, `lib/activations/**` (≈ 5 000 lignes), `components/activations/**`
(≈ 9 000 lignes), `app/(public)/i/[token]/page.tsx`, migrations `20261011000101_marketing_activations.sql`,
`…000201_activation_sheets_messages.sql`, `…000301_influence.sql`, `…000401_activation_agency.sql`, `…000501_press.sql`,
`20261011300101_activation_statuses.sql`, et côté Stratégie `20261012101501_strategy_reserves_execution.sql`
(`strategy_execution_items`, création des activations au « plan d'exécution »). Textes : `lib/i18n/fr/activations.ts`,
`activation-work.ts`, `activation-influence.ts`, `activation-press.ts`, `activation-agency.ts`. Doc : `docs/ARCHITECTURE.md`
§ 8 duodecies (l. 4505-4628), `docs/MARKETING-METIER.md` l. 56-66, 85-100, 141-163.

## 0. Constat d'ensemble

Le **fond métier** de l'app est très proche du proto, souvent plus riche (trois axes, preuves avec contrôles, relevés,
fiches versionnées, accord express avec empreinte, agence lue en lecture seule avec aperçu, décision PDS séparée,
opportunités presse, retombées vérifiées). L'écart est surtout de **parcours et de design** :

| Proto (18/10, « j'ai rien compris ») | App aujourd'hui |
| --- | --- |
| Une seule page : liste à gauche (frise + phrase « À vous · … »), activation ouverte à droite | Page tableau (compteurs, filtres de type, 7 vues, `DataTable` 6 colonnes) + page par activation à **onglets** (Pilotage, Cadrage, Concepts, Collaborations/Cibles, Agence, Bilan) et sous-page par cible |
| « Maintenant » : **toutes** les actions de l'activation (les vôtres d'abord, puis « En attente de … »), avec le geste en place | Un panneau « Prochaine action » (une seule, modifiable, « Créer une tâche », « Sans objet ») ; les gestes sont dans des sections séparées (Identité, Statut, Preuves, Statistiques, Clôture) |
| Module (influence / presse / agence) **dans** la page, en cartes repliables | Module réparti sur 2 à 4 onglets et une sous-page par collaboration / média |
| Informations repliées (type, levier, responsable, échéance, preuve, statistiques) | Identité, blocages, dépendances, journal toujours dépliés |
| Leviers à transformer : **bandeau** repliable au-dessus, « Créer l'activation » (mode choisi sur la ligne) / « Plus tard » | Activations créées en bloc au « Confirmer le plan d'exécution » de la Stratégie, plus une section « À rattacher » + « Nouvelle activation » (modale) |
| La créatrice agit sur son lien privé : accord, **dépôt du contenu, déclaration de publication, facture** | `/i/<jeton>` : accord express seulement ; contenu, publication, facture saisis par l'équipe |
| Preuve d'une campagne **calculée** (« N publications vérifiées sur M créateurs engagés ») ; « Déclarer réalisée » refusé sans 1re publication / 1er message envoyé | Preuve = agrégat des preuves déclarées (dont celles des cibles) ; pas de condition de module pour « Réalisée déclarée » |

## 1. Écrans et étapes du proto, dans l'ordre du parcours

Personnages : Lina Haddad (cheffe de projet, `cp`, responsable des activations), Claire Morel (DG, `dg` = « direction »,
valide concepts, cadrage RP, dossier, messages, vérifie preuves / publications / retombées, bon à payer), Nadia Benali
(directrice créative, `da` = « creativeInt », valide le contenu des créateurs ; responsable de « Sortie du clip »),
Léa Moreau (créatrice, lien privé), agences Halo (influence) et Plume (RP) sans compte.

### 1.1 Bandeau « Leviers à préparer » (étape `ac0`, scénario `actstart`)
- Fil d'Ariane « Néons › Marketing › Activations › Leviers à préparer ». Au-dessus : la carte « À vous, ailleurs » (shell
  Marketing, hors zone).
- `<details class="levers">` ouvert si des leviers restent : titre « **6 leviers du Brief de sortie à transformer en
  activations** » (ou « 1 levier gardé pour plus tard », replié), sous-titre « Créez l'activation quand vous êtes prêt ;
  un levier peut attendre. »
- Une ligne par levier retenu (calculé par `planItems()` à la validation du Brief de sortie, `onStrategyValidated`) :
  titre (ACT_DEF : « Contenus sur les réseaux », « Influence · 12 créateurs », « Relations presse », « Pitching
  playlists », « Sortie du clip », « Showcase à Paris »), source « Contenu · levier Social organique · Brief de sortie V1
  › Dispositif ».
- Gestes (cheffe de projet seule, `can("project")`) : pour Influence et RP un select « Gestion interne / Agence externe » ;
  **« Créer l'activation »** (crée l'activation `status:"prep"`, sans responsable ni échéance, toast « … : activation
  créée ») ; **« Plus tard »** (toast « Reporté : vous pourrez la créer plus tard. »). Une ligne créée → pastille
  « Créée » + « Ouvrir » ; reportée → « Plus tard » + « Créer ». Autres rôles : pastille « À préparer ».
- Fait (étape `ac0` terminée) quand plus aucun levier n'est « proposé ». Acteur : « Créer ou reporter N activations ».
- Vide : « Les activations arrivent quand la Stratégie est validée : chaque levier retenu peut en devenir une. »

### 1.2 Page Activations : liste à gauche (`actPage`, scénarios `acts`, `agency`, `rpint`)
- Mise en page `layout` deux colonnes : `nav.spine.alist` « Activations » à gauche, `section.card` à droite.
- Filtres en pastilles avec compteurs : **« À moi »** (une action à la personne), **« En cours »** (ni clôturée ni annulée,
  filtre par défaut), **« À mesurer »** (phase 3), **« Terminées »** (clôturées + annulées). L'activation ouverte reste
  dans la liste même si elle sort du filtre.
- Une ligne par activation (`button.step.arow`, sélectionnée = fond, « à vous » = phrase en bleu) : titre ; « Influence ·
  Gestion interne · Lina Haddad · Sam. 12/12 » (type · mode · responsable ou « responsable à désigner » · échéance
  courte) ; **frise** 5 segments Préparer → Réaliser → Prouver → Mesurer → Clôturer (faits verts, courant bleu) + libellé
  de phase (« Mesurer », « Clôturée », « Annulée », « · suspendue ») ; **phrase** `actSentence` : « À vous · récupérer les
  statistiques · et 2 autres » / « Nadia Benali · fournir la preuve » / « Attend : Clip officiel livré » / « Annulée :
  motif » / « Clôturée · 48 200 vues ».
- Phase (`phaseOf`) : 0 tant que responsable / échéance manquent, statut prep ou bloquée par prérequis ; 1 = lancée ;
  2 = preuve à fournir / contestée / fournie non vérifiée ; 3 = statistiques à collecter ; 4 = à clôturer ; 5 = clôturée.
- Sélection par défaut : l'activation ouverte, sinon la première « à moi », sinon la première.

### 1.3 Activation ouverte, à droite (`actDetail` + `actBody`)
- En-tête : titre h2 + pastille éventuelle (« Suspendue », « Annulée », « Bloquée »), phrase « pourquoi » (ACT_WHY par
  type, ex. « Les créateurs publient ; chaque publication a sa preuve, ses vues et ses droits. »), **grande frise** avec
  les 5 libellés.
- Prérequis non atteint (« Sortie du clip » attend la livraison du clip, `gate`) : callout cadenas « Elle commence quand
  le Clip officiel est livré. » et rien d'autre.
- Si annulée : callout « Annulée par … le … : « motif ». Elle reste dans le bilan, avec ce motif. »
- Si `prep` : note « Pour lancer : il manque un responsable et une échéance. » / « prête : responsable, échéance, rien de
  bloquant. »
- **Encadré « Maintenant »** (`nowbox`) : le geste de la personne si c'est son tour (formulaire en place), puis les
  lignes des autres actions (`actorsOf` : action du tronc commun + une par collaboration + agence + presse), « À vous ·
  … · plus bas » pour les siennes ailleurs dans la page, « En attente de Claire Morel : vérifier la preuve » pour les
  autres (avatar). Pied : « Prochaine action · Lina Haddad : » **« Créer une tâche »** (ou « tâche créée dans Travail »)
  et **« Sans objet »** (pour preuve et statistiques : formulaire « Pourquoi « fournir la preuve » est sans objet * »,
  « Marquer sans objet »). Rien à faire : « Rien à faire de votre côté pour l'instant. »
- Tronc commun, une étape à la fois (`actNext`), geste et effet :
  1. « Désigner un responsable » : select membres (« Lina Haddad · Cheffe de projet » présélectionnée) → « Désigner ».
  2. « Fixer l'échéance » : date préremplie au jour J±n du calendrier (« Proposée : J+7 dans le calendrier de lancement,
     Sam. 12/12/2026 ») → « Fixer l'échéance ».
  3. « Lancer l'activation » → statut En cours.
  4. « Déclarer l'activation réalisée » : note « Réalisée déclarée ne signifie ni publiée, ni vérifiée, ni mesurée. »,
     « Déclarer réalisée ». **Refus** : influence interne sans publication (« Aucun créateur n'a encore publié : la
     campagne n'est pas réalisée. » / « Engagez au moins un créateur… »), presse interne sans message envoyé.
  5. « Fournir la preuve » (activation simple ou agence) : « Lien de la preuve * » (https), case « Preuve indisponible
     (story expirée, publication retirée…) » + « Motif si indisponible » → « Enregistrer la preuve ».
  6. « Vérifier la preuve » (direction) : lien, « fournie par … le … », Commentaire (obligatoire pour contester) →
     « Vérifier la preuve » / « Contester » (→ « Fournir une autre preuve »).
     Influence / presse en interne : pas de lien unique — encadré « Preuves » calculé (« 1 publication vérifiée sur
     2 créateurs engagés », liste de ce qui manque, « La preuve de l'activation en découle : aucun lien unique pour
     toute la campagne. »).
  7. « Récupérer les statistiques » : « Nouveau relevé » — « Vues * » (unité du type), « Plateforme » (TikTok, Instagram,
     YouTube, Spotify, Deezer, Presse, Autre), « Période * », « Source » (Déclaré en interne / par le créateur / par
     l'agence / Relevé sur la plateforme), cases « Relevé partiel… », « Donnée indisponible : la plateforme ne la fournit
     pas » → « Enregistrer le relevé ». Liste « Relevés de statistiques » (chacun daté, source, saisi par, « Vérifier »
     pour la direction ; « Les relevés ne s'additionnent pas »). Après réalisation : « Ajouter un relevé ».
  8. « Clôturer l'activation ».
- Puis le **module** (§ 1.4 à 1.8), puis `<details class="infos">` **« Informations »** repliées : Type (· mode), Levier
  (« · Brief de sortie V1 › Dispositif »), Responsable, Échéance, Preuve (pastille PRSTATE), Statistiques (pastille).
- Pied à droite : **« Suspendre »** et **« Annuler l'activation »** → modale (`reasonModal`) « Suspendre / Annuler
  <titre> », phrase d'effet (« Elle s'arrête sans être perdue : elle reprend là où elle en était. » / « L'activation reste
  dans le tableau et dans le bilan, avec ce motif. Ses preuves et ses relevés sont gardés. »), « Motif * » → bouton
  d'action / « Retour ». Suspendue : geste « Reprendre l'activation » (retour au statut d'avant).
- Statuts affichés (OSTATE) : À préparer, Prête (calculée : responsable + échéance), En cours, Réalisée déclarée,
  Clôturée, Suspendue, Annulée, Bloquée (calculée). Preuve : Non attendue, À fournir, Fournie non vérifiée, Vérifiée,
  Contestée, Indisponible. Statistiques : Non attendues, À collecter, Disponibles déclarées, Partielles, Disponibles
  vérifiées, Indisponibles.

### 1.4 Influence — gestion interne (`influenceSection`, `collabCard`)
- Bloc « Campagne d'influence · gestion interne » + « Choisir des créateurs » (responsable ou chef de projet).
- Faits : « Concept de campagne » (texte · « Brief de sortie V1 › Narratif », lu, pas validé à part) ; « Créateurs » :
  « 3 · 1 publiés et vérifiés · 1 sortis ».
- Choisir : panneau « Réseau › Influenceurs » — nom, @, pastille d'alerte (« Déjà collaboré », « Déjà contacté », « Donnée
  ancienne »), « TikTok · 328 000 abonnés · relevé le 02/10/2026 · historique » ; « Ajouter » (ou « Déjà dans la
  campagne ») ; « Les résultats passés ne garantissent aucun résultat futur. » ; « Fermer ». Doublon → toast « Déjà dans
  la campagne : la fiche existante est ouverte. »
- Une **carte repliable par créateur** (`versionCard`, ouverte si une action vous attend) : « Léa Moreau · @leamoreau »,
  pastille d'étape (15 étapes : Candidate, Concept à valider, Validée en interne, Négociation, Accord à obtenir,
  Accordée, En validation, Prête à publier, Publiée déclarée, Publiée vérifiée, Administration, Clôturée, Refusée,
  Sans réponse, Abandonnée), plateforme à droite. Corps : audience datée + historique ; Concept (« validé par … ») ;
  Négociation (historique des positions PDS / créatrice) ; Accord express (lien `https://pds-os.app/i/<jeton>` +
  « Copier le lien », droits organiques et publicitaires séparés, « Jamais déduits des droits organiques ») ; Contenus
  (versions, retours horodatés) ; Publication ; Paiement administratif (« aucun virement par PDS OS ») ; journal.
- Gestes par étape (`collabNext`) :
  - Candidate → responsable : « Concept pour Léa » (Angle *, Format, Message clé, préremplis ; « Décliné du concept de
    campagne ; il ne change pas celui des autres créateurs. ») → « Soumettre à Claire Morel ».
  - Concept à valider → direction : Commentaire → « Valider le concept » / « Demander des corrections ».
  - Validée → responsable : « Brief et proposition » — Rémunération proposée *, Livrables, Droits organiques, Droits
    publicitaires (Non demandés / Spark Ads 30 j inclus / +200 € HT), Message prérempli (« PDS OS ne l'envoie pas :
    copiez-le, puis indiquez qu'il est parti. »), Canal (E-mail / Message TikTok / WhatsApp) → « Marquer le brief comme
    envoyé » / « Copier le message ».
  - Négociation → responsable : « Accepter 950 € » (si contre-proposition), « Faire une nouvelle proposition » (Montant *,
    Droits pub → « Envoyer la proposition »), « Sans réponse » ; **simulation** « Proto : la créatrice répond ».
  - Accepter → crée le lien d'accord (étape Accord à obtenir) ; créatrice : « Donner son accord » (lien privé).
  - Accordée → créatrice : « Déposer le contenu » (lien privé).
  - En validation → **directrice créative** : « Votre décision sur la V1 » — Timecode, Catégorie (Montage, Audio,
    Sous-titres, Mentions, Autre), Retour (obligatoire pour corrections) → « Valider la V1 » / « Demander des
    corrections » (retour à Accordée).
  - Prête → créatrice : « Déclarer la publication ».
  - Publiée déclarée → direction : « Vérifier la publication ».
  - Publiée vérifiée → responsable : « Demander la facture » → Administration / Pièce attendue → créatrice : « Déposer
    la facture » → direction : « Valider le bon à payer » (refus sans accord accepté ; « le bon à payer ne déclenche aucun
    virement ») → responsable : « Déclarer le paiement » → direction : « Vérifier le paiement » → responsable :
    « Clôturer la collaboration ».
  - Pour une action de la créatrice, côté PDS : « En attente de Léa Moreau (lien privé) : déposer la facture » ;
    **simulation** « Proto : Léa Moreau déposer la facture » (pour un créateur sans lien réel).

### 1.5 Page privée de la créatrice (`creatorPortal`, rôle `lea`, réunie par `host.js portalPage`)
- Bandeau « PDS « Néons » · Léa Moreau · Lien privé · sans compte », « Néons · Mona Lys · single · Créatrice TikTok »,
  « Ce que PDS attend de vous » › Marketing, puis une carte par collaboration selon l'étape :
  - Accord : « Votre accord » — « Version des conditions du … Ce n'est pas une signature électronique : c'est votre accord
    sur ces conditions, horodaté. », faits (Ce qu'on vous demande, Rémunération, Droits organiques, Droits publicitaires,
    Concept) → **« Bon pour accord »** (gros bouton) / « Demander une modification » (« Ce que vous voulez changer * » →
    « Envoyer la demande », retour en négociation).
  - Accordée : « Déposer votre contenu » (retours de la version précédente, « Lien de la vidéo (non publiée) * » →
    « Envoyer la V2 »).
  - Prête : « Votre publication » (« Contenu validé : vous pouvez publier. », « Lien de la publication * » → « Déclarer
    la publication »).
  - Administration / pièce attendue : « Votre facture » (« Nom du fichier * » → « Envoyer la facture »).
  - Sinon : nom de l'étape + « Rien à faire pour vous pour l'instant. »
- Confirmation (`crAfter`) : seulement la suite de sa collaboration (« Ensuite : Claire Morel · valider le bon à payer.
  Vous serez prévenue ici. »). Carte « Votre contact chez PDS · Lina Haddad · Cheffe de projet ».

### 1.6 Agence externe — influence et RP sur un même moteur (`agencySection`, scénario `agency`)
- Bloc « Campagne d'influence · agence externe » (« Agence Halo · Jeanne Roussel ») / « Relations presse · agence
  externe » (Agence Plume).
- Étape 1 : « Lien du Google Sheets de l'agence * » (« PDS OS lit le tableau, il n'y écrit jamais. L'agence le partage en
  lecture avec le lien. ») → « Relier le tableau » (refus si pas `docs.google.com/spreadsheets`) ; « Utiliser un lien
  d'exemple » (proto).
- Étape 2 : « Correspondance des colonnes » — une ligne par colonne (« Nom · colonne A · ex. : Jade Cormier »), select du
  champ PDS (préproposé `cfg.auto`) ; refus sans colonne clé (« Associez une colonne à « Compte » : c'est elle qui
  reconnaît chaque ligne… ») ou deux colonnes vers le même champ → « Confirmer la correspondance ».
- Ensuite : faits « Tableau » (lien · lu seulement · relié par … · « Modifier la correspondance »), « Dernière
  actualisation » (« Instantané n° 1 · Lina Haddad, 16/11, 10:05 · 6 ajouts, 0 modification, 0 retrait, 2 erreurs »),
  « Décisions PDS » (« 1 à examiner · 2 validés · 1 refusé… »), « Récapitulatifs envoyés ».
- **« Actualiser »** → aperçu « Ce que l'actualisation va changer » : N nouvelles lignes, N modifications (« Tarif HT :
  700 € → 850 € »), N lignes retirées (« gardé dans PDS OS avec sa décision, marqué retiré »), N lignes à corriger chez
  l'agence (« La valeur fausse est laissée vide ; le reste de la ligne est importé. ») → « Importer ces changements » /
  « Annuler » (« Rien n'a été importé. ») ; sans changement : « Aucun changement depuis l'instantané n° N. ».
  Simulation : « Proto : Agence Halo met à jour son tableau ».
- Galerie de cartes (`agcard`, avatar à initiales) : nom, @/clé, faits (« TikTok · 412 000 abonnés · Lifestyle · 1 200 €
  HT » ; RP : « Camille Roy · Chronique · Focus sur le titre · priorité haute · pour le 27/11 »), lien de publication +
  « vues selon l'agence », « Statut agence » / « Décision PDS » (pastille + auteur, date), « Note de l'agence », « Note
  interne », alertes (« Abonnés : « #REF! » n'est pas un nombre (erreur de formule dans le tableau) · à corriger dans le
  tableau de l'agence », « Catégorie « Food ? » inconnue : reprise telle quelle », « Doublon : même média que la ligne 2,
  à rapprocher », « Modifié par l'agence après votre décision : … », « Retiré du tableau par l'agence le … », RP : « L'agence
  indique « Contacté » alors que PDS n'a pas encore décidé »). Geste : « Décider » / « Changer la décision » → select
  Décision PDS (influence : À examiner, Validé, Refusé, À discuter, En attente d'information ; RP : À examiner, Validé,
  Refusé, À corriger) + « Note interne » (« Jamais envoyée à l'agence », obligatoire pour discuter / info / corriger) →
  « Enregistrer ».
- « Récapitulatif pour Agence Halo » (dès qu'une décision est postérieure au dernier envoi) : message écrit par le code
  (« Bonjour Jeanne, Voici nos retours… Validés : … Refusés : … »), « Écrit à partir de vos décisions, sans les notes
  internes. PDS OS ne l'envoie pas… » → **« Marquer comme envoyé »** / « Copier le message ».
- « Bilan selon l'agence » : tuiles (influence : Profils proposés, Validés par PDS, Publiés selon l'agence, Vues
  déclarées, Coût des validés ; RP : Actions proposées, Validées par PDS, Retombées déclarées, Preuves fournies, Preuves
  manquantes), « Données de l'agence, non vérifiées par PDS · instantané n° 1. », « Reprendre les vues dans les
  statistiques » (relevé partiel « Déclaré par Agence Halo (instantané n° N) »).
- RP seulement : « Bilan de l'agence » — réserves relevées par le code (« … : action déclarée sans preuve », « « Contacté »
  sans décision PDS », « aucune audience ni date de diffusion fournie ») ou « Aucune réserve relevée. » ; Commentaire →
  « Valider provisoirement avec réserves » / « Demander des compléments » (commentaire obligatoire) / « Archiver comme
  reçu » ; ensuite « Décision : … · par, le ».
- Prochaines actions agence (`agNext`) : Relier le tableau de …, Confirmer la correspondance des colonnes, Vérifier
  l'actualisation avant de l'importer, Actualiser le tableau de l'agence, Décider sur N profils/médias, Envoyer le
  récapitulatif à ….

### 1.7 Relations presse — commun aux deux modes (`rpCadrage`, `rpKit`)
- Carte « **Cadrage RP** » (pastille Brouillon / À valider / Validé / Corrections demandées, « Commun aux deux modes ») :
  Objectifs, Public, Message principal, Angles, Porte-parole, Calendrier, Restrictions (« · non bloquant »), Interlocuteur
  presse — chacun « Repris de Brief de sortie V1 › … » ou « Modifié par … », « Modifier » / « Compléter » en place
  (textarea → « Enregistrer »). « Soumettre à Claire Morel » (refus « Il manque : … ») ; direction : Commentaire →
  « Valider le cadrage » / « Demander des corrections » ; validé : « Modifier le cadrage » (version 2, « la version 1
  reste celle qui fait foi jusqu'à validation »).
- Carte « **Dossier de presse** » (pastille « V1 en préparation / à valider / validée », sous-titre « Validé ≠ envoyé » ou
  « Envoyé ») : faits Complétude (« 7 sections sur 9 · manque : biographie, pochette »), Validation, Diffusion ; sections
  Présentation de l'artiste (Fiche Artiste), du titre (Fiche Projet), Message et angles (lu du cadrage validé), Biographie,
  Photos presse, Pochette (lue de Production › Pochette livrée), Crédits (non bloquant), Liens d'écoute (non bloquant),
  Coordonnées presse. « Soumettre la V1 à Claire Morel » (refus si cadrage non validé ou section obligatoire vide) ;
  direction « Valider la V1 » / « Demander des corrections » ; validé : « Ouvrir la V2 ».
- Agence : bloc « Transmission à Agence Plume » — « L'agence n'a pas de compte : envoyez-lui le cadrage et le dossier V1
  hors PDS OS, puis déclarez-le. » → **« Marquer comme transmis »** ; ensuite « Cadrage et dossier V1 transmis à Agence
  Plume (déclaré par Lina Haddad) le 19/11, 09:30. L'agence n'a pas de compte et ne voit rien d'autre. » Puis § 1.6.

### 1.8 Relations presse — gestion interne (`rpInternal`, scénario `rpint`)
- Bloc « Relations presse · gestion interne » + « Ajouter des médias » → panneau « Réseau › Médias & journalistes » :
  média, type, journaliste, historique, alertes (« Campagne récente », « Refus antérieur », « Coordonnée ancienne »,
  « Doublon probable de « Le Contrechamp » ») ; « Ajouter » ouvre Priorité (Haute/Moyenne/Basse), Angle (angles du
  cadrage), Pourquoi ce média ; si alerte, callout « … L'ajout reste possible, en connaissance de cause. » → « Confirmer
  l'ajout » / « Ajouter à la campagne ». « Déjà ciblé (sous « … ») ».
- « Modèle commun » : « Préparer le modèle commun » (écrit depuis le cadrage) → Objet / Message (« {accroche} est
  remplacée par l'accroche de chaque média ») → « Soumettre à Claire Morel » → direction « Valider le modèle » /
  « Demander des corrections » → « Préparer un brouillon par média ».
- « Médias ciblés · 3 » : une carte repliable par média (pastille Ciblé / Brouillon / À valider / Validé / Envoi déclaré /
  Réponse positive / Refus) : type · journaliste · e-mail (masqué « coordonnées masquées » hors responsable/chef de
  projet) · historique ; faits Priorité, Angle, Pourquoi ce média ; messages (« Premier message · E-mail », « Relance N ») :
  brouillon → Accroche personnalisée + Canal (E-mail / Message privé / Téléphone) → « Soumettre à Claire Morel » ;
  direction → « Valider le message » / « Demander des corrections » ; validé → « Marquer l'envoi comme déclaré » (callout
  « Vous déclarez avoir envoyé ce message à Sarah Benhamou par e-mail, avec le dossier de presse V1. PDS OS ne l'a pas
  envoyé. » → « Confirmer l'envoi déclaré » ; refus si dossier non validé) / « Copier le message ». Après envoi : « Noter
  une réponse positive » (crée une opportunité « Interview proposée »), « Noter un refus », « Préparer une relance »
  (brouillon, à valider) ; bloqué : « Refus noté : pas de relance », « Opportunité ouverte : pas de relance ».
- Carte d'opportunité « Interview · Le Contrechamp » (Interview proposée → Disponibilité de principe → Créneau confirmé →
  Interview réalisée → Diffusion déclarée / Diffusion annulée) : « Noter une disponibilité de principe » ; « Confirmer le
  créneau » (Date *, Heure *, Format, Confirmé par) ; « Préparer le brief d'interview » (Messages clés, Angle, Éléments
  factuels, Sujets sensibles « À compléter », Questions probables — « Aucune réponse n'est écrite à la place de Mona
  Lys. ») ; « Marquer l'interview réalisée » (refusé avant la date du créneau) ; « Déclarer la diffusion » (Format diffusé,
  Source de la déclaration *) ; « Déclarer la retombée ». Journal.
- « Retombées » : « Déclarer une retombée » (Média, Type, Lien, Source de la déclaration * ; « Sans lien, la retombée
  reste déclarée ; elle se vérifie par capture ou exemplaire. ») ; direction : méthode (Lien consulté / Capture d'écran /
  Exemplaire papier) → « Vérifier la retombée » / « Lien inaccessible ».
- « Bilan RP » : tuiles Médias ciblés, Messages envoyés, Réponses positives, Interviews réalisées, Diffusions déclarées,
  Retombées vérifiées (« 0 sur 0 »), Preuves manquantes ; « Reprendre les retombées vérifiées dans les statistiques ».
- Prochaines actions (`rpNext`) : Soumettre / Valider le cadrage RP, Compléter / Valider le dossier V1, Transmettre le
  dossier à l'agence, Valider le modèle commun, « Soumettre / Valider le message · média », « Déclarer l'envoi · média »,
  « Noter une disponibilité / Confirmer le créneau / Marquer l'interview réalisée / Déclarer la diffusion · média »,
  « Vérifier N retombées ».

### 1.9 Notifications / déblocages
- Chaque geste écrit une ligne d'activité (`log`) et, par `actorsOf`, l'action passe dans Travail / la carte « Maintenant »
  du shell / la page privée de la créatrice. Pas de notification push spécifique dans le proto.
- « Sortie du clip » est bloquée jusqu'à la livraison du Clip officiel (Production) ; l'étape `bi1` (Suivi & bilan)
  dépend de `ac0`. Le bilan lit phases, preuves, relevés (`dashData`).

## 2. Correspondance dans l'app et écarts

Effort : S < ½ j, M 1–2 j, L > 2 j.

| # | Écran / geste proto | App (route, composants, lib, SQL, textes) | Écart | Effort | Migration |
| --- | --- | --- | --- | --- | --- |
| 1 | Bandeau leviers « Créer l'activation » / « Plus tard », mode sur la ligne | Création en bloc au plan d'exécution de la Stratégie (`strategy_execution_items`, fonction de la migration `20261012101501`, `components/strategy/documents/validated-strategy.tsx`, `ExecutionPlanCard`) ; `AttachSection` « À rattacher » (`lib/activations/attachables.ts`, leviers `levers.state='selected'`, `kindOfLever`) ; `NewActivationButton` → `ActivationForm` (modale : type, mode, titre, objectif, responsable, échéance, début, priorité) | **DIFFÉRENT** (parcours) + « Plus tard » **MANQUANT**. Le proto crée une à une depuis Activations ; l'app crée tout à la Stratégie. Créer depuis la ligne en un clic (sans modale), garder la modale « Nouvelle activation » pour une activation hors levier (ticket : « créée ou rattachée par une personne »). À coordonner avec la zone Stratégie : le plan d'exécution ne doit plus créer d'activations (seulement les tâches), ou le bandeau ne montre que les leviers sans activation | M | Oui : état « plus tard » d'un levier côté Activations — table `activation_lever_choices (lever_id, state 'later', by, at)` ou `strategy_execution_items.kind='deferred'` (contrainte à élargir) |
| 2 | Liste à gauche + filtres « À moi / En cours / À mesurer / Terminées » + frise + phrase | `activations/page.tsx` : `ActivationsHeader`, `ActivationsCounters`, filtre de type, `DataTableViews` (7 vues `ACTIVATION_VIEWS`), `ActivationsTable` | **DIFFÉRENT** (design + parcours). Tout se calcule déjà (`board.ts`, `states.ts`) : il manque `phaseOf`, la phrase, le filtre « À moi » (qui agit, voir #4) et le composant frise | L | Non |
| 3 | Activation ouverte à droite, sur la même page | `[activationId]/layout.tsx` (`ActivationHeader` + `SectionTabs` 1 à 6 onglets) et 6 pages (`page.tsx` Pilotage, `framing`, `concepts`, `targets`, `targets/[targetId]`, `agency`, `report`) | **DIFFÉRENT** : passer en mise en page deux volets (liste persistante dans un `activations/layout.tsx`, détail en page), sections au lieu d'onglets ; anciennes URL redirigées vers des ancres | L | Non |
| 4 | « Maintenant » : toutes les actions, à vous d'abord, « En attente de … », geste en place | `NextActionPanel` (une action, `activation_next_actions`, règle ou saisie, « Modifier », « Créer une tâche » `create_activation_task`, « Sans objet ») ; règles `ruleSteps` (`states.ts`) + `moduleSignals` (`modules.ts`) — étapes sans personne attribuée | **DIFFÉRENT** : (a) lister toutes les étapes ouvertes avec leur **personne** (responsable, validateur `marketing_can_validate`, créatrice via lien) ; (b) geste inline pour les étapes du tronc commun ; (c) garder « Créer une tâche » / « Sans objet ». « Modifier la prochaine action » (saisie libre) : EN TROP vs proto, à garder replié (ticket § 4 le demande) | M | Non |
| 5 | « Désigner un responsable », « Fixer l'échéance » (date proposée J±n) | `IdentitySection` + `identity-actions.tsx` (`updateActivation`) ; échéance non proposée depuis le calendrier | **DIFFÉRENT** (geste dans Maintenant ; proposition de date manquante — lire le temps fort du levier dans la Stratégie, `lib/strategy`) | S | Non |
| 6 | « Lancer l'activation » / « Déclarer réalisée » | `StatusForm` (select de statut, raison) ; SQL `marketing_activations_check` + `activation_launch_gaps` refusent le lancement sans responsable / échéance / blocage levé | **DIFFÉRENT** (un bouton par geste au lieu d'un select). **MANQUANT** : refus « Déclarer réalisée » sans 1re publication (influence interne) / 1er message envoyé (presse interne) | S + S | Oui : élargir `marketing_activations_check` (passage à `done_declared` : influence interne ⇒ une `activation_evidence` non retirée liée à une cible ; presse interne ⇒ un `activation_messages.status='sent_declared'`) |
| 7 | « Fournir la preuve » (lien / indisponible + motif), « Vérifier » / « Contester » | `EvidenceSection`, `EvidenceForm`, `EvidenceActions` (`declareEvidence`, `checkEvidence` méthode + résultat verified/contested/unavailable, `withdrawEvidence`) ; tables `activation_evidence`, `activation_evidence_checks` | OK sur le fond (app plus riche : méthode, fichier). **DIFFÉRENT** : formulaire plus long, à réduire au lien + « indisponible » dans Maintenant ; le reste dans « Informations » | S | Non |
| 8 | Preuve calculée « N publications vérifiées sur M créateurs engagés » + encadré « Preuves » | `proofState` (`states.ts`) agrège toutes les preuves vivantes de l'activation, celles des cibles comprises | **DIFFÉRENT** : la règle proto exige une publication vérifiée par **créateur engagé** (proposition acceptée, sans issue de sortie) ; texte et liste « ce qui manque » absents. Presse : retombées vérifiées sur déclarées | S | Non (code : `states.ts`, données déjà là : `influence_proposals.accepted_at`, `activation_targets.outcome`) |
| 9 | « Nouveau relevé » (valeur, plateforme, période, source, partiel, indisponible), « Vérifier » un relevé | `MetricsSection`, `MetricForm`, `MetricActions` (`recordMetric`, `setMetricVerification`, `invalidateMetric`), `activation_metrics` | OK (app plus riche : métrique, unité, invalidation). **DIFFÉRENT** : la case « Donnée indisponible » du proto ⇔ `metrics_expected=false` / « Sans objet » dans l'app — à rendre dans le même formulaire | S | Non |
| 10 | « Clôturer l'activation » (un bouton) | `ClosureSection` + `ClosureForm` (`close_activation` définitive / avec réserves listées, `reopen_activation`) | DIFFÉRENT (plus riche ; le ticket le demande). Garder, mais le bouton dans Maintenant, les réserves dans la modale verre | S | Non |
| 11 | « Suspendre » / « Annuler l'activation » (modale motif), « Reprendre » | Statuts `cancelled` / `blocked` avec raison via `StatusForm` ; « Suspendue » fusionnée dans « Bloquée » (décision Sacha 11/10, migration `20261011300101`) | **DIFFÉRENT** : le proto 18/10 rétablit Suspendre + Reprendre (retour au statut d'avant). Deux boutons + `ReasonForm` dans `FormDialog` | M | Oui : statut `suspended` dans la contrainte + colonne `status_before_suspension` (ou lecture dans `activation_events`) ; mettre à jour `ACTIVATION_STATUSES`, vues, `viewsOf`, Suivi & bilan |
| 12 | « Informations » repliées (type, levier, responsable, échéance, preuve, statistiques) | `ActivationHeader` (type, mode, 3 axes, source, version du Brief), `IdentitySection`, `BlockersSection`, `DependenciesSection`, `JournalSection` toujours dépliés | **DIFFÉRENT** : replier ; blocages / dépendances / journal = **EN TROP** à l'écran principal (demandés par le ticket « pilotage » § 5) → dans « Informations » | S | Non |
| 13 | « Sortie du clip » attend la livraison du clip (gate automatique) | Dépendance saisie à la main (`activation_dependencies`, kind `deliverable`, `dependencies.ts`) ; transfert Production `production_activation_handoffs` | **DIFFÉRENT** : créer la dépendance automatiquement quand l'activation vient du levier clip / d'un livrable non livré, callout « Elle commence quand le Clip officiel est livré. » | S | Non (insertion par l'action de création) |
| 14 | Influence : « Choisir des créateurs » (Réseau › Influenceurs, alertes, « Ajouter ») | `AddTargetButton` / `AddTargetForm` (`addTarget`, `targetWarnings` : proposé, contacté, collaboré, refus, donnée ancienne / absente ; `confirmed_warnings`) ; onglet « Collaborations » `CollaborationsTable` | OK sur le fond ; DIFFÉRENT : panneau inline au lieu de la modale + table | S | Non |
| 15 | Carte repliable par créateur avec étape et un geste à la fois | Sous-page `targets/[targetId]` → `InfluenceCollaboration` : `SheetPanel` (concept décliné), `NegotiationSection`, `MessagesSection`, `RightsSection`, `ContentsSection`, `EvidenceSection` (publication), `MetricsSection`, `PaymentSection`, `JournalSection` ; étape calculée `stage.ts` | **DIFFÉRENT** (parcours) : tout est là mais en 9 sections ouvertes sur une page à part ; le proto montre une carte repliable par créateur dans l'activation, avec le seul geste de l'étape | L | Non |
| 16 | Concept par créateur : Angle, Format, Message clé → « Soumettre à Claire Morel » → « Valider le concept » / « Demander des corrections » | `activation_sheets` kind `concept` + `target_id` (8 champs : angle, format, mécanique, message, contraintes, références, livrable, justification), `saveSheet`, `decideSheet` (`decide_activation_sheet` : validée / corrections / refusée) | OK (DIFFÉRENT : 8 champs au lieu de 3 — garder les 3 en tête, le reste replié) | S | Non |
| 17 | Concept de campagne lu du Brief (Narratif), pas de cadrage Influence | Onglet « Cadrage » pour l'influence (`framing_influence` : objectif, public, plateformes, jalons, contraintes, mentions, validé) + onglet « Concepts » (concept générique validé, `concepts/page.tsx`) | **EN TROP** vs proto (le ticket Influence demande un concept générique décliné, pas un cadrage validé). Proposition : masquer le cadrage Influence, montrer le concept de campagne en fait sourcé (Brief › Narratif) ; garder les tables. Complexifie (une validation de plus avant le premier créateur) | S | Non |
| 18 | « Brief et proposition » en un formulaire (rémunération, livrables, droits organiques, droits pub, message, canal) → « Marquer le brief comme envoyé » | Trois objets : message `brief` (`MessagesSection`, `brief.ts` compose le texte, Brouillon → À valider → Validé → Envoi déclaré), proposition (`ProposalForm`, `recordProposal`), droits (`RightsForm`, `saveRights` puis `decideRights`) | **DIFFÉRENT** : un formulaire unique qui écrit les trois ; validation du brief par la direction **EN TROP** vs proto (le proto ne fait valider que le concept ; le ticket : « Aucun message externe n'est envoyé sans validation humaine » — l'humain qui marque l'envoi suffit). À trancher, défaut : sans étape « À valider » | M | Non |
| 19 | Négociation : « Accepter 950 € », « Faire une nouvelle proposition », « Sans réponse » | `NegotiationSection`, `NegotiationButtons` (`recordProposal` PDS ou créateur, `acceptTerms` → `accept_influence_terms`), issue `setTargetOutcome` (no_response…) | OK | S | Non |
| 20 | Accord express : lien copiable, « Bon pour accord » / « Demander une modification » | `prepareAgreement` (`prepare_influence_agreement`, jeton 64 hex, hash, 30 jours), `revokeAgreement`, `/i/[token]` + `PublicAgreement` (`get_influence_agreement`, `respond_influence_agreement` : nom, consentement, empreinte) | OK (app plus stricte : nom + consentement) | — | Non |
| 21 | Page privée créatrice : déposer le contenu, déclarer la publication, déposer la facture | `/i/[token]` ne sert qu'à l'accord ; contenus (`submitContent`), publication (`declareEvidence` par l'équipe), facture (`savePayment`, fichier `restricted`) saisis par l'équipe ; jeton expirant à 30 jours | **MANQUANT** | L | Oui : jeton de **collaboration** durable (ou prolongé) ; fonctions `security definer` par jeton : `submit_influence_content_by_token(token, url)`, `declare_influence_publication_by_token(token, url)`, `submit_influence_invoice_by_token(token, file)` (+ politique Storage d'upload signé), lecture `get_influence_collaboration(token)` (étape, retours de la dernière version, conditions) |
| 22 | Contenus : « Votre décision sur la V1 » (timecode, catégorie, retour) par la directrice créative | `ContentsSection`, `ContentButtons`, `FeedbackForm` (`decideContent` → `decide_influence_content`, `addFeedback`, `setFeedbackStatus`) ; validateur = DG ou DC (`marketing_can_validate`) | OK | — | Non |
| 23 | Publication déclarée → « Vérifier la publication » (direction) | Preuve de la cible (`EvidenceSection` filtrée sur la cible) + contrôle | OK (DIFFÉRENT : déclaration par la créatrice manquante, #21) | — | Non |
| 24 | Paiement : Demander la facture → facture → Bon à payer (direction) → Payé déclaré → Payé vérifié → Clôturer la collaboration | `PaymentSection`, `payment-forms.tsx` (`savePayment`, `advancePayment` → `advance_influence_payment` ; Bon à payer exige un accord accepté ; Payé vérifié une preuve restreinte) ; clôture = `setTargetOutcome('closed')` | OK sur le fond ; DIFFÉRENT : un bouton par étape dans la carte | S | Non |
| 25 | Agence : relier le Google Sheets, correspondance des colonnes | `SourcesSection`, `SourceForm` (Sheets, Excel / CSV, saisie manuelle ; `createAgencySource`), `MappingForm` (`saveAgencyMapping`, `fields.ts`) ; `agency_sources` | OK (app plus riche : plusieurs sources, Excel, PDF saisi) | — | Non |
| 26 | « Actualiser » → aperçu → « Importer ces changements » / « Annuler » | `RefreshButton` (`refreshAgencySource` → `record_agency_preview`), `PreviewPanel` (confirmation totale ou partielle `apply_agency_snapshot`, `discard_agency_snapshot`) ; `agency_snapshots`, `agency_snapshot_rows` | OK | — | Non |
| 27 | Galerie de cartes, statut agence ≠ décision PDS, notes, alertes, « Décider » | `AgencyGallery`, `RowButtons` (`decideAgencyRow`, `linkAgencyRow` au Réseau, `addManualAgencyRow`), `divergence.ts`, filtres par décision ; `agency_rows` | OK (DIFFÉRENT : rattachement au Réseau en plus, ticket « capitalisation ») ; vérifier les messages « Modifié par l'agence après votre décision » et « Retiré du tableau … » | S | Non |
| 28 | Récapitulatif → « Marquer comme envoyé » / « Copier le message » | `RecapButton` (`prepareAgencyRecap`) + `MessagesSection` kind `agency_recap` (Brouillon → À valider → Validé → Envoi déclaré) | **DIFFÉRENT** : deux étapes de plus que le proto (validation). Le ticket RP § 6.3 dit « Brouillon puis À valider » ; le proto les fusionne. À trancher — défaut proto : relu et marqué envoyé par le responsable | S | Non |
| 29 | « Bilan selon l'agence » (tuiles) + « Reprendre les vues dans les statistiques » | Onglet « Bilan » : `ReportSynthesis` (totaux par source, « données agence ») ; `importAgencyMetrics` (relevés « Agence ») | OK (DIFFÉRENT : dans un onglet séparé) | S | Non |
| 30 | RP agence : « Bilan de l'agence », réserves calculées, 3 décisions | `AddReportButton` (`receiveAgencyReport` : fichier / lien / texte), `ReportDecisionButtons` (`decide_agency_report` : provisoire avec réserves, compléments, archivé, validé avec motif), `agencyReserves` | OK sur le fond ; DIFFÉRENT : l'app exige de **déposer** un bilan, le proto le lit dans le tableau. Garder le dépôt (ticket), mais afficher les réserves et les décisions sans dépôt préalable | S | Non |
| 31 | RP agence : « Transmission à Agence Plume » → « Marquer comme transmis » | — | **MANQUANT** | S | Oui : `MESSAGE_KINDS` + contrainte `activation_messages.kind` += `agency_brief` (envoi déclaré, joint la version du dossier), ou colonne `marketing_activations.kit_transmitted_*` |
| 32 | Cadrage RP (8 champs, provenance, soumettre, valider, version 2) | Onglet « Cadrage » : `SheetPanel` kind `framing` (`framing_press` 9 champs dont « éléments de preuve »), `framingPrefill`, `strategyChangedAt`, `decideSheet` | OK (DIFFÉRENT : carte repliable dans la page au lieu d'un onglet) | S | Non |
| 33 | Dossier de presse par sections, complétude, validation par la direction, V2, « Validé ≠ envoyé » | `PressKitPanel` : lien vers le Dossier de presse **de la Stratégie** (`strategy_documents` kind `press_kit`, générateur de pages `lib/strategy/documents/press-kit-*.ts`, route `strategy/press-kit`), état validé + nombre de messages envoyés qui le joignent | **DIFFÉRENT** (point à trancher) : le proto édite le dossier dans l'activation, l'app a un document unique fait dans la Stratégie (« jamais dupliqué »). Proposition : garder la source unique Stratégie, montrer dans la carte RP complétude (blocs `PRESS_BLOCKS` remplis), validation, diffusion, « Ouvrir le dossier » ; la complétude sectionnée du proto se calcule des blocs | M | Non |
| 34 | Ciblage médias (alertes : campagne récente, refus, coordonnée ancienne, doublon probable) | `AddTargetForm` press (média + journaliste), `targetWarnings` | **DIFFÉRENT** : alerte « Doublon probable » d'une fiche du Réseau (nom / domaine) **MANQUANTE** ; « Campagne récente » ≈ « contacté » | S | Non |
| 35 | Modèle commun → brouillon par média | `PressTargetsSection` : `MessagesSection` modèle, `PrepareDraftsButton` (`prepareTargetDrafts`), `PressTargetsTable` | OK | — | Non |
| 36 | Messages par média : soumettre, valider, envoi déclaré confirmé, relance, réponse positive / refus | `PressTarget` (sous-page) : `MessagesSection` (`saveMessage`, `advanceMessage` → `advance_activation_message`), relance gardée par `activation_follow_up_guard`, issue `setTargetOutcome` | OK ; DIFFÉRENT : sous-page au lieu de carte repliable. Vérifier que « réponse positive » crée l'opportunité (dans l'app : `OpportunitiesSection` créée à la main ?) | S | Non |
| 37 | Opportunité : disponibilité, créneau (date, heure, format, confirmé par), brief, réalisée (pas avant la date), diffusion (source *), annulée | `OpportunitiesSection`, `OpportunityForm`, `OpportunityButtons` (`saveOpportunity`, `saveInterviewBrief`, `press_opportunities_guard`), `press/brief.ts` | OK | — | Non |
| 38 | Retombées déclarées puis vérifiées (méthode), « Lien inaccessible » | Preuves `coverage` de la cible (`EvidenceSection`) + contrôles | OK | — | Non |
| 39 | « Bilan RP » (7 tuiles) + « Reprendre les retombées vérifiées dans les statistiques » | — (pas de tuiles RP ; compteurs globaux dans `ActivationsCounters`) | **MANQUANT** (calcul de code) | S | Non |
| 40 | Prochaines actions RP / agence / influence dans Maintenant et Travail | `moduleSignals` (`modules.ts`) : cadrage, concepts, contenus, messages, interviews, agence | DIFFÉRENT : pas de personne par étape, pas d'action par média / par créateur (« Déclarer l'envoi · Urbania Mag ») | M | Non |
| 41 | Tableau 9 colonnes, tuiles, 7 vues, compteurs avec règle | `ActivationsCounters`, `DataTableViews`, `ActivationsHeader` (période, responsable Marketing, alertes, volet Marketing) | **EN TROP** vs proto 18/10 (retiré : « plus de tableau à 9 colonnes, de tuiles ») ; le ticket pilotage les demandait. Les vues restent utiles à Suivi & bilan (`lib/marketing`). Masquer à l'écran, garder le calcul | S | Non |
| 42 | Sous-pages par cible (`targets/[targetId]`) | `targets/[targetId]/page.tsx` | EN TROP comme destination principale ; garder l'URL comme ancre / redirection vers la carte | S | Non |

## 3. Écarts transverses à connaître

- **Statuts** : proto `prep / run / done / closed / suspended / cancelled` + « Prête » et « Bloquée » calculées ; app
  `to_prepare / in_progress / done_declared / closed / cancelled / blocked` (bloquée stockée avec raison, Suspendue
  fusionnée le 11/10). Le proto du 18/10 est plus récent : rétablir « Suspendue » (#11).
- **Qui valide** : proto direction (DG) pour concepts, cadrage, dossier, messages, preuves, publications, retombées,
  bon à payer ; directrice créative pour le contenu des créateurs. App : `marketing_can_validate` = DG **ou** directeur
  créatif pour tout. Écart mineur (le contenu peut être validé par la DG dans l'app) — à laisser.
- **Phase / frise** : n'existe nulle part dans l'app ; à ajouter dans `lib/activations/states.ts` (pur, client-safe) et
  à réutiliser par Suivi & bilan (`PHASE_NAMES` du proto, zone Bilan).
- **Acteurs** : le proto attribue chaque action à une personne (`actorsMk`) ; l'app n'a qu'un `expectedPersonId` pour
  la prochaine action. Il faut une fonction `activationActors(a, facts, viewer)` (responsable, validateurs, créatrice par
  lien) utilisée par la liste (phrase, filtre « À moi »), Maintenant, Travail et la carte « Maintenant » du shell Marketing.
- **Plan d'exécution de la Stratégie** : aujourd'hui il crée les activations (et leur mode) en bloc — conflit direct avec
  le bandeau du proto (#1). Le changement touche la zone Stratégie (`validated-strategy.tsx`, `ExecutionPlanCard`,
  fonction SQL du plan).

## 4. Briques communes utilisées par la zone

| Brique | Dans le proto | Dans l'app (où) | État |
| --- | --- | --- | --- |
| « Maintenant » (à vous / en attente de) | `nowbox` dans l'activation ; carte « À vous, ailleurs / Aussi à vous » du shell | `components/shell/journey/now-card.tsx` (`NowCard`, `nowOf` de `lib/ui/journey.ts`), utilisé par Production et Juridique ; Activations : `NextActionPanel` | À brancher : NowCard prend des `JourneyStep` ; il faut soit un adaptateur « actions d'une activation » → steps, soit une variante liste d'actions (une prop) |
| Parcours / liste à gauche | `nav.spine.alist` (liste d'activations avec frise) | `components/shell/journey/journey-spine.tsx` (`JourneySpine`) | Réutilisable comme cadre de la liste (variante « ligne avec frise et phrase ») |
| Frise de phases | `frise()` 5 segments | — (`ProcessSteps` = chevrons, `ProgressBar`) | MANQUANT : petit composant `components/ui/phase-strip.tsx` (variante `big` avec libellés) |
| Fil d'Ariane | « Néons › Marketing › Activations › <activation> » | `ProjectPageTitle` / fil du projet (zone shell) | À fournir l'élément courant (titre de l'activation) |
| Chevrons des modules Marketing | Stratégie / Conception / Production / Activations / Suivi & bilan | `ProjectTabs` / sections projet (zone shell) | Hors zone |
| Décision avec motif | Commentaire obligatoire pour « Demander des corrections » / « Contester » | `ReasonForm`, `DecisionForm` (strategy/documents, production/post), `decideSheet` (commentaire) | Existe ; harmoniser les mots |
| Modale verre | `reasonModal` Suspendre / Annuler | `FormDialog`, `ConfirmDialog`, `DialogButton` | Existe |
| Cartes de versions repliables | `versionCard` (créateur, média, cadrage, dossier) | Pas de carte repliable générique dans `docs/COMPOSANTS.md` (les versions de Production/Master sont des listes) | À créer une fois (`components/ui/disclosure-card.tsx` : titre, pastille, sous-titre à droite, ouvert si action) et réutiliser |
| Faits avec source | `callFacts` (« Repris de … », « Modifié par … ») | `FactTable`, `FactList`, provenance des `SheetPanel` | Existe |
| Message préparé « PDS OS ne l'envoie pas » + Copier + Marquer envoyé | brief, récap agence, messages presse | `MessagesSection`, `CopyButton`, `advanceMessage` | Existe (circuit plus long, #18/#28) |
| Pages privées triées | page de Léa réunie par workflow (`host.js portalPage`) | une route par module : `/i` (accord), `/p` (production), `/m` (master), `/l`, `/f`, `/fs`, `/s` | `/i` à étendre (#21) ; page privée réunie = zone shell / pages privées |
| Résumé aux participants, formulaire de call, Confirmer/Modifier/Écarter, cartes « Recommandé » | non utilisés dans la zone Activations | — | Sans objet |
| « Créer une tâche » / « Sans objet » | pied de Maintenant | `create_activation_task`, `activation_next_actions.status='not_applicable'` | Existe |

## 5. Simulations du proto (« Proto : … ») et vrai événement

| Bouton proto | Vrai événement dans l'app |
| --- | --- |
| « Proto : la créatrice répond » (`ccounter`, contre-proposition +150 €) | La créatrice répond hors app (e-mail, message) → la responsable **note sa contre-proposition** (`recordProposal` côté créateur, existe) ; ou la créatrice clique « Demander une modification » sur `/i/<jeton>` (existe, devient une position) |
| « Proto : Léa Moreau donner son accord » (`cproto`, étape accord) | « Bon pour accord » sur `/i/<jeton>` (existe, `respond_influence_agreement`) |
| « Proto : … déposer le contenu » | Dépôt du lien de la vidéo non publiée sur le lien privé (**à construire**, #21) ; à défaut, saisie par l'équipe (`submitContent`, existe) |
| « Proto : … déclarer la publication » | Déclaration sur le lien privé (**à construire**) ; à défaut, preuve déclarée par l'équipe source « créateur » (existe) |
| « Proto : … déposer la facture » | Dépôt du fichier sur le lien privé (**à construire**, upload Storage restreint) ; à défaut, `savePayment` avec pièce par l'équipe (existe) |
| « Proto : Agence Halo met à jour son tableau » (`agproto`) | L'agence modifie son Google Sheets (ou envoie un nouvel Excel) ; la responsable clique **« Actualiser »** (`refreshAgencySource`, existe) |
| « Utiliser un lien d'exemple » (preuve, tableau, contenu, publication) | Aucun : saisie réelle. Hors prod, `fill_page_test_data` / `create_test_data` de PO (`docs/ASSISTANT.md`) |
| « Copier le message » (toast) | `CopyButton` (presse-papiers réel, existe) |

## 6. Découpage proposé en sous-lots (ordonnés, chacun livrable et testable seul)

1. **ACT-1 — Phase, acteurs, phrase (calcul seul).** `lib/activations/states.ts` : `phaseOf`, `activationActors`
   (toutes les étapes ouvertes avec leur personne : tronc commun, module, collaborations, médias, agence), `actSentence` ;
   preuve calculée influence / presse (#8) ; tests unitaires si présents. Aucune UI. S–M, pas de migration. Risque :
   `viewsOf` / `reservesOf` lus par Suivi & bilan (`lib/marketing`) — ne pas changer leur sortie.
2. **ACT-2 — Page deux volets.** `activations/layout.tsx` (liste à gauche : filtres À moi / En cours / À mesurer /
   Terminées, ligne avec frise + phrase, `JourneySpine` en variante), `/activations` ouvre la première activation « à moi »,
   `[activationId]/page.tsx` à droite (titre, pastille, pourquoi, grande frise). Composant `PhaseStrip`. Masquer tableau,
   tuiles, vues (#41) sans supprimer leur calcul. L, pas de migration. Risques : liens existants vers `/activations`
   (Production `closure-section.tsx`, `lib/production/next/compute.ts`, Stratégie `validated-strategy.tsx`, `review/page.tsx`,
   `lib/ui/project-sections.ts`, `workflow-hrefs.ts`) ; `loading.tsx` ; `ViewLink`.
3. **ACT-3 — « Maintenant » et tronc commun inline.** Encadré listant toutes les actions (les vôtres d'abord), gestes en
   place : Désigner, Fixer l'échéance (date proposée depuis le calendrier), Lancer, Déclarer réalisée, Fournir la preuve /
   indisponible, Vérifier / Contester, Nouveau relevé, Clôturer ; « Créer une tâche », « Sans objet ». « Informations »
   repliées (identité, blocages, dépendances, journal). Suspendre / Annuler / Reprendre en modale verre. M–L.
   Migrations : `suspended` + statut d'avant (#11) ; garde « Déclarer réalisée » par module dans
   `marketing_activations_check` (#6) ; pgTAP `supabase/tests/marketing-activations.test.sql` à compléter. Risque :
   contrainte de statut lue par `close_activation`, vues, Suivi & bilan, `delete_project_row` (inchangé).
4. **ACT-4 — Bandeau des leviers.** `leversBanner` : leviers retenus sans activation, mode sur la ligne, « Créer
   l'activation » en un clic (responsable du projet proposé), « Plus tard », « Créée · Ouvrir ». Dépendance automatique au
   livrable (#13). Migration : état « plus tard » (#1). Coordination zone Stratégie : le plan d'exécution ne crée plus
   les activations (ou le bandeau ignore les leviers déjà créés — compatible avec l'existant). M. Risque : double création
   si les deux chemins restent actifs (garder l'unicité `strategy_execution_items.item_key`).
5. **ACT-5 — Influence interne dans la page.** Bloc « Campagne d'influence · gestion interne » (concept de campagne lu du
   Brief, compteur créateurs), « Choisir des créateurs » inline, une carte repliable par créateur avec pastille d'étape
   (`stage.ts`) et le seul geste de l'étape ; formulaire unique « Brief et proposition » (message + proposition + droits) ;
   masquer Cadrage Influence et Concepts génériques (#17). Les sections détaillées de `InfluenceCollaboration` passent
   dans le repli de la carte. L, pas de migration. Risque : `collaborationRows`, liens « #concept » depuis l'onglet
   Concepts.
6. **ACT-6 — Lien privé de la créatrice étendu.** `/i/<jeton>` montre l'étape : accord (existant), déposer le contenu,
   déclarer la publication, déposer la facture ; confirmation limitée à sa collaboration ; jeton valable pour la
   collaboration. L. Migration : fonctions par jeton + upload Storage restreint + durée du jeton. Risques : sécurité
   (jeton non devinable, aucune donnée d'un autre créateur, révocation), RLS des fichiers `restricted`, montants visibles
   seulement par les lecteurs du budget côté app.
7. **ACT-7 — Relations presse dans la page.** Cartes Cadrage RP, Dossier de presse (complétude des blocs de la Stratégie,
   validation, diffusion), Médias ciblés (cartes avec messages, réponse, relance), opportunités, Retombées, Bilan RP
   (tuiles + « Reprendre les retombées vérifiées »), alerte « Doublon probable » (#34). M–L, pas de migration. Point à
   trancher : dossier édité dans la Stratégie (app) ou dans l'activation (proto) — défaut : source unique Stratégie.
8. **ACT-8 — Agence dans la page.** Sources, aperçu, galerie, récapitulatif (« Marquer comme envoyé » direct, #28),
   « Bilan selon l'agence », bilan d'agence RP (réserves + 3 décisions, dépôt facultatif), « Transmission à l'agence »
   (#31). M. Migration : kind `agency_brief` (ou colonnes de transmission). Risque : `moduleSignals` lit `agency_recap`
   envoyé pour l'étape « récapitulatif ».
9. **ACT-9 — Nettoyage.** Redirections des anciens onglets (`framing`, `concepts`, `targets`, `agency`, `report`,
   `targets/[targetId]`) vers les ancres de la page, mise à jour `docs/ARCHITECTURE.md` § 8 duodecies, `docs/COMPOSANTS.md`
   (PhaseStrip, DisclosureCard, NowCard variante), `docs/AVANCEMENT.md`. S.

**Effort total estimé : ≈ 13 à 17 jours** (ACT-1 1 j, ACT-2 2–3 j, ACT-3 2–3 j, ACT-4 1–2 j, ACT-5 2–3 j, ACT-6 2–3 j,
ACT-7 1,5–2 j, ACT-8 1 j, ACT-9 ½ j). Migrations : 4 petites (statut suspendu, garde « réalisée », levier « plus tard »,
transmission agence) + 1 moyenne (actions de la créatrice par jeton).

**Ce qui casserait l'existant si mal fait** : Suivi & bilan (lit vues, preuves, relevés, statuts : `lib/marketing/`,
`components/marketing/`), le plan d'exécution de la Stratégie, les tâches liées (`tasks.activation_id` ramènent à
`/activations/<id>`), les notifications (`production_handed_off` → activations), `lib/assistant/facts.ts` (PO lit les
activations), les 52 tests pgTAP `marketing-activations.test.sql`, l'export du rapport de bilan.
