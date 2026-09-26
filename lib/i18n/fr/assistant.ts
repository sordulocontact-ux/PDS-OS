/** Home page: the PO assistant and the cards below it. */
export const assistant = {
  title: "Demander à PO",
  disclaimer:
    "PO est une IA : il peut se tromper. Les faits exacts et les liens sont affichés sous chaque réponse.",
  placeholder: "Comment je peux t'aider ?",
  label: "Votre question",
  send: "Envoyer",
  stop: "Arrêter",
  clear: "Nouvelle conversation",
  thinking: "PO consulte les données…",
  suggestions: [
    "Qu'est-ce qu'il me reste à faire ?",
    "Qu'est-ce qui a avancé cette semaine ?",
    "Quels projets sont en cours ?",
  ],
  tools: {
    find_projects: "Recherche du projet",
    project_status: "Lecture de l'état du projet",
    my_todo: "Lecture de vos tâches",
    recent_activity: "Lecture de l'activité récente",
    search_calls: "Recherche dans les calls",
    propose_artist: "Préparation de la fiche artiste",
    propose_master: "Préparation du master",
    propose_project: "Préparation du projet",
  } as Record<string, string>,
  // Drafts proposed by PO: nothing is written before a person saves them.
  drafts: {
    badge: "Proposition de PO",
    notSaved: "Rien n'est enregistré tant que vous n'avez pas validé.",
    review: "Relire et enregistrer",
    saved: "Enregistré",
    open: "Ouvrir",
    loading: "Préparation du formulaire…",
    loadFailed: "Le formulaire n'a pas pu être préparé. Réessayez.",
    close: "Fermer",
    empty: "Aucune valeur proposée : complétez le formulaire.",
    titles: {
      createArtist: (name: string) =>
        name ? `Nouvel artiste : ${name}` : "Nouvel artiste",
      updateArtist: (name: string) => `Modifier la fiche de ${name}`,
      createMaster: (title: string) =>
        title ? `Nouveau master : ${title}` : "Nouveau master",
      updateMaster: (title: string) => `Modifier le master ${title}`,
      createProject: (title: string) =>
        title ? `Nouveau projet : ${title}` : "Nouveau projet",
      updateProject: (title: string) => `Modifier le projet ${title}`,
    },
    sheet: {
      artist: "Relisez la fiche, corrigez si besoin, puis enregistrez.",
      artistProfile:
        "L'artiste est créé. Relisez maintenant son identité et sa biographie.",
      contacts: (count: number) =>
        count === 1
          ? "Relisez le contact proposé, puis enregistrez-le."
          : `Relisez les ${count} contacts proposés, un par un.`,
      master: "Relisez le master, corrigez si besoin, puis enregistrez.",
      project: "Relisez le projet, corrigez si besoin, puis enregistrez.",
    },
    labels: {
      contact: (role: string) => `Contact (${role})`,
      credits: "Artistes",
    },
    // Facts for the model and the "Données utilisées" list.
    ready: (title: string) =>
      `Proposition préparée : ${title}. Rien n'est enregistré : l'utilisateur doit la relire et l'enregistrer lui-même avec « Relire et enregistrer ».`,
    forbiddenCatalog:
      "L'utilisateur n'a pas le droit de modifier le catalogue (artistes, masters).",
    forbiddenProjects: "L'utilisateur n'a pas le droit de créer des projets.",
    launched: (title: string) =>
      `Le projet ${title} est lancé : ses informations ne se modifient plus ici, mais dans ses étapes (Cadrage, Stratégie) par son chef de projet.`,
    notFound: (what: string, name: string) =>
      `${what} « ${name} » introuvable dans PDS OS (ou nom ambigu).`,
    what: { artist: "Artiste", master: "Master", project: "Projet" },
    unknownArtist: (name: string) =>
      `« ${name} » n'est pas au catalogue : créez d'abord l'artiste, ou choisissez-le dans le formulaire.`,
    unknownMaster: (title: string) =>
      `Master « ${title} » introuvable : rattachez-le dans le formulaire.`,
    unknownPerson: (name: string) =>
      `« ${name} » n'est pas un membre possible pour ce rôle : choisissez-le dans le formulaire.`,
    unknownCountry: (country: string) =>
      `Pays « ${country} » non reconnu : choisissez-le dans le formulaire.`,
    notSaid: (label: string) =>
      `${label} non repris : il doit figurer tel quel dans votre message (avec l'année pour une date).`,
    teamByTransmission:
      "L'équipe d'un projet déjà créé change par la transmission, pas par cette proposition.",
  },
  launcher: {
    title: "PO",
    description:
      "Posez une question ou demandez une création. La dictée démarre dès l'ouverture.",
    hint: "Espace Espace pour ouvrir PO depuis n'importe quelle page.",
    close: "Fermer",
  },
  facts: "Données utilisées",
  sources: "Sources",
  you: "Vous",
  po: "PO",
  error: "PO n'a pas pu répondre. Réessayez dans un instant.",
  tooLong: "Question trop longue (2000 caractères maximum).",
  activityKinds: {
    call_created: "call créé",
    report_created: "compte rendu produit",
    brief_proposed: "Brief proposé par PO",
    brief_confirmed: "Brief confirmé",
    brief_rejected: "Brief rejeté",
    task_created: "tâche créée",
    task_done: "tâche faite",
    point_resolved: "point tranché",
    stage_changed: "étape modifiée",
    validation_requested: "validation demandée",
    validation_decided: "validation décidée",
    release_online: "sortie détectée en ligne",
  } as Record<string, string>,
  validationStates: {
    pending: "en attente",
    approved: "acceptée",
    rejected: "refusée",
  } as Record<string, string>,
  cards: {
    tasks: "Mes tâches",
    tasksEmpty: "Aucune tâche à faire.",
    overdue: "En retard",
    due: (date: string) => `Échéance ${date}`,
    validations: "Validations qui m'attendent",
    validationsEmpty: "Rien à valider.",
    proposals: "Propositions de PO à confirmer",
    proposalsEmpty: "Aucune proposition en attente.",
    proposalsCount: (count: number) =>
      count === 1 ? "1 proposition" : `${count} propositions`,
    activity: "Activité récente",
    activityEmpty: "Rien sur les 7 derniers jours.",
    projects: "Projets en cours",
    projectsEmpty: "Aucun projet pour l'instant.",
    allProjects: "Tous les projets",
    releases: "Sorties",
    releasesEmpty: "Aucune sortie enregistrée.",
    online: "En ligne",
    notOnline: "Pas encore en ligne",
    planned: (date: string) => `Prévue le ${date}`,
  },
} as const;
