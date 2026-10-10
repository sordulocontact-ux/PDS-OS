/** Project pages that read what is stored and what happened: Fichiers, Validations, Activité. */
export const projectHistory = {
  files: {
    title: "Fichiers",
    description:
      "Les documents du projet, classés par catégorie, puis les enregistrements des calls et les versions déposées en conception.",
    libraryTitle: "Documents",
    libraryEmptyBody:
      "Glissez un fichier ici, ou cliquez pour le choisir : brief, visuels, contrats, presse. Vous direz ensuite où le classer.",
    libraryEmptyBodyReadOnly: "Les documents du projet apparaîtront ici.",
    libraryEmptyBodyCreative:
      "Glissez un fichier ici, ou cliquez pour le choisir : références, premières pistes. Ils vont dans Visuels ou Autres.",
    callsTitle: "Enregistrements des calls",
    designTitle: "Versions de la conception",
    designColumns: {
      version: "Version",
      date: "Déposée le",
      author: "Par",
      state: "État",
    },
    directionTarget: "Direction créative",
    columns: {
      call: "Call",
      date: "Date",
      type: "Type",
      size: "Taille",
      action: "Fichier",
    },
    audio: "Enregistrement audio",
    megabytes: (value: string) => `${value} Mo`,
    download: "Télécharger",
    downloadLabel: (title: string) =>
      `Télécharger l'enregistrement de « ${title} »`,
    unavailable: "Indisponible",
    transcript: "Transcription",
    report: "Compte rendu",
  },
  validations: {
    title: "Validations",
    description:
      "Chaque demande de validation d'une étape, qui l'a demandée, qui décide et ce qui a été décidé.",
    pending: "En attente",
    history: "Historique",
    historyEmpty: "Aucune validation décidée pour l'instant.",
    emptyTitle: "Aucune validation",
    emptyBody:
      "Une étape soumise par le responsable du projet apparaîtra ici, en attendant la décision.",
    states: {
      pending: "En attente",
      approved: "Validée",
      rejected: "Refusée",
    } as Record<string, string>,
    requestedBy: (name: string, date: string) =>
      `Demandée par ${name} le ${date}`,
    validator: (name: string) => `Validateur : ${name}`,
    decidedAt: (date: string) => `Décidée le ${date}`,
    note: "Note de la demande",
    comment: "Commentaire",
    openStage: "Ouvrir l'étape",
    unknownPerson: "—",
  },
  activity: {
    title: "Activité",
    description:
      "Tout ce qui s'est passé sur ce projet, du plus récent au plus ancien.",
    today: "Aujourd'hui",
    yesterday: "Hier",
    emptyTitle: "Aucune activité",
    emptyBody:
      "Les calls, validations, tâches et changements d'étape s'afficheront ici.",
  },
} as const;
