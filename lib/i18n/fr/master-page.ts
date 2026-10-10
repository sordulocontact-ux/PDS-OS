// Title page ("master" in the code): header, tabs and the sections below them.

const form = {
  cancel: "Annuler",
  close: "Fermer",
  submit: "Enregistrer",
  submitting: "Enregistrement…",
};

const remove = {
  confirm: "Supprimer",
  deleting: "Suppression…",
  cancel: "Annuler",
  close: "Fermer",
};

export const masterPage = {
  tabsLabel: "Sections du titre",
  artistsTable: { artist: "Artiste", role: "Rôle" },
  // Six tabs at most (docs/DESIGN.md § 4): the other sections are blocks of
  // one of these pages.
  tabs: {
    overview: "Vue d'ensemble",
    audio: "Audio",
    credits: "Crédits",
    rights: "Droits",
    projects: "Projets & sorties",
    files: "Fichiers",
  },

  loadError: "Ces informations n'ont pas pu être chargées. Rechargez la page.",
  form,
  deleteFailed: "La suppression n'a pas abouti. Réessayez.",
  archivedNote: "Ce titre est archivé : il n'est plus modifiable.",

  overview: {
    figures: {
      audioFiles: "Fichiers audio",
      variants: "Variantes",
      sessions: "Sessions",
      contributors: "Contributeurs",
      projects: "Projets",
    },
    facts: "Informations",
    artists: "Artistes",
    checklist: {
      title: "Dossier du titre",
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
      masterFile: "Fichier Master final déposé",
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
    engineerSuggested: (name: string) =>
      `${name} est proposé d'après les crédits du titre ou le Brief Mix/Master.`,
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

  variants: {
    title: "Variantes",
    description:
      "Les autres variantes du même titre, pour les mêmes artistes : radio edit, instrumental, remix… Chacune a son propre ISRC.",
    add: "Nouvelle variante",
    emptyBody:
      "Créez une variante pour une radio edit, une instrumentale ou un remix.",
    emptyBodyReadOnly: "Les autres variantes de ce titre apparaîtront ici.",
  },

  // Successive audio files of the title, grouped by audio state.
  audio: {
    title: "Évolution du morceau",
    description:
      "Chaque fichier garde l'état audio qu'il représente. Le titre avance tout seul vers l'état le plus avancé déposé.",
    add: "Ajouter un fichier audio",
    stateLabel: "État audio du fichier",
    hint: "WAV, AIFF, MP3, FLAC… 50 Mo au plus. La durée est lue quand le navigateur le peut.",
    notAudio: "Choisissez un fichier audio (WAV, AIFF, MP3, FLAC…).",
    dialog: {
      description: "À quel état du morceau correspond-il ?",
      descriptionMany: "Ils correspondront tous au même état du morceau.",
    },
    emptyBody:
      "Déposez la maquette, puis les mises à plat et les masters : ils restent tous rattachés à ce titre.",
    emptyBodyReadOnly: "Les fichiers audio du titre apparaîtront ici.",
  },

  credits: {
    artistsTitle: "Artistes interprètes",
    artistsDescription:
      "Crédités sur la pochette et les plateformes. On les change dans « Modifier ».",
    title: "Contributeurs",
    description:
      "Auteurs, compositeurs, producteurs, ingénieurs, musiciens : tous les crédits du titre.",
    add: "Ajouter un contributeur",
    // Who is credited: a person of the Réseau, or only a name.
    person: "Personne",
    emptyTitle: "Aucun contributeur",
    emptyBody: "Créditez les auteurs, compositeurs, producteurs et musiciens.",
    emptyBodyReadOnly: "Les contributeurs du titre apparaîtront ici.",
    roles: {
      composer: "Compositeur·rice",
      lyricist: "Auteur·rice (paroles)",
      arranger: "Arrangeur·se",
      producer: "Réalisateur·rice",
      co_producer: "Coréalisateur·rice",
      recording_engineer: "Ingé son (enregistrement)",
      mix_engineer: "Ingé son (mixage)",
      mastering_engineer: "Ingé son (mastering)",
      musician: "Musicien·ne",
      other: "Autre",
    },
    columns: {
      name: "Nom",
      role: "Rôles",
      detail: "Précision",
      actions: "Actions",
    },
    fields: {
      name: "Nom",
      role: "Rôle",
      // One person, all their roles at once (UX test of 09/10/2026).
      roles: "Rôles",
      rolesPlaceholder: "Choisir un ou plusieurs rôles",
      rolesRequired: "Choisissez au moins un rôle.",
      rolesFromNetwork:
        "Rôles repris de sa fiche Réseau, à corriger si besoin.",
      rolesEngineer:
        "Ingénieur·e au Réseau : précisez enregistrement, mixage ou mastering.",
      detail: "Précision",
      detailHint:
        "Instrument ou détail : « guitare », « production additionnelle ».",
      // Opened from a project with several titles (Juridique).
      master: "Titre",
    },
    addTitle: "Nouveau contributeur",
    editTitle: "Modifier le contributeur",
    formDescription: "Le nom tel qu'il doit apparaître dans les crédits.",
    confirmTitle: "Retirer ce contributeur ?",
    confirmBody: (name: string) =>
      `« ${name} » ne sera plus crédité sur ce titre, pour aucun de ses rôles.`,
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
      // The owner of the recording, not the artistic producer.
      producer: "Producteur (phonographique)",
      author: "Auteur·rice (paroles)",
      composer: "Compositeur·rice",
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
    // The publishing split confirmed by everyone in the Juridique.
    confirmed: {
      title: (project: string, version: number) =>
        `Répartition confirmée par tous dans le Juridique (projet « ${project} », version ${version}).`,
      differs: "Les parts ci-dessous ne sont pas les mêmes.",
      same: "Les parts ci-dessous sont les mêmes.",
      adopt: "Reprendre ces parts",
      adopting: "Reprise…",
      rounded:
        "Les parts du titre gardent deux décimales : elles sont arrondies pour faire toujours 100 %.",
      failed: "Les parts n'ont pas pu être reprises. Réessayez.",
    },
    // Who a share goes to, picked (or only a name).
    party: {
      credited: "Crédité sur le titre",
      artist: "Artiste du titre",
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
      iswcHint: "Code de l'œuvre, par exemple T-034.524.680-1.",
      rightsHolder: "Titulaire du ℗",
      rightsHolderHint: "Le producteur phonographique.",
      rightsHolderSuggested: (role: "label" | "producer") =>
        `Proposé d'après la répartition master du titre (${role === "label" ? "label" : "producteur"}).`,
      rightsYear: "Année du ℗",
      rightsYearHint: "Année de première publication.",
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
    title: "Distribution",
    description:
      "Les sorties des projets qui portent ce titre. On les modifie dans la Sortie du projet.",
    emptyBody:
      "Rattachez ce titre à un projet : sa sortie, son UPC et ses liens apparaîtront ici.",
    emptyBodyLinked:
      "Les projets de ce titre n'ont pas encore de sortie. Elle apparaîtra ici dès qu'elle sera créée dans leur Sortie.",
    columns: {
      release: "Sortie",
      project: "Projet",
      upc: "UPC",
      date: "Date",
      status: "Statut",
      links: "Sur les plateformes",
    },
    noLinks: "Aucun lien détecté",
  },

  projects: {
    title: "Projets",
    emptyBody: "Aucun projet ne rattache ce titre pour l'instant.",
  },

  files: {
    emptyBody:
      "Glissez un fichier ici, ou cliquez pour le choisir : stems, pochette, contrats. Les fichiers audio successifs sont dans l'onglet Audio.",
    emptyBodyReadOnly: "Les fichiers du titre apparaîtront ici.",
  },

  activity: {
    emptyBody: "Ce qui se passe autour de ce titre apparaîtra ici.",
    sections: {
      session: "la session",
      track: "la piste",
      contributor: "le contributeur",
      split: "la part de",
      declaration: "la déclaration",
    },
    fields: {
      identity: "l'identité",
      audio: "l'état audio",
      rights: "les droits",
    },
    sentences: {
      masterCreated: "Titre créé",
      masterUpdated: (fields: string) => `Modification de ${fields}`,
      masterUpdatedNoField: "Titre modifié",
      itemAdded: (what: string) => `Ajout de ${what}`,
      itemUpdated: (what: string) => `Modification de ${what}`,
      itemRemoved: (what: string) => `Suppression de ${what}`,
      fileAdded: (name: string) => `Fichier ${name} ajouté`,
      fileRemoved: (name: string) => `Fichier ${name} supprimé`,
      fileUpdated: (name: string) => `Fichier ${name} modifié`,
      fileMoved: (name: string, category: string) =>
        `Fichier ${name} classé dans ${category}`,
      audioAdded: (state: string, name: string) =>
        `Fichier audio ${name} ajouté (${state})`,
      audioRemoved: (state: string, name: string) =>
        `Fichier audio ${name} supprimé (${state})`,
      audioStateSet: (state: string) => `État audio : ${state}`,
      projectCreated: (title: string) => `Projet ${title} créé avec ce titre`,
      projectLinked: (title: string) => `Titre rattaché au projet ${title}`,
    },
  },

  remove,
} as const;
