// Master page: header, tabs and the sections below them.
const optional = "Facultatif.";

const form = {
  cancel: "Annuler",
  close: "Fermer",
  submit: "Enregistrer",
  submitting: "Enregistrement…",
  optional,
};

const remove = {
  confirm: "Supprimer",
  deleting: "Suppression…",
  cancel: "Annuler",
  close: "Fermer",
};

export const masterPage = {
  tabsLabel: "Sections du master",
  tabs: {
    overview: "Vue d'ensemble",
    sessions: "Sessions & pistes",
    versions: "Versions",
    credits: "Contributeurs & crédits",
    splits: "Splits",
    rights: "Droits & déclarations",
    distribution: "Distribution",
    projects: "Projets",
    files: "Fichiers",
    activity: "Activité",
  },
  loadError: "Ces informations n'ont pas pu être chargées. Rechargez la page.",
  form,
  deleteFailed: "La suppression n'a pas abouti. Réessayez.",
  archivedNote: "Ce master est archivé : il n'est plus modifiable.",

  overview: {
    figures: {
      versions: "Versions",
      sessions: "Sessions",
      contributors: "Contributeurs",
      projects: "Projets",
    },
    facts: "Informations",
    artists: "Artistes",
    checklist: {
      title: "Dossier du master",
      done: "Fait",
      todo: "À compléter",
      isrc: "ISRC renseigné",
      iswc: "ISWC de l'œuvre renseigné",
      rightsHolder: "Titulaire du ℗ renseigné",
      contributors: "Au moins un contributeur crédité",
      masterSplits: "Splits du master complets (100 %)",
      publishingSplits: "Splits de l'édition complets (100 %)",
      declarations: (done: number, total: number) =>
        `Déclarations déposées (${done} sur ${total})`,
      masterFile: "Fichier master déposé",
    },
  },

  sessions: {
    title: "Sessions",
    description:
      "Enregistrement, production, mixage, mastering : où et avec qui le titre a été fait.",
    add: "Ajouter une session",
    emptyTitle: "Aucune session",
    emptyBody:
      "Notez les sessions d'enregistrement, de mixage et de mastering.",
    emptyBodyReadOnly: "Les sessions du titre apparaîtront ici.",
    undated: "Date à préciser",
    noStudio: "Lieu non renseigné",
    kinds: {
      recording: "Enregistrement",
      production: "Production",
      mixing: "Mixage",
      mastering: "Mastering",
      other: "Autre",
    },
    fields: {
      kind: "Type de session",
      date: "Date",
      studio: "Studio ou lieu",
      engineer: "Ingénieur du son",
      notes: "Notes",
    },
    addTitle: "Nouvelle session",
    editTitle: "Modifier la session",
    formDescription: "Seuls le type et la date servent au classement.",
    confirmTitle: "Supprimer cette session ?",
    confirmBody: (name: string) =>
      `« ${name} » sera supprimée. Ses pistes restent, sans session.`,
  },

  tracks: {
    title: "Pistes",
    description:
      "Les pistes du multipiste : voix, instruments, et qui les joue.",
    add: "Ajouter une piste",
    empty: "Aucune piste notée pour l'instant.",
    noSession: "Sans session",
    columns: {
      name: "Piste",
      performer: "Interprète",
      session: "Session",
      actions: "Actions",
    },
    fields: {
      name: "Nom de la piste",
      nameHint: "« Voix lead », « Batterie », « Synthé basse »…",
      performer: "Interprète",
      session: "Session",
      noSession: "Aucune",
    },
    addTitle: "Nouvelle piste",
    editTitle: "Modifier la piste",
    formDescription: "Rattachez-la à une session si vous la connaissez.",
    confirmTitle: "Supprimer cette piste ?",
    confirmBody: (name: string) => `« ${name} » sera supprimée.`,
  },

  versions: {
    title: "Versions",
    description:
      "Les autres enregistrements du même titre, pour les mêmes artistes : radio edit, instrumental, remix… Chacun a son propre ISRC.",
    add: "Nouvelle version",
    current: "Ce master",
    emptyTitle: "Pas d'autre version",
    emptyBody:
      "Créez une version pour une radio edit, une instrumentale ou un remix.",
    emptyBodyReadOnly: "Les autres versions de ce titre apparaîtront ici.",
  },

  credits: {
    artistsTitle: "Artistes interprètes",
    artistsDescription:
      "Crédités sur la pochette et les plateformes. On les change dans « Modifier ».",
    title: "Contributeurs",
    description:
      "Auteurs, compositeurs, producteurs, ingénieurs, musiciens : tous les crédits du titre.",
    add: "Ajouter un contributeur",
    emptyTitle: "Aucun contributeur",
    emptyBody: "Créditez les auteurs, compositeurs, producteurs et musiciens.",
    emptyBodyReadOnly: "Les contributeurs du titre apparaîtront ici.",
    roles: {
      composer: "Compositeur",
      lyricist: "Auteur",
      arranger: "Arrangeur",
      producer: "Producteur",
      co_producer: "Coproducteur",
      recording_engineer: "Ingénieur d'enregistrement",
      mix_engineer: "Ingénieur mixage",
      mastering_engineer: "Ingénieur mastering",
      musician: "Musicien",
      other: "Autre",
    },
    columns: {
      name: "Nom",
      role: "Rôle",
      detail: "Précision",
      actions: "Actions",
    },
    fields: {
      name: "Nom",
      role: "Rôle",
      detail: "Précision",
      detailHint:
        "Instrument ou détail : « guitare », « production additionnelle ».",
    },
    addTitle: "Nouveau contributeur",
    editTitle: "Modifier le contributeur",
    formDescription: "Le nom tel qu'il doit apparaître dans les crédits.",
    confirmTitle: "Retirer ce contributeur ?",
    confirmBody: (name: string) => `« ${name} » ne sera plus crédité.`,
  },

  splits: {
    reserved: "Les splits sont réservés à la direction et aux chefs de projet.",
    kinds: {
      master: "Master",
      publishing: "Édition",
    },
    kindDescriptions: {
      master: "Propriété de l'enregistrement : label, artiste, producteur.",
      publishing: "Droits sur l'œuvre : auteurs, compositeurs, éditeurs.",
    },
    add: "Ajouter une part",
    empty: "Aucune part pour l'instant.",
    roles: {
      label: "Label",
      artist: "Artiste",
      producer: "Producteur",
      author: "Auteur",
      composer: "Compositeur",
      publisher: "Éditeur",
      other: "Autre",
    },
    columns: {
      party: "Ayant droit",
      role: "Rôle",
      share: "Part",
      actions: "Actions",
    },
    total: (value: string) => `Total : ${value}`,
    status: {
      complete: "Complet",
      incomplete: (remaining: string) => `Reste ${remaining}`,
      empty: "À répartir",
    },
    fields: {
      kind: "Type",
      party: "Ayant droit",
      role: "Rôle",
      share: "Part",
      shareHint: (remaining: string) =>
        `En pourcentage, deux décimales au plus. Disponible : ${remaining}.`,
    },
    addTitle: "Nouvelle part",
    editTitle: "Modifier la part",
    formDescription: "Le total d'un type ne peut pas dépasser 100 %.",
    errors: {
      share: "Indiquez une part entre 0,01 et 100.",
      overTotal:
        "Le total dépasserait 100 %. Réduisez cette part ou une autre.",
    },
    confirmTitle: "Supprimer cette part ?",
    confirmBody: (name: string) => `La part de « ${name} » sera supprimée.`,
  },

  rights: {
    title: "Droits",
    description: "L'œuvre et le titulaire des droits sur l'enregistrement.",
    edit: "Modifier",
    fields: {
      iswc: "ISWC",
      iswcHint: "Facultatif. Code de l'œuvre, par exemple T-034.524.680-1.",
      rightsHolder: "Titulaire du ℗",
      rightsHolderHint: "Facultatif. Le producteur phonographique.",
      rightsYear: "Année du ℗",
      rightsYearHint: "Facultatif. Année de première publication.",
    },
    pLine: "Mention ℗",
    editTitle: "Modifier les droits",
    formDescription:
      "Ces informations servent aux déclarations et à la distribution.",
    errors: {
      iswc: "ISWC invalide : T suivi de 10 chiffres, par exemple T-034.524.680-1.",
      year: "Année invalide : entre 1900 et 2100.",
    },
  },

  declarations: {
    title: "Déclarations",
    description: "Dépôts auprès des sociétés de gestion collective.",
    organisms: {
      sacem: "SACEM",
      scpp: "SCPP",
      sppf: "SPPF",
      adami: "ADAMI",
      spedidam: "SPEDIDAM",
    },
    organismDescriptions: {
      sacem: "Œuvre : auteurs, compositeurs, éditeurs",
      scpp: "Phonogramme : producteurs",
      sppf: "Phonogramme : producteurs indépendants",
      adami: "Artistes interprètes principaux",
      spedidam: "Musiciens et artistes d'accompagnement",
    },
    statuses: {
      todo: "À déposer",
      submitted: "Déposée",
      confirmed: "Confirmée",
      rejected: "Refusée",
    },
    declare: "Déclarer",
    columns: {
      organism: "Organisme",
      status: "Statut",
      reference: "Référence",
      date: "Déposée le",
      actions: "Actions",
    },
    fields: {
      status: "Statut",
      reference: "Référence du dépôt",
      date: "Date du dépôt",
      notes: "Notes",
    },
    dialogTitle: (organism: string) => `Déclaration ${organism}`,
    formDescription: "Notez le dépôt tel que l'organisme l'a enregistré.",
    confirmTitle: "Retirer cette déclaration ?",
    confirmBody: (name: string) =>
      `La déclaration ${name} repassera « À déposer ».`,
  },

  distribution: {
    description:
      "Les sorties des projets qui portent ce master. On les modifie dans la Sortie du projet.",
    emptyTitle: "Pas encore de sortie",
    emptyBody:
      "Rattachez ce master à un projet : sa sortie, son UPC et ses liens apparaîtront ici.",
    emptyBodyLinked:
      "Les projets de ce master n'ont pas encore de sortie. Elle apparaîtra ici dès qu'elle sera créée dans leur Sortie.",
    columns: {
      release: "Sortie",
      project: "Projet",
      upc: "UPC",
      date: "Date",
      status: "Statut",
    },
    links: "Sur les plateformes",
    noLinks: "Aucun lien détecté pour l'instant.",
  },

  projects: {
    emptyTitle: "Aucun projet",
    emptyBody: "Aucun projet ne rattache ce master pour l'instant.",
  },

  files: {
    emptyBody:
      "Master final, stems, mixes, pochette, contrats : ajoutez ici les fichiers du titre.",
    emptyBodyReadOnly: "Les fichiers du titre apparaîtront ici.",
  },

  activity: {
    emptyBody: "Ce qui se passe autour de ce master apparaîtra ici.",
    sections: {
      session: "la session",
      track: "la piste",
      contributor: "le contributeur",
      split: "la part de",
      declaration: "la déclaration",
    },
    fields: {
      identity: "l'identité",
      rights: "les droits",
    },
    sentences: {
      masterCreated: "Master créé",
      masterUpdated: (fields: string) => `Modification de ${fields}`,
      masterUpdatedNoField: "Master modifié",
      itemAdded: (what: string) => `Ajout de ${what}`,
      itemUpdated: (what: string) => `Modification de ${what}`,
      itemRemoved: (what: string) => `Suppression de ${what}`,
      fileAdded: (name: string) => `Fichier ${name} ajouté`,
      fileRemoved: (name: string) => `Fichier ${name} supprimé`,
      projectCreated: (title: string) => `Projet ${title} créé avec ce master`,
      projectLinked: (title: string) => `Master rattaché au projet ${title}`,
    },
  },

  remove,
} as const;
