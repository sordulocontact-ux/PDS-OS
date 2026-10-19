// Master workflow of a project (lib/master-workflow/).
const titles = (count: number) => (count > 1 ? `${count} titres` : "1 titre");

export const masterWorkflow = {
  steps: {
    label: "Étapes du master",
    soon: "Bientôt disponible",
    // The five steps shown (lib/ui/master-steps.ts, Sacha, 11/10/2026):
    // the path of the ticket « Workflow Master », the Brief its own step.
    source: "Source",
    brief: "Brief",
    mixing: "Mixage",
    mastering: "Mastering",
    final: "Master final",
  },
  // One page per round (lib/ui/master-steps.ts, ticket « Architecture
  // globale »): the validations live inside, never a step of their own.
  production: {
    progress: (done: number, total: number) =>
      `${done} titre${done > 1 ? "s" : ""} validé${done > 1 ? "s" : ""} sur ${total}`,
    show: "Afficher",
    alreadyFinal: (n: number) =>
      n === 1
        ? "Le titre avait déjà son master final au Catalogue avant le workflow."
        : `Les ${n} titres avaient déjà leur master final au Catalogue avant le workflow.`,
    toFinal: "Voir le master final",
    mix: {
      title: "Mixage",
      description:
        "Le dossier part au mixeur, les versions reviennent, le validateur décide titre par titre. Un mix validé ne change plus.",
      round: "Mix",
      done: "Chaque titre a son mix final",
      nothing: "Rien à mixer",
    },
    mastering: {
      title: "Mastering",
      description:
        "Le dossier de mastering part avec les mix finals, les versions reviennent, le validateur décide titre par titre.",
      round: "Mastering",
      done: "Chaque titre a son master final",
      nothing: "Rien à masteriser",
      waiting: (done: number, total: number) =>
        `S'ouvre quand chaque titre a son mix final (${done} sur ${total} pour l'instant).`,
    },
  },
  // Where each title stands for its mix (PROJ-BUG-06).
  diagnosis: {
    title: "Où en est le mix de chaque titre",
    description:
      "Le parcours s'adapte à la source réelle : un titre déjà mixé passe directement au mastering, sans nouveau mixage ni pistes séparées.",
    states: {
      todo: "Mix à faire",
      running: "Mix en cours",
      done: "Mix terminé",
      master_final: "Master final déjà là",
    },
    next: {
      todo: "Le mix part au mixeur avec le dossier du Mixage.",
      running: "Les versions arrivent dans le Mixage, le validateur décide.",
      done: "Le mix final est là : ce titre passe au mastering.",
      master_final: "Rien à mixer ni à masteriser pour ce titre.",
    },
    existing: (fileName: string) =>
      `Un mix existe déjà au Catalogue (« ${fileName} ») : s'il est final, le titre peut passer au mastering sans nouveau mixage.`,
    divergence: (brief: string, catalogue: string) =>
      `Le Brief confie le mix à ${brief}, le Catalogue crédite ${catalogue} : vérifiez avant d'envoyer (rien n'est remplacé).`,
    declare: "Utiliser ce mix comme mix final",
    declareTitle: (title: string) =>
      `Utiliser ce mix comme mix final de « ${title} » ?`,
    declareBody: (fileName: string) =>
      `« ${fileName} » devient le mix final du titre, définitivement : le mastering partira de ce fichier, sans copie. Le mix n'est pas envoyé au mixeur.`,
    declareNote: "Pourquoi (facultatif)",
    declared: "Mix final enregistré : le titre passe au mastering.",
  },
  // At the top of the Source step (lib/ui/master-steps.ts): where the
  // preparation of the mix stands.
  prepare: {
    title: "Où en est la préparation",
    description:
      "La source de chaque titre, le Brief, puis l'envoi au mixeur : chaque ligne dit ce qui reste.",
    doneLabel: "fait",
    todoLabel: "à faire",
    sources: {
      title: "Source du mix",
      none: "Aucun titre dans le projet.",
      finished: (total: number) =>
        total === 1
          ? "Le titre a déjà son master final : aucune source à confirmer."
          : `Les ${total} titres ont déjà leur master final : aucune source à confirmer.`,
      count: (done: number, total: number) =>
        done === total
          ? total === 1
            ? "Confirmée pour le titre."
            : `Confirmée pour les ${total} titres.`
          : `${done} titre${done > 1 ? "s" : ""} sur ${total} confirmé${done > 1 ? "s" : ""} : la version de départ de chaque titre, plus bas.`,
      action: "Confirmer les sources",
    },
    brief: {
      title: "Brief Mix/Master",
      empty:
        "Pas encore enregistré : ce que le projet sait déjà y est pré-rempli, à relire.",
      notNeeded: "Facultatif : il n'y a rien à mixer ni à masteriser.",
      noEngineer: "Enregistré, sans ingénieur du mix.",
      engineer: (name: string) => `Mix confié à ${name}.`,
      fill: "Remplir le Brief",
      open: "Ouvrir le Brief",
    },
    send: {
      title: "Envoi au mixeur",
      ready: "Tout est prêt : le dossier peut partir.",
      sent: "Le dossier est parti : la suite se passe dans Mixage.",
      action: "Passer au mix",
      follow: "Suivre le mix",
      nothing: "Rien à envoyer : chaque titre a déjà son master final.",
      final: "Voir le master final",
    },
  },
  brief: {
    title: "Brief Mix/Master",
    description:
      "Ce que l'ingénieur du mix et celui du mastering doivent savoir : la source, qui fait quoi, la direction, les livrables et le calendrier. Rempli par le chef de projet.",
    saved: (date: string, by: string | null) =>
      by ? `Enregistré le ${date} par ${by}` : `Enregistré le ${date}`,
    notSaved:
      "Pas encore enregistré : ce qui est déjà connu du projet est pré-rempli.",
    allFinal:
      "Tous les titres du projet ont déjà leur master final : il n'y a rien à mixer ni à masteriser. Le Brief reste facultatif, pour garder une trace.",
    submit: "Enregistrer le Brief",
    submitting: "Enregistrement…",
    savedToast: "Brief enregistré.",
    none: "Pas encore choisi",
    // What the Brief is for and what comes out of it (PROJ-UX-08).
    purpose:
      "Le Brief dit à l'ingénieur du mix puis à celui du mastering ce qu'on attend d'eux. Résultat attendu : le dossier qu'ils recevront par leur lien privé, avec la direction, les conditions, les livrables, les dates et votre message.",
    savedAt: (date: string, by: string | null) =>
      by ? `Enregistré le ${date} par ${by}` : `Enregistré le ${date}`,
    unchanged: "Aucune modification à enregistrer.",
    orderError: (after: string) =>
      `Cette date tombe avant « ${after} » : les échéances vont dans l'ordre (Mix V1, Mix final, Mastering, Master final).`,
    dirty: "Modifications non enregistrées.",
    next: {
      title: "Étape suivante : transmettre le dossier",
      body: "Le dossier se transmet depuis Mixage : vous le relisez, puis un lien privé est créé pour l'ingénieur.",
      ready: "Tout ce qu'il faut pour transmettre est là.",
      missing: "Avant de transmettre :",
      action: "Aller à Mixage",
      sentAlready: (date: string) =>
        `Le dossier est parti le ${date} : une modification du Brief n'atteint l'ingénieur qu'avec un nouvel envoi (« Renvoyer le dossier » dans Mixage).`,
    },
    sections: {
      sources: {
        title: "Source",
        description: "La version de chaque titre, sa session et ses pistes.",
      },
      conditions: {
        title: "Conditions de prestation",
        description:
          "Qui fait le mix et le mastering, à quel tarif estimé, combien d'allers-retours, et qui valide les versions.",
      },
      direction: {
        title: "Direction artistique",
        description: "Ce que le mix doit faire entendre.",
      },
      deliverables: {
        title: "Livrables et formats",
        description: "Ce que l'ingénieur rend, et sous quelle forme.",
      },
      calendar: {
        title: "Dates",
        description:
          "Les échéances, dans l'ordre : elles partent telles quelles dans le dossier de l'ingénieur.",
      },
      message: {
        title: "Message",
        description:
          "Affiché en tête du dossier ; repris quand vous transmettez, modifiable à ce moment-là.",
      },
    },
    fields: {
      mixEngineer: "Ingénieur du mix",
      masteringEngineer: "Ingénieur du mastering",
      engineerHint:
        "Les ingénieurs crédités sur les titres d'abord, puis ceux du Réseau.",
      sameEngineer: "Même ingénieur que le mix",
      mixRate: "Tarif estimé du mix",
      masteringRate: "Tarif estimé du mastering",
      rateHint: "En euros.",
      revisions: "Révisions incluses",
      revisionsHint: "Le nombre d'allers-retours prévus avec l'ingénieur.",
      validator: "Qui valide les versions",
      validatorHint: "Le chef de projet ou un directeur créatif du projet.",
      references: "Références",
      referencesHint:
        "Des titres dont s'inspirer, avec ce qu'il faut y entendre.",
      direction: "Direction",
      constraints: "Contraintes",
      deliverables: "Livrables",
      formats: "Formats de livraison",
      formatsHint:
        "Par exemple : WAV 24 bits / 48 kHz, -14 LUFS, un fichier par titre.",
      message: "Message pour les ingénieurs",
      messageHint: "Ce que vous voulez leur dire en ouvrant le dossier.",
      mixV1Due: "Mix V1",
      mixFinalDue: "Mix final",
      masteringDue: "Mastering",
      masterFinalDue: "Master final",
      masterFinalHint: "La date dont tout le reste dépend.",
    },
    deliverables: {
      mix_final: "Mix final",
      master_final: "Master final",
      instrumental: "Instrumental",
      acapella: "A cappella",
      clean: "Version clean",
      radio_edit: "Radio edit",
      live: "Version live / performance",
      tv_mix: "TV mix / backing track",
      stems: "Stems",
    },
    proposal: (dates: string) => `Proposition : ${dates}.`,
    applyProposal: "Utiliser ces dates",
    noProposal:
      "Indiquez la date du master final pour obtenir une proposition.",
    engineerContact: {
      noHistory: "Jamais crédité sur un titre de PDS",
      credited: "Crédité sur les titres du projet",
    },
    budget: {
      title: "Budget du projet",
      description:
        "Les tarifs du Brief inscrits au Budget, et où ils en sont. Un montant proposé ne consomme pas l'enveloppe : accepté, il devient engagé.",
      roles: { mix: "Mix", mastering: "Mastering" },
      item: "Poste",
      lineLabel: (role: string, engineer: string | null) =>
        engineer ? `${role} · ${engineer}` : role,
      add: "Inscrire au budget",
      noRate: "Indiquez d'abord ce tarif dans le Brief, puis enregistrez-le.",
      notInBudget: "Pas encore au budget",
      noRateShort: "Pas de tarif au Brief",
      total: (amount: string) => `Total estimé du Brief : ${amount}`,
      noTotal: "Aucun tarif estimé dans le Brief.",
      sameLine: "Compris dans le tarif du mix",
      status: "État du montant",
      open: "Voir le Budget",
      already: "Ce tarif est déjà au budget.",
      forbidden: "Seul le chef de projet responsable modifie le budget.",
      failed: "Le budget n'a pas pu être mis à jour. Réessayez.",
      differs: (brief: string) => `Le Brief dit ${brief}.`,
    },
    review: {
      text: (field: string, edit: boolean) =>
        edit ? `${field} (modification)` : `${field} (ajout)`,
      engineer: (role: string) => `Ingénieur du ${role}`,
      sameEngineer: "Même ingénieur pour le mix et le mastering",
      rate: (role: string) => `Tarif estimé du ${role}`,
      deliverable: "Livrable ajouté",
      roles: { mix: "mix", mastering: "mastering" },
      yes: "Oui",
      no: "Non",
      applied: "Brief mis à jour.",
    },
    dictate: "Remplir en dictant",
    exchanges: {
      title: "Échanges",
      description:
        "Un call avec l'ingénieur ou l'équipe pour compléter le Brief : son ordre du jour reprend ce qui manque, puis ce qui s'y dit est proposé ici.",
      prepare: "Préparer un échange",
      prepareTitle: "Préparer un échange",
      prepareDescription:
        "Un call du projet dont l'ordre du jour reprend ce que le Brief ne dit pas encore. Une fois enregistré et traité, il propose des réponses au Brief.",
      defaultTitle: "Échange Mix/Master",
      agendaTitle: (minutes: number) =>
        `Ordre du jour, d'après ce que le Brief ne dit pas encore (${minutes} min)`,
      minutes: (minutes: number) => `${minutes} min`,
      create: "Créer le call",
      preparing: "Création…",
      empty: "Aucun échange pour l'instant.",
      propose: "Proposer pour le Brief",
      analysing: "PO lit ce qui s'est dit…",
      open: "Ouvrir le call",
      notProcessed: "Pas encore traité",
      processed: "Traité",
      columns: { call: "Call", date: "Date", state: "État" },
    },
    agenda: {
      engineers: "Qui mixe, qui masterise, et si c'est la même personne",
      rates: "Tarifs du mix et du mastering, révisions incluses",
      direction:
        "Direction artistique : références, ce que le son doit être, contraintes",
      deliverables:
        "Livrables attendus (instrumental, clean, radio edit, stems…)",
      calendar: "Calendrier : date du master final, puis Mix V1 et Mix final",
      sources: "Source : la version à transmettre et les pistes séparées",
      confirm: "Relire ensemble le Brief et confirmer ce qui est déjà noté",
    },
    errors: {
      forbidden: "Seul le chef de projet responsable remplit le Brief.",
      amount: "Un montant en euros, par exemple 800 ou 1 200,50.",
      revisions: "Un nombre entre 0 et 20.",
      date: "Une date valide.",
      calendar:
        "Les dates doivent se suivre : Mix V1, Mix final, Mastering, puis Master final.",
      validator:
        "Le validateur doit être le chef de projet ou un directeur créatif du projet.",
      tooLong: "2 000 caractères au plus.",
      failed: "Le Brief n'a pas pu être enregistré. Réessayez.",
    },
  },
  mix: {
    title: "Mix",
    description:
      "Le dossier que reçoit l'ingénieur du mix, puis son suivi : envoi, attente, relances, réception.",
    package: {
      title: {
        mix: "Dossier pour le mixeur",
        mastering: "Dossier pour le mastering",
      },
      description:
        "Calculé à partir du Brief et des fichiers confirmés : c'est exactement ce que l'ingénieur recevra.",
      to: "Destinataire",
      titles: { mix: "Titres à mixer", mastering: "Titres à masteriser" },
      source: { mix: "Source", mastering: "Mix final" },
      missing: {
        mix: "Source à confirmer",
        mastering: "Mix final à valider",
      },
      stems: (count: number) =>
        count === 0
          ? "Aucune piste séparée"
          : count > 1
            ? `${count} pistes séparées`
            : "1 piste séparée",
      direction: "Direction",
      references: "Références",
      constraints: "Contraintes",
      deliverables: "Livrables",
      revisions: "Révisions incluses",
      mixV1Due: "Mix V1 attendu le",
      mixFinalDue: "Mix final attendu le",
      masteringDue: "Mastering attendu le",
      masterFinalDue: "Master final attendu le",
      releaseDue: "Sortie prévue le",
      formats: "Formats de livraison",
      none: "Non renseigné",
      notSent: "Les tarifs restent internes : ils ne sont pas dans le dossier.",
    },
    blockers: {
      title: "Avant de transmettre",
      engineer: "Choisissez l'ingénieur du mix dans le Brief Mix/Master.",
      masteringEngineer:
        "Choisissez l'ingénieur du mastering dans le Brief Mix/Master (ou « même ingénieur que le mix »).",
      mixFinal: (title: string) =>
        `Le mix final de « ${title} » n'est pas encore validé.`,
      noTitle:
        "Tous les titres du projet ont déjà leur master final : il n'y a rien à mixer.",
      allMixed:
        "Chaque titre a déjà son mix final : rien à envoyer au mixeur, le mastering peut commencer.",
      source: (title: string) =>
        `Confirmez la source de « ${title} » sur l'État du master.`,
    },
    transmitTo: {
      mix: "Transmettre au mixeur",
      mastering: "Transmettre au mastering",
    },
    transmitTitle: "Transmettre le dossier",
    transmitDescription:
      "Un lien privé donne accès au dossier et à ses fichiers, sans compte, et permet à l'ingénieur de déposer ses versions. Il reste valable 14 jours après la date finale prévue au Brief (30 jours au moins). Il n'est affiché qu'une fois : copiez-le ou envoyez-le tout de suite.",
    modes: {
      remind: {
        label: "Renouveler le lien",
        title: "Relancer l'ingénieur",
        description:
          "Un nouveau lien remplace le précédent et renouvelle les fichiers, jusqu'à 14 jours après la date finale prévue au Brief (30 jours au moins). Il n'est affiché qu'une fois.",
      },
      resend: {
        label: "Renvoyer le dossier",
        title: "Renvoyer le dossier",
        description:
          "Le dossier est recalculé tel qu'il est aujourd'hui (source, stems, Brief) et un nouveau lien remplace le précédent, jusqu'à 14 jours après la date finale prévue au Brief (30 jours au moins). Les retours déjà transmis y restent. Il n'est affiché qu'une fois.",
      },
    },
    noteHint: "Affiché en tête du dossier. Repris du Brief, modifiable ici.",
    submit: "Créer le lien",
    submitting: "Création du lien…",
    cancel: "Annuler",
    sent: "Le dossier est prêt. Envoyez ce lien à l'ingénieur : il n'est affiché qu'une fois.",
    linkTitle: "Lien du dossier",
    link: "Lien du dossier",
    copy: "Copier le lien",
    copied: "Lien copié.",
    email: "Écrire un e-mail",
    emailSubject: {
      mix: (project: string) => `Dossier Mix · ${project}`,
      mastering: (project: string) => `Dossier Mastering · ${project}`,
    },
    emailBody: (link: string) =>
      `Bonjour,\n\nVoici le dossier (Brief et fichiers) :\n${link}\n\nMerci de confirmer sa réception depuis la page.`,
    close: "Fermer",
    history: {
      title: "Suivi",
      description:
        "Chaque envoi par destinataire, et chaque étape du lien : créé, envoyé, ouvert, prise en charge, fichier reçu.",
      empty: "Rien n'a encore été transmis.",
      columns: { sentAt: "Envoyé le", to: "À", by: "Par", state: "État" },
      sending: (n: number, to: string) => `Envoi ${n} · ${to}`,
      lifeLabel: "Étapes du lien",
      states: {
        received: (date: string) => `Reçu le ${date}`,
        waiting: "En attente de confirmation",
        to_remind: "Sans réponse, à relancer",
        expired: "Lien expiré",
        replaced: "Remplacé par un nouvel envoi",
        revoked: "Lien révoqué",
      },
    },
    errors: {
      forbidden: "Seul le chef de projet responsable transmet le dossier.",
      failed: "Le dossier n'a pas pu être créé. Réessayez.",
      stemsMissing: (titles: string[]) =>
        `Pas de pistes séparées pour ${titles.map((x) => `« ${x} »`).join(", ")} : cochez « Envoyer sans stems » pour transmettre quand même.`,
    },
    continued: (name: string) =>
      `Le dossier de mastering est ajouté au lien déjà envoyé à ${name} : il le retrouve sur la même page, avec l'historique du mix.`,
    // The review before sending and the life of a link (PROJ-UX-09).
    review: {
      sameLink: (name: string) =>
        `${name} a fait le mix : le dossier s'ajoute à son lien actuel, aucun nouveau lien n'est créé.`,
      otherLink:
        "Un autre ingénieur que celui du mix : il reçoit un lien à lui, sans les échanges du mix.",
      files: "Fichiers qui partent",
      listen: (title: string) => `Écouter « ${title} »`,
      change: "Changer",
      datePast: (label: string, date: string) =>
        `« ${label} » (${date}) est déjà passé : corrigez le Brief ou prévenez l'ingénieur.`,
      dateAfterRelease: (label: string, release: string) =>
        `« ${label} » tombe après la sortie prévue le ${release}.`,
      title: "Avant d'envoyer",
      engineer: (name: string, email: string | null) =>
        email
          ? `Destinataire : ${name} (${email})`
          : `Destinataire : ${name}, sans e-mail connu : vous lui transmettrez le lien vous-même`,
      sources: (n: number) =>
        n === 1
          ? "La source du titre est confirmée."
          : `Les sources des ${n} titres sont confirmées.`,
      finals: (n: number) =>
        n === 1
          ? "Le mix final du titre est validé."
          : `Les mix finals des ${n} titres sont validés.`,
      stemsOk: "Chaque titre a ses pistes séparées.",
      stemsMissing: (titles: string[]) =>
        `Sans pistes séparées : ${titles.join(", ")}.`,
      withoutStems: "Envoyer sans stems pour ces titres",
      withoutStemsHint:
        "Le mix peut se faire sans stems : votre choix est gardé sur l'envoi.",
      dates: (dates: string) => `Dates du dossier : ${dates}.`,
      noDates: "Aucune date dans le Brief : l'ingénieur n'aura pas d'échéance.",
      linkTitle: "Le lien privé",
      linkScope:
        "Il ouvre, sans compte, le dossier, ses fichiers à télécharger et le dépôt des versions. Seule la personne qui a le lien y accède : ne le transmettez qu'à l'ingénieur.",
      linkExpiry: (date: string, days: number) =>
        `Valable jusqu'au ${date} (${days} jours), fichiers compris.`,
      linkPolicy:
        "Il n'est affiché qu'une fois. Un nouvel envoi crée un nouveau lien et désactive aussitôt l'ancien.",
    },
    note: {
      mix: "Message pour le mixeur",
      mastering: "Message pour l'ingénieur mastering",
    },
    life: {
      created: "Lien créé",
      sent: "Lien envoyé",
      opened: "Ouvert par l'ingénieur",
      acknowledged: "Prise en charge confirmée",
      delivered: "Fichier reçu",
      notYet: "pas encore",
      notSaid: "à confirmer",
      by: (name: string | null) => (name ? ` par ${name}` : ""),
      expires: (date: string, days: number) =>
        days < 0
          ? `Lien expiré le ${date}.`
          : days === 0
            ? `Le lien expire aujourd'hui (${date}) : renouvelez-le si l'ingénieur en a encore besoin.`
            : `Le lien expire le ${date} (dans ${days} jour${days > 1 ? "s" : ""}).`,
      revoked: (reason: string) => `Lien révoqué : ${reason}`,
      continued: "Ajouté au lien du mix (même ingénieur).",
      withoutStems: (titles: string[]) =>
        `Envoyé sans stems pour ${titles.join(", ")}.`,
      markSent: "J'ai envoyé le lien",
      markedSent: "Envoi du lien noté.",
      revoke: "Révoquer le lien",
      revokeTitle: "Révoquer le lien",
      revokeBody:
        "Le lien ne fonctionnera plus, tout de suite. L'ingénieur verra que le label l'a désactivé. Pour lui en redonner un, utilisez « Renouveler ».",
      revokeLabel: "Pourquoi vous le révoquez",
      revoked_toast: "Lien révoqué.",
      onlyOnce:
        "Le lien n'est affiché qu'une fois, à sa création : pour le renvoyer, renouvelez-le (l'ancien est désactivé).",
    },
  },
  mastering: {
    title: "Mastering",
    description:
      "Quand chaque titre a son mix final validé, le dossier part à l'ingénieur du mastering, après votre confirmation.",
    ready: "Le Mix final est validé. Le Mastering peut commencer.",
    waiting:
      "Le mastering commence quand le mix final de chaque titre est validé, dans l'étape Mix.",
    sameEngineer: (name: string) =>
      `Même ingénieur que le mix : poursuivez avec ${name}.`,
    otherEngineer: (name: string) => `Ingénieur du mastering : ${name}.`,
  },
  final: {
    title: "Master final",
    description:
      "Le master final validé de chaque titre, rattaché au Catalogue, et les autres livrables attendus par le Brief.",
    allDone: "Chaque titre a son master final, rattaché au Catalogue.",
    allBefore:
      "Chaque titre avait déjà son master final au Catalogue avant le workflow : il n'y avait rien à mixer ni à masteriser.",
    before: (date: string) => `Déjà au Catalogue le ${date}, avant le workflow`,
    waiting:
      "Un titre a son master final quand le validateur valide une version dans l'étape Mastering.",
    noFinal: "Pas encore de master final validé",
    facts: {
      final: "Master final",
      engineer: "Ingénieur du mastering",
      validated: "Validé",
      catalogue: "État au Catalogue",
      lineage: "Filiation",
    },
    // PROJ-BUG-06 and PROJ-BUG-10.
    attached: "Rattaché au titre du Catalogue (Master final), même fichier",
    lineageSource: (file: string) => `Source confirmée : ${file}`,
    lineageMix: (number: number, file: string) =>
      `Mix final V${number} : ${file}`,
    listen: (title: string) => `Écouter le master final de « ${title} »`,
    nextDistribution:
      "Étape suivante : la Distribution reprend ce même fichier, écoutable et téléchargeable, sans nouvel import.",
    toDistribution: "Aller à la Distribution",
    version: (number: number, file: string) => `V${number} · ${file}`,
    validated: (date: string, by: string | null) =>
      by ? `le ${date} par ${by}` : `le ${date}`,
    deliverables: "Autres livrables attendus",
    deliverablesHint: "Cochez chaque livrable quand il est reçu.",
    noDeliverables: "Le Brief n'attend pas d'autre livrable.",
    distribution:
      "Le master final validé est repris par la Distribution comme prérequis de la livraison au distributeur, sans rien ressaisir.",
    errors: {
      forbidden:
        "Seul le chef de projet responsable coche les livrables reçus.",
      failed: "Le livrable n'a pas pu être mis à jour. Réessayez.",
    },
  },
  mixVersions: {
    // Said under PO's synthesis when the code corrected it.
    summaryChecked: (restored: number, removed: number) =>
      [
        restored > 0
          ? `${restored} commentaire${restored > 1 ? "s" : ""} repris tel${restored > 1 ? "s" : ""} quel${restored > 1 ? "s" : ""} pour garder leurs chiffres`
          : null,
        removed > 0
          ? `${removed} ligne${removed > 1 ? "s" : ""} retirée${removed > 1 ? "s" : ""} (remarque de PO ou chiffre que personne n'a dit)`
          : null,
      ]
        .filter(Boolean)
        .join(" ; ") + ". Relisez avant d'enregistrer.",
    needsBrief:
      "Les versions sont suivies dès que le Brief Mix/Master est enregistré : c'est lui qui désigne l'ingénieur et le validateur.",
    openBrief: "Ouvrir le Brief Mix/Master",
    // What differs between the versions of the mix and of the mastering.
    stages: {
      mix: {
        title: "Versions du mix",
        description:
          "Chaque version reçue de l'ingénieur du mix, les retours de l'équipe, la synthèse transmise, puis la décision du validateur.",
        emptyHint:
          "Ajoutez le fichier reçu du mixeur à l'état « Mix » : la version est créée et l'équipe prévenue.",
        final: (number: number) => `Mix final : V${number}`,
        afterFinal: (number: number) =>
          `Reçue après la validation du mix final (V${number}) : elle ne le remplace pas.`,
        approve: "Valider ce mix",
        approveTitle: (title: string, number: number) =>
          `Valider la V${number} du mix de « ${title} » ?`,
        approveDescription:
          "Elle devient le mix final du titre, définitivement : une version reçue ensuite ne la remplacera pas. Le mastering pourra commencer quand chaque titre aura son mix final.",
        approveConfirm: "Valider le mix final",
        approved: (date: string, by: string | null) =>
          by
            ? `Mix final validé le ${date} par ${by}`
            : `Mix final validé le ${date}`,
      },
      mastering: {
        title: "Versions du mastering",
        description:
          "Chaque master reçu de l'ingénieur du mastering, les retours de l'équipe, la synthèse transmise, puis la décision du validateur.",
        emptyHint:
          "Ajoutez le fichier reçu du mastering à l'état « Master » : la version est créée et l'équipe prévenue.",
        final: (number: number) => `Master final : V${number}`,
        afterFinal: (number: number) =>
          `Reçue après la validation du master final (V${number}) : elle ne le remplace pas.`,
        approve: "Valider ce master",
        approveTitle: (title: string, number: number) =>
          `Valider la V${number} du mastering de « ${title} » ?`,
        approveDescription:
          "Elle devient le master final du titre, définitivement : le fichier passe à l'état « Master final » et le titre avec lui dans le Catalogue.",
        approveConfirm: "Valider le master final",
        approved: (date: string, by: string | null) =>
          by
            ? `Master final validé le ${date} par ${by}`
            : `Master final validé le ${date}`,
      },
    },
    add: "Ajouter une version",
    empty: "Aucune version reçue pour l'instant.",
    version: (number: number) => `V${number}`,
    received: (date: string, by: string | null) =>
      by ? `Reçue le ${date}, ajoutée par ${by}` : `Reçue le ${date}`,
    statuses: {
      received: "Retours en cours",
      feedback_sent: "Retours transmis",
    },
    comments: "Retours de l'équipe",
    noComment: "Aucun retour pour l'instant.",
    commentLabel: "Votre retour",
    commentHint: "Ce que vous entendez, ce qu'il faudrait changer.",
    commentSubmit: "Ajouter mon retour",
    summary: "Synthèse pour l'ingénieur",
    summaryHint:
      "Ce que l'ingénieur lira. PO peut la proposer à partir des retours ; relisez-la avant de l'envoyer.",
    propose: "Proposer une synthèse",
    proposing: "PO rédige…",
    save: "Enregistrer la synthèse",
    saved: "Synthèse enregistrée.",
    send: "Transmettre les retours",
    sent: (date: string) => `Retours transmis le ${date} :`,
    sentToast: "Retours transmis à l'ingénieur.",
    errors: {
      forbidden: "Vous n'avez pas le droit de faire cette action.",
      comment: "Le retour n'a pas pu être ajouté. Réessayez.",
      summary: "La synthèse n'a pas pu être enregistrée. Réessayez.",
      send: "Les retours n'ont pas pu être transmis. Réessayez.",
      noSummary: "Enregistrez d'abord une synthèse.",
      noComment: "Il n'y a encore aucun retour à synthétiser.",
      propose: "PO n'a pas pu rédiger de synthèse. Réessayez ou écrivez-la.",
      decide: "La décision n'a pas pu être enregistrée. Réessayez.",
      alreadyVersion:
        "Ce fichier est déjà une version du mixage : il se valide dans le Mixage.",
      decisionRefused: {
        already_decided: "Cette version a déjà été tranchée.",
        not_latest:
          "Une version plus récente est arrivée : c'est elle qui se tranche.",
        already_final:
          "Ce titre a déjà sa version finale validée : elle ne change plus.",
        note_required:
          "Rien n'a encore été transmis à l'ingénieur pour cette version : écrivez ce qu'il faut changer, ce sera son retour.",
      },
    },
    // One flow of feedback with the engineer (PROJ-BUG-08).
    timecode: "Minutage",
    timecodeHint: "Facultatif : « 1:23 » ou « 83 » secondes.",
    timecodeInvalid: "Écrivez un minutage comme « 1:23 », ou laissez vide.",
    at: (time: string) => `à ${time}`,
    commentSent: "Transmis à l'ingénieur",
    commentNotSent: "Pas encore transmis",
    listen: (number: number) => `Écouter la V${number}`,
    downloadVersion: "Télécharger",
    engineerSees: "L'ingénieur voit cette décision sur sa page.",
    requestNoteRequired:
      "Rien n'est encore transmis pour cette version : ce texte sera le retour envoyé à l'ingénieur.",
    requestNoteComplement:
      "Les retours sont déjà transmis : ce texte les complète, l'ingénieur le voit à côté.",
    requestNoteSaved:
      "La synthèse enregistrée part à l'ingénieur avec la demande ; ce texte la complète si besoin.",
    decider: (name: string) => `Décision : ${name}`,
    approving: "Validation…",
    requestChange: "Demander une modification",
    requestTitle: "Demander une modification",
    requestDescription:
      "La version reste dans l'historique ; la suivante sera tranchée à son tour. Les retours de l'équipe passent par la synthèse.",
    requestNote: "Ce qu'il faut changer",
    requestNoteHint: "Visible par l'équipe et par l'ingénieur.",
    requestSubmit: "Demander la modification",
    cancel: "Annuler",
    close: "Fermer",
    decisions: {
      changes_requested: (date: string, by: string | null) =>
        by
          ? `Modification demandée le ${date} par ${by}`
          : `Modification demandée le ${date}`,
    },
  },
  // PROJ-AMEL-02: the thread with the engineer and their signals.
  engineerThread: {
    title: "Échanges avec le label",
    teamTitle: "Fil avec l'ingénieur",
    teamDescription:
      "Questions, retards et fichiers manquants signalés depuis le lien de l'ingénieur, et vos réponses. Un retard ne change aucune date sans votre accord.",
    empty: "Aucun échange pour l'instant.",
    kinds: {
      message: "Message",
      question: "Question",
      delay: "Retard",
      missing_file: "Fichier manquant",
    },
    actions: {
      message: "Écrire un message",
      question: "Poser une question",
      delay: "Signaler un retard",
      missing_file: "Signaler un fichier manquant",
    },
    placeholders: {
      message: "Votre message au label…",
      question: "Votre question…",
      delay: "Ce qui retarde le travail…",
      missing_file: "Le fichier qui manque, et pour quel titre…",
    },
    bodyLabel: "Votre message",
    delayDays: "Retard prévu, en jours",
    delayDaysRequired: "Dites de combien de jours, entre 1 et 90.",
    send: "Envoyer",
    sent: "Envoyé au label.",
    invalid: "Écrivez votre message (2 000 caractères au plus).",
    linkClosed: "Ce lien n'est plus actif : contactez le label directement.",
    failed: "Le message n'a pas pu être envoyé. Réessayez.",
    stages: { mix: "Mixage", mastering: "Mastering" },
    you: "Vous",
    label: "Le label",
    engineer: "L'ingénieur",
    days: (n: number) => (n === 1 ? "1 jour" : `${n} jours`),
    statuses: { open: "À traiter", handled: "Traité" },
    reply: "Répondre",
    replyLabel: "Votre réponse à l'ingénieur",
    replied: "Réponse envoyée : l'ingénieur la lit sur sa page.",
    handle: "Marquer comme traité",
    handled: "Signalement traité.",
    reopen: "Rouvrir",
    impactTitle: "Échéances touchées",
    impactIntro: (days: string) =>
      `Si le retard de ${days} est confirmé, voici ce que le code propose :`,
    impactLine: (label: string, from: string, to: string) =>
      `${label} : ${from} → ${to}`,
    impactNone: "Aucune échéance à venir n'est touchée.",
    beyondRelease:
      "Le master final passerait après la date de sortie prévue : à arbitrer avec la direction.",
    applyDates: "Appliquer ces dates",
    applied: "Dates du Brief mises à jour.",
    sections: {
      summaryFiles: (titles: number) =>
        titles === 1 ? "1 titre" : `${titles} titres`,
      summaryBrief: (dates: number) =>
        dates === 0 ? "Aucune date" : dates === 1 ? "1 date" : `${dates} dates`,
    },
  },
  publicPackage: {
    pageTitle: "Dossier",
    title: { mix: "Dossier Mix", mastering: "Dossier Mastering" },
    intro: {
      mix: (project: string, engineer: string) =>
        `${engineer}, voici le dossier du mix de « ${project} ».`,
      mastering: (project: string, engineer: string) =>
        `${engineer}, voici le dossier du mastering de « ${project} ».`,
    },
    from: "Message du label",
    continued:
      "Le label vous confie aussi le mastering : son dossier s'ajoute ici, au même lien, avec l'historique du mix.",
    // One entry per version, written once (PROJ-BUG-08).
    versions: {
      title: "Vos versions",
      heading: (title: string, number: number, date: string) =>
        `${title} · V${number} · reçue le ${date}`,
      states: {
        mix: {
          received: "En écoute",
          feedback_sent: "Retours envoyés",
          changes_requested: "Modification demandée",
          approved: "Mix validé",
          reopened: "Rouverte",
        },
        mastering: {
          received: "En écoute",
          feedback_sent: "Retours envoyés",
          changes_requested: "Modification demandée",
          approved: "Master validé",
          reopened: "Rouverte",
        },
      },
      feedbackSent: (date: string) => `Retours du label, le ${date} :`,
      decided: {
        mix: {
          approved: (date: string, by: string | null) =>
            by
              ? `Mix final validé le ${date} par ${by}.`
              : `Mix final validé le ${date}.`,
          changes_requested: (date: string, by: string | null) =>
            by
              ? `Modification demandée le ${date} par ${by}.`
              : `Modification demandée le ${date}.`,
        },
        mastering: {
          approved: (date: string, by: string | null) =>
            by
              ? `Master final validé le ${date} par ${by}.`
              : `Master final validé le ${date}.`,
          changes_requested: (date: string, by: string | null) =>
            by
              ? `Modification demandée le ${date} par ${by}.`
              : `Modification demandée le ${date}.`,
        },
      },
      reopened: (date: string, reason: string) =>
        `Rouvert le ${date} : « ${reason} ». Déposez une nouvelle version.`,
      note: (text: string) => `Précision : ${text}`,
      next: {
        mix: "Étape suivante : le mastering, avec l'ingénieur qui en est chargé. Le mix validé ne valide pas le master.",
        mastering:
          "Étape suivante : le label prépare la livraison du master final.",
      },
      listening: "Le label écoute cette version : ses retours arriveront ici.",
      refreshed: (time: string) =>
        `Page à jour à ${time} : elle se met à jour toute seule toutes les 30 secondes.`,
    },
    files: "Fichiers",
    download: "Télécharger",
    source: {
      mix: (state: string) => `Source (${state})`,
      mastering: () => "Mix final",
    },
    stem: "Piste séparée",
    brief: "Ce qui est attendu",
    acknowledge: "J'ai bien reçu le dossier",
    acknowledging: "Envoi…",
    received: (date: string) => `Réception confirmée le ${date}. Merci !`,
    expires: (date: string) => `Lien valable jusqu'au ${date}.`,
    // The engineer's deposit (UX test of 09/10/2026).
    deliver: {
      title: "Déposer ma version",
      hint: {
        mix: "Glissez votre mix ici, ou cliquez pour le choisir. Il arrive directement chez le label comme nouvelle version.",
        mastering:
          "Glissez votre master ici, ou cliquez pour le choisir. Il arrive directement chez le label comme nouvelle version.",
      },
      pending: "Envoi…",
      // Choosing is not sending (PROJ-BUG-09).
      confirmTitle: "Fichier choisi, pas encore envoyé",
      confirmHint: {
        mix: "Écoutez-le si besoin : c'est exactement ce fichier qui partira comme nouvelle version du mix.",
        mastering:
          "Écoutez-le si besoin : c'est exactement ce fichier qui partira comme nouvelle version du master.",
      },
      listen: (fileName: string) => `Écouter « ${fileName} »`,
      confirm: "Confirmer l'envoi",
      replace: "Remplacer",
      received: (fileName: string, size: string, date: string) =>
        `Envoi confirmé : « ${fileName} » (${size}) est arrivé chez le label le ${date}.`,
      sent: (fileName: string, date: string) =>
        `${fileName} · déposé le ${date}`,
      notAudio:
        "Ce format n'est pas accepté : déposez un fichier WAV, AIFF, FLAC, MP3, M4A, AAC ou OGG.",
      tooLarge:
        "Ce fichier dépasse 50 Mo : envoyez-le par un autre moyen au label.",
      errors: {
        invalid_extension:
          "Ce format n'est pas accepté : déposez un fichier WAV, AIFF, FLAC, MP3, M4A, AAC ou OGG.",
        invalid_file_name:
          "Ce nom de fichier n'est pas accepté : de 3 à 200 caractères, sans « / » ni « \\ », terminé par l'extension audio (ex. « Titre - Mix V2.wav »).",
        replaced:
          "Ce lien a été remplacé par un envoi plus récent : utilisez le dernier lien reçu.",
        expired: "Ce lien a expiré. Demandez un nouveau lien au label.",
        too_many_deposits:
          "Trop de dépôts en une heure sur ce lien. Réessayez un peu plus tard.",
        title_not_in_package: "Ce titre ne fait plus partie du dossier.",
        file_mismatch:
          "Le fichier reçu ne correspond pas à celui confirmé (taille différente) : il n'a pas été enregistré. Réessayez.",
        failed: "Le fichier n'a pas pu être envoyé. Réessayez.",
      },
    },
    replaced:
      "Ce lien a été remplacé par un envoi plus récent. Utilisez le dernier lien reçu.",
    expired: "Ce lien a expiré. Demandez un nouveau lien au label.",
    revoked:
      "Le label a désactivé ce lien. Demandez-lui un nouveau lien si vous en avez encore besoin.",
    failed: "La confirmation n'a pas pu être envoyée. Réessayez.",
  },
  inventory: {
    title: "État du master",
    description:
      "Ce que les titres du projet ont déjà pour le mix et le mastering : la source, les pistes, les ingénieurs. Chaque information est connue, à confirmer ou manquante.",
    noTitles:
      "Aucun titre n'est rattaché à ce projet : le master se suit titre par titre.",
    noneOfState: {
      known: "Aucune information connue pour l'instant.",
      to_confirm: "Aucune information à confirmer.",
      missing: "Aucune information manquante.",
    },
    counts: {
      known: "Informations connues",
      to_confirm: "Informations à confirmer",
      missing: "Informations manquantes",
    },
    sections: {
      sources: {
        title: "Source",
        description:
          "La version audio que le mix utilisera, confirmée par le chef de projet, et la session dont elle vient.",
      },
      materials: {
        title: "Pistes et fichiers",
        description: "Ce que l'ingénieur du mix reçoit pour travailler.",
      },
      engineers: {
        title: "Mix et mastering",
        description:
          "Qui mixe et qui masterise chaque titre, et s'ils sont dans le Réseau.",
      },
    },
    facts: {
      source: "Source du mix",
      session: "Session d'enregistrement",
      stems: "Pistes séparées (stems)",
    },
    states: {
      noAudio: "Aucun fichier audio",
      sourceToConfirm: "Source à confirmer",
      sourceConfirmed: "Source confirmée",
      newerVersion: "Version plus récente reçue",
      finalMaster: "Master final reçu",
      sessionKnown: "Renseignée",
      noSession: "Aucune session",
      stemsKnown: "Disponibles",
      noStems: "Aucun fichier de pistes",
      namedInSession: "Nommé dans une session",
      namedInFraming: "Désigné au Cadrage",
      nobody: "Personne n'est crédité",
    },
    sources: {
      audio: "Audio du titre",
      sessions: "Sessions du titre",
      files: "Fichiers du titre",
      credits: "Crédits du titre",
      framing: "Équipe du Cadrage",
    },
    version: (version: number) => `v${version}`,
    source: {
      addedOn: (date: string) => `Ajoutée le ${date}`,
      current: "Source actuelle",
      detected: "Dernière version détectée",
      confirmed: (date: string, by: string | null) =>
        by ? `confirmée le ${date} par ${by}` : `confirmée le ${date}`,
      newer: (fileName: string) => `nouvelle version : ${fileName}`,
      confirm: "Confirmer",
      change: "Changer",
      dialogTitle: (title: string) => `Source du mix · ${title}`,
      dialogDescription:
        "La version que l'ingénieur du mix recevra. La dernière version détectée est proposée ; vous pouvez en choisir une autre.",
      legend: "Version audio",
      notListed: "La bonne version n'est pas dans la liste ?",
      importVersion: "Importer une version",
      submit: "Utiliser cette version",
      submitting: "Enregistrement…",
      cancel: "Annuler",
      errors: {
        forbidden: "Seul le chef de projet responsable confirme la source.",
        notASource:
          "Cette version n'est plus une version audio de ce titre. Rechargez la page.",
        failed: "La source n'a pas pu être enregistrée. Réessayez.",
      },
    },
    fileCount: (count: number) =>
      count > 1 ? `${count} fichiers` : "1 fichier",
    engineersInNetwork: (count: number) =>
      count > 1
        ? `${count} ingénieurs dans le Réseau`
        : "1 ingénieur dans le Réseau",
    actions: {
      addAudio: "Ajouter l'audio",
      addStems: "Ajouter les pistes",
      addSession: "Ajouter une session",
      credit: "Créditer",
      creditTitle: "Créditer un ingénieur",
    },
    // The engineers of the Réseau, offered in the Brief (network-engineers.ts).
    network: {
      add: "Ajouter un ingénieur",
      mixHistory: (count: number) => `Mix sur ${titles(count)}`,
      masteringHistory: (count: number) => `Mastering sur ${titles(count)}`,
    },
  },
  questions: {
    title: "Questions à l'équipe",
    description:
      "Ce que le Brief ne dit pas encore, demandé à qui le sait : la question arrive dans son Travail, sa réponse revient ici.",
    dimensions: {
      direction: "Direction artistique",
      deliverables: "Autres livrables",
    },
    taskTitle: {
      direction: "Brief Mix/Master : donner la direction artistique",
      deliverables: "Brief Mix/Master : dire les livrables attendus",
    },
    plan: "À demander, d'après ce que le Brief ne dit pas encore :",
    planRow: (dimension: string, people: string) => `${dimension} → ${people}`,
    ask: "Poser les questions",
    asking: "Envoi…",
    asked: "Questions posées : elles sont dans le Travail de chacun.",
    nothingToAsk:
      "Le Brief dit déjà la direction artistique et les livrables, ou chaque directeur créatif a déjà été interrogé.",
    noCreatives:
      "Aucun directeur créatif sur ce projet : le Brief se remplit ici, par le chef de projet.",
    empty: "Aucune question posée pour l'instant.",
    askedTo: (person: string, date: string) => `Demandé à ${person} le ${date}`,
    states: {
      open: "En attente de réponse",
      answered: "Répondu",
      applied: "Ajouté au Brief",
      done: "Répondu",
    },
    nothingElse: "Rien d'autre que le mix et le master finals.",
    yourTurn: "Votre réponse",
    directionLabel: "Direction artistique",
    directionHint:
      "Ce que le son doit être : références, intentions, ce qu'il faut éviter.",
    deliverablesLabel: "Livrables attendus en plus du mix et du master",
    deliverablesHint: "Ne cochez rien si rien d'autre n'est attendu.",
    answer: "Envoyer la réponse",
    answering: "Envoi…",
    answered: "Réponse envoyée.",
    apply: "Ajouter au Brief",
    applying: "Ajout…",
    appliedToast: "Réponse ajoutée au Brief.",
    applyHint:
      "La direction s'ajoute à ce qui est déjà écrit ; les livrables cochés rejoignent ceux du Brief.",
    errors: {
      forbidden:
        "Seul le chef de projet responsable pose les questions et les reporte au Brief.",
      notYours: "Cette question a été posée à quelqu'un d'autre.",
      nothing: "Il n'y a rien à demander pour l'instant.",
      empty: "Écrivez une réponse.",
      already: "Cette question a déjà sa réponse.",
      answer: "La réponse n'a pas pu être envoyée. Réessayez.",
      failed: "L'action n'a pas abouti. Réessayez.",
    },
  },
} as const;
