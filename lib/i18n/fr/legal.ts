// Juridique section of a project (lib/legal/).
export const legal = {
  inventory: {
    title: "État des lieux",
    description:
      "Tout ce que le projet sait déjà de ses droits, de ses contrats et de ses déclarations. Chaque information est connue, à confirmer ou manquante.",
    // The page that holds the Cadrage's questions and the Confirmation too.
    dossierDescription:
      "Ce que le projet sait déjà, les questions de PO sur ce qui manque, puis le dossier à confirmer. Le plan d'action s'ouvre une fois le dossier confirmé.",
    filterEmpty: {
      known: "Aucune information connue pour l'instant.",
      to_confirm: "Aucune information à confirmer.",
      missing: "Aucune information manquante.",
    },
    actions: {
      // A row that opens its form in a modal on the page (Sacha, 05/11).
      edit: "Modifier",
      removeDeclaration: "Supprimer la déclaration",
      splitsTitle: (kind: string, title: string) => `${kind} · ${title}`,
      declare: "Déclarer",
      declareTitle: "Nouvelle déclaration",
      declareDescription:
        "Le titre et l'organisme, puis le dépôt tel qu'il a été fait.",
      title: "Titre",
      organism: "Organisme",
      allDeclared: "Tous les organismes sont déjà déclarés pour ce titre.",
      complete: "Compléter",
    },
    // Source of an intervenant non crédité.
    contactSource: "Réseau",
    // One section per domain (proto Juridique v3, `inv()`).
    sections: {
      titles: "Titres",
      people: "Personnes",
      splits: "Répartitions",
      agreements: "Contrats",
      declarations: "Déclarations",
      flags: "Points signalés au cadrage",
      contacts: "Intervenants non crédités",
    },
    note: "Une ligne se complète ou se modifie ici, d'un clic. Un contrat s'ouvre sur sa page ; le reste avance avec les démarches du plan.",
    facts: {
      isrc: "ISRC",
      iswc: "ISWC",
      rightsHolder: "Ayant droit ℗",
      credits: "Crédits",
      performer: "Artiste interprète",
      featuring: "Artiste interprète · Featuring",
      // A collective's main artist, said once (Ibé, 18/11/2026); also at
      // the Cadrage and the Confirmation.
      mainArtist: "Artiste principal · tous les titres",
      noContract: "Aucun contrat",
      declarations: "Déclarations",
      secured: {
        master: "Droits master sécurisés",
        publishing: "Droits d'édition sécurisés",
      },
    },
    declarationRef: (reference: string) => `Réf. ${reference}`,
    declarationOn: (date: string) => `déposée le ${date}`,
    declarationNoDate: "date du dépôt non renseignée",
    states: {
      filled: "Fait",
      catalogArtist: "Artiste du catalogue",
      empty: "À faire",
      noContributor: "Aucun contributeur",
      noContract: "Aucun contrat rattaché au projet",
      noDeclaration: "Aucune déclaration déposée",
      // JUR-01: a split filled in is not yet rights secured.
      splitFilled: "Répartition renseignée",
      securedConfirmed: "Confirmée par chaque personne",
      securedToConfirm: "À faire confirmer par chaque personne",
      securedSigned: "Contrat signé avec chaque partie",
      securedMissing: (parties: string) =>
        `Contrat signé manquant : ${parties}`,
      flaggedProposed: "Proposé, à confirmer au cadrage",
      // JUR-03: what to do with a confirmed constraint.
      flaggedToHandle:
        "À traiter : ouvrir une autorisation, ou dire qu'il n'y a rien à autoriser",
      flaggedFollowed: (n: number) =>
        n === 1
          ? "Suivi dans l'autorisation du projet : vérifiez qu'elle le couvre"
          : `Suivi dans les ${n} autorisations du projet : vérifiez qu'elles le couvrent`,
    },
    sources: {
      title: "Fiche du titre",
      artist: "Fiche artiste",
      credits: "Crédits du titre",
      splits: "Splits du titre",
      declarations: "Droits du titre",
      contracts: "Contrats",
      framing: "Cadrage",
      legalSplits: "Répartitions du Juridique",
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
        hint: "Composition, texte, arrangement, production, mix, musiciens… comme vous le diriez.",
        why: "Les crédits de ce titre sont vides : ils servent aux contrats et à la déclaration SACEM.",
        short: "Participants",
        // Some people are already known (known-people.ts): ask for the rest.
        askKnown: (title: string) => `Qui d'autre a participé à « ${title} » ?`,
        whyKnown:
          "Il manque qui a composé, écrit, arrangé, produit ou joué : les contrats et la déclaration SACEM en ont besoin.",
      },
      third_party: {
        ask: (title: string) =>
          `« ${title} » reprend-il un élément d'une œuvre existante ?`,
        hint: "L'œuvre et, si vous le savez, son auteur.",
        why: "Utiliser une œuvre existante exige l'autorisation préalable de ses ayants droit (bulletin SACEM).",
        short: "Élément repris",
      },
      agreements: {
        ask: () => "Des accords existent-ils déjà pour ce projet ?",
        hint: "Le type d'accord et avec qui.",
        why: "Aucun contrat n'est encore rattaché au projet.",
        short: "Accords existants",
      },
      publisher: {
        ask: (title: string) => `L'œuvre « ${title} » a-t-elle un éditeur ?`,
        hint: "Le nom de l'éditeur.",
        why: "Le bulletin SACEM demande les éditeurs de l'œuvre, s'il y en a.",
        short: "Éditeur",
      },
    },
    // A question answered « Oui… / Non… » (as the Cadrage's dimensions,
    // Sacha 10/11/2026): « Oui » opens the field (its label), « Non »
    // records the question's « none ». The examples live in « Oui », not
    // in a grey hint.
    yesNo: {
      third_party: {
        yes: "Oui : sample, topline, interpolation, reprise…",
        no: "Non, aucune œuvre existante",
        label: "Quel élément, de quelle œuvre et de qui ?",
      },
      agreements: {
        yes: "Oui : contrat d'artiste, cession, licence, édition…",
        no: "Non, aucun accord",
        label: "Quels accords, avec qui ?",
      },
      publisher: {
        yes: "Oui, elle a un éditeur",
        no: "Non, pas d'éditeur",
        label: "Quel éditeur ?",
      },
    } as Partial<Record<string, { yes: string; no: string; label: string }>>,
    yesNoLegend: "Votre réponse",
    saveNone: "Enregistrer la réponse",
    project: "Projet",
    // The domain of a question, in the eyebrow of « Question de PO ».
    domains: {
      contributors: "Participants",
      third_party: "Élément repris",
      agreements: "Accords existants",
      publisher: "Éditeur",
    },
    notAsked: {
      sources: {
        credits: "Crédits du titre",
        contracts: "Contrats du projet",
        splits: "Splits du titre",
      },
    },
    answersOf: (answered: number, total: number) =>
      `${answered} réponse${answered > 1 ? "s" : ""} sur ${total}`,
    answer: "Répondre",
    questionOf: (n: number, total: number) => `Question ${n} sur ${total}`,
    answerLabel: "Votre réponse",
    // An answer that says « nothing », saved without PO (UX test of
    // 09/10/2026: « Enregistrer » greyed when the right answer was none).
    none: {
      third_party: "Aucune œuvre existante",
      agreements: "Aucun accord",
      publisher: "Pas d'éditeur",
    } as Record<string, string>,
    // What the Cadrage already established, offered as the answer.
    fromCadrage: "Repris du Cadrage, à vérifier.",
    // Who the title and the Cadrage already name (known-people.ts),
    // offered as the start of the answer, one line per person.
    fromKnown: "Déjà connu, avec sa source. Ajoutez les autres à la suite.",
    known: {
      roles: {
        performer: "interprète",
        recording_engineer: "enregistrement",
        mix_engineer: "mix",
        mastering_engineer: "mastering",
      } as Record<string, string>,
      sources: {
        title: "artiste du titre",
        featuring: "featuring du titre",
        cadrage: "Cadrage",
        session: "session du titre",
      } as Record<string, string>,
      line: (name: string, roles: string[], sources: string[]) =>
        `${name} : ${roles.join(" et ")} (${sources.join(", ")}).`,
    },
    cadrageNone: {
      third_party:
        "Aucune œuvre existante : ni sample, ni reprise, ni interpolation (Cadrage).",
      agreements: "Aucun accord pour l'instant (Cadrage).",
    } as Record<string, string>,
    read: "Lire ma réponse",
    reading: "PO lit votre réponse…",
    reviewTitle: "Ce que PO a compris",
    reviewHint: "Retirez ce qui est faux, puis enregistrez.",
    nothingFound:
      "PO n'a rien relevé dans cette réponse. Reformulez, ou précisez les noms tels qu'ils doivent être écrits.",
    nothingFoundNone: (label: string) =>
      `PO n'a rien relevé dans cette réponse : enregistrez « ${label.toLowerCase()} », ou reformulez.`,
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
    // A row of « Réponses »: its words for a screen reader (« Répondre »
    // for an open one), its pill while unanswered or open in PO's box.
    edit: "Modifier la réponse",
    toAnswerPill: "À répondre",
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
    notice:
      "Confirmer le dossier ne vaut ni signature, ni autorisation, ni dépôt.",
    sections: {
      people: "Personnes",
      third_party: "Éléments repris",
      agreements: "Contrats",
      publishers: "Éditeurs",
    },
    empty: "Rien dans cette partie pour l'instant.",
    sources: {
      intake: "Cadrage juridique",
      // What « À vérifier » no longer says (Sacha 06/11/2026).
      declared: "Cadrage juridique · déclaré, pas encore prouvé",
      deduced: "Cadrage juridique · déduit par PO",
    },
    states: {
      credited: "Crédité",
      inSplit: "Dans le split édition",
      unanswered: "Sans réponse",
      answer: {
        // Plain states (Ibé 01/11, Sacha 06/11/2026): the provenance
        // (declared, deduced…) stays in the source line under the value.
        known: "Fait",
        confirmed: "Fait",
        declared: "À vérifier",
        deduced: "À vérifier",
        to_verify: "À vérifier",
        simulated: "Simulé",
        missing: "À faire",
      },
    },
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
    // JUR-06: the button says what it does.
    confirm: "Confirmer et générer le plan d'action",
    confirmAgain: "Confirmer à nouveau le dossier",
    correct: "Corriger une réponse",
    // A line's way back to its question (ticket Juridique 01).
    actions: { answer: "Répondre", correct: "Corriger" },
    // The question opened in a modal from its line (Sacha, 05/11/2026).
    questionDialog: {
      title: {
        answer: "Répondre à la question",
        correct: "Corriger la réponse",
      },
      description: {
        answer:
          "PO lit votre réponse, vous l'enregistrez, et le dossier se met à jour ici.",
        correct:
          "Votre nouvelle réponse remplace l'ancienne, et le dossier se met à jour ici.",
      },
    },
    confirmedTitle: "Le dossier confirmé",
    preview: {
      title: "Le plan d'action qui sera généré",
      empty: "Aucune démarche à prévoir avec le dossier tel qu'il est.",
      kind: {
        onboarding: (n: number) =>
          n === 1
            ? "1 fiche de renseignements à recueillir"
            : `${n} fiches de renseignements à recueillir`,
        contract: (n: number) =>
          n === 1 ? "1 contrat à prévoir" : `${n} contrats à prévoir`,
        splits: (n: number) =>
          n === 1
            ? "1 répartition de l'édition à faire confirmer"
            : `${n} répartitions de l'édition à faire confirmer`,
        clearance: (n: number) =>
          n === 1
            ? "1 autorisation d'utilisation à obtenir"
            : `${n} autorisations d'utilisation à obtenir`,
        formality: (n: number) =>
          n === 1 ? "1 déclaration SACEM" : `${n} déclarations SACEM`,
      },
      // JUR-06: what stays open after confirming.
      then: "Vous gardez ou retirez chaque action, et choisissez responsables et échéances avant de lancer le plan. Rien n'est envoyé à personne.",
    },
    confirming: "Confirmation…",
    confirmed: (date: string, name: string | null) =>
      name
        ? `Dossier confirmé le ${date} par ${name}.`
        : `Dossier confirmé le ${date}.`,
    confirmedNote:
      "Corriger une réponse le rouvrira : il faudra le confirmer à nouveau.",
    openPlan: "Passer au plan d'action",
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
      clearance: (work: string) => `Autorisation d'utilisation « ${work} »`,
      clearanceDetail: (title: string) => `Repris dans « ${title} »`,
      clearanceWhy:
        "Reprendre un élément d'une œuvre existante exige l'accord de ses ayants droit avant la sortie.",
      splits: (title: string) => `Répartir l'édition de « ${title} »`,
      splitsWhy:
        "Les auteurs et compositeurs doivent s'accorder sur la part de chacun : elle sert à la déclaration SACEM.",
      formality: (title: string) => `Déclarer « ${title} » à la SACEM`,
      formalityWhy:
        "La déclaration ouvre les droits d'auteur. Elle attend les informations des créateurs, la répartition, les autorisations d'œuvres existantes et le master final.",
    },
    // JUR-05: immediate actions apart from dependent ones.
    sections: {
      immediate: {
        title: (n: number) => `Démarches immédiates · ${n}`,
      },
      dependent: {
        title: (n: number) => `Démarches dépendantes · ${n}`,
      },
    },
    noPrereq: "Aucun prérequis",
    // One line per démarche, named as the journey will name it (Sacha,
    // 06/11/2026): what it holds, who answers for it and by when.
    demarches: {
      person: (withFiche: boolean) =>
        withFiche
          ? "Sa fiche de renseignements, puis son contrat"
          : "Son contrat",
      fiches: "les fiches de renseignements",
      after: (labels: string) => `Après : ${labels}`,
      removed: "Retirée",
      removedNote: "Retirée du plan : rien ne sera créé pour elle.",
      remove: "Retirer du plan",
      restore: "Remettre dans le plan",
      close: "Fermer",
      edit: (title: string) => `Modifier « ${title} »`,
    },
    // What launching makes, said once before it happens (JUR-05).
    creates: {
      title: "Ce que le lancement crée",
      aside: "Rien ne part à l'extérieur, aucun contrat n'est généré",
      then: "Chaque démarche part quand son responsable le décide.",
      kind: {
        onboarding:
          "une étape par personne, sa fiche pré-remplie avec ce que PDS OS sait d'elle, son lien privé créé seulement à l'envoi",
        contract:
          "son contrat, généré une fois sa fiche validée, soumis à la direction avant tout envoi",
        clearance:
          "une étape d'autorisation, la demande aux ayants droit préparée mais pas envoyée",
        splits:
          "une étape de répartition, les liens de confirmation créés seulement à l'envoi",
        formality:
          "une étape de déclaration, le bulletin pré-rempli depuis le dossier, généré seulement après vérification",
      },
      line: (label: string, what: string) => `${label} : ${what}`,
    },
    // One group per kind of action: what they share is said once.
    groups: {
      onboarding: "Fiches de renseignements",
      contract: "Contrats à faire signer",
      splits: "Répartitions de l'édition",
      clearance: "Autorisations à obtenir",
      formality: "Déclarations SACEM",
    },
    // Where an action is done, the same button everywhere.
    go: {
      onboarding: "Préparer les fiches",
      contract: "Voir les contrats",
      splits: "Répartir",
      clearance: "Ouvrir l'autorisation",
      formality: "Déclarer",
    },
    responsible: "Responsable",
    noResponsible: "À désigner",
    due: "Échéance",
    launch: "Lancer le plan d'action",
    launching: "Lancement…",
    nothing: "Le dossier ne demande aucune action pour l'instant.",
    needsConfirmation: {
      title: "Le dossier n'est pas encore confirmé",
      body: "Le plan d'action part du dossier confirmé : relisez-le et confirmez-le d'abord.",
      action: "Aller à la confirmation",
    },
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
      "La signature des contrats et le dépôt SACEM se font hors de PDS OS : déposez ici le signé et sa preuve une fois faits. Chaque état vient de ce qui est saisi dans PDS OS.",
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
      // An awaited return says from whom and what unlocks it (JUR-28).
      sentForSignature:
        "Envoyé pour signature : en attente du contrat signé, à déposer avec sa preuve",
      awaitingDirector: "À valider par la direction",
      // JUR-11: signed back by the person, PDS still to sign, then checked.
      awaitingCountersign:
        "Signé par la personne : la direction doit signer pour PDS",
      signatureToCheck: "Signé des deux côtés : vérifier la signature",
      noContract: "Aucun contrat pour l'instant",
      titleRemoved: "Le titre n'est plus dans le projet",
      splitConfirmed: "Répartition confirmée par tous",
      splitDisputed: "Répartition contestée",
      splitWaiting: (confirmed: number, total: number) =>
        `${confirmed} confirmation${confirmed > 1 ? "s" : ""} sur ${total} : en attente de la réponse des autres personnes, par leur lien`,
      splitToDo: "Répartition à proposer",
      splitOnTitle: "Répartie sur la fiche du titre, à faire confirmer",
      clearanceGone: "Plus à sécuriser",
      cleared: "Sécurisé",
      clearance: {
        refused: "Refusé par les ayants droit",
        action_required: "Action requise",
      },
      clearanceWaiting:
        "En attente de la réponse des ayants droit, à consigner dans l'autorisation",
      clearanceTermsPending: "Conditions à valider par la direction",
      toInvestigate: "À instruire",
      declared: "Déclaration confirmée",
      submitted:
        "Déposée : en attente de la réponse de la SACEM, à saisir avec « Enregistrer le résultat »",
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
      clearance: "Ouvrir l'autorisation",
      formality: "Ouvrir la déclaration",
    },
    views: { act: "Ce qui attend une action", all: "Tout le plan" },
    activeFilter: (group: string) => `Filtre : ${group}.`,
    clearFilter: "Retirer le filtre",
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
          ? "Les autorisations sont obtenues, mais 1 démarche reste ouverte :"
          : `Les autorisations sont obtenues, mais ${count} démarches restent ouvertes :`,
      more: (count: number) => `et ${count} de plus`,
      policy:
        "Une œuvre existante non autorisée bloque la sortie. Les fiches, contrats, répartitions et la SACEM ne la bloquent pas, mais restent à suivre.",
    },
    since: (date: string) => `depuis le ${date}`,
    overdue: (date: string) => `Échéance dépassée : ${date}`,
    due: (date: string) => `Échéance : ${date}`,
    open: "Ouvrir",
    delegate: "Changer",
    delegated: "Responsable et échéance changés",
    delegateWhy: "Pourquoi",
    delegateWhyMissing: "Dites pourquoi : c'est gardé dans l'historique.",
    delegateTitle: "Responsable et échéance",
    delegateDescription:
      "Gardé dans l'historique. La personne qui reprend est prévenue.",
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
    // A person's fiche in their démarche, as the Master sends its package
    // (Sacha, 06/11/2026: « pas pro »; proto juridique-v3 `link`).
    fiche: {
      decision: "Décision",
      known: "Déjà connu, pré-rempli dans sa fiche",
      roles: "Rôles sur le projet",
      creditName: "Nom à créditer",
      artistName: "Nom d'artiste",
      fromCredits: "Crédits du titre",
      fromArtist: "Page artiste",
      fromNetwork: "Réseau",
      send: (name: string) => `Envoyer la fiche à ${name}`,
      sending: "Envoi…",
      linkInstead: "Copier le lien plutôt",
      noAddress: (name: string) =>
        `PDS OS n'a pas encore l'adresse de ${name} : c'est justement la fiche qui la recueille. Créez le lien, envoyez-le par votre canal habituel, puis marquez la fiche comme envoyée.`,
      createLink: "Créer le lien de la fiche",
      sendYourself: (name: string) =>
        `Envoyez ce lien à ${name} par votre canal habituel, puis marquez la fiche comme envoyée.`,
      markSent: "Marquer la fiche comme envoyée",
      // Who is awaited, in the Master's blue (Sacha, 06/11/2026).
      waiting: (name: string) => `En attente de ${name} : remplir sa fiche.`,
      waitingComplement: (name: string, fields: string, at: string) =>
        `En attente de ${name} : compléter sa fiche (${fields}), demandé le ${at}.`,
      answers: (name: string) => `Ce que ${name} a rempli`,
      corrections: "Corrections à vérifier",
      fromFiche: (name: string) => `Fournie par ${name}, dans sa fiche`,
      corrected: "Une valeur déjà connue a été corrigée",
      complete: "Fiche complète",
      completeBody: "Ses données permanentes sont sur son contact du Réseau.",
    },
    contract: {
      notNeeded:
        "Pas de contrat prévu pour cette personne dans les contrats à prévoir.",
      unmapped: "Les contrats à prévoir sont à valider d'abord.",
      toMapping: "Aller au Plan d'action",
      // Who is awaited, in the Master's blue (Sacha, 06/11/2026).
      waitingDirection: (direction: string) =>
        `En attente de ${direction} : valider le contrat.`,
      needsInfoBody:
        "Chaque valeur se complète à sa source (la fiche de renseignements, le Réseau, le projet) : le contrat se génère tout seul dès que tout est là.",
      generate: "Générer le contrat",
      submit: "Relire, puis soumettre à la direction",
      submitAction: "Soumettre à la direction",
      review: "Valider le document rempli",
      approve: "Valider le document",
      requestChanges: "Demander des modifications",
      changesLabel: "Ce qu'il faut changer",
      changesMissing: "Dites ce qu'il faut changer.",
      sendChanges: "Envoyer la demande",
      send: "Envoyer en signature",
      markSigned: "Marquer comme signé",
      signed: "Signé, avec sa preuve",
      openContract: "Ouvrir le contrat",
      // The fee as recorded, with its source (JUR-15).
      financial: {
        title: "Conditions financières",
        amount: (fee: string, source: string) => `${fee}, ${source}`,
        fromFiche: "d'après la fiche de renseignements",
        fromMapping: "saisi dans les contrats nécessaires",
        none: "aucune rémunération enregistrée",
      },
      // Which fiche is awaited, for which contract (JUR-10).
      missingFromFiche: (name: string, fields: string) =>
        `Il manque les renseignements de ${name} pour préparer son contrat : ${fields}. Ils arrivent avec sa fiche de renseignements.`,
      complete: "Compléter",
      values: (total: number, missing: number) =>
        missing > 0
          ? `Valeurs du contrat · ${missing} bloquante${missing > 1 ? "s" : ""} sur ${total}`
          : `Valeurs du contrat · ${total}, rien ne bloque`,
      failed: "L'action n'a pas pu être faite. Réessayez.",
    },
    split: {
      next: "Prochaine action",
      waiting: "En attente d'un retour",
      decision: "Décision",
      propose: "Proposer la répartition",
      fromTitle: "Faire confirmer la répartition de la fiche du titre",
      send: "Envoyer pour confirmation",
      // JUR-01: every creator and every publisher outside the house answers.
      sendBody: (names: string[], house: boolean) =>
        `Un lien par personne, valable 30 jours : ${names.length > 1 ? `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}` : (names[0] ?? "")} confirment ou contestent.${house ? " PDS Éditions, c'est vous." : ""}`,
      house: "PDS Éditions, c'est vous : aucun lien à envoyer.",
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
    // When a démarche counts as done, said once on its card (JUR-07); the
    // same rules the code applies (lib/legal/tracking/sources.ts).
    doneWhen: {
      onboarding: "Terminé quand chaque personne a une fiche complète.",
      contract:
        "Terminé quand chaque contrat est signé, avec le signé et sa preuve dans ses fichiers.",
      splits:
        "Terminé quand chaque personne a confirmé la dernière version de la répartition.",
      clearance:
        "Terminé quand l'utilisation est autorisée : licence signée et preuve déposées.",
      formality:
        "Terminé quand la SACEM a confirmé l'enregistrement de la déclaration.",
    },
    // One line per person, per title (UX test of 09/10/2026).
    sections: {
      people: "Personnes",
      titles: "Titres",
    },
    // The step a person's or a title's line shows, before its state.
    stepOf: {
      fiche: "Fiche · ",
      contract: "Contrat · ",
      split: "Répartition · ",
      sacem: "SACEM · ",
    } as Record<string, string>,
    steps: {
      fiche: "Fiche de renseignements",
      contract: "Contrat",
      split: "Répartition de l'édition",
      sacem: "Bulletin SACEM",
      mapping: "Contrats à prévoir",
      clearance: "Autorisation d'utilisation",
      link: "Démarche",
      steps: "Démarche",
    } as Record<string, string>,
    next: (label: string) => `Suivant : ${label}`,
    why: {
      people:
        "Pour chaque personne : sa fiche de renseignements (par un lien, sans compte), puis son contrat.",
      titles:
        "Pour chaque titre : la répartition de l'édition confirmée par chacun, puis le bulletin SACEM.",
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
      contract: "Fiches, puis contrats à prévoir",
      splits: "Fiches des auteurs",
      formality: "Répartitions et autorisations",
    },
    progress: (done: number, total: number) =>
      `${done} fait${done > 1 ? "s" : ""} sur ${total}`,
    due: (date: string) => `pour le ${date}`,
    since: (date: string) => `depuis le ${date}`,
    waitsFor: (labels: string) => `Attend : ${labels}`,
    waitsFiche: (name: string) => `Attend la fiche de ${name}`,
    namesake: "Homonyme à relier",
    notInNetwork: "Pas dans le Réseau",
    mapping: "Contrats à prévoir",
    edition: "Édition",
    bulletin: "Bulletin 725 · œuvre éditée",
    toPropose: "À proposer",
    confirmations: (ok: number, total: number) =>
      `${ok} confirmation${ok > 1 ? "s" : ""} sur ${total}`,
    verbs: {
      open: "Ouvrir",
      link: "Relier d'abord",
      addToNetwork: "Ajouter au Réseau",
      prepareFiche: "Préparer la fiche",
      markSent: "Marquer comme envoyée",
      review: "Vérifier les réponses",
      mapping: "Valider les contrats à prévoir",
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
        `${secured} autorisation${total > 1 ? "s" : ""} obtenue${secured > 1 ? "s" : ""} sur ${total}`,
      noBorrowing: "Aucune œuvre existante dans ce projet.",
    },
    responsible: "Responsable et échéance",
    open: "Ouvrir la page",
  },
  // Intervenants non crédités (ticket « Architecture globale », lot 6) :
  // un avocat, un distributeur, un photographe… choisis dans le Réseau.
  projectContacts: {
    add: "Ajouter un intervenant",
    addDescription:
      "Une personne du Réseau qui intervient sans être créditée : sa fiche et son contrat suivent ceux des crédités.",
    contact: "Personne du Réseau",
    role: "Rôle dans le projet",
    submit: "Ajouter",
    pending: "Ajout…",
    contactRequired: "Choisis une personne du Réseau.",
    remove: (name: string) => `Retirer ${name}`,
    removeShort: "Retirer",
    roleSaved: "Rôle modifié",
    errors: {
      credited:
        "Cette personne est déjà créditée sur un titre du projet : elle est connue par son crédit.",
      alreadyAdded: "Cette personne est déjà dans le dossier.",
      inUse:
        "Un contrat est prévu pour cette personne dans les contrats à prévoir : retirez-le d'abord.",
      roleInUse:
        "Un contrat est déjà prévu pour cette personne avec ce rôle : retirez-le des contrats à prévoir pour changer son rôle.",
      failed: "L'intervenant n'a pas pu être enregistré. Réessaie.",
    },
  },
} as const;
