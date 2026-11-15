# Analyse de Midday : design, UX, fonctionnalités, IA, et ce qu'on en tire pour PDS OS

15/11/2026, à la demande de Sacha (« ils font mieux que nous sur des pages : beaucoup moins de texte,
des tableaux plus simples ; et comment ils utilisent l'IA »). Document de référence pour les lots qui
appliqueront ces idées. Il n'a encore rien changé dans le code.

**Sources**
- 791 écrans Mobbin (167 parcours) du vault : `~/Documents/KNOWLEDGE/INSPIRATION/UNIVERS/midday/flows/`
  (chemins abrégés `flows/…` ci-dessous), plus `ui/` et `web/`. Deux générations du produit s'y
  mêlent : 2025 (chiffres en mono) et mai 2026 (chiffres en serif).
- Le code open source (`github.com/midday-ai/midday`, branche `main`, novembre 2026) : tokens,
  colonnes des tableaux, panneau de transaction, rapprochement, prompts et outils de l'assistant.
- Les annonces produit (midday.ai/updates : v2, Computer, MCP, insights, chat).

Contexte : Midday est racheté par Ramp (annonce du 07/05/2026) et ferme. C'est une référence figée,
pas un concurrent.

---

## 1. Pourquoi leurs pages se lisent mieux : le diagnostic

Ce n'est pas une question de joli. Ce sont **sept décisions** qui reviennent sur tous les écrans.

1. **Une page = une liste, rien autour.** Pas de titre ni de phrase d'intro sur Transactions,
   Inbox, Factures, Vault, Rapports. La page s'ouvre sur la barre d'outils (recherche à gauche,
   2-3 boutons carrés à droite) puis la donnée. La barre latérale dit déjà où l'on est.
2. **Moitié des colonnes cachées.** Transactions : 6 colonnes visibles sur 12 possibles (TVA,
   montant en devise de base, méthode, assigné… dans un menu « Colonnes »). Une cellule vide = un
   travail à faire (catégorie absente), pas un tiret.
3. **Le détail sort de la liste, dans un panneau à droite** (~⅓ de l'écran), la liste reste
   visible derrière. On y lit, on y corrige, on y attache, et on passe à la ligne suivante avec ↑ ↓
   sans fermer. Le formulaire n'est pas une étape séparée : la fiche *est* le formulaire.
4. **Tout ce qui est rare est replié ou dans « ⋯ ».** Sections « General » et « Note » fermées,
   réglages avancés de l'import repliés, 6 actions de ligne dans « ⋯ » avec le seul rouge sur
   « Delete ».
5. **La couleur ne sert qu'à la donnée.** Interface noire, blanche et grise ; vert = argent qui
   entre, rouge = perte ou destruction, carré coloré = catégorie. Aucun bouton, lien ou menu coloré.
6. **Trois registres typographiques qui classent sans lire** : sans-serif pour l'interface, mono
   pour la donnée machine (montants, badges, tags, raccourcis), serif rare pour les « moments »
   (salutation, gros total, titre d'un document).
7. **Le texte explicatif n'existe que là où il remplace une action** : états vides, réglages,
   toasts, infobulles. Les états vides disent « tout va bien » (« All paid », « All caught up »,
   « All done ») au lieu de laisser un trou.

La part de l'IA dans cette lisibilité est grande et discrète : **elle fait le tri à la place de
l'utilisateur** (catégorie, nom propre du fournisseur, rapprochement du reçu, titre et tags d'un
document), donc la liste n'a plus besoin d'expliquer ce qu'il faut faire. Il reste à vérifier.

---

## 2. Le style, valeurs exactes

### Couleurs (code : `packages/ui/src/globals.css`)
- Clair : fond blanc, cartes et popovers **crème** `hsl(45 18% 96%)`, aplats sable `hsl(40 11% 89%)`,
  filets `hsl(45 5% 85%)`, texte secondaire `hsl(0 0% 38%)` ; dans les composants, gris `#878787`
  et `#606060` pour le secondaire.
- Sombre : fond `#0C0C0C` (5 %), cartes 7 %, filets 11 %.
- Graphiques d'une seule encre : réel en noir plein, précédent en gris 30 %, prévision en gris,
  remplissage **hachuré** plutôt qu'un aplat ; rouge seulement pour une perte.
- Couleurs de donnée : vert `#00C969` pour une entrée (toute la ligne, pas que le montant), carrés de
  catégorie, pastilles de statut pâles (Paid vert, Scheduled bleu, Draft presque invisible), jaune
  pour « Processing incomplete » et le point de notification.

### Typographie
- Cellules de tableau en `text-sm` (14 px) **regular** ; secondaire en `text-xs` (12 px), gris.
  Le medium n'est que pour le nom d'une ligne (fournisseur d'un reçu) et les titres de section.
- Serif (Hedvig Letters) : « Good afternoon, Sam » (prénom en gris), les chiffres des tuiles de
  Factures, le montant du détail d'une facture, le total d'heures du Tracker, le titre « Export ».
- Mono (Geist Mono) : badges « Pending / Matched / Best Match », tags, suggestions de l'assistant,
  raccourcis clavier.
- Trois niveaux de gris seulement : noir (valeur), gris moyen (libellé), gris pâle (aide, désactivé).

### Formes
- Coins droits partout (cartes, champs, modales, toasts) ; pilules seulement pour badges, filtres,
  suggestions. Une bordure de 1 px est la seule séparation ; **aucune ombre**, sauf la carte qu'on
  déplace en mode « Customize ».
- Tableaux : grille complète de filets fins, pas de zébrage, lignes hautes (~44 px réels).
- Rail de navigation d'icônes seules (~66 px réels), dépliable avec libellés.

---

## 3. Les patterns, domaine par domaine

### 3.1 Coquille
- Rail d'icônes à gauche, l'actif sur une pastille grise. En haut : « Find anything… ⌘K »,
  cloche (point jaune si non lu), avatar. Pas de fil d'Ariane, pas de titre dans l'en-tête.
- **⌘K mélange résultats et actions** : groupes « Vault / Customers / Transactions / Tracker /
  Invoices », ligne = icône + titre + secondaire gris (e-mail, montant + date), actions au survol
  (copier, télécharger, ouvrir), et des actions « ↱ Create invoice », « View vault » dans la même
  liste (`flows/searching-midday-2/04`).
- Menu avatar : compte, support, équipes, apps, thème (Light / Dark / System), déconnexion.

### 3.2 Accueil (`flows/overview/02`, `flows/home/07`)
- « Good afternoon, Sam » en serif, puis **une seule phrase d'état qui tourne** (5 tirets de
  pagination), le mot-clé souligné en pointillé et cliquable : « You have 3 invoices outstanding,
  totaling $486. », « There's $330 in unbilled time across 2 projects you could invoice. »,
  « There is 1 item in your inbox waiting to be reviewed. », ou « You're all caught up. Nothing
  needs your attention right now. »
- Le champ de l'assistant est le héros de la page, puis 5 boutons d'action (Create Invoice, Add
  Transaction, Add Customer, Track Time, Upload Receipt), puis **6 tuiles** : libellé gris, chiffre,
  2 à 4 mots gris sur la même ligne de base (« 2 · $246 outstanding », « 0 · All paid »).
- Rapports sur une page à part : widgets à bordure fine, titre gris, un chiffre, une légende, une
  courbe ; « Customize » (poignées, glisser, largeurs ⅓ ⅔ ½) ; période dans un seul menu
  (Période / Type de revenu / Devise, avec la note « All amounts are converted… ») ; « ⋮ › Share »
  crée un lien public figé avec date d'expiration.
- Les infobulles des graphiques expliquent la prévision : fourchette, confiance (« 73 % »), sources
  (factures récurrentes, encaissements, heures facturables).

### 3.3 Tableaux et listes (`flows/transactions-2/03`, `flows/filtering-transactions/07`)
- Barre d'outils : un seul champ « Search transactions… » qui sert aussi d'entrée aux filtres
  (icône filtre dedans), puis à droite « Colonnes », « + », et un segment `All | Review (2)`.
- Le placeholder montre des **phrases en langage naturel** (« From Google without receipt »,
  « Software last Q4 ») : le champ comprend une phrase (icône étincelle, ⌘F).
- Filtres : menu de 8 entrées (Date, Montant, Statut, Pièces jointes, Catégories, Tags, Comptes,
  Récurrent), chacune ouvre son sous-panneau ; le bouton de validation **donne le compte avant
  d'appliquer** (« Show 5 transactions »). Filtres actifs = pilules grises, croix au survol.
- **Total contextuel flottant** en bas dès qu'un filtre est actif : « -SGD 7 (6 Transactions) ».
- Catégorie = carré de couleur + mot. Statut = **la prochaine action**, pas un état technique :
  « No receipt », « Ready to export », « Exported ».
- Sélection : la barre d'outils devient « Bulk edit · Actions ⌄ » et une barre flottante en bas
  « 6 selected · Deselect all · Export ». Confirmation par toast « Updated 6 transactions. ».
- Colonnes masquables, réordonnables par glisser l'en-tête, défilement horizontal avec la colonne
  Description figée et deux flèches dans son en-tête.
- Onglet « Review » = la file de travail (ce qui est prêt à exporter) ; vide, il dit « All done ·
  Everything is exported. New transactions will appear here when they are ready to export. »

### 3.4 Détail d'une ligne : la feuille latérale (`flows/transaction-detail/02`)
Ordre : compte et date en petit gris → libellé → **montant en grand** → nom éditable →
Catégorie | Assigné côte à côte → Tags → **Pièces jointes** (ouvert : recherche dans les documents
déjà reçus + zone de dépôt + fichiers) → General et Note repliés → pied avec raccourcis
(`⌘M` « Mark as completed », ↑ ↓ ligne précédente / suivante, `Esc`).
**Aucun bouton « Enregistrer »** : chaque champ s'enregistre au changement, la liste derrière se met
à jour. Un tag inexistant se crée dans le menu (« Create "Expense" »).

### 3.5 Rattacher un fichier : reçus, tickets, factures fournisseurs
C'est leur meilleur parcours. Trois portes, une seule mécanique.
- **Portes d'entrée** : glisser-déposer **n'importe où sur la page** (Transactions, Inbox, Vault) ;
  une **adresse e-mail dédiée** à l'équipe (`xxxx@inbox.midday.ai`) où l'on transfère ses reçus ;
  Gmail / Outlook connectés (les reçus sont repérés seuls, les newsletters ignorées) ; Slack,
  WhatsApp, Telegram, iMessage (photo du ticket) ; zone de dépôt dans la fiche d'une transaction.
- **Un seul toast qui change de texte** au lieu d'une pile : « Uploading 1 files 100 % · Files will
  be matched to transactions automatically » → « Processing 1 receipt… Looking for matching
  transactions » → « ✓ Processing complete · No matching transactions found ».
- **Inbox** = liste de cartes à gauche (fournisseur, montant, date, badge ; ~6 mots) et aperçu du
  PDF à droite (`flows/inbox/04`). Badges mono gris : Pending → Analyzing → Suggested match →
  Matched → Done. Sous l'aperçu, la proposition : « Supabase · $5.10 · Mar 6, 2024 · 87 %
  confidence · ✓ Confirm · ✕ Decline ». Sinon « Select a transaction » (recherche, la première
  marquée « Best Match »).
- **Rien ne correspond** : pas d'alerte. Infobulle « We didn't find a match yet — we'll check again
  when new transactions arrive ». Après 90 jours, le code clôt en `no_match`.
- Onglet « Other » : les documents non financiers (contrats, notifications) mis de côté.
- « ⋯ » : Mark as done, **Retry Matching**, Edit (modale à 2 champs : nom, montant), Download,
  Copy link, Blocklist (domaine ou e-mail à ne plus lire), Delete.
- **Vault** : grille de cartes, titre et description de 2 lignes écrits par l'IA, tags ; « Related
  Files » ; badge jaune « Processing incomplete » + « Re-analyze document » quand l'IA a échoué. Le
  fichier reste toujours accessible.

### 3.6 Créer une personne, une structure, un membre
- **Client** dans la feuille latérale : section « General » ouverte (nom, e-mail, e-mail de
  facturation en puces, téléphone, site, contact), « Details » repliée (adresse, TVA, tags, note).
  **L'adresse se tape une fois** dans « Search for an address » et remplit rue, ville, code postal,
  pays.
- **La fiche se complète seule après coup** à partir du site web (secteur, type, effectif, siège,
  heure locale, liens) : une API de données d'entreprise, pas un LLM, avec des contrôles (résultat
  jeté si le domaine ne correspond pas) et un geste « clear » pour tout effacer.
- **Fiche client** : quatre chiffres (Total, Payé, Restant, Nombre de factures) puis la liste des
  factures datées. Bandeau de liste : « Most Active Client », « Inactive Clients », « Top Revenue
  Client », « New Customers », chacun sur 30 jours.
- **Portail client** : un interrupteur donne un lien public où le client voit et paie ses factures.
- **Membres** : modale « Invite Members », une ligne = e-mail + rôle, « Add more », onglets
  « Team Members / Pending Invitations ».
- **Réglages** : une carte = un réglage (titre, une phrase, contrôle, pied avec aide + « Save ») ;
  la zone dangereuse est en bas, bordure rouge, confirmation en tapant « DELETE », et la modale de
  déconnexion bancaire liste dans un encart ambre ce qui sera effacé.
- **Onboarding** : une décision par écran, illustration à gauche, barre de progression,
  « Skip for now » sur chaque connexion, et des réassurances (« Read-only access · Encrypted ·
  Disconnect anytime »).

### 3.7 La facture est le document (`flows/creating-an-invoice/02` → `/06`)
- La feuille contient le document lui-même : on clique sur « To » ou sur une zone **hachurée**
  (= à remplir) au lieu d'un formulaire. Client et produit se cherchent ou se créent dans la cellule.
- **Enregistrement automatique**, pilule « ✓ Saved » ; le brouillon existe dès le client choisi.
- Réglages (taille, devise, échéance Net 30, TVA, remise, unités, QR code) dans un menu ⚙ qui
  modifie le document **en direct**.
- Le bouton principal **porte le chemin choisi** : « Create & Send », « Schedule (May 20 10:00) »,
  « Recurring (Custom) » ; la récurrence montre les 3 prochaines dates et « 12 invoices total $60 ».
- Détail : client + statut, montant en serif, `Remind · Edit · ⋯`, paires libellé / valeur, lien
  public, **timeline** Created → Sent → Reminder sent → Paid (l'étape à venir en point creux).
- Confirmer seulement ce qui engage : « Send Reminder » et « Cancel series » ont une modale dont le
  bouton reprend le verbe et dont le choix sûr est nommé (« Keep series ») ; marquer payé ouvre
  directement un calendrier ; dupliquer ne demande rien.
- Écran de fin : « Created & Sent », mini-reçu, lien à partager, « Create another ».

### 3.8 Temps, projets
- Total du mois en titre (« 15h 35m », « $330 this month »), calendrier mois/semaine, jours hors mois
  hachurés. On **glisse sur la journée** pour saisir une plage, puis on choisit ou crée le projet.
- Un projet « Billable » porte son taux ; « Create Invoice › période » produit une facture déjà
  remplie (« Landing Page Redesign (01/05 - 31/05) », 12 h × 20 $). Le temps devient de l'argent
  sans ressaisie, et l'accueil le rappelle (« $330 in unbilled time »).

### 3.9 Retours et états
- Toast carré en bas à gauche, une ligne de titre et une de détail, qui peut porter des actions
  (« Export completed · Share URL ⌄ · Download »).
- Bouton grisé tant que le formulaire est incomplet (voir § 5 : à ne pas copier).
- États vides en trois éléments : titre court, une ou deux phrases, un seul bouton.

---

## 4. L'IA de Midday

### 4.1 Trois familles
1. **Invisible, en arrière-plan** (la plus importante) : enrichissement des transactions,
   extraction des reçus, classement des documents, rapprochement, résumé hebdomadaire.
2. **Conversationnelle** : l'assistant de l'accueil, les bots de messagerie, et un serveur MCP qui
   ouvre Midday à Claude, ChatGPT, Cursor.
3. **Autonome planifiée** (« Midday Computer », bêta annoncée, pas de code public) : agents qui
   tournent seuls et **proposent puis attendent l'approbation**.

### 4.2 L'IA invisible, pipeline par pipeline
| Fonction | Ce que voit l'utilisateur | Machine | Garde-fou |
| --- | --- | --- | --- |
| Nom du fournisseur et catégorie d'une transaction | « Analyzing » gris dans la cellule, puis la catégorie | Gemini Flash-Lite, catégories en liste fermée, confiance par champ | Le **code** accepte au-dessus de 0,7 (catégorie) / 0,6 (fournisseur), sinon « non catégorisé » ; ne touche jamais une catégorie posée par un humain ; ne bloque jamais (marqué terminé même en échec) |
| Lecture d'un reçu / d'une facture | Fournisseur, montant, date dans la carte d'Inbox | Mistral Small → Gemini Flash → Gemini Pro en cascade | Score de qualité en code (montant, devise, fournisseur, date critiques), repli sur le texte du PDF ; classement `invoice / receipt / other` d'abord |
| Titre, résumé, date, tags d'un document | Carte du Vault, recherche | Gemini Flash (texte ou image) | Titre spécifique exigé ; ambre + « Retry » si échec ; « A document should never be stuck » |
| **Rapprochement reçu ↔ transaction** | « Suggested match · 87 % · Confirm / Decline » | **Aucun LLM** : score déterministe (montant 30, date 15, nom 10, devise 5 ; écart de TVA reconnu ; pénalités) | Seuil calibré par équipe sur 90 jours de confirmations ; **automatique seulement après 3 confirmations humaines de la même paire**, et désactivé par défaut ; un refus n'est plus reproposé |
| Résumé de la semaine | 2-3 phrases, 4 chiffres, 3-5 actions | Le **code** calcule et choisit les chiffres et anomalies (« slots »), gpt-4.1-mini rédige | « All figures must match exactly » ; texte de secours si l'IA échoue |
| Fiche entreprise d'un client | Bloc « Company Profile » | API de données, pas un LLM | Résultat jeté si le domaine ne correspond pas ; « clear » |

### 4.3 L'assistant
- Entrée : le champ de l'accueil (`+` pièce jointe, éclair = suggestions, `@` = app connectée,
  lien), puis une page de conversation (titre généré, bulle grise pour l'humain, **réponse en texte
  brut sans bulle**, « Midday AI can make mistakes. Please double-check responses. »).
- Suggestions tirées au hasard d'un thème par domaine : « Which invoices are overdue? », « Show
  recurring expenses I could cut », « How many hours did I log this week? ».
- **Pendant le travail** : une pastille par outil avec un libellé humain (« Looking up
  transactions », « Creating invoice »), puis « ✓ Used 2 tools » repliable.
- Rendu : tableau obligatoire dès 3 éléments ; **liens d'entité cliquables** (`#txn:…`, `#inv:…`,
  `#cust:…`) qui ouvrent la fiche ; quand un outil renvoie une facture, **le vrai éditeur de facture
  s'ouvre à côté** et le texte se réduit à « Here's the draft invoice. ».
- 80 outils (les mêmes que MCP), 12 exposés à la fois choisis par similarité, avec un outil
  « search_tools ». Les fichiers joints passent d'abord par la chaîne de l'Inbox : le modèle ne lit
  qu'un résumé, jamais le fichier brut.
- Règles du prompt : aucun chiffre, date, nom ou id inventé ; citer la provenance quand on mélange
  des sources ; tout en brouillon ; demander confirmation avant d'envoyer ou de détruire ; ne jamais
  créer un client en silence (« Did you mean Lost Island AB? ») ; ne jamais toucher le numéro de
  facture ; dates ISO calculées depuis le fuseau de l'utilisateur ; quand il manque une info, **poser
  une question** (« I need Alex's email address… »).
- Limite : la confirmation d'envoi d'une facture repose sur le prompt, pas sur un bouton.

### 4.4 Messagerie et agents
- Bots : notification « facture en retard » → répondre « send reminder » ; « invoice Linear for
  40 hours at $150/h » → brouillon avec aperçu → « send now » ; photo d'un reçu → Inbox. Un prompt
  par plateforme (aucun texte pendant le travail sur WhatsApp, pas de markdown sur iMessage).
- Agents préconstruits annoncés : **Clôture du mois** (du 28 au 31 : non catégorisés, reçus en
  attente, brouillons, P&L comparé), **Relance des factures** (mardi 9 h, classées par urgence,
  relances proposées), **Briefing du lundi**, **Détecteur de dépenses** (silencieux sauf doublon,
  pic ou fournisseur inconnu, base de 90 jours). Mode approbation : « Nothing runs without that
  approval. », trace complète de ce que l'agent a lu et décidé.

### 4.5 La philosophie
1. L'IA **lit, nomme, classe et propose** ; le code **calcule, compare et tranche** (le rapprochement,
   le cœur financier, n'a pas de LLM du tout).
2. L'humain confirme tout ce qui a un effet réel ; l'automatisation n'arrive qu'après avoir appris
   des confirmations de l'humain.
3. Chaque automatisme a une sortie visible : Retry, Pending, Decline, unmatch, clear.
4. L'IA ne bloque jamais : un échec laisse le document, la ligne, la fiche utilisables.
5. Une seule boîte à outils sert l'assistant, MCP et les agents.

---

## 5. Ce qu'il ne faut pas copier
- **Montants alignés à gauche**, sans chiffres tabulaires : comparer deux montants est pénible.
- **Bouton grisé** tant que le formulaire est incomplet, sans dire ce qui manque ; aucun repère
  d'obligation. Notre règle (« * », manques en rouge à l'essai, focus sur le premier) est meilleure.
- Texte coupé net par la colonne (« SGD acc ») ; « State » non recalculé après l'adresse.
- Confirmation d'envoi de facture laissée au modèle.
- Phrases d'aide sous chaque champ dans leurs formulaires récents : le formulaire de transaction est
  devenu bavard (« Enter the transaction amount »).

---

## 6. Où en est PDS OS face à ça

| Sujet | Midday | PDS OS aujourd'hui |
| --- | --- | --- |
| En-tête de page | Pas de titre sur une liste, barre d'outils d'abord | `PageHeader` titre 36 px + phrase d'intro 18 px (« Texte d'introduction sous le titre ») |
| Typographie | 14 px regular, secondaire 12 px gris, medium rare | 16 px courant, 14 px minimum, **medium (500) partout** (décision du 27/09) : tout pèse pareil |
| Détail d'une ligne | Feuille latérale, liste visible, ↑ ↓, enregistrement au champ | **Modale** pour tout (décision du 07/11 : « plus de panneau latéral ») ; formulaire + « Enregistrer » |
| Colonnes | 6 sur 12, choix de l'utilisateur | `DataTable` masque selon la largeur d'écran ; pas de choix de colonnes |
| Recherche universelle | ⌘K résultats + actions | Aucune ; Espace Espace ouvre PO |
| Justificatifs | E-mail dédié, Gmail, dépôt partout, lecture + rapprochement + Confirm/Decline | Champ « Justificatif (photo du ticket, facture) » dans le formulaire d'une dépense ; statut « Sans justificatif » |
| Rapprochement bancaire | Score déterministe, apprend des confirmations | **Même principe** déjà codé (`lib/finance/reconcile.ts` : montant 50, référence 40, partie 25) avec validation humaine ; pas d'apprentissage des confirmations |
| Écriture par l'IA | Brouillon, éditeur réel à côté du chat | **Déjà là et plus strict** : `propose_*` ouvre le vrai formulaire, chiffres et dates vérifiés par le code (`verbatim.ts`, `said-date.ts`) |
| Boîte e-mail | Inbox par équipe | `po@pdsrecords.com` lu en IMAP (`lib/email/inbox.ts`), aujourd'hui pour les réponses aux demandes d'autorisation |
| Champs obligatoires | Bouton grisé | « * » + manques en rouge (meilleur) |
| Fiche entreprise | Complétée seule depuis le site | Saisie à la main dans le Réseau |

On est donc **en avance sur l'IA qui écrit** (propositions vérifiées) et **en retard sur l'IA
invisible** (qui range à notre place) et sur la sobriété des pages.

---

## 7. Appliquer à PDS OS

### 7.1 Règles transverses (design)
Proposées ; celles marquées ⚠ reviennent sur une décision de Sacha et sont à trancher (§ 9).

1. **Page liste sans phrase d'intro** ; titre compact, la barre d'outils juste dessous (règle déjà
   en mémoire « moins de texte », à généraliser à `PageHeader` des listes).
2. ⚠ **Hiérarchie par la graisse** : regular (400) pour le secondaire et les cellules courantes,
   medium pour le nom de la ligne et les titres. Aujourd'hui tout est à 500, donc rien ne ressort.
3. **Colonnes choisies** : `DataTable` gagne un menu « Colonnes » (par table, mémorisé par
   personne en base) ; défaut = 5-6 colonnes.
4. **Statut = prochaine action** (« Sans justificatif », « À rapprocher », « Prêt pour le
   comptable », « Exporté ») au lieu d'un état technique ; une cellule vide = à faire.
5. **Couleur réservée à la donnée** (déjà notre direction en Finance depuis le 13/11) ; montants
   **alignés à droite en chiffres tabulaires** (on garde ce que Midday rate).
6. **Total contextuel** sous un tableau filtré (« 12 dépenses · 4 830 € ») et **barre de sélection
   flottante** (« 3 sélectionnées · Exporter · Catégoriser »).
7. **Un toast qui évolue** pour les traitements longs (envoi → lecture → rapprochement → résultat),
   pas une pile.
8. **États vides positifs** : « Tout est rapproché », « Aucun justificatif en attente ».
9. ⚠ **Fiche latérale pour le détail d'une ligne de liste** (dépense, transaction, contact,
   fichier) : liste visible, ↑ ↓ pour enchaîner, modification au champ ; la modale reste pour un
   **geste** (révoquer, confirmer, créer). Variante si on garde la modale : modale de détail avec
   ↑ ↓ et sans « Enregistrer » pour les champs simples.
10. **Mono pour la donnée machine** (montants du détail, références, ISRC, n° de facture) ; un seul
    moment « éditorial » par page au plus.

### 7.2 Finance
- **Boîte à justificatifs** (le parcours phare) :
  - portes : glisser-déposer partout sur Dépenses et Rapprochement ; adresse dédiée
    (`justificatifs@` ou alias de po@ lu par `lib/email/inbox.ts`) où l'équipe transfère ses
    tickets ; plus tard WhatsApp (l'équipe vit dessus) ;
  - lecture par l'IA (fournisseur, montant TTC, TVA, date, n° de facture) **comme une proposition** :
    montant et date **retrouvés tels quels dans le texte du PDF** par le code (`unpdf` + logique de
    `verbatim.ts`), sinon affichés « à vérifier » ; une photo sans texte passe toujours par la
    vérification humaine (règle 6 : l'IA ne produit pas un montant) ;
  - rapprochement **par le code** avec la dépense existante (montant, date, fournisseur du Réseau)
    ou la transaction bancaire, carte « Proposé : SNCF · 84,20 € · 12/11 · Confirmer / Écarter » ;
    rien → « En attente, on réessaie à chaque nouvelle dépense ou relevé », jamais une alerte ;
  - « Créer la dépense » pré-remplie quand le justificatif ne correspond à rien (le `propose_*` de
    PO existe déjà pour les dépenses) ;
  - « Autres documents » pour ce qui n'est pas une pièce comptable.
- **Rapprochement qui apprend** : mémoriser chaque confirmation (libellé bancaire « PRLV SEPA
  SNCF… » ↔ fournisseur SNCF du Réseau) et chaque refus, en code ; au bout de 3 confirmations d'une
  même paire, proposer « Rapprocher automatiquement la prochaine fois » (jamais seul avant).
- **Catégorisation proposée** des transactions et dépenses (poste, enveloppe) : d'abord par
  l'historique (même fournisseur → même poste, du code), l'IA seulement en secours, sur une liste
  fermée, acceptée au-dessus d'un seuil fixé par le code, jamais sur une catégorie posée par
  quelqu'un ; état « Analyse… » dans la cellule.
- **File « À traiter »** comme leur onglet Review : sans justificatif, à rapprocher, prêt pour le
  comptable ; puis « Envoyer au comptable » (export + e-mail, rangé dans les fichiers).
- **Recherche en phrase** : « dépenses sans justificatif de novembre » → pilules de filtres que le
  code valide (valeurs de liste fermée, dates par `said-date.ts`) ; l'utilisateur voit ce qui a
  été compris et défait une pilule.
- **Agents de Finance en mode approbation** (plus tard) : clôture du mois, relance des encaissements
  en retard (préparée par PO, envoyée par un humain), détecteur de dépense inhabituelle (doublon,
  fournisseur inconnu, pic) qui alimente l'onglet Alertes.
- **Résumé de la semaine** pour le DG : chiffres et anomalies choisis par le code, phrases écrites
  par le modèle à partir de ces valeurs, texte de secours sans IA.

### 7.3 Autres parties
- **Réseau** : créer une structure en tapant son nom ou son SIRET → raison sociale, adresse, TVA
  intracommunautaire, code NAF remplis depuis l'**API Recherche d'entreprises** (data.gouv, gratuite,
  sans clé) ; adresse par la **Base Adresse Nationale** ; source affichée (« Annuaire des
  entreprises ») et effaçable. C'est exactement notre règle « ne jamais faire retaper ».
  Fiche d'une personne : quelques chiffres (projets, contrats, montants dus) puis la liste.
- **Catalogue et fichiers** : titre, résumé et tags proposés pour chaque fichier déposé (contrat
  signé, visuel, stems, bon de commande) ; « Analyse incomplète · Réessayer » sans jamais bloquer le
  fichier ; « Fichiers liés ».
- **Juridique / Contrats** : contrats signés et autorisations reçus par e-mail rangés dans une file
  « Reçus » (on lit déjà la boîte de po@) avec rattachement proposé au contrat ou à l'autorisation,
  confirmé par un humain ; un contrat reste un document qu'on lit, jamais une clause écrite par l'IA.
- **Production / Marketing** : devis et factures de prestataires déposés → lecture → rattachement
  proposé à la ligne de budget du projet.
- **Projets** : la Vue d'ensemble peut prendre leur accueil (une phrase d'état calculée par le code
  qui tourne, quelques tuiles chiffre + 2-4 mots, actions rapides).
- **Accueil** : remplacer les blocs de texte par la phrase qui tourne (« 3 dépenses sans
  justificatif », « 2 contrats à signer », « 1 projet attend ta validation ») ; chaque phrase est un
  lien vers la file concernée.
- **⌘K** : recherche universelle avec actions mélangées aux résultats (« Nouvelle dépense »,
  « Nouveau contact »), et en dernière ligne « Demander à PO : … ».

### 7.4 PO : ce qu'on prend de leur assistant
- Pastilles d'outils en libellés humains pendant le travail (« Lecture des dépenses ») puis
  « ✓ 2 lectures » repliable : rend visible ce que PO a lu (on a déjà la provenance par le code).
- Liens d'entité cliquables dans les réponses (une dépense, un contrat, une personne).
- Tableau dès 3 éléments ; réponse d'une ligne quand un formulaire s'ouvre à côté.
- Suggestions de questions tirées par domaine **selon la page** où l'on est.
- Pièce jointe dans PO (déjà des images depuis le 13/11) → passe par la boîte à justificatifs quand
  c'est une pièce comptable.
- Ce qu'on garde de chez nous : la validation par le bouton « Enregistrer » d'un humain, jamais par
  le prompt.

---

## 8. Ordre proposé
1. **Socle visuel des listes** : `PageHeader` de liste sans intro, menu « Colonnes » de `DataTable`,
   statuts « prochaine action », total contextuel, barre de sélection flottante, montants à droite
   (et, si Sacha le valide, la graisse regular pour le secondaire). Un pattern modifié l'est partout.
2. **Boîte à justificatifs** en Finance (dépôt partout, lecture vérifiée, rapprochement proposé,
   Confirmer / Écarter, file « À traiter ») : la fonctionnalité qui montre le plus le gain.
3. **Rapprochement qui apprend** + catégorisation proposée.
4. **Réseau pré-rempli** par l'annuaire des entreprises et la Base Adresse Nationale.
5. **⌘K** et phrase d'état de l'accueil.
6. Fichiers analysés (Catalogue, Contrats), puis agents en mode approbation.

## 8 bis. Protos du 15/11/2026

Copies sur le Bureau (`~/Desktop/Protos PDS OS/`), tests dans `docs/protos/tests/justificatifs.cjs` et
`nouveau-design.cjs` (`PROTO=<fichier>` tant qu'ils ne sont pas validés et recopiés dans `docs/protos/`).

- **Boîte à justificatifs** : Finance › Banque et comptabilité › Justificatifs ; adresse à copier,
  dépôt n'importe où, toast qui évolue, liste + document, « Ce que PDS OS a lu » avec source et
  « Modifier », proposition calculée par le code (raisons : même montant, référence, fournisseur,
  jour), photo « À vérifier » avant toute recherche, doublon, « Autres documents », Dépenses avec
  colonne Justificatif et détail en fiche latérale ou en modale (bascule du proto). Le ticket d'Ibé
  range « récupération des justificatifs » en P2 (« Synchronisation avancée »).
- **Nouveau design** (bascule « Aujourd'hui / Nouveau ») sur Accueil, Projets, Vue d'ensemble,
  Master › Brief, fiche contact, Finance. Valeurs proposées : texte courant 15 px, cellules 14 px,
  légende 13 px, pastille 12 px ; regular (400) par défaut, medium (500) pour ce qui ressort,
  semi-bold réservé ; titre de page 28 px, de module 24 px, salutation 36 px ; boutons 34 px à 8 px
  d'arrondi ; champs 34 px à 6 px ; cartes et tableaux 8 px, modale 12 px ; en-tête de tableau
  sans bandeau gris, 13 px ; pas de phrase sous un titre de liste ; état = point + mot, la pastille
  pleine restant aux catégories ; menu « Colonnes » sur les listes.

- **Finance à la Midday** (`PDS OS - Finance à la Midday.html`, test `finance-midday.cjs`) : la
  section refaite de zéro, sans nos règles de design. Navigation Vue d'ensemble, Rapports,
  Transactions (rapprochement Qonto et export comptable), Justificatifs, Dépenses, Budgets,
  Factures, Planning, Financements ; alertes dans la cloche, ⌘K. Détail en fiche latérale avec
  modification au champ et historique ; serif pour les moments, mono pour les montants, coins
  droits. Trésorerie, point bas et moteurs (Orchard 52 000 € / 12 titres, PDS MIC, SHOW, VERSUS,
  Pay Later, part J4Y, aide CNM) calculés par le code ; décaler l'émission #10 recalcule tout.
  Justificatifs en grille d'aperçus ou en liste (sans vignette), mêmes mots et même barre que
  Transactions. Version à coins droits enregistrée (`docs/protos/finance-midday-coins-droits.html`) ;
  `docs/protos/finance-midday.html` se lit par versions cumulatives (sélecteur « Version ») :
  v1 Midday (coins droits, serif, mono) ; v2 Arrondi (cartes et tableaux 8 px, boutons et champs
  6 px, étiquettes 4 px, modales 10 px) ; v3 Typo (titres en Google Sans Flex) ; v4 Légende (sous
  les camemberts) ; v5 Design system (gris et tons d'état de `app/globals.css`, sélection bleue,
  modale verre et toast de l'app, montants en Google Sans à chiffres tabulaires) ; v6 Accueil en
  cartes (salutation à gauche, 8 cartes-phrases menant à leur page, PO en bas avec « Je veux… ») ;
  v7 Graphiques (dessinés à la taille de leur carte, textes 13 px plus foncés, camembert agrandi).

## 9. À trancher par Sacha
1. **Fiche latérale ou modale pour le détail d'une ligne** (décision du 07/11 : modale partout).
   Recommandation : fiche latérale pour consulter et corriger une ligne de liste en enchaînant ; la
   modale pour un geste.
2. **Graisse minimale** (décision du 27/09 : medium partout). Recommandation : regular pour le
   secondaire et les cellules, medium pour ce qui doit ressortir ; garder 16 px.
3. **Enregistrement au champ** dans une fiche (catégorie, assigné, note) au lieu d'« Enregistrer ».
4. **Adresse de dépôt des justificatifs** : alias de po@ ou boîte dédiée ; WhatsApp plus tard ?
5. **Données publiques d'entreprise** (API data.gouv) : nouvelle source externe, un seul point
   d'entrée dans `lib/`.
