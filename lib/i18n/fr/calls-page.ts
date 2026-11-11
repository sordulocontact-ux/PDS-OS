/**
 * A call's page (proto `docs/protos/pages.html`, « Calls », 29/10/2026):
 * « Maintenant » by state and role, its cards, the windows « Créer la
 * tâche » and « Résumé pour les participants ».
 */
export const callPage = {
  organizedBy: (name: string) => `organisé par ${name}`,
  // The module header's fact on a project's call page.
  organizer: "Organisé par",
  // The call's project, a link from its page opened in Calls.
  project: (title: string) => `Projet : ${title}`,
  projectLink: (title: string) => `Ouvrir le projet « ${title} »`,
  more: (title: string) => `Plus d'actions pour « ${title} »`,
  copyMeetingLink: "Copier le lien de la visio",
  sheetEmail: "Envoyer la fiche par e-mail",
  // « Supprimer la réunion » (DG only; Ibé, tests of 31/10-02/11/2026).
  delete: {
    action: "Supprimer la réunion",
    title: (title: string) => `Supprimer « ${title} » ?`,
    body: "La réunion est supprimée avec ses invités, son enregistrement, sa transcription et son compte rendu. C'est définitif.",
    confirm: "Supprimer définitivement",
    pending: "Suppression…",
    done: "Réunion supprimée.",
    errors: {
      forbidden:
        "Seuls la direction et le responsable de la réunion peuvent la supprimer.",
      not_found: "Cette réunion n'existe plus.",
      in_use:
        "Cette réunion est encore utilisée : des tâches, des points ou un Brief Master viennent de son compte rendu. Supprimez-les d'abord.",
      generic: "La réunion n'a pas pu être supprimée. Réessayez.",
    },
  },
  // The module a call's proposals are settled in.
  modules: {
    framing: "le Cadrage",
    strategy: "la Stratégie",
    design: "la Conception",
    production: "la Production",
    // A deal's call (BIZ 6): its proposals are settled on the deal's page.
    deal: "le deal",
  },
  // A deal's call (BIZ 6): where it belongs.
  deal: {
    pill: (artist: string | null) => (artist ? `Deal · ${artist}` : "Deal"),
    open: "Ouvrir le deal",
  },
  now: {
    label: "Maintenant",
    mine: "À vous",
    nothing: "Rien à faire pour vous",
    processing: "Traitement en cours",
    closed: "Clôturé",
    then: "Ensuite",
    record: {
      title: (title: string) => `Enregistrer « ${title} »`,
      why: (time: string) =>
        `Aujourd'hui à ${time} : ouvrez le call au moment de l'échange, PDS OS enregistre la visio et votre micro.`,
      start: "Commencer l'enregistrement",
    },
    // The call's Meet was transcribed by Meet (lib/calls/meet-transcript.ts).
    meet: {
      title: "Transcription du Meet",
      why: (day: string) =>
        `Le call du ${day} s'est tenu sur Meet : PDS OS reprend ce que Meet a transcrit, puis écrit le compte rendu.`,
      fetching: "Récupération de la transcription du Meet…",
      retry: "Réessayer",
      instead: "Déposer l'enregistrement à la place",
    },
    upload: {
      title: "Déposer l'enregistrement",
      why: (day: string) =>
        `Le call du ${day} n'a pas été enregistré dans PDS OS : déposez le fichier audio pour avoir sa transcription et son compte rendu.`,
    },
    processingTitle: "Transcription, puis compte rendu",
    processingWhy:
      "Enregistrement reçu. PO transcrit l'échange, range ce qui a été dit dans l'ordre du jour, puis pré-remplit l'étape.",
    processingWhyMeeting:
      "Enregistrement reçu. PO transcrit l'échange, puis relève les décisions et les actions.",
    proposals: {
      title: (n: number, module: string) =>
        `Trancher ${n} proposition${n > 1 ? "s" : ""} dans ${module}`,
      why: "PO a rangé ce qui a été dit là où ça sert, chaque phrase avec sa citation : confirmez, modifiez ou écartez.",
      open: (module: string) => `Ouvrir ${module}`,
    },
    tasks: {
      title: (n: number) =>
        n > 1
          ? `Créer les ${n} tâches des actions décidées`
          : "Créer la tâche de l'action décidée",
      why: "Chaque action relevée devient une tâche avec un responsable et une échéance, choisis par vous.",
      action: (n: number) => (n > 1 ? "Créer les tâches" : "Créer la tâche"),
    },
    summary: {
      title: "Envoyer le résumé aux participants",
      why: "PO a préparé le résumé ; relisez-le avant qu'il parte.",
      action: "Relire et envoyer",
    },
    close: {
      title: "Clôturer le call",
      why: "Tout ce qui est sorti de l'échange a sa place : la clôture fige le compte rendu.",
    },
    // « Ensuite : … », in lower case.
    thenOf: {
      record: "enregistrer le call",
      upload: "déposer l'enregistrement",
      meet: "reprendre la transcription du Meet",
      proposals: "trancher les propositions",
      tasks: "créer les tâches",
      summary: "envoyer le résumé",
      close: "clôturer le call",
    },
    waiting: (owner: string, what: string) =>
      `En attente de ${owner} : ${what}`,
    waitingRecord: "enregistrer le call",
    waitingReport: "traiter le compte rendu",
    waitingWhy:
      "Le responsable du projet enregistre, traite et clôture le call ; vous lisez son compte rendu.",
    closedTitle: (day: string) => `Clôturé le ${day}`,
    closedWhy:
      "Le compte rendu est figé ; une correction en fait une nouvelle version.",
  },
  report: {
    title: "Compte rendu",
    description:
      "Les phrases sont citées telles quelles. Ce qui fait foi, ce sont les décisions confirmées dans l'étape.",
    empty: "Rien n'a été relevé dans ce call.",
  },
  transcript: {
    title: "Transcription",
    // Without timings, the transcript reads as one text.
    fold: (n: number) =>
      n > 0 ? `Extraits minutés (${n})` : "Lire la transcription",
  },
  participants: "Participants",
  recording: "Enregistrement",
  visio: "Visio",
  // An action of the call → a task (never chosen by PO, CLAUDE.md rule 6).
  task: {
    action: "Créer la tâche",
    title: "Créer la tâche",
    description: "PO ne choisit ni le responsable ni l'échéance.",
    project: "Projet",
    assignee: "Responsable",
    assigneePlaceholder: "Choisir",
    due: "Échéance",
    projectMissing: "Choisissez le projet de la tâche.",
    assigneeMissing: "Choisissez qui s'en charge.",
    dueMissing: "Choisissez une échéance.",
    duePast: "L'échéance doit être aujourd'hui ou après.",
    failed: "La tâche n'a pas pu être créée. Réessayez.",
    created: "Tâche créée.",
    why: (quote: string) => `Pourquoi : « ${quote} »`,
    line: (assignee: string, due: string, project: string) =>
      [assignee, `pour le ${due}`, project].filter(Boolean).join(" · "),
  },
  summary: {
    title: "Résumé pour les participants",
    description:
      "Préparé par PO à partir du compte rendu. Relisez et corrigez avant d'envoyer ; ni la transcription ni l'audio ne partent.",
    to: "À",
    toSource: "Participants du call",
    subject: "Objet",
    subjectOf: (title: string, where: string) => `Résumé · ${title} — ${where}`,
    message: "Message",
    messageMissing: "Écrivez le message à envoyer.",
    send: "Envoyer aux participants",
    sent: "Résumé envoyé aux participants.",
    // PDS OS e-mails the outside guests it has an address for (SMTP set).
    emailedTo: (names: string[]) =>
      `L'équipe le reçoit dans PDS OS ; ${names.join(", ")} ${names.length > 1 ? "le reçoivent" : "le reçoit"} aussi par e-mail, envoyé par PDS OS à l'envoi.`,
    // Guests it cannot e-mail (no address, a private link): by hand.
    byHand: (names: string[]) =>
      `PDS OS n'envoie pas ce résumé à ${names.join(", ")} : écrivez-${names.length > 1 ? "leur" : "lui"} de votre messagerie.`,
    // No SMTP: every outside guest by hand.
    externals:
      "L'équipe le reçoit dans PDS OS. Pour les invités extérieurs, PDS OS prépare l'e-mail avec ce message : envoyez-le de votre messagerie.",
    mailto: "Écrire l'e-mail aux invités",
  },
} as const;
