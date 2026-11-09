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
      "En tête, « Maintenant » met l'action la plus pressée, avec son pourquoi, ce qui est validé ensuite et un bouton « Ouvrir » qui mène au geste exact.",
      "Les autres actions sont dans un seul tableau, en groupes repliables : En retard, Cette semaine, Plus tard, Sans échéance, En attente d'un autre.",
      "Trois onglets : Tout, À faire, À valider.",
      "On y trouve aussi un projet à accepter, un projet à retransmettre, les tâches libres rattachées à aucun workflow et les comptes rendus de session studio à rédiger.",
      "Le bouton « Voir le calendrier » ouvre le Calendrier.",
      "Un chiffre à côté de « Travail » dans la barre latérale compte ce qui vous attend.",
    ],
    faq: [
      {
        q: "Comment valider quelque chose ?",
        a: "Ouvrez la ligne « À valider » dans Travail : elle mène directement à la version ou à la décision, dans son projet.",
      },
      {
        q: "Puis-je ajouter une tâche à la main ?",
        a: "Travail ne sert pas à écrire une liste à part. Les actions viennent des parcours des projets. Des tâches libres existent, créées depuis un compte rendu de call.",
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
      "En vue Semaine, on peut créer une réunion en cliquant ou en glissant sur un créneau libre, et déplacer ses propres calls.",
    ],
    faq: [
      {
        q: "Comment changer la date d'une sortie ?",
        a: "Pas depuis le Calendrier : il montre les dates. Cliquez la date, elle ouvre l'endroit où elle se décide.",
      },
      {
        q: "Comment planifier une réunion ?",
        a: "En vue Semaine, cliquez ou glissez sur un créneau libre : le formulaire « Nouvelle réunion » s'ouvre sur ce créneau.",
      },
    ],
  },
  {
    key: "calls",
    title: "Calls",
    summary:
      "Les calls et réunions de tous les projets : planifier, enregistrer, obtenir le compte rendu.",
    keywords: [
      "call",
      "calls",
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
    where:
      "Aussi dans un projet lancé › Pilotage › Calls (les calls de ce projet seulement).",
    facts: [
      "La page Calls liste tous les calls et réunions que vous pouvez voir, avec les onglets Tous, À venir et Passés, une recherche et un filtre par projet.",
      "Deux vues : la liste (par défaut) et le calendrier.",
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
        q: "Où retrouver le compte rendu d'un call ?",
        a: "Dans la page du call, ouverte depuis la liste Calls ou depuis les Calls du projet.",
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
];
