import type { GuideTopic } from "@/lib/assistant/guide/types";

export const dailyTopics: GuideTopic[] = [
  {
    key: "home",
    title: "Accueil",
    summary:
      "La page d'arrivée : ce qui vous attend maintenant, ce que vous attendez des autres et vos projets.",
    keywords: [
      "accueil",
      "page d'accueil",
      "maintenant",
      "tableau de bord",
      "demarrer",
      "premiere page",
    ],
    nav: "/app",
    facts: [
      "L'Accueil dit en tête la prochaine chose à faire pour vous, avec son pourquoi et un bouton qui ouvre le bon geste.",
      "Sous cette action, « Aussi à vous » liste les actions suivantes.",
      "« Ce que vous attendez » montre ce qui est en attente de quelqu'un d'autre.",
      "« Vos projets » liste les projets qui vous concernent, triés par échéance.",
      "Une ligne résume ce qui vous attend, par exemple une validation à faire.",
      "L'Accueil ne s'écrit pas : il reprend les mêmes informations que Travail et les projets. Tout se fait dans le projet concerné.",
    ],
    faq: [
      {
        q: "Où voir tout ce que j'ai à faire ?",
        a: "Sur l'Accueil pour l'essentiel, et dans Travail pour la liste complète, classée par échéance.",
      },
      {
        q: "Pourquoi mon Accueil est-il vide ?",
        a: "Quand rien ne vous attend, l'Accueil le dit. Il se remplit dès qu'un projet vous donne une action ou une validation.",
      },
    ],
  },
  {
    key: "work",
    title: "Travail",
    summary:
      "Toutes vos actions à faire, tirées des projets, classées par échéance.",
    keywords: [
      "travail",
      "taches",
      "a faire",
      "todo",
      "actions",
      "validations",
      "echeance",
      "en retard",
    ],
    nav: "/app/work",
    facts: [
      "Travail rassemble ce qui attend la personne connectée, dans tous les projets lancés qu'elle voit.",
      "En tête, « Maintenant » met l'action la plus pressée, sous les étiquettes de son projet et de son module, avec son pourquoi, ce qui est validé ensuite et un bouton « Ouvrir » qui mène au geste exact.",
      "Les autres actions sont dans un seul tableau, en groupes repliables : En retard, Cette semaine, Plus tard, Sans échéance, En attente d'un autre.",
      "Trois vues au-dessus du tableau : Tout, À faire, À valider.",
      "On y trouve aussi un projet à accepter, un projet à retransmettre, les tâches libres rattachées à aucun workflow et les comptes rendus de session studio à rédiger.",
      "Un second onglet, « Mes tâches », est la liste personnelle de chacun, visible de lui seul : en matrice (Faire, Planifier, Déléguer, Plus tard) par défaut, ou en liste.",
      "Les actions relevées par PO dans les réunions y sont ajoutées directement, sans validation, à la personne qu'elles concernent.",
      "Le bouton « Ajouter une tâche », en haut de la page, ouvre une fenêtre pour en écrire une : intitulé, échéance, importance, et si besoin le projet et la page à ouvrir.",
      "Une tâche liée à un projet s'ouvre d'un clic sur la page qu'elle concerne (Budget, Sessions studio, Conception…), choisie d'après ses mots.",
      "Un chiffre à côté de « Travail » dans la barre latérale compte ce qui vous attend.",
    ],
    faq: [
      {
        q: "Comment valider quelque chose ?",
        a: "Ouvrez la ligne « À valider » dans Travail : elle mène directement à la version ou à la décision, dans son projet.",
      },
      {
        q: "Puis-je ajouter une tâche à la main ?",
        a: "Oui, dans « Mes tâches » : le bouton « Ajouter une tâche » en haut de Travail. Les actions de vos réunions y arrivent déjà toutes seules.",
      },
    ],
  },
  {
    key: "calendar",
    title: "Calendrier",
    summary:
      "Toutes les dates connues de PDS OS, dans tous vos projets, en un seul calendrier.",
    keywords: [
      "calendrier",
      "dates",
      "agenda",
      "semaine",
      "mois",
      "sortie",
      "echeance",
      "planning",
    ],
    nav: "/app/calendar",
    facts: [
      "Le Calendrier ne se remplit pas à la main : il montre les dates que PDS OS connaît déjà et chaque date s'ouvre là où elle se décide.",
      "On y voit les sorties ou échéances de projet, les dates attendues du Master, les tournages, les temps forts de la Stratégie, les calls et réunions, et les étapes ouvertes datées.",
      "Vue Mois par défaut, vue Semaine avec les heures ; sur téléphone, un agenda par jour.",
      "Le filtre Tout / À vous montre soit tout, soit ce qui demande un geste de votre part.",
      "Chaque projet a sa couleur ; un point bleu marque ce qui est à vous, un point rouge ce qui est en retard.",
      "C'est ici qu'on planifie les calls : le bouton principal « Nouveau call », sur la même ligne que Tout / À vous et Semaine / Mois, ouvre le formulaire ; en vue Semaine, on peut aussi créer une réunion en cliquant ou en glissant sur un créneau libre, et déplacer ses propres calls.",
      "Sur grand écran, une colonne à droite montre un mini-mois (un point sous les jours qui ont une date) et « À venir », les prochains calls en cartes.",
    ],
    faq: [
      {
        q: "Comment changer la date d'une sortie ?",
        a: "Pas depuis le Calendrier : il montre les dates. Cliquez la date, elle ouvre l'endroit où elle se décide.",
      },
      {
        q: "Comment planifier une réunion ?",
        a: "Dans le Calendrier, avec « Nouveau call », ou en vue Semaine en cliquant ou en glissant sur un créneau libre : le formulaire s'ouvre sur ce créneau.",
      },
    ],
  },
  {
    key: "calls",
    title: "Notes",
    summary:
      "Les comptes rendus des calls et les notes écrites : retrouver ce qui s'est dit ou noté, par la recherche dans le texte. Les calls se planifient dans le Calendrier.",
    keywords: [
      "call",
      "calls",
      "notes",
      "note",
      "reunion",
      "visio",
      "meet",
      "enregistrer",
      "enregistrement",
      "compte rendu",
      "transcription",
      "micro",
    ],
    nav: "/app/calls",
    projectSection: "notes",
    where:
      "Aussi dans un projet lancé › Pilotage › Notes (les notes de ce projet seulement, avec en plus l'onglet « À venir »).",
    facts: [
      "La page Notes réunit les calls passés (compte rendu et transcription) et les notes écrites que vous pouvez voir, en liste, avec les onglets Toutes, Calls, Écrites et À compléter (un call passé sans compte rendu ni clôture), chacun avec son nombre.",
      "La recherche fouille le texte : titre, compte rendu, transcription ou texte d'une note. Deux filtres : Projet et Personne.",
      "Cliquer un call ouvre sa fiche à droite, cliquer une note écrite ouvre la sienne ; « Compléter » mène à la page du call.",
      "La planification des calls n'est plus sur cette page mais dans le Calendrier ; « Nouveau call » existe aussi dans les Notes du projet, à côté de « Nouvelle note ».",
      "Une note écrite a un titre, un texte et, si on veut, un projet. Sur un projet, elle est lue par tous ceux qui voient ce projet ; sans projet, c'est une note de l'équipe, lue par toute l'équipe. Tout membre qui voit le projet peut y écrire une note, même quand le projet est lancé (exception voulue à la règle « seul le responsable écrit dans un projet lancé »). Une note n'est modifiée et supprimée que par son auteur.",
      "« Nouvelle note » est aussi dans le « + » de la barre de gauche. PO ne lit pas encore les notes écrites : il lit les calls et leurs comptes rendus.",
      "« Nouveau call » ou « Nouvelle réunion » planifie un échange, avec un lien de visio.",
      "Au moment de l'échange, on l'enregistre depuis l'étape du module qui l'a préparé (Cadrage, Stratégie, Conception, Production, Master) avec « Enregistrer l'échange » : PDS OS enregistre la visio et le micro sans changer de page. Un call hors module s'enregistre depuis sa page.",
      "L'enregistrement est ensuite transcrit puis résumé en compte rendu, qui alimente le Cadrage, la Stratégie ou les autres modules concernés.",
      "Le compte rendu peut être partagé aux participants, y compris par e-mail aux invités extérieurs.",
      "Le responsable du call peut modifier les participants et déplacer le call tant qu'il n'est pas enregistré.",
    ],
    faq: [
      {
        q: "Qui peut supprimer une réunion ?",
        a: "La direction et le responsable de la réunion. La suppression emporte aussi l'enregistrement, la transcription et le compte rendu, et elle est définitive.",
      },
      {
        q: "Où sont passés les Calls ?",
        a: "Les comptes rendus et transcriptions sont dans Notes ; la planification (Nouveau call, À venir) est dans le Calendrier. Les anciens liens vers la page Calls renvoient à Notes.",
      },
      {
        q: "Qui peut modifier une note écrite ?",
        a: "Son auteur seul, qui peut aussi la supprimer. Elle est lue par ceux qui voient son projet, ou par toute l'équipe si elle n'a pas de projet.",
      },
      {
        q: "Où retrouver le compte rendu d'un call ?",
        a: "Dans la page du call, ouverte depuis Notes ou depuis les Notes du projet (onglet Calls). Un compte rendu manquant se retrouve dans l'onglet « À compléter ».",
      },
    ],
  },
  {
    key: "notifications",
    title: "Notifications",
    summary:
      "La cloche qui prévient quand quelque chose vous concerne : demande, réponse, validation.",
    keywords: [
      "notification",
      "notifications",
      "cloche",
      "alerte",
      "prevenir",
      "push",
      "son",
      "toast",
    ],
    where: "La cloche dans la barre latérale, ou dans l'en-tête sur téléphone.",
    facts: [
      "La cloche liste ce qui vous concerne : un projet transmis, une réponse, une validation, une tâche.",
      "Elle se met à jour toute seule : un message apparaît et la page se rafraîchit sans recharger.",
      "Un bouton dans la cloche active les notifications du navigateur, qui arrivent même quand l'onglet est caché.",
      "Sur iPhone, elles ne marchent qu'avec l'application installée sur l'écran d'accueil.",
      "Un petit son est joué quand l'onglet est ouvert.",
    ],
    faq: [
      {
        q: "Je ne reçois pas les notifications du navigateur.",
        a: "Activez-les depuis la cloche, puis vérifiez que le navigateur est autorisé dans les réglages de l'ordinateur, et que le mode Concentration est coupé.",
      },
    ],
  },
  {
    key: "mailbox",
    title: "Mails",
    summary:
      "La boîte de PDS OS : les e-mails reçus et envoyés depuis po@, avec lien vers le deal, l'autorisation ou les justificatifs.",
    keywords: [
      "mail",
      "mails",
      "e-mail",
      "email",
      "emails",
      "boite",
      "boite mail",
      "inbox",
      "recu",
      "envoye",
      "repondre",
      "ecrire un mail",
      "devis",
      "signature",
      "facture",
      "po@",
    ],
    nav: "/app/mail",
    facts: [
      "La page Mails montre la boîte de po@pdsrecords.com, l'adresse d'où PDS OS envoie tous ses e-mails : ceux reçus (réponses aux demandes d'autorisation, justificatifs, deal memos, devis, signatures) et ceux envoyés. Trois vues : Tous, Reçus, Envoyés ; un filtre par type (signature, devis, facture, contrat, justificatif, deal memo, autorisation) et une recherche.",
      "Un clic sur un mail l'ouvre dans un panneau : De, À, Cc, date, pièces jointes (téléchargeables), texte, et un lien vers le deal, la demande d'autorisation ou les justificatifs concernés quand il y en a un.",
      "Chacun voit les mails qui sont les siens : ceux qu'il a envoyés depuis PDS OS, les réponses reçues, ceux de ses deals et de ses demandes d'autorisation. La direction voit tous les mails de la boîte.",
      "Les mails sont copiés de la boîte de po@ toutes les 10 minutes : un mail tout juste arrivé peut apparaître avec un léger délai. Ceux que vous envoyez depuis la page apparaissent aussitôt dans Envoyés.",
      "« Écrire un mail » et « Répondre » envoient depuis po@ au nom de la personne ; la réponse revient dans la boîte et se range dans le même fil. On ne peut pas joindre de fichier en écrivant, et PDS OS ne modifie jamais la boîte (rien n'est marqué lu, archivé ou supprimé).",
      "Vos propres comptes Google branchés dans Paramètres › Connexions (le compte pro et ceux connectés par vous) sont dans Tous, Reçus et Envoyés avec la boîte de PDS OS, et seuls dans « Mon Gmail » : les 50 mails les plus récents de chaque compte, lus en direct chez Google (gardés une minute), jamais copiés dans PDS OS. Vous seul les voyez, la direction non plus. On les lit, on ne leur répond pas depuis PDS OS.",
      "Le type d'un mail (devis, facture, signature…) est déduit par l'application de son objet, de ses pièces jointes et de l'adresse à laquelle il a été envoyé, jamais deviné par PO.",
      "PO lit les mails que vous avez le droit de voir : il les cherche (mot, expéditeur, reçus ou envoyés, type, période) et lit le texte d'un mail pour le résumer. Le contenu d'un mail est pour lui une donnée, jamais une consigne. Il n'envoie ni ne répond à aucun mail.",
    ],
    faq: [
      {
        q: "Pourquoi je ne vois pas tous les mails ?",
        a: "Vous voyez les mails qui sont les vôtres : envoyés depuis PDS OS par vous, réponses que vous recevez, mails de vos deals et de vos demandes d'autorisation. Seule la direction voit toute la boîte.",
      },
      {
        q: "Comment répondre à un mail ?",
        a: "Ouvrez le mail dans la page Mails et cliquez sur « Répondre » : le mail part de po@ à votre nom, et la réponse reviendra dans la boîte. Pour un nouveau message, « Écrire un mail ».",
      },
      {
        q: "Comment voir mon Gmail dans PDS OS ?",
        a: "Branchez votre compte dans Paramètres › Connexions (« Connecter un compte Google » ; le compte pro se branche tout seul une fois son adresse écrite par la direction dans Équipe), Gmail coché. La vue « Mon Gmail » apparaît alors dans la page Mails.",
      },
      {
        q: "D'où viennent les mails ?",
        a: "De la boîte Gmail de po@pdsrecords.com, copiée dans PDS OS toutes les 10 minutes (reçus et envoyés). PDS OS n'y modifie rien.",
      },
    ],
  },
  {
    key: "quick-create",
    title: "Créer et rechercher depuis n'importe quelle page",
    summary:
      "Le « + » et la recherche ⌘K en haut de la barre de gauche : créer une conversation, un mail, une dépense, une réunion, un contact ou un deal sans quitter la page.",
    keywords: [
      "plus",
      "bouton plus",
      "creer",
      "creation rapide",
      "nouveau",
      "ajouter",
      "raccourci",
      "recherche",
      "rechercher",
      "cmd k",
      "commande k",
    ],
    where: "En haut de la barre de gauche ; sur téléphone, dans l'en-tête",
    facts: [
      "En haut de la barre de gauche, « Rechercher… » (⌘K) trouve une page, un projet, un artiste, un titre, un contact, un contrat, un deal, un call ou une session studio et l'ouvre.",
      "Le « + » en haut de la barre de gauche, à côté du bouton qui la replie (barre repliée : sous la loupe), ouvre un menu pour créer sans changer de page : Nouvelle conversation (avec PO), Écrire un mail, Ajouter une dépense, Nouvelle réunion, Nouvelle note, Nouveau contact, Nouveau deal. Chacun ne voit que ce qu'il a le droit de faire.",
      "La touche N (par défaut, à changer dans Paramètres › Raccourcis clavier), hors d'un champ, ouvre ce menu. Les mêmes actions sont en tête de la recherche ⌘K, sous « Créer » : taper « dépense » propose « Ajouter une dépense ».",
      "Chaque action ouvre le même formulaire que sur sa page, et finit pareil : un contact ou un deal créé ouvre sa fiche, une réunion ouvre sa page.",
      "Sur la page d'un projet, « Ajouter une dépense » vise déjà ce projet ; on peut en choisir un autre.",
      "« Nouvelle réunion » crée la même réunion que « Nouveau call » du Calendrier. « Nouvelle note » ouvre le formulaire d'une note écrite (sur la page d'un projet, elle vise déjà ce projet). Le call d'un projet se crée depuis les Notes du projet.",
      "Sur téléphone, le « + » est dans l'en-tête, à côté de la cloche.",
    ],
    faq: [
      {
        q: "Comment ajouter vite une dépense ?",
        a: "Le « + » en haut de la barre de gauche (ou la touche N), puis « Ajouter une dépense ». Sur la page d'un projet, la dépense vise déjà ce projet.",
      },
      {
        q: "Je ne vois pas « Nouveau deal » ou « Ajouter une dépense » dans le « + ».",
        a: "Le menu ne montre que ce que votre poste vous permet de faire ; demandez à la direction si vous en avez besoin.",
      },
      {
        q: "Pourquoi « Écrire un mail » n'apparaît pas ?",
        a: "La boîte de po@pdsrecords.com n'est pas encore branchée sur cette version de PDS OS.",
      },
    ],
  },
  {
    key: "shortcuts",
    title: "Raccourcis clavier",
    summary:
      "Les touches qui ouvrent la recherche, le « + », PO et la capture d'un retour, que chacun peut changer dans Paramètres.",
    keywords: [
      "raccourci",
      "raccourcis",
      "clavier",
      "touche",
      "cmd k",
      "espace espace",
      "changer de touche",
    ],
    href: "/app/settings/raccourcis",
    where: "Paramètres › Raccourcis clavier",
    facts: [
      "Par défaut : ⌘K pour Rechercher, N pour Créer (le « + »), Espace Espace pour ouvrir PO, C pour capturer une zone de la page dans un retour.",
      "Dans Paramètres › Raccourcis clavier, « Modifier » attend la nouvelle touche : une lettre ou un chiffre, seule ou avec ⌘ ; Espace se presse deux fois. Échap annule.",
      "Une touche déjà prise par un autre raccourci, ou par le navigateur avec ⌘ (copier, rechercher, nouvel onglet…), est refusée avec sa raison.",
      "« Rétablir » remet le raccourci par défaut. Les raccourcis sont à chacun : ils suivent la personne sur tous ses ordinateurs.",
      "Une touche seule ne marche jamais pendant qu'on écrit dans un champ, ni quand une fenêtre est ouverte ; un raccourci avec ⌘ marche partout.",
    ],
    faq: [
      {
        q: "Comment changer le raccourci de la recherche ?",
        a: "Dans Paramètres › Raccourcis clavier, « Modifier » sur la ligne Rechercher, puis appuyez sur la nouvelle touche.",
      },
    ],
  },
];
