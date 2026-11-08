/** Home page: the PO assistant and the cards below it. */
export const assistant = {
  title: "Demander à PO",
  disclaimer: "PO peut se tromper. Vérifiez avec ses sources.",
  placeholder: "Comment je peux t'aider ?",
  label: "Votre question",
  send: "Envoyer",
  stop: "Arrêter",
  clear: "Nouvelle conversation",
  thinking: "PO consulte les données…",
  tools: {
    find_projects: "Recherche du projet",
    project_status: "Lecture de l'état du projet",
    my_todo: "Lecture de vos tâches",
    recent_activity: "Lecture de l'activité récente",
    search_calls: "Recherche dans les calls",
    find_artists: "Lecture du catalogue d'artistes",
    find_masters: "Lecture des titres",
    propose_artist: "Préparation de la fiche artiste",
    propose_master: "Préparation du titre",
    propose_project: "Préparation du projet",
    create_test_data: "Création des données de test",
    fill_page_test_data: "Remplissage de la page avec des données de test",
  } as Record<string, string>,
  // Development only: fake records written straight away (docs/ASSISTANT.md § 3 ter).
  testData: {
    notes: "Données de test créées par PO (fictives).",
    forbidden:
      "Création impossible : votre poste ne permet pas de créer ces éléments.",
    noManager:
      "Création du projet impossible : aucun chef de projet n'est disponible dans l'organisation.",
    failed: (what: string) =>
      `La création ${what} a échoué ; rien d'autre n'a été créé ensuite.`,
    what: {
      artist: "de l'artiste de test",
      master: "du titre de test",
      project: "du projet de test",
      template: "du modèle de contrat de test",
    },
    artistCreated: (name: string) => `Artiste de test « ${name} » créé.`,
    masterCreated: (title: string, artist: string) =>
      `Titre de test « ${title} » créé, crédité à ${artist}.`,
    templateCreated: (name: string) =>
      `Modèle de contrat de test « ${name} » créé en brouillon (texte fictif écrit par l'application, sans valeur juridique) : le directeur général peut le valider pour essayer « Générer le contrat ».`,
    projectCreated: (title: string, kind: string, manager: string) =>
      `Projet de test « ${title} » créé (${kind}), transmis à ${manager}.`,
    // A test project taken past its Cadrage (create_test_data, stage).
    advance: {
      accepted: "Projet accepté : vous en êtes le responsable.",
      notYours: (manager: string) =>
        `Le projet est transmis à ${manager} : c'est à cette personne de l'accepter et de remplir son Cadrage, rien de plus n'a été fait.`,
      framingFilled:
        "Cadrage rempli avec des réponses fictives (six dimensions).",
      stopsAtFraming:
        "Le Brief n'est pas encore envoyé : « Envoyer en validation » se fait depuis la page Cadrage.",
      briefSent: "Brief envoyé en validation au directeur général.",
      waitsForValidator:
        "La suite (validation du Brief, plan, étapes Master, Juridique…) attend la décision du directeur général : vous n'êtes pas le validateur.",
      briefValidated: "Brief validé (données de test).",
      planLaunched:
        "Plan du projet lancé tel que proposé : ses étapes (Stratégie, Juridique, Master…) sont ouvertes.",
      failed: (step: string, reason = "") =>
        `Arrêté à l'étape « ${step} »${reason ? ` : ${reason}` : ""}. Ce qui précède est fait.`,
      steps: {
        accept: "accepter le projet",
        framing: "remplir le Cadrage",
        send: "envoyer le Brief",
        validate: "valider le Brief",
        launch: "lancer le plan",
      },
    },
    // Filling the open page (fill_page_test_data).
    noPage:
      "Aucune fiche de titre, d'artiste ou de projet n'est ouverte : rien à compléter ici.",
    noTitles: (title: string) =>
      `Le projet « ${title} » n'a aucun titre : ses pages (Master, Juridique) se lisent sur ses titres, il n'y a rien à compléter.`,
    filled: (what: string, list: string) =>
      `Complété sur ${what} avec des données fictives : ${list}.`,
    untouched: (list: string) => `Laissé tel quel (déjà rempli) : ${list}.`,
    notFilled: (list: string) => `Échec, non complété : ${list}.`,
    nothingToFill: (what: string) =>
      `Rien à compléter sur ${what} : chaque section a déjà des données.`,
    distribution:
      "La distribution vient de la Sortie d'un projet lancé : elle reste vide.",
    masterSections: {
      core: "ISRC, durée et état audio",
      sessions: "sessions et pistes",
      credits: "contributeurs",
      masterSplits: "splits master (100 %)",
      publishingSplits: "splits édition (100 %)",
      rights: "ISWC et ℗",
      declarations: "déclarations SACEM, SCPP, SPPF, ADAMI, SPEDIDAM",
      variant: "versions (Instrumental)",
      project: "projets (un single)",
      audio: "audio (Master final)",
      artwork: "pochette",
    },
    projectSections: {
      network: "ingénieurs de mix et de mastering ajoutés au Réseau et reliés",
    },
    artistSections: {
      identity: "nom civil et pays",
      bio: "biographie",
      contacts: "contacts (manager, presse)",
      masters: "titres",
    },
    theMaster: (title: string) => `le titre « ${title} »`,
    theArtist: (name: string) => `l'artiste ${name}`,
    theProject: (title: string, count: number) =>
      `${count > 1 ? `les ${count} titres` : "le titre"} du projet « ${title} »`,
    theFraming: (title: string) => `le Cadrage du projet « ${title} »`,
    framingSections:
      "les questions encore ouvertes des six dimensions (propositions confirmées, autres réponses fictives)",
    framingOwnerOnly: (title: string) =>
      `Cadrage non complété : seul le responsable du projet « ${title} » écrit son Cadrage.`,
    framingNotFilled:
      "Le Cadrage du projet n'a pas été touché : il se remplit quand on le demande, ou depuis sa page Cadrage.",
  },
  // Catalog facts for the model and the "Données utilisées" list.
  catalog: {
    artist: "Artiste",
    fansNotStreams:
      "Classement par fans Deezer, calculé par l'application : les écoutes (streams) ne sont pas disponibles dans PDS OS.",
    artistRanked: (
      rank: number,
      name: string,
      relation: string,
      fans: string,
      masters: string,
    ) =>
      `N°${rank} : ${name} (${relation}), ${fans} fans sur Deezer, ${masters}.`,
    artistNoDeezer: (name: string, relation: string, masters: string) =>
      `${name} (${relation}) : pas de profil Deezer, non classé, ${masters}.`,
    masterCount: (count: number) =>
      count === 0 ? "aucun titre" : count === 1 ? "1 titre" : `${count} titres`,
    noArtist: "Aucun artiste trouvé dans le catalogue.",
    master: (
      label: string,
      artists: string,
      audioState: string | null,
      isrc: string | null,
      duration: string | null,
    ) =>
      [
        `Titre « ${label} » de ${artists || "artiste inconnu"}`,
        audioState && `état audio ${audioState}`,
        isrc && `ISRC ${isrc}`,
        duration && `durée ${duration}`,
      ]
        .filter(Boolean)
        .join(", ") + ".",
    noMaster: "Aucun titre trouvé.",
  },
  // Drafts proposed by PO: nothing is written before a person saves them.
  drafts: {
    badge: "Proposition de PO",
    notSaved: "Rien n'est enregistré tant que vous n'avez pas validé.",
    review: "Relire et enregistrer",
    saved: "Enregistré",
    savedNext: (label: string, next: string) =>
      `Enregistré : ${label}. Suite : ${next}`,
    savedAsReviewed:
      "Enregistré tel que relu dans le formulaire : ouvrez la fiche pour voir les valeurs gardées.",
    proposal: "Proposition de PO",
    savedLabels: {
      contract: "le contrat",
      contact: "la fiche du contact",
      meeting: "la réunion",
    },
    open: "Ouvrir",
    loading: "Préparation du formulaire…",
    loadFailed: "Le formulaire n'a pas pu être préparé. Réessayez.",
    close: "Fermer",
    empty: "Aucune valeur proposée : complétez le formulaire.",
    feedback: {
      send: "Envoyer",
      sending: "Envoi…",
      edit: "Modifier",
      sent: "Envoyé",
      hint: "Envoyé au directeur général tel quel, ou modifiez-le avant.",
      failed: "Le retour n'a pas pu être envoyé. Réessayez ou modifiez-le.",
    },
    titles: {
      createArtist: (name: string) =>
        name ? `Nouvel artiste : ${name}` : "Nouvel artiste",
      updateArtist: (name: string) => `Modifier la fiche de ${name}`,
      createMaster: (title: string) =>
        title ? `Nouveau titre : ${title}` : "Nouveau titre",
      updateMaster: (title: string) => `Modifier le titre ${title}`,
      createProject: (title: string) =>
        title ? `Nouveau projet : ${title}` : "Nouveau projet",
      updateProject: (title: string) => `Modifier le projet ${title}`,
      feedback: (kind: string | null) =>
        kind ? `Nouveau retour : ${kind}` : "Nouveau retour",
      editTopic: (title: string) => `Modifier le retour « ${title} »`,
      review: {
        send: (title: string) => `Transmettre « ${title} »`,
        prioritize: (title: string) => `Changer la priorité de « ${title} »`,
        dismiss: (title: string) => `Écarter « ${title} »`,
        reopen: (title: string) => `Remettre « ${title} » à examiner`,
      },
    },
    sheet: {
      artist: "Relisez la fiche, corrigez si besoin, puis enregistrez.",
      artistProfile:
        "L'artiste est créé. Relisez maintenant son identité et sa biographie.",
      contacts: (count: number) =>
        count === 1
          ? "Relisez le contact proposé, puis enregistrez-le."
          : `Relisez les ${count} contacts proposés, un par un.`,
      master: "Relisez le titre, corrigez si besoin, puis enregistrez.",
      project: "Relisez le projet, corrigez si besoin, puis enregistrez.",
      // Not opened here: a feedback is sent from its card or the feedback window.
      feedback: "Relisez le retour, puis envoyez-le au directeur général.",
      feedbackTopic:
        "Relisez le texte que recevra l'équipe qui construit PDS OS, puis enregistrez.",
      feedbackReview: "Vérifiez la décision, puis confirmez.",
    },
    labels: {
      contact: (role: string) => `Contact (${role})`,
      credits: "Artistes",
      feedbackKind: "Type",
      message: "Message",
      page: "Page",
      topicTitle: "Titre",
      summary: "Résumé",
      priority: "Priorité",
    },
    // Facts for the model and the "Données utilisées" list.
    ready: (title: string) =>
      `Proposition préparée : ${title}. Rien n'est enregistré : l'utilisateur doit la relire et l'enregistrer lui-même avec « Relire et enregistrer ».`,
    forbiddenCatalog:
      "L'utilisateur n'a pas le droit de modifier le catalogue (artistes, titres).",
    forbiddenProjects: "L'utilisateur n'a pas le droit de créer des projets.",
    launched: (title: string) =>
      `Le projet ${title} est lancé : ses informations ne se modifient plus ici, mais dans ses étapes (Cadrage, Stratégie) par son chef de projet.`,
    notFound: (what: string, name: string) =>
      `${what} « ${name} » introuvable dans PDS OS (ou nom ambigu).`,
    what: { artist: "Artiste", master: "Titre", project: "Projet" },
    understoodAs: (said: string, actual: string) =>
      `« ${said} » compris comme « ${actual} », le nom du catalogue.`,
    // Not in the catalogue yet: picked by name when the form opens, once
    // created (artist → titles → project in one answer).
    toCreate: (name: string) => `${name} (à créer)`,
    pendingArtist: (name: string) =>
      `Artiste « ${name} » pas encore au catalogue : il sera repris dans le formulaire une fois créé.`,
    pendingMaster: (title: string) =>
      `Titre « ${title} » pas encore au catalogue : il sera repris dans le formulaire une fois créé.`,
    unknownArtist: (name: string) =>
      `« ${name} » n'est pas au catalogue : créez d'abord l'artiste, ou choisissez-le dans le formulaire.`,
    unknownFormat: (name: string) =>
      `Format PDS « ${name} » introuvable : choisissez-le ou créez-le dans le formulaire.`,
    unknownMaster: (title: string) =>
      `Titre « ${title} » introuvable : rattachez-le dans le formulaire.`,
    unknownPerson: (name: string) =>
      `« ${name} » n'est pas un membre possible pour ce rôle : choisissez-le dans le formulaire.`,
    unknownCountry: (country: string) =>
      `Pays « ${country} » non reconnu : choisissez-le dans le formulaire.`,
    // No agreement to make with the label (UX test of 09/10/2026:
    // « Échéance non repris : il doit… »).
    notSaid: (label: string) =>
      `« ${label} » n'a pas été repris : la valeur doit figurer telle quelle dans votre message. Saisissez-la dans le formulaire.`,
    nameFollowedBy: (name: string, after: string) =>
      `Dans votre message, « ${name} » est suivi de « ${after} » : vérifiez le nom dans le formulaire.`,
    // Dates read by code (lib/assistant/said-date.ts), never by PO.
    understoodDate: (date: string, quote: string) =>
      `${date} · dit « ${quote} »`,
    dateVague: (label: string, quote: string) =>
      `« ${label} » : « ${quote} » n'est pas un jour précis. Choisissez la date dans le formulaire.`,
    dateMismatch: (label: string, quote: string) =>
      `« ${label} » : dans « ${quote} », le jour de la semaine ne correspond pas à la date. Choisissez la date dans le formulaire.`,
    dateUnparsed: (label: string, quote: string) =>
      `« ${label} » : « ${quote} » n'a pas été compris comme une date. Choisissez la date dans le formulaire.`,
    forbiddenFeedback:
      "Seul le directeur général lit et traite les retours de l'équipe.",
    topicNotFound:
      "Sujet de retour introuvable : appelez find_feedback pour obtenir son topicId.",
    topicSent: (title: string) =>
      `Le sujet « ${title} » est déjà transmis : son texte ne se modifie plus, seule sa priorité peut changer.`,
    invalidReview: (title: string, status: string) =>
      `Cette décision n'est pas possible : le sujet « ${title} » est ${status}.`,
    rewriteFailed:
      "La réécriture n'a pas pu être préparée : modifiez le texte dans le formulaire.",
    priorityToChoose:
      "Priorité non reprise : elle doit figurer dans votre message (haute, normale ou basse). Choisissez-la dans le formulaire.",
    teamByTransmission:
      "L'équipe d'un projet déjà créé change par la transmission, pas par cette proposition.",
  },
  // Model context: the page PO was opened from, written by code.
  pageContext: {
    artist: (name: string) => `la fiche de l'artiste « ${name} »`,
    master: (label: string, artists: string) =>
      `la fiche du titre « ${label} »${artists ? ` de ${artists}` : ""}`,
    project: (title: string, id: string, section?: string) =>
      `${section ? `l'onglet ${section} du` : "la page du"} projet « ${title} » (projectId ${id})`,
    sections: {
      framing: "Cadrage",
      calls: "Calls",
      strategy: "Stratégie",
      release: "Distribution",
      master: "Master",
      legal: "Juridique",
      production: "Production",
      design: "Conception",
      activations: "Activations",
      review: "Suivi & bilan",
      work: "Travail",
      team: "Équipe",
      deliverables: "Livrables",
      files: "Fichiers",
      planning: "Planning",
      budget: "Budget",
      validations: "Validations",
      activity: "Activité",
    } as Record<string, string>,
    // « Master › Mixage »: the module, then the step open in it.
    sectionStep: (section: string, step: string) => `${section} › ${step}`,
    artists: "la liste des artistes",
    masters: "la liste des titres",
    projects: "la liste des projets",
    feedback:
      "la page Retours (les retours de l'équipe sur l'application PDS OS)",
    work: "sa page Travail (ce qui l'attend, projet par projet)",
  },
  // find_projects: one workflow of a launched project (project-workflows.ts).
  workflowLine: (
    workflow: string,
    status: string,
    index: number,
    total: number,
    step: string,
  ) => `${workflow} : ${status}, étape ${index} sur ${total} (${step})`,
  // step_status: the step of the open page, worded by code (lib/assistant/
  // step-status.ts). PO relays these sentences, it never deduces a state.
  stepStatus: {
    noProjectPage:
      "La page ouverte n'est pas celle d'une étape de projet. Si un projet est nommé dans la question, appelle maintenant find_projects avec ce nom (il donne l'étape actuelle de chaque projet), puis project_status ; ne demande pas à l'utilisateur sur quelle page il est.",
    projectNotFound: "Ce projet n'est pas visible pour vous.",
    noStep:
      "La page ouverte ne correspond à aucune étape des parcours du projet (le workflow n'est peut-être pas encore lancé par le Plan du projet).",
    page: (place: string) => `Page ouverte : ${place}.`,
    state: (place: string, state: string) => `Étape « ${place} » : ${state}.`,
    states: {
      done: "faite",
      current: "en cours",
      waiting: "en attente d'un retour",
      rework: "à revoir après un changement ailleurs",
      blocked: "verrouillée, ses prérequis ne sont pas tous faits",
      upcoming: "pas encore ouverte",
      obsolete: "plus nécessaire",
    },
    why: (text: string) => `Ce que dit l'étape : « ${text} »`,
    summary: (text: string) => `Ce qu'elle a donné : « ${text} ».`,
    prereqMissing: (label: string, source: string | null) =>
      `Prérequis pas encore fait : « ${label} »${source ? ` (${source})` : ""}.`,
    prereqsDone: "Tous ses prérequis sont faits.",
    reported: "Un blocage a été signalé sur cette étape.",
    nobody: "Personne n'a d'action à faire sur cette étape pour l'instant.",
    next: (labels: string) => `Une fois faite, elle ouvre : ${labels}.`,
    blocker: (round: string, text: string) =>
      `Ce qui empêche d'envoyer le dossier ${round} : ${text}`,
    noBlocker: (round: string) =>
      `Rien n'empêche d'envoyer le dossier ${round}.`,
    rounds: { mix: "au mixeur", mastering: "au mastering" },
    lift: "Où le lever",
  },
  launcher: {
    title: "PO",
    description:
      "Parlez : votre demande part à PO dès la fin de la dictée. Il sait sur quelle page vous êtes.",
    stopHint: "Entrée ou le micro pour envoyer, Échap pour annuler.",
    hint: "Espace Espace pour ouvrir PO depuis n'importe quelle page.",
    close: "Fermer",
  },
  // Conversation page, opened by a question from the home page.
  conversation: {
    pageTitle: "Conversation avec PO",
    backTo: "Retour au projet",
    new: "Nouvelle conversation",
    reply: "Répondre…",
    resume: "Reprendre la conversation",
  },
  // The saved conversations, beside the conversation (docs/ASSISTANT.md § 2 ter).
  history: {
    title: "Historique",
    open: "Afficher l'historique",
    empty: "Vos conversations avec PO s'enregistrent ici.",
    actions: (title: string) => `Actions pour « ${title} »`,
    deleteTitle: "Supprimer cette conversation ?",
    deleteBody:
      "Elle disparaît de votre historique. Ce que PO vous a aidé à créer reste en place.",
    deleted: "Conversation supprimée",
    deleteFailed: "La conversation n'a pas pu être supprimée.",
  },
  facts: "Données utilisées",
  // The folded line above an answer: what PO read, and what it said on the way.
  read: (count: number) =>
    count === 1 ? "A lu 1 donnée" : `A lu ${count} données`,
  steps: "Étapes de la réponse",
  sources: "Sources",
  sourcesCount: (count: number) => `Sources (${count})`,
  copy: "Copier la réponse",
  copied: "Réponse copiée",
  you: "Vous",
  po: "PO",
  // The route's error codes (app/api/assistant/route.ts).
  errors: {
    busy: "Réponse interrompue : PO est saturé, réessayez dans une minute.",
    failed: "Réponse interrompue : PO n'a pas pu la terminer.",
  },
  retry: "Réessayer",
  tooLong: "Question trop longue (2000 caractères maximum).",
  activityKinds: {
    call_created: "call créé",
    report_created: "compte rendu produit",
    framing_proposed: "Cadrage : réponses proposées par PO",
    framing_confirmed: "Cadrage : réponses confirmées",
    framing_dismissed: "Cadrage : questions écartées",
    brief_created: "Brief créé",
    brief_sent: "Brief envoyé en validation",
    task_created: "tâche créée",
    task_done: "tâche faite",
    point_resolved: "point tranché",
    stage_changed: "étape modifiée",
    validation_requested: "validation demandée",
    validation_decided: "validation décidée",
    release_online: "sortie détectée en ligne",
    file_added: "document ajouté",
  } as Record<string, string>,
  readFailed:
    "Lecture impossible pour l'instant : la base n'a pas répondu. Rien ne permet de dire qu'il ne s'est rien passé.",
  // my_todo (lib/assistant/my-work.ts): facts for the model, the home's and
  // the Travail's lists phrased in sentences.
  myWork: {
    toAccept: (title: string, artist: string | null) =>
      `Projet « ${title} »${artist ? ` (${artist})` : ""} : il vous a été transmis et attend votre réponse (accepter, refuser ou demander une précision). C'est la première chose à faire.`,
    action: (a: {
      todo: string;
      project: string;
      place: string;
      decision: boolean;
      due: string | null;
      late: string;
    }) =>
      `${a.decision ? "Validation qui vous attend" : "À faire"} : « ${a.todo} » (${a.project}, ${a.place})${a.due ? `, échéance le ${a.due}, ${a.late}` : ", sans échéance"}.`,
    task: (a: {
      title: string;
      project: string;
      due: string | null;
      late: string;
    }) =>
      `Tâche « ${a.title} » (${a.project}) : à faire, ${a.due ? `échéance le ${a.due}, ${a.late}` : "sans échéance"}.`,
    proposals: (count: number, project: string) =>
      `${count} proposition(s) de PO à confirmer sur ${project}.`,
    nothing:
      "Rien ne vous attend : aucun projet à accepter, aucune action dans vos projets, aucune tâche, aucune proposition.",
    // project_status: one open step of the project's journeys.
    projectAction: (a: {
      who: string | null;
      todo: string;
      place: string;
      decision: boolean;
      due: string | null;
      late: boolean;
    }) =>
      `${a.who ? `Attendu de ${a.who}` : a.decision ? "Validation qui vous attend" : "À vous"} : « ${a.todo} » (${a.place})${a.due ? `, échéance le ${a.due}${a.late ? ", EN RETARD" : ""}` : ""}.`,
    toAcceptSource: "à accepter",
    proposalsSource: "propositions",
  },
  activityMore: (n: number) => `et ${n} autre${n > 1 ? "s" : ""}`,
  validationStates: {
    pending: "en attente",
    approved: "acceptée",
    rejected: "refusée",
  } as Record<string, string>,
  cards: {
    proposalsCount: (count: number) =>
      count === 1 ? "1 proposition" : `${count} propositions`,
  },
} as const;
