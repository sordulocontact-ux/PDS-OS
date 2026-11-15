# Problèmes consolidés (test du 12/11/2026, module Business et Budget de PDS OS)

Contexte : PDS OS est l'outil interne d'un label (3 à 5 personnes). Le module Business sert aux négociateurs (business manager, business developer) à tenir leurs deals avec les artistes (étapes, termes négociés, calls, contacts) et à la direction à valider les accords de principe et à tenir l'enveloppe budgétaire de chaque artiste. Un accord mal validé ou une négociation mal notée engage le label vis-à-vis d'un artiste ; les négociateurs vivent au téléphone et veulent noter vite.

Participants simulés : 3 sessions exploitables — Malik (business manager, aisance 3, pressé, 1366×768), Élise (business developer, aisance 4, exploratrice, 1440×900), Claire (directrice générale, aisance 2, prudente, lit tout, 1280×800). Une 4e session (cheffe de projet au clavier) n'a pas pu avoir lieu (serveur bloqué).

Issues vérifiées en base : Malik 5/5 réelles ; Élise 1/4 (T1, T3, T4 non faisables) ; Claire 4/4 réelles mais avec doutes.

## P1 — Un négociateur ne peut pas ouvrir de négociation, et rien ne le lui dit

- Élise (T1, échec, SEQ 2) cherche à suivre une nouvelle artiste comme négociation. Aucun bouton dans Deals, Artistes ou la fiche contact. Elle finit par créer l'artiste comme contact dans le Réseau (doublon : l'artiste existe déjà au catalogue, qu'elle n'a pas vue), sans pouvoir ouvrir la négociation.
- Verbatims : « Ah, donc je peux pas ? Ok mais dis-le moi. » ; « J'ai créé la fiche, mais pas la négociation. C'est qui qui décide ça ? »
- Règle : seule la direction ou le responsable d'un projet ouvre un deal.

## P2 — Les coordonnées d'un contact privé s'affichent « non renseigné »

- Élise (T3, échec, SEQ 3) ouvre la fiche de la manageuse d'une artiste. Un encadré dit « Coordonnées privées · Malik Durand les partage deal par deal », mais juste dessous, e-mail, téléphone et ville affichent « non renseigné » (alors qu'ils sont renseignés, seulement masqués). Aucun moyen de demander le partage depuis la fiche.
- Verbatim : « Ok, c'est verrouillé, au moins c'est écrit. Mais je ne peux pas demander à Malik d'ici. »

## P3 — Un deal abandonné est une impasse sans explication

- Élise (T4, abandon, SEQ 2) veut reprendre une négociation abandonnée. La page n'offre aucune action, ne dit pas que l'abandon est définitif ni à qui s'adresser.
- Verbatim : « Sur HubSpot je rouvre en un clic. Là, rien. Je dois demander à quelqu'un, mais je ne sais pas qui. »

## P4 — Soumettre un accord à la direction demande deux boutons enchaînés, sans confirmation que la direction est prévenue

- Malik (T4, succès, SEQ 5) : depuis « Call prévu », il doit cliquer « Démarrer la négociation » puis « Proposer l'accord de principe ». Pas de récapitulatif, pas d'indication que Claire est prévenue.
- Verbatim : « Je ne sais pas si Claire reçoit un message. »

## P5 — Valider un accord : un seul clic, retour peu visible, deux demandes semblables sur l'accueil

- Claire (T1, succès difficile, SEQ 5) hésite entre deux lignes « Valider l'accord de principe » quasi identiques sur l'accueil (une grande carte, une petite ligne), ne les distinguant que par le nom de l'artiste. Le bouton valide d'un clic sans récapitulatif ; le message de confirmation (toast) n'est pas vu, la page change.
- Verbatims : « Je ne voudrais pas valider la mauvaise. » ; « Est-ce que c'est enregistré, là ? »

## P6 — Changer de négociateur : l'action est en bas de page, et le changement est définitif

- Claire (T2, succès difficile, SEQ 4) cherche près du nom en haut, doit faire défiler toute la page jusqu'au bloc « Négocié par » pour trouver « Changer », en évitant le gros bouton de validation du haut. Impossible d'indiquer que c'est pour deux semaines.
- Verbatims : « Je ne touche pas à ce bouton du haut, je n'ai rien relu. » ; « Il faudra que je pense à le rendre à Malik. »

## P7 — Le budget d'un artiste : introuvable depuis « Dépenses », reste négatif inexpliqué, geste « prévoir » ambigu

- Claire (T3, succès avec doutes, SEQ 3) ouvre « Dépenses » (liste de lignes, aucun reste), revient en arrière jusqu'à la fiche artiste, onglet Business. Elle y lit « Reste : −7 178 € HT » sur une enveloppe de 40 000 € : l'enveloppe compte aussi les dépenses des projets de l'artiste, ce qu'elle ne comprend pas. Pour « prévoir 5 000 € de cours de chant », elle hésite entre augmenter l'enveloppe et ajouter un poste, fait les deux.
- Verbatims : « Ce n'est pas ça, je ne vois pas ce qui reste. » ; « Moins 7 178 euros ? Le budget est déjà dépassé. » ; « Je crois que c'est bon, mais je ne suis pas sûre d'avoir bien fait. »

## P8 — La prochaine action demande deux dates pour une seule intention

- Malik (T2, succès difficile, SEQ 4) : pour « rappeler vendredi », le formulaire propose « Pour le » et « Relancer le ». Une date est d'abord tombée sur 06/11 (champ date natif), il a dû la retaper.
- Verbatim : « Il a mis 06/11, c'est n'importe quoi. »

## P9 — « Terme enregistré » s'affiche avant que la nouvelle valeur apparaisse

- Malik (T2) : le message de succès apparaît alors que la ligne affiche encore 18 % pendant quelques secondes (serveur de développement lent).
- Verbatim : « Attends, il a enregistré là ou pas ? »

## P10 — L'heure du call et le téléphone du contact sont tout en bas de la fiche du deal

- Malik (T3, succès, SEQ 5) : en haut seulement « Dim. 15/11 » ; l'heure et le numéro sont dans les sections Calls et Contacts en bas, après un long défilement.
- Verbatim : « J'ai scrollé longtemps sans savoir si ça existait. »

## P11 — Déclarer une dépense avancée de sa poche : pas de notion de remboursement, « Sans justificatif » inexpliqué

- Malik (T5, succès, SEQ 5) remplit un formulaire long, met « avancé par moi » dans la note faute de champ ; une étiquette jaune « Sans justificatif » apparaît sans explication.
- Verbatim : « Je ne sais pas si l'app sait que c'est moi qu'il faut rembourser. »

## P12 — Lenteurs : clics sans effet visible, export PDF long sans aperçu

- Claire (T4) : un premier clic sur un onglet sans effet visible ; « Exporter en PDF » met longtemps, puis « PDF téléchargé » sans ouvrir le document. Malik : « Allez, ça charge. » Environnement : serveur de développement sur une machine très chargée.
- Verbatims : « J'ai dû mal cliquer. » ; « Je ne sais pas si ça contient tout ce qui a été convenu. »

## P13 — La fenêtre de bienvenue intercepte le premier clic

- Malik : à la première connexion, une fenêtre de bienvenue a absorbé son premier clic sur un deal.
