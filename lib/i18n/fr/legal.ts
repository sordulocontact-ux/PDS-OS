// Juridique section of a project (lib/legal/).
export const legal = {
  inventory: {
    title: "État des lieux",
    description:
      "Tout ce que le projet sait déjà de ses droits, de ses accords et de ses déclarations. Chaque information est connue, à confirmer ou manquante.",
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
      agreements: {
        title: "Accords",
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
      body: "La prochaine étape, la confirmation du dossier, arrive bientôt. Vous pouvez encore corriger une réponse ci-dessous.",
    },
    errors: {
      invalid: "Cette réponse n'a pas pu être lue. Réessayez.",
      failed: "La réponse n'a pas pu être enregistrée. Réessayez.",
      provider:
        "PO n'a pas pu lire votre réponse pour l'instant. Réessayez dans un instant.",
    },
    panel: {
      title: "Le dossier",
      description: "Ce que le projet sait, mis à jour à chaque réponse.",
      line: (known: number, toConfirm: number, missing: number) =>
        `${known} connu${known > 1 ? "s" : ""} · ${toConfirm} à confirmer · ${missing} manquant${missing > 1 ? "s" : ""}`,
      clearances: (count: number) =>
        count === 0
          ? "Aucun élément tiers à sécuriser"
          : count === 1
            ? "1 élément tiers à sécuriser"
            : `${count} éléments tiers à sécuriser`,
      thirdParty: "Éléments tiers",
      responsibles: "Responsables",
      responsiblesNote: "Désignés au plan d'action.",
      open: "Voir l'état des lieux",
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
        title: "Accords",
        description: "Les contrats du projet et les accords déclarés.",
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
      "Corriger une réponse le rouvrira : il faudra le confirmer à nouveau. La prochaine étape, le plan d'action, arrive bientôt.",
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
          "Débloquées dès que ce dont elles dépendent est fait. Leur tâche se crée alors depuis le Suivi.",
      },
    },
    // Plain words (Sacha, 04/10/2026: « je comprends pas ») : what to do,
    // then why it exists.
    items: {
      onboarding: (count: number) =>
        count === 1
          ? "Récupérer les informations d'une personne"
          : `Récupérer les informations de ${count} personnes`,
      onboardingWhy:
        "Créditées mais pas encore dans le Réseau : il faut leur identité, leurs coordonnées, leur numéro SACEM et de quoi les payer.",
      contract: (name: string) => `Faire signer un contrat à ${name}`,
      contractWhy:
        "Sa participation (rémunération, cession de ses droits) doit être écrite et signée.",
      clearance: (work: string) => `Obtenir l'accord pour « ${work} »`,
      clearanceDetail: (title: string) => `Repris dans « ${title} »`,
      clearanceWhy:
        "Reprendre un élément d'une œuvre existante exige l'accord de ses ayants droit avant la sortie.",
      splits: (title: string) => `Répartir l'édition de « ${title} »`,
      splitsWhy:
        "Les auteurs et compositeurs doivent s'accorder sur la part de chacun : elle sert à la déclaration SACEM.",
      formality: (title: string) => `Déclarer « ${title} » à la SACEM`,
      formalityWhy:
        "La déclaration ouvre les droits d'auteur. Elle attend les informations des créateurs, la répartition, les accords et le master final.",
    },
    after: (labels: string) => `Après : ${labels}`,
    empty: "Rien dans cette colonne.",
    include: (label: string) => `Garder « ${label} » dans le plan`,
    responsible: "Responsable",
    noResponsible: "À désigner",
    due: "Échéance",
    optional: "facultatif",
    launch: "Lancer le plan",
    launching: "Lancement…",
    notice:
      "Lancer le plan crée les tâches des actions à lancer maintenant. Rien n'est envoyé à l'extérieur et aucun contrat n'est créé.",
    nothing: "Le dossier ne demande aucune action pour l'instant.",
    needsConfirmation: {
      title: "Le dossier n'est pas encore confirmé",
      body: "Le plan d'action part du dossier confirmé : relisez-le et confirmez-le d'abord.",
      action: "Aller à la confirmation",
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
      dueMissing: (labels: string) =>
        `Ajoutez une échéance pour créer la tâche de : ${labels}.`,
      failed: "Le plan n'a pas pu être lancé. Réessayez.",
    },
    openTracking: "Voir le suivi",
  },
  tracking: {
    title: "Suivi",
    description:
      "Qu'est-ce qui nécessite notre attention ? L'état de chaque action est relu à chaque visite dans le Réseau, les Contrats et les fiches des titres.",
    integrations:
      "Pas encore intégrés : les fiches à remplir par lien, l'envoi en signature et les dépôts SACEM. Les états viennent de ce qui est saisi dans PDS OS.",
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
      splitComplete: "Répartition saisie à 100 %",
      splitToDo: "Répartition à compléter",
      clearanceGone: "Plus à sécuriser",
      cleared: "Sécurisé",
      clearance: {
        refused: "Refusé par les ayants droit",
        action_required: "Action requise",
      },
      clearanceWaiting: "En attente des ayants droit",
      toInvestigate: "À instruire",
      declared: "Déclaration confirmée",
      submitted: "Déposée, en traitement",
      rejected: "Déclaration refusée",
      toDeclare: "À déclarer",
      waitsForOthers: "Attend une autre action",
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
      dueMissing:
        "Ajoutez une échéance (Modifier) : elle est nécessaire pour créer la tâche.",
      responsibleMissing:
        "Désignez un responsable (Modifier) : la tâche lui sera assignée.",
    },
    task: {
      create: "Créer la tâche",
      creating: "Création…",
      tick: "Cocher la tâche",
      open: "Tâche dans Travail",
      done: "Tâche cochée",
      none: "Pas encore de tâche",
    },
    notLaunched: {
      title: "Le plan n'est pas encore lancé",
      body: "Le suivi commence au lancement du plan d'action.",
      action: "Aller au plan d'action",
    },
  },
} as const;
