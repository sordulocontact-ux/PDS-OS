// Activity tab of the artist page. Each event reads as one sentence; the
// actor ("Par Aminata Fall") is shown apart, so sentences never name them.

const quoted = (value: string | undefined, fallback: string) =>
  value ? `« ${value} »` : fallback;

export const artistActivity = {
  title: "Activité",
  listLabel: "Journal d'activité de l'artiste",
  emptyTitle: "Aucune activité pour l'instant",
  emptyBody:
    "Les créations, modifications, fichiers, masters et projets de l'artiste apparaîtront ici.",
  loadError: "Le journal n'a pas pu être chargé. Rechargez la page.",
  today: "Aujourd'hui",
  yesterday: "Hier",
  by: (name: string) => `Par ${name}`,
  open: "Ouvrir",
  limitNote: "Seuls les 200 derniers événements sont affichés.",
  aMaster: "un master",
  aProject: "un projet",
  aFile: "un fichier",
  aContact: "un contact",
  someone: "un membre de l'équipe",

  fields: {
    identity: "l'identité",
    bio: "la biographie",
    notes: "les notes",
    picture: "la photo",
    deezer: "le profil Deezer",
  },

  fileCategories: {
    press: "Presse",
    photo: "Photo",
    contract: "Contrat",
    audio: "Audio",
    other: "Autre",
  },

  sentences: {
    artistCreated: "Fiche artiste créée",
    artistUpdated: (fields: string) => `Fiche modifiée : ${fields}`,
    artistUpdatedNoField: "Fiche modifiée",
    contactAdded: (name: string) => `Contact ${name} ajouté`,
    contactUpdated: (name: string) => `Contact ${name} modifié`,
    contactRemoved: (name: string) => `Contact ${name} retiré`,
    fileAdded: (name: string) => `Fichier ${name} ajouté`,
    fileRemoved: (name: string) => `Fichier ${name} supprimé`,
    masterCreated: (title: string) => `Master ${title} créé`,
    masterCredited: (title: string) => `Crédité sur le master ${title}`,
    projectCreated: (title: string) => `Projet ${title} créé`,
    projectLinked: (title: string) => `Rattaché au projet ${title}`,
    projectTransmitted: (title: string, assignee: string) =>
      `Projet ${title} transmis à ${assignee}`,
    // The one who answers is the actor, shown on the line below.
    projectAccepted: (title: string) => `Projet ${title} accepté`,
    projectRefused: (title: string) => `Projet ${title} refusé`,
    projectClarification: (title: string) =>
      `Précision demandée sur le projet ${title}`,
  },

  quoted,
} as const;
