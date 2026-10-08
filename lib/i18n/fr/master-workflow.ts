// Master workflow of a project (lib/master-workflow/).
const titles = (count: number) => (count > 1 ? `${count} titres` : "1 titre");

export const masterWorkflow = {
  steps: {
    label: "Étapes du master",
    soon: "Bientôt disponible",
    state: "État du master",
    brief: "Brief Mix/Master",
    mix: "Mix",
    mastering: "Mastering",
    final: "Master final",
    // The four steps shown (lib/ui/master-steps.ts, ticket « Architecture
    // globale »): mix and mastering are two business milestones.
    prepare: "Préparation",
    mixing: "Mixage",
    backToPrepare: "Préparation",
  },
  // One page per round (lib/ui/master-steps.ts, ticket « Architecture
  // globale »): the validations live inside, never a step of their own.
  production: {
    progress: (done: number, total: number) =>
      `${done} titre${done > 1 ? "s" : ""} validé${done > 1 ? "s" : ""} sur ${total}`,
    show: "Afficher",
    mix: {
      title: "Mixage",
      description:
        "Le dossier part au mixeur, les versions reviennent, le validateur décide titre par titre. Un mix validé ne change plus.",
      round: "Mix",
      done: "Chaque titre a son mix final",
    },
    mastering: {
      title: "Mastering",
      description:
        "Le dossier de mastering part avec les mix finals, les versions reviennent, le validateur décide titre par titre.",
      round: "Mastering",
      done: "Chaque titre a son master final",
      waiting: (done: number, total: number) =>
        `S'ouvre quand chaque titre a son mix final (${done} sur ${total} pour l'instant).`,
    },
  },
  // « Préparer » (lib/ui/master-steps.ts): where the preparation stands.
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
      sent: "Le dossier est parti : la suite se passe dans Mix et mastering.",
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
    sections: {
      sources: {
        title: "Source",
        description: "La version de chaque titre, sa session et ses pistes.",
      },
      mix: {
        title: "Mix",
      },
      mastering: {
        title: "Mastering",
      },
      direction: {
        title: "Direction artistique",
      },
      deliverables: {
        title: "Livrables",
      },
      calendar: {
        title: "Calendrier",
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
      source: (title: string) =>
        `Confirmez la source de « ${title} » sur l'État du master.`,
    },
    transmitTo: {
      mix: "Transmettre au mixeur",
      mastering: "Transmettre au mastering",
    },
    transmitTitle: "Transmettre le dossier",
    transmitDescription:
      "Un lien privé, valable 30 jours, donne accès au dossier et à ses fichiers, sans compte. Il n'est affiché qu'une fois : copiez-le ou envoyez-le tout de suite.",
    modes: {
      remind: {
        label: "Relancer",
        title: "Relancer l'ingénieur",
        description:
          "Un nouveau lien remplace le précédent (et renouvelle les fichiers pour 30 jours). Il n'est affiché qu'une fois.",
      },
      resend: {
        label: "Renvoyer le dossier",
        title: "Renvoyer le dossier",
        description:
          "Le dossier est recalculé tel qu'il est aujourd'hui (source, stems, Brief) et un nouveau lien remplace le précédent, pour 30 jours. Les retours déjà transmis y restent. Il n'est affiché qu'une fois.",
      },
    },
    note: "Message pour le mixeur",
    noteHint: "Affiché en tête du dossier.",
    submit: "Créer le lien",
    submitting: "Création du lien…",
    cancel: "Annuler",
    sent: "Le dossier est prêt. Envoyez ce lien au mixeur :",
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
      description: "Chaque envoi, et ce que l'ingénieur en a fait.",
      empty: "Rien n'a encore été transmis.",
      columns: { sentAt: "Envoyé le", to: "À", by: "Par", state: "État" },
      states: {
        received: (date: string) => `Reçu le ${date}`,
        waiting: "En attente de confirmation",
        to_remind: "Sans réponse, à relancer",
        expired: "Lien expiré",
        replaced: "Remplacé par un nouvel envoi",
      },
    },
    errors: {
      forbidden: "Seul le chef de projet responsable transmet le dossier.",
      failed: "Le dossier n'a pas pu être créé. Réessayez.",
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
    waiting:
      "Un titre a son master final quand le validateur valide une version dans l'étape Mastering.",
    noFinal: "Pas encore de master final validé",
    facts: {
      final: "Master final",
      engineer: "Ingénieur du mastering",
      validated: "Validé",
      catalogue: "État au Catalogue",
    },
    version: (number: number, file: string) => `V${number} · ${file}`,
    validated: (date: string, by: string | null) =>
      by ? `le ${date} par ${by}` : `le ${date}`,
    deliverables: "Autres livrables attendus",
    deliverablesHint: "Cochez chaque livrable quand il est reçu.",
    noDeliverables: "Le Brief n'attend pas d'autre livrable.",
    distribution:
      "La brique Distribution n'existe pas encore : quand elle existera, le master final validé y sera repris comme prérequis, sans rien ressaisir.",
    errors: {
      forbidden:
        "Seul le chef de projet responsable coche les livrables reçus.",
      failed: "Le livrable n'a pas pu être mis à jour. Réessayez.",
    },
  },
  mixVersions: {
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
      decisionRefused: {
        already_decided: "Cette version a déjà été tranchée.",
        not_latest:
          "Une version plus récente est arrivée : c'est elle qui se tranche.",
        already_final:
          "Ce titre a déjà sa version finale validée : elle ne change plus.",
      },
    },
    decider: (name: string) => `Décision : ${name}`,
    approving: "Validation…",
    requestChange: "Demander une modification",
    requestTitle: "Demander une modification",
    requestDescription:
      "La version reste dans l'historique ; la suivante sera tranchée à son tour. Les retours de l'équipe passent par la synthèse.",
    requestNote: "Ce qu'il faut changer",
    requestNoteHint: "Visible par l'équipe.",
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
    feedback: "Retours sur vos versions",
    feedbackOf: (title: string, number: number, date: string) =>
      `${title} · V${number} · ${date}`,
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
    replaced:
      "Ce lien a été remplacé par un envoi plus récent. Utilisez le dernier lien reçu.",
    expired: "Ce lien a expiré. Demandez un nouveau lien au label.",
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
      nobody: "Personne n'est crédité",
    },
    sources: {
      audio: "Audio du titre",
      sessions: "Sessions du titre",
      files: "Fichiers du titre",
      credits: "Crédits du titre",
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
    network: {
      title: "Ingénieurs du Réseau",
      description:
        "Les contacts au rôle d'ingénieur, et les titres de PDS qu'ils ont déjà mixés ou masterisés.",
      empty: "Aucun ingénieur dans le Réseau.",
      add: "Ajouter un ingénieur",
      columns: {
        name: "Nom",
        city: "Ville",
        history: "Déjà fait avec PDS",
        contact: "Coordonnées",
      },
      noHistory: "Aucun titre",
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
