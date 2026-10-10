// Juridique section of a project (lib/legal/).
export const legal = {
  inventory: {
    title: "État des lieux",
    description:
      "Tout ce que le projet sait déjà de ses droits, de ses contrats et de ses déclarations. Chaque information est connue, à confirmer ou manquante.",
    // The page that holds the Cadrage's questions and the Confirmation too.
    dossierDescription:
      "Ce que le projet sait déjà, les questions de PO sur ce qui manque, puis le dossier à confirmer. Le plan d'action s'ouvre une fois le dossier confirmé.",
    counts: {
      known: "Informations connues",
      to_confirm: "Informations à confirmer",
      missing: "Informations manquantes",
    },
    filterEmpty: {
      known: "Aucune information connue pour l'instant.",
      to_confirm: "Aucune information à confirmer.",
      missing: "Aucune information manquante.",
    },
    actions: {
      distribute: "Répartir",
      editShares: "Modifier",
      splitsTitle: (kind: string, title: string) => `${kind} · ${title}`,
      declare: "Déclarer",
      declareTitle: "Nouvelle déclaration",
      declareDescription:
        "Le titre et l'organisme, puis le dépôt tel qu'il a été fait.",
      title: "Titre",
      organism: "Organisme",
      allDeclared: "Tous les organismes sont déjà déclarés pour ce titre.",
      editTitle: "Modifier le titre",
      editRights: "Modifier les droits",
    },
    sections: {
      titles: {
        title: "Titres",
        description: "Identifiants et ayant droit de chaque titre du projet.",
      },
      people: {
        title: "Personnes",
        description:
          "Les contributeurs crédités, et s'ils sont dans le Réseau.",
      },
      splits: {
        title: "Répartitions",
        description: "Parts du master et de l'édition, titre par titre.",
      },
      // « Accords » is the clearances' dossier (third-party elements):
      // never the same word for the contracts.
      agreements: {
        title: "Contrats",
        description: "Les contrats rattachés au projet.",
      },
      declarations: {
        title: "Déclarations",
        description: "Dépôts auprès des sociétés de gestion collective.",
      },
      flags: {
        title: "Points signalés au cadrage",
        description: "Les contraintes de droits notées dans le Cadrage.",
        empty: "Aucun point juridique noté au cadrage.",
      },
    },
    facts: {
      isrc: "ISRC",
      iswc: "ISWC",
      rightsHolder: "Ayant droit ℗",
      credits: "Crédits",
      performer: "Artiste interprète",
      featuring: "Artiste interprète · Featuring",
      noContract: "Aucun contrat",
      declarations: "Déclarations",
    },
    states: {
      filled: "Renseigné",
      catalogArtist: "Artiste du catalogue",
      empty: "À renseigner",
      noContributor: "Aucun contributeur",
      noContract: "Aucun contrat rattaché au projet",
      noDeclaration: "Aucune déclaration déposée",
      flagged: "Signalé au cadrage",
      flaggedProposed: "Proposé, à confirmer au cadrage",
    },
    sources: {
      title: "Fiche du titre",
      artist: "Fiche artiste",
      credits: "Crédits du titre",
      splits: "Splits du titre",
      declarations: "Droits du titre",
      contracts: "Contrats",
      framing: "Cadrage",
    },
  },
  intake: {
    title: "Cadrage juridique",
    description:
      "PO pose une question à la fois sur ce que le projet ne sait pas encore. Répondez librement : il relève les informations, vous les vérifiez avant qu'elles soient gardées.",
    questions: {
      contributors: {
        ask: (title: string) =>
          `Qui a participé à « ${title} », et à quel titre ?`,
        hint: "Composition, texte, arrangement, production, enregistrement, mix, musiciens… Plusieurs personnes à la fois, comme vous le diriez.",
        why: "Les crédits de ce titre sont vides : ils servent aux contrats et à la déclaration SACEM.",
        short: "Participants",
      },
      third_party: {
        ask: (title: string) =>
          `« ${title} » reprend-il un élément d'une œuvre existante ?`,
        hint: "Une topline, un sample, une interpolation, une reprise… Précisez l'œuvre et, si vous le savez, son auteur. Sinon, répondez « non ».",
        why: "Un emprunt à une œuvre existante exige l'autorisation préalable de ses ayants droit (bulletin SACEM).",
        short: "Élément repris",
      },
      agreements: {
        ask: () => "Des accords existent-ils déjà pour ce projet ?",
        hint: "Contrat d'artiste, cession, licence, édition, coproduction… Avec qui ? Sinon, répondez « non ».",
        why: "Aucun contrat n'est encore rattaché au projet.",
        short: "Accords existants",
      },
      publisher: {
        ask: (title: string) => `L'œuvre « ${title} » a-t-elle un éditeur ?`,
        hint: "Le nom de l'éditeur, ou « non ».",
        why: "Le bulletin SACEM demande les éditeurs de l'œuvre, s'il y en a.",
        short: "Éditeur",
      },
    },
    project: "Projet",
    progress: (answered: number, total: number) =>
      `${answered} question${answered > 1 ? "s" : ""} sur ${total} ${answered > 1 ? "ont" : "a"} une réponse`,
    answerLabel: "Votre réponse",
    read: "Lire ma réponse",
    reading: "PO lit votre réponse…",
    reviewTitle: "Ce que PO a compris",
    reviewHint:
      "Retirez ce qui est faux, puis enregistrez. Rien n'est gardé avant.",
    nothingFound:
      "PO n'a rien relevé dans cette réponse. Reformulez, ou précisez les noms tels qu'ils doivent être écrits.",
    dropped: (count: number) =>
      count === 1
        ? "Un élément n'a pas été retrouvé tel quel dans votre réponse : il a été écarté."
        : `${count} éléments n'ont pas été retrouvés tels quels dans votre réponse : ils ont été écartés.`,
    remove: (label: string) => `Retirer « ${label} »`,
    save: "Enregistrer",
    saving: "Enregistrement…",
    editAnswer: "Modifier ma réponse",
    cancel: "Annuler",
    answers: "Réponses",
    correct: "Corriger",
    correcting: "Correction d'une réponse",
    lastAnswer: (text: string) => `Votre réponse : « ${text} »`,
    facts: {
      none: {
        contributors: "Personne",
        third_party: "Aucun élément repris",
        agreements: "Aucun accord",
        publisher: "Pas d'éditeur",
      },
      performer: "Interprète",
      elements: {
        topline: "Topline",
        sample: "Sample",
        interpolation: "Interpolation",
        cover: "Reprise",
        other: "Élément repris",
      },
      third_party: (element: string, work: string, author: string | null) =>
        author
          ? `${element} de « ${work} » (${author})`
          : `${element} de « ${work} »`,
    },
    done: {
      title: "Toutes les questions ont une réponse",
      body: "Relisez maintenant le dossier et confirmez-le. Vous pouvez encore corriger une réponse ci-dessous.",
      action: "Passer à la confirmation",
    },
    nothingToAsk: {
      title: "Aucune question à poser",
      body: "Ce que le projet sait déjà répond à tout ce que PO aurait demandé : relisez le dossier et confirmez-le.",
    },
    errors: {
      invalid: "Cette réponse n'a pas pu être lue. Réessayez.",
      failed: "La réponse n'a pas pu être enregistrée. Réessayez.",
      provider:
        "PO n'a pas pu lire votre réponse pour l'instant. Réessayez dans un instant.",
    },
  },
  confirmation: {
    title: "Confirmation",
    description:
      "Le dossier tel que PO l'a compris, ligne par ligne avec sa source. Corrigez ce qui est faux, puis confirmez-le.",
    notice:
      "Confirmer le dossier ne vaut ni signature, ni autorisation, ni dépôt.",
    sections: {
      people: {
        title: "Personnes",
        description: "Qui a participé à chaque titre, et à quel titre.",
      },
      third_party: {
        title: "Éléments repris",
        description: "Ce que les titres empruntent à des œuvres existantes.",
      },
      agreements: {
        title: "Contrats",
        description: "Les contrats du projet et ceux déclarés au cadrage.",
      },
      publishers: {
        title: "Éditeurs",
        description: "L'éditeur de chaque œuvre, s'il y en a un.",
      },
    },
    empty: "Rien dans cette partie pour l'instant.",
    sources: { intake: "Cadrage juridique" },
    states: {
      credited: "Crédité",
      inSplit: "Dans le split édition",
      unanswered: "Sans réponse",
      answer: {
        known: "Connu",
        confirmed: "Confirmé",
        declared: "Déclaré",
        deduced: "Déduit",
        to_verify: "À vérifier",
        simulated: "Simulé",
        missing: "Manquant",
      },
    },
    actions: { answer: "Répondre", correct: "Corriger" },
    notStarted: {
      title: "Le cadrage juridique n'a pas encore commencé",
      body: "Répondez d'abord aux questions de PO : le dossier se construit à partir de vos réponses.",
      action: "Commencer le cadrage",
    },
    open: (count: number) =>
      count === 1
        ? "Une question reste sans réponse : répondez-y avant de confirmer."
        : `${count} questions restent sans réponse : répondez-y avant de confirmer.`,
    resume: "Reprendre le cadrage",
    confirm: "Confirmer le dossier",
    confirming: "Confirmation…",
    confirmed: (date: string, name: string | null) =>
      name
        ? `Dossier confirmé le ${date} par ${name}.`
        : `Dossier confirmé le ${date}.`,
    confirmedNote:
      "Corriger une réponse le rouvrira : il faudra le confirmer à nouveau.",
    openPlan: "Passer au plan d'action",
    toConfirmTitle: "Le dossier à confirmer",
    confirmedTitle: "Le dossier confirmé",
    reopened:
      "Une réponse a changé depuis la dernière confirmation : relisez le dossier et confirmez-le à nouveau.",
    errors: {
      openQuestions: "Des questions restent sans réponse.",
      failed: "Le dossier n'a pas pu être confirmé. Réessayez.",
    },
  },
  plan: {
    title: "Plan d'action",
    description:
      "Ce qu'il faut faire à partir du dossier confirmé : ce qui peut commencer maintenant, ce qui est en cours, ce qui viendra ensuite. Choisissez les responsables, puis lancez le plan.",
    columns: {
      now: {
        title: "À lancer maintenant",
        description:
          "Rien ne les retient. Chacune devient une tâche dans le Travail de son responsable, qui est prévenu.",
      },
      ongoing: {
        title: "En cours",
        description: "Déjà commencé, en attente d'un retour.",
      },
      later: {
        title: "À venir",
        description:
          "Débloquées dès que ce dont elles dépendent est fait. Leur tâche attend déjà dans Travail.",
      },
    },
    // Plain words (Sacha, 04/10/2026: « je comprends pas ») : what to do,
    // then why it exists.
    items: {
      onboarding: (count: number) =>
        count === 1
          ? "Faire remplir une fiche de renseignements"
          : `Faire remplir ${count} fiches de renseignements`,
      onboardingWhy:
        "Chaque personne créditée remplit sa fiche par un lien, sans compte : identité, coordonnées, numéro SACEM, de quoi la payer. Ses contrats et déclarations en dépendent.",
      contract: (name: string) => `Faire signer un contrat à ${name}`,
      contractWhy:
        "Sa participation (rémunération, cession de ses droits) doit être écrite et signée.",
      clearance: (work: string) => `Sécuriser l'emprunt de « ${work} »`,
      clearanceDetail: (title: string) => `Repris dans « ${title} »`,
      clearanceWhy:
        "Reprendre un élément d'une œuvre existante exige l'accord de ses ayants droit avant la sortie.",
      splits: (title: string) => `Répartir l'édition de « ${title} »`,
      splitsWhy:
        "Les auteurs et compositeurs doivent s'accorder sur la part de chacun : elle sert à la déclaration SACEM.",
      formality: (title: string) => `Déclarer « ${title} » à la SACEM`,
      formalityWhy:
        "La déclaration ouvre les droits d'auteur. Elle attend les informations des créateurs, la répartition, les emprunts sécurisés et le master final.",
    },
    after: (labels: string) => `Après : ${labels}`,
    // One group per kind of action: what they share is said once.
    groups: {
      onboarding: "Fiches de renseignements",
      contract: "Contrats à faire signer",
      splits: "Répartitions de l'édition",
      clearance: "Emprunts à sécuriser",
      formality: "Déclarations SACEM",
    },
    // Where an action is done, the same button everywhere.
    go: {
      onboarding: "Préparer les fiches",
      contract: "Voir les contrats",
      splits: "Répartir",
      clearance: "Ouvrir l'emprunt",
      formality: "Déclarer",
    },
    empty: "Rien dans cette colonne.",
    include: (label: string) => `Garder « ${label} » dans le plan`,
    responsible: "Responsable",
    noResponsible: "À désigner",
    due: "Échéance",
    launch: "Lancer le plan",
    launching: "Lancement…",
    notice:
      "Lancer le plan crée une tâche par action dans Travail ; chacune se coche d'elle-même quand sa source dit que c'est fait. Rien n'est envoyé à l'extérieur et aucun contrat n'est créé.",
    nothing: "Le dossier ne demande aucune action pour l'instant.",
    needsConfirmation: {
      title: "Le dossier n'est pas encore confirmé",
      body: "Le plan d'action part du dossier confirmé : relisez-le et confirmez-le d'abord.",
      action: "Aller à l'état des lieux",
    },
    launched: (date: string, name: string | null) =>
      name ? `Plan lancé le ${date} par ${name}.` : `Plan lancé le ${date}.`,
    status: {
      action_now: "À lancer",
      waiting_external: "En attente d'un retour",
      blocked: "En attente d'une autre action",
      done: "Fait",
      obsolete: "Plus nécessaire",
    },
    errors: {
      notConfirmed: "Le dossier doit d'abord être confirmé.",
      already: "Le plan a déjà été lancé.",
      failed: "Le plan n'a pas pu être lancé. Réessayez.",
    },
    openTracking: "Voir le suivi",
  },
  tracking: {
    title: "Plan d'action",
    description:
      "Ce qui attend pour que les droits de la sortie soient en règle, démarche par démarche. L'état de chaque action est relu à chaque visite dans le Réseau, les Contrats et les fiches des titres.",
    integrations:
      "Pas encore intégrés : la signature électronique (le contrat signé et sa preuve sont déposés à la main) et les dépôts SACEM. Les états viennent de ce qui est saisi dans PDS OS.",
    groups: {
      now: {
        title: "À traiter maintenant",
        description: "Rien ne les retient : à faire.",
      },
      decision: {
        title: "Décision requise",
        description:
          "Un refus, un rejet, un contrat à valider, ou une échéance dépassée.",
      },
      waiting: {
        title: "En attente d'un retour",
        description:
          "Envoyé : l'action attend quelqu'un d'autre, rien à faire pour l'instant.",
      },
      silent: {
        title: "Progression silencieuse",
        description:
          "Ce qui est fait, ce qui n'est plus nécessaire et ce qui attend une autre action.",
      },
    },
    empty: "Rien ici.",
    reasons: {
      allFichesComplete: "Toutes les fiches sont complètes",
      fichesMissing: (count: number) =>
        count === 1 ? "1 fiche à recueillir" : `${count} fiches à recueillir`,
      waitsForFiche: "Attend la fiche de la personne",
      noLongerCredited: "Plus créditée sur les titres du projet",
      signed: "Contrat signé",
      sentForSignature: "Envoyé pour signature",
      awaitingDirector: "À valider par la direction",
      noContract: "Aucun contrat pour l'instant",
      titleRemoved: "Le titre n'est plus dans le projet",
      splitConfirmed: "Répartition confirmée par tous",
      splitDisputed: "Répartition contestée",
      splitWaiting: (confirmed: number, total: number) =>
        `${confirmed} confirmation${confirmed > 1 ? "s" : ""} sur ${total}`,
      splitToDo: "Répartition à proposer",
      splitOnTitle: "Répartie sur la fiche du titre, à faire confirmer",
      clearanceGone: "Plus à sécuriser",
      cleared: "Sécurisé",
      clearance: {
        refused: "Refusé par les ayants droit",
        action_required: "Action requise",
      },
      clearanceWaiting: "En attente des ayants droit",
      clearanceTermsPending: "Conditions à valider par la direction",
      toInvestigate: "À instruire",
      declared: "Déclaration confirmée",
      submitted: "Déposée, en traitement",
      rejected: "Déclaration refusée",
      toDeclare: "À déclarer",
      waitsForOthers: "Attend une autre action",
    },
    // The button of a line that waits for someone of the team: where its
    // action is done.
    act: {
      onboarding: "Ouvrir les fiches",
      contract: "Ouvrir le contrat",
      splits: "Répartir",
      clearance: "Ouvrir l'emprunt",
      formality: "Ouvrir la déclaration",
    },
    views: { act: "Ce qui attend une action", all: "Tout le plan" },
    viewsLabel: "Affichage du plan",
    viewEmpty: {
      act: "Rien n'attend l'équipe : tout est en attente d'un retour, ou fait.",
      all: "Le plan est vide.",
      now: "Rien à traiter maintenant.",
      decision: "Aucune décision en attente.",
      waiting: "Rien n'attend de retour.",
      silent: "Rien ici.",
    },
    hidden: (count: number) =>
      count === 1
        ? "Une démarche n'a rien dans cette vue."
        : `${count} démarches n'ont rien dans cette vue.`,
    progress: (done: number, total: number) =>
      `${done} sur ${total} fait${done > 1 ? "s" : ""}`,
    fold: {
      waiting: (count: number, names: string) =>
        `${count} en attente d'un retour · ${names}`,
      blocked: (count: number, names: string) =>
        `${count} ${count > 1 ? "attendent" : "attend"} une autre action · ${names}`,
      done: (count: number, names: string) =>
        `${count} fait${count > 1 ? "s" : ""} · ${names}`,
    },
    readiness: {
      title: "Prêt pour la sortie",
      ready: "Rien de connu ne bloque la sortie côté droits.",
      blocking: (count: number) =>
        count === 1
          ? "1 point bloque la sortie"
          : `${count} points bloquent la sortie`,
      reached: "Atteint",
      notYet: "Pas encore",
      toFollow: "Démarches ouvertes",
      remaining: (count: number) =>
        count === 1
          ? "Les emprunts sont sécurisés, mais 1 démarche reste ouverte :"
          : `Les emprunts sont sécurisés, mais ${count} démarches restent ouvertes :`,
      more: (count: number) => `et ${count} de plus`,
      policy:
        "Un emprunt non sécurisé bloque la sortie. Les fiches, contrats, répartitions et la SACEM ne la bloquent pas, mais restent à suivre.",
    },
    since: (date: string) => `depuis le ${date}`,
    overdue: (date: string) => `Échéance dépassée : ${date}`,
    due: (date: string) => `Échéance : ${date}`,
    open: "Ouvrir",
    delegate: "Modifier",
    delegateTitle: "Responsable et échéance",
    delegateDescription:
      "Changer le responsable est une délégation : elle reste dans le journal du plan.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    errors: {
      failed: "La modification n'a pas pu être enregistrée. Réessayez.",
      responsible: "Ce responsable ne peut pas suivre le juridique.",
    },
    added: {
      body: (count: number) =>
        count === 1
          ? "1 action est apparue depuis le lancement (une personne ou un titre ajouté)."
          : `${count} actions sont apparues depuis le lancement (des personnes ou des titres ajoutés).`,
      action: "Ajouter au plan",
      adding: "Ajout…",
      failed: "Les actions n'ont pas pu être ajoutées. Réessayez.",
    },
    notLaunched: {
      title: "Le plan n'est pas encore lancé",
      body: "Le suivi commence au lancement du plan d'action.",
      action: "Aller au plan d'action",
    },
  },
  // The panels of the plan's lines (components/legal/tracking/*-panel.tsx).
  panels: {
    fiche: {
      next: "Prochaine action",
      waiting: "En attente d'un retour",
      decision: "Décision",
      prepare: (name: string) => `Préparer la fiche de ${name}`,
      prepareBody: (name: string, roles: string) =>
        roles
          ? `Rôles déjà connus : ${roles}. ${name} ne verra que les questions de ces rôles, et confirmera ce qui est pré-rempli.`
          : `${name} choisit ses rôles, puis ne voit que les questions de ces rôles.`,
      sendLink: (name: string) => `Envoyer ce lien à ${name}`,
      once: "Affiché une seule fois. Valable 30 jours, sans compte. WhatsApp convient.",
      linkGone:
        "Le lien n'est affiché qu'une fois : envoyé, marquez-le comme tel ; perdu, « Nouveau lien » en crée un autre et révoque l'ancien.",
      sent: (date: string) =>
        date ? `Envoyée le ${date}, sans réponse` : "Envoyée, sans réponse",
      sentBody:
        "Rien à faire. Un nouveau lien révoque l'ancien : utile pour relancer.",
      corrected: "Une valeur déjà connue a été corrigée",
      complete: "Fiche complète",
      completeBody: "Ses données permanentes sont sur son contact du Réseau.",
    },
    contract: {
      next: "Prochaine action",
      decision: "Décision de la direction",
      waiting: "En attente d'un retour",
      atDirection: "Chez la direction",
      notNeeded:
        "Pas de contrat prévu pour cette personne dans la cartographie.",
      unmapped: "La cartographie des contrats est à valider d'abord.",
      needsInfo: "Il manque des informations pour générer le contrat",
      needsInfoBody:
        "Chaque valeur se complète à sa source (la fiche de renseignements, le Réseau, le projet) : le contrat se génère tout seul dès que tout est là.",
      generate: "Générer le contrat",
      submit: "Relire, puis soumettre à la direction",
      submitBody:
        "Généré depuis son modèle validé. Une clause modifiée crée une nouvelle version, avec sa raison, sur la page du contrat.",
      submitAction: "Soumettre à la direction",
      review: "Valider le document rempli",
      reviewBody: "Valider ce document précis autorise son envoi.",
      reviewWait: "Le document attend la validation de la direction",
      reviewWaitBody:
        "Rien à faire de votre côté : vous serez notifié de sa décision.",
      approve: "Valider le document",
      requestChanges: "Demander des modifications",
      changesLabel: "Ce qu'il faut changer",
      changesMissing: "Dites ce qu'il faut changer.",
      sendChanges: "Envoyer la demande",
      send: "Envoyer en signature",
      sendBody:
        "La signature électronique n'est pas intégrée : envoyez le PDF par votre canal habituel, puis dites comment. C'est la preuve d'envoi.",
      deposit: "Quand le signé revient, déposez-le ici avec sa preuve",
      markSigned: "Marquer comme signé",
      signed: "Signé, avec sa preuve",
      openContract: "Ouvrir le contrat",
      values: (total: number, missing: number) =>
        missing > 0
          ? `Valeurs du contrat · ${missing} manquante${missing > 1 ? "s" : ""} sur ${total}`
          : `Valeurs du contrat · ${total}, toutes remplies`,
      failed: "L'action n'a pas pu être faite. Réessayez.",
    },
    split: {
      next: "Prochaine action",
      waiting: "En attente d'un retour",
      decision: "Décision",
      propose: "Proposer la répartition de l'édition",
      proposeBody:
        "Parts exactes, total exactement 100 %. Chacun la confirmera par son propre lien.",
      fromTitle: "Faire confirmer la répartition de la fiche du titre",
      send: "Envoyer pour confirmation",
      sendBody:
        "Un lien par personne, affiché une seule fois à l'envoi, à copier et envoyer par votre canal habituel.",
      waitingBody:
        "Seule la confirmation de chacun clôt la démarche. Une contestation ouvre une décision, sans rien effacer.",
      disputed: "Répartition contestée",
      confirmed: "Confirmée par tous",
      confirmedBody: "Chaque réponse est gardée avec le contenu exact montré.",
    },
    sacem: {
      waits: "Le bulletin attend d'autres démarches",
    },
  },
  // The launched plan as the prototype drew it (lib/legal/plan/board.ts).
  board: {
    why: {
      onboarding:
        "Chaque personne créditée remplit sa fiche par un lien, sans compte. Ses contrats et la répartition en dépendent.",
      clearance:
        "Reprendre un élément d'une œuvre existante exige l'accord écrit de ses ayants droit, avec la preuve.",
      contract:
        "Un contrat par personne qui en a besoin, généré depuis un modèle validé, signé avec sa preuve.",
      splits:
        "Les parts exactes de chaque auteur, confirmées par chacun par un lien.",
      formality:
        "Le bulletin de chaque œuvre, pré-rempli depuis le dossier, signé puis déposé.",
    },
    after: {
      contract: "Fiches, puis cartographie",
      splits: "Fiches des auteurs",
      formality: "Répartitions et emprunts",
    },
    progress: (done: number, total: number) =>
      `${done} fait${done > 1 ? "s" : ""} sur ${total}`,
    due: (date: string) => `pour le ${date}`,
    since: (date: string) => `depuis le ${date}`,
    waitsFor: (labels: string) => `Attend : ${labels}`,
    waitsFiche: (name: string) => `Attend la fiche de ${name}`,
    namesake: "Homonyme à relier",
    mapping: "Cartographie des contrats",
    edition: "Édition",
    bulletin: "Bulletin 725 · œuvre éditée",
    toPropose: "À proposer",
    confirmations: (ok: number, total: number) =>
      `${ok} confirmation${ok > 1 ? "s" : ""} sur ${total}`,
    verbs: {
      open: "Ouvrir",
      link: "Relier d'abord",
      prepareFiche: "Préparer la fiche",
      markSent: "Marquer comme envoyée",
      review: "Vérifier les réponses",
      mapping: "Valider la cartographie",
      missing: "Voir ce qui manque",
      generate: "Générer le contrat",
      submit: "Soumettre à la direction",
      validateDocument: "Valider le document",
      send: "Envoyer en signature",
      deposit: "Déposer le signé et sa preuve",
      ask: "Demander l'autorisation",
      reply: "Coller leur réponse",
      validateTerms: "Valider les conditions",
      sign: "Faire signer",
      decide: "Décider de la suite",
      split: "Proposer la répartition",
      proposeSplit: "Envoyer pour confirmation",
      fillBulletin: "Compléter le bulletin",
      generateBulletin: "Générer le bulletin",
      signatures: "Recueillir les signatures",
      file: "Déposer le bulletin",
      correct: "Corriger",
    },
    readiness: {
      borrowings: (secured: number, total: number) =>
        `${secured} emprunt${total > 1 ? "s" : ""} sécurisé${secured > 1 ? "s" : ""} sur ${total}`,
      noBorrowing: "Aucun emprunt dans ce projet.",
    },
    responsible: "Responsable et échéance",
    open: "Ouvrir la page",
  },
  // Intervenants non crédités (ticket « Architecture globale », lot 6) :
  // un avocat, un distributeur, un photographe… choisis dans le Réseau.
  projectContacts: {
    title: "Intervenants non crédités",
    description:
      "Les personnes qui interviennent sans être créditées sur un titre : leur fiche et leur contrat suivent ceux des crédités.",
    empty: "Aucun intervenant non crédité.",
    contact: "Personne du Réseau",
    role: "Rôle dans le projet",
    submit: "Ajouter",
    pending: "Ajout…",
    contactRequired: "Choisis une personne du Réseau.",
    remove: (name: string) => `Retirer ${name}`,
    removeShort: "Retirer",
    errors: {
      credited:
        "Cette personne est déjà créditée sur un titre du projet : elle est connue par son crédit.",
      alreadyAdded: "Cette personne est déjà dans le dossier.",
      inUse:
        "Un contrat est prévu pour cette personne dans la cartographie : retire-le d'abord.",
      failed: "L'intervenant n'a pas pu être enregistré. Réessaie.",
    },
  },
} as const;
