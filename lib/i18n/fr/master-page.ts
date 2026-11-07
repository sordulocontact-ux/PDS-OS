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
    facts: "Informations",
    artists: "Artistes",
    // The head of the overview (retour Catalogue 11), in the line of facts
    // under the title: where the title stands.
    status: {
      audio: "État audio",
      noAudio: "Aucun son",
      reference: "Version de référence",
      noReference: "Aucune",
      projects: "Projet",
      noProject: "Aucun",
      distribution: "Distribution",
    },
    distributionStates: {
      not_prepared: "Non préparée",
      preparing: "En préparation",
      delivered: "Livrée",
      available: "Disponible",
    },
    // « Maintenant » of the title (proto `docs/protos/titre.html`): the one
    // next action, computed by code (titleNextAction), why and what follows.
    nextActions: {
      add_first_version: "Ajouter une première version audio",
      review: (label: string) => `Examiner ${label}`,
      awaiting_review: (label: string) =>
        `${label} attend la validation de l'équipe catalogue`,
      deposit_correction: (label: string) =>
        `Déposer la version corrigée de ${label}`,
      deposit_next: (state: string) => `Déposer une version « ${state} »`,
      link_project: "Créer ou rattacher un projet pour ce titre",
    },
    now: {
      label: "Maintenant",
      mine: "À vous",
      toValidate: "À valider",
      nothing: "Rien à faire pour vous",
      open: "Ouvrir",
      then: "Ensuite",
      where: (title: string, place: string) => `${title} · ${place}`,
      // A reader: who is awaited, on what.
      waiting: (todo: string) => `En attente de l'équipe catalogue : ${todo}`,
      doneTitle: "Le dossier est complet",
      doneBody:
        "Le titre a son master final et tout ce qu'il faut pour sortir. La suite se joue dans son projet.",
      why: {
        add_first_version:
          "Le titre n'a encore aucun son : la première version (maquette, mise à plat…) ouvre son suivi audio ; validée, elle devient la version de référence.",
        review: (label: string) =>
          `${label} a été déposée : écoutez-la, puis validez-la ou demandez des corrections.`,
        deposit_correction: (label: string) =>
          `Des corrections ont été demandées sur ${label} : la version corrigée reprend la même étape.`,
        deposit_next: (next: string) =>
          `L'étape suivante du son est ${next} : la version déposée s'examine ensuite dans Audio.`,
        link_project:
          "Le master final est validé : un projet porte maintenant sa sortie.",
        release: "Il manque au dossier pour sortir le titre.",
        later: "Il complète le dossier du titre.",
      },
      thenOf: {
        first: "Version de référence",
        review: "Version suivante",
        project: "Sortie du projet",
        others: (n: number) =>
          n === 0
            ? "Dossier complet"
            : `${n} autre${n > 1 ? "s" : ""} au dossier`,
      },
    },
    // The dossier, one row per piece with its value (proto, 29/10/2026).
    // « Complet » is not « validé » (retour 12).
    dossier: {
      title: "Dossier du titre",
      count: (done: number, total: number) => `${done} sur ${total}`,
      countLabel: (done: number, total: number) =>
        `${done} pièces sur ${total} au dossier`,
      release: "Pour la sortie",
      later: "Ensuite",
      left: (n: number) => `${n} à faire`,
      allDone: "fait",
      missing: "À faire",
      edit: "Modifier",
      legal: "Un dossier complet n'est pas un dossier validé juridiquement.",
      remaining: (share: string) => `Reste ${share}`,
      masterFileDone: "Validé",
      masterFileLocked: "Se valide dans Audio, après le Master",
      labels: {
        isrc: "ISRC",
        rightsHolder: "Titulaire du ℗",
        masterSplits: "Splits du master",
        publishingSplits: "Splits de l'édition",
        masterFile: "Master final",
        iswc: "ISWC de l'œuvre",
        contributors: "Contributeurs",
        declarations: "Déclarations",
      },
      verbs: {
        isrc: "Renseigner l'ISRC",
        rightsHolder: "Renseigner le titulaire",
        masterSplits: "Répartir le master",
        publishingSplits: "Répartir l'édition",
        masterFile: "Ouvrir l'audio",
        iswc: "Renseigner l'ISWC",
        contributors: "Créditer",
        declarations: (toQualify: number) =>
          toQualify > 0
            ? `Qualifier ${toQualify} organisme${toQualify > 1 ? "s" : ""}`
            : "Mettre à jour",
      },
    },
  },

  sessions: {
    title: "Sessions",
    description:
      "Composition, enregistrement, mixage, mastering : où et avec qui le titre a été fait.",
    add: "Ajouter une session",
    emptyTitle: "Aucune session",
    emptyBody:
      "Notez les sessions d'enregistrement, de mixage et de mastering.",
    emptyBodyReadOnly: "Les sessions du titre apparaîtront ici.",
    undated: "Date à préciser",
    noStudio: "Lieu non renseigné",
    // Ibé, 06/11/2026: « Composition » rather than « Production », first.
    kinds: {
      production: "Composition",
      recording: "Enregistrement",
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
    engineerHint:
      "Choisissez quelqu'un du Réseau, ou gardez seulement le nom tapé.",
    engineerSuggested: (name: string) =>
      `${name} est proposé d'après les crédits du titre ou le Brief Mix/Master.`,
    addTitle: "Nouvelle session",
    editTitle: "Modifier la session",
    formDescription: "Seuls le type et la date servent au classement.",
    confirmTitle: "Supprimer cette session ?",
    confirmBody: (name: string) =>
      `« ${name} » sera supprimée. Ses fichiers de travail restent, sans session.`,
    // Retours 27 à 35: one session, several titles. Its state is computed
    // (lib/sessions/state.ts, texts in sessions.states).
    fields2: {
      startsAt: "Début",
      endsAt: "Fin",
    },
    endsBeforeStart: "La fin vient après le début.",
    alsoOn: (titles: string) => `Aussi sur ${titles}`,
    attach: "Rattacher une session",
    attachTitle: "Rattacher une session existante",
    attachDescription:
      "Une session qui a servi à plusieurs titres reste une seule session : rattachez-la plutôt que d'en créer une copie.",
    attachEmpty: "Aucune autre session dans le Catalogue.",
    attachAction: "Rattacher",
    attached: "Session rattachée.",
    onTitles: (titles: string) => `Sur ${titles}`,
    detach: "Détacher de ce titre",
    detachTitle: "Détacher cette session ?",
    detachBody: (name: string, others: string) =>
      `« ${name} » reste sur ${others} avec son historique. Sur ce titre, ses fichiers de travail restent, sans session.`,
    detached: "Session détachée.",
    deleted: "Session supprimée.",
    sharedDelete: (others: string) =>
      `Cette session sert aussi à ${others} : détachez-la de ce titre plutôt que de la supprimer.`,
    deleteDependencies: (files: number) =>
      files === 0
        ? ""
        : files === 1
          ? " 1 fichier de travail y est rattaché : il reste, sans session."
          : ` ${files} fichiers de travail y sont rattachés : ils restent, sans session.`,
    times: (start: string | null, end: string | null) =>
      start && end ? `${start} – ${end}` : (start ?? end ?? ""),
    errors: {
      session_shared:
        "Cette session sert à d'autres titres : détachez-la au lieu de la supprimer.",
      session_last_title:
        "C'est le seul titre de cette session : supprimez-la plutôt.",
      session_not_of_title: "Cette session n'est pas rattachée à ce titre.",
      failed: "L'action n'a pas pu être faite. Réessayez.",
    },
  },

  // Retours 36 à 38: what the session really produced, stored once.
  workFiles: {
    title: "Fichiers de travail",
    description:
      "Dossiers de session, ZIP, projets Pro Tools ou Logic, multipistes, stems : le contenu réel des séances, versionné, rattaché au titre et, si vous la connaissez, à une session.",
    add: "Déposer un fichier",
    addLink: "Ajouter un lien",
    empty: "Aucun fichier de travail pour l'instant.",
    emptyReadOnly: "Les fichiers de travail du titre apparaîtront ici.",
    limit:
      "500 Mo au plus par fichier déposé (limite du stockage). Au-delà, ajoutez un lien vers l'endroit où il est partagé : il n'est jamais copié.",
    columns: {
      name: "Fichier",
      session: "Session",
      status: "Statut",
      added: "Déposé",
    },
    statuses: {
      provisional: "Provisoire",
      final: "Définitif",
    },
    noStatus: "—",
    noSession: "Sans session",
    link: "Lien",
    version: (n: number) => `v${n}`,
    addedBy: (name: string) => `par ${name}`,
    fields: {
      file: "Fichier",
      description: "Ce que c'est",
      descriptionHint: "« Session Pro Tools du 3 octobre », « Stems V2 »…",
      label: "Nom du lien",
      url: "Adresse du lien",
      urlHint: "Une adresse https (WeTransfer, Drive, Dropbox…).",
      session: "Session",
      noSession: "Aucune",
      status: "Statut",
    },
    addTitle: "Déposer un fichier de travail",
    addLinkTitle: "Ajouter un lien vers un fichier de travail",
    editTitle: "Modifier le fichier de travail",
    formDescription:
      "La session est facultative : un fichier peut rester sur le titre seul.",
    save: "Enregistrer",
    saved: "Fichier de travail enregistré.",
    deleted: "Fichier de travail supprimé.",
    deleteTitle: "Supprimer ce fichier de travail ?",
    deleteBody: (name: string) =>
      `« ${name} » sera supprimé du titre et de sa session.`,
    urlInvalid: "Saisissez une adresse qui commence par https://.",
    fileRequired: "Choisissez un fichier.",
    tooLarge:
      "Fichier trop lourd : 500 Mo au plus. Ajoutez plutôt un lien vers l'endroit où il est partagé.",
    legacyTitle: "Anciennes pistes",
    legacyDescription:
      "Notées une par une avant les fichiers de travail, gardées pour l'historique.",
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
      "La famille du titre : l'original et ses variantes (acoustique, instrumentale, remix, live…), reliées à lui. Chacune garde ses fichiers, ses crédits et son ISRC.",
    add: "Nouvelle variante",
    emptyBody:
      "Créez une variante pour une radio edit, une instrumentale ou un remix.",
    emptyBodyReadOnly: "Les autres variantes de ce titre apparaîtront ici.",
  },

  // Successive audio files of the title, grouped by audio state.
  audio: {
    title: "Versions audio",
    description:
      "Chaque version garde son étape et son numéro. Déposer fait avancer l'étape atteinte, jamais la validation : une version se valide ici.",
    add: "Ajouter un fichier audio",
    stateLabel: "État audio du fichier",
    // `formats` = AUDIO_FORMAT_LIST, the same list the server accepts.
    hint: (formats: string) =>
      `${formats}, 500 Mo au plus par fichier. La durée est lue quand le navigateur le peut.`,
    notAudio: (formats: string) =>
      `Ce format n'est pas accepté : choisissez un fichier ${formats}.`,
    dialog: {
      description: "À quel état du morceau correspond-il ?",
      descriptionMany: "Ils correspondront tous au même état du morceau.",
    },
    emptyBody:
      "Déposez la maquette, puis les mises à plat et les masters : ils restent tous rattachés à ce titre.",
    emptyBodyReadOnly: "Les fichiers audio du titre apparaîtront ici.",
    // Versions, decisions and comments (retours Catalogue 10, 13, 18 à 26).
    versions: {
      summary: {
        reached: "Étape atteinte",
        latestDeposited: "Dernière version déposée",
        latestValidated: "Dernière version validée",
        none: "Aucune",
      },
      label: (state: string, number: number) => `${state} V${number}`,
      deposited: (author: string, date: string) =>
        author ? `Déposée par ${author} le ${date}` : `Déposée le ${date}`,
      follows: (label: string) => `Suit ${label}`,
      validation: {
        approved: "Validée",
        changes_requested: "Corrections demandées",
        pending: "En attente de validation",
        superseded: "Non examinée",
      },
      decided: (who: string, date: string) =>
        who ? `${who}, le ${date}` : `le ${date}`,
      approve: "Valider cette version",
      approveTitle: (label: string) => `Valider ${label} ?`,
      approveBody:
        "La validation est attachée à ce fichier précis et ne se reprend pas. Pour changer d'avis, déposez une nouvelle version.",
      approveFinalBody:
        "Ce master final validé fait passer le titre dans « Finalisés ». La validation ne se reprend pas.",
      requestChanges: "Demander des corrections",
      requestChangesTitle: (label: string) =>
        `Demander des corrections sur ${label}`,
      requestChangesLabel: "Ce qu'il faut corriger",
      requestChangesHint:
        "La demande reste attachée à cette version, même quand la suivante arrive.",
      requestChangesFromComments:
        "Repris des retours d'écoute de cette version : corrigez ou complétez avant d'envoyer.",
      approved: "Version validée.",
      changesRequested: "Corrections demandées.",
      reclassify: "Corriger l'étape",
      reclassifyTitle: (label: string) => `Corriger l'étape de ${label}`,
      reclassifyLabel: "Étape de ce fichier",
      reclassifyHint:
        "Possible tant que personne n'a examiné ni utilisé cette version. Les numéros V1, V2… suivent.",
      reclassified: "Étape corrigée.",
      listen: (label: string) => `Écouter ${label}`,
      open: "Ouvrir",
      download: "Télécharger",
      delete: "Supprimer",
      deleteTitle: (label: string) => `Supprimer ${label} ?`,
      deleteBody: (label: string) =>
        `Le fichier de ${label} sera supprimé définitivement, avec ses commentaires. Le journal du titre garde la trace de son dépôt et de sa suppression.`,
      deleteBlocked: {
        approved:
          "Cette version est validée : elle ne se supprime pas, pour que l'historique des décisions reste vrai.",
        inUse:
          "Un projet utilise cette version dans son workflow Master : elle ne se supprime pas.",
      },
      // Listening notes: anyone, as many as needed; never a decision.
      comments: {
        title: (count: number) =>
          count === 0 ? "Retours d'écoute" : `Retours d'écoute (${count})`,
        empty: "Aucun retour sur cette version.",
        whole: "Toute la version",
        at: (timecode: string) => `à ${timecode}`,
        bodyLabel: "Votre retour",
        atLabel: "Moment (min:s)",
        atHint: "Repris de la position du lecteur. Vide = toute la version.",
        showMore: (n: number) =>
          n === 1 ? "Voir l'autre retour" : `Voir les ${n} autres retours`,
        showLess: "Réduire",
        add: "Ajouter un retour",
        addTitle: (label: string) => `Ajouter un retour sur ${label}`,
        addHint:
          "Un avis d'écoute, partagé avec l'équipe. Il ne valide rien et ne demande aucune correction.",
        send: "Ajouter le retour",
        sent: "Retour ajouté.",
        atInvalid:
          "Écrivez le moment en minutes et secondes, par exemple 1:23.",
        bodyRequired: "Écrivez votre retour.",
      },
      errors: {
        failed: "La décision n'a pas pu être enregistrée. Réessayez.",
        noteRequired: "Dites ce qu'il faut corriger.",
        alreadyReviewed:
          "Cette version a déjà été examinée : la décision ne se reprend pas.",
        locked:
          "Cette version a déjà été examinée ou un projet l'utilise : son étape ne change plus.",
        commentInvalid: "Ce retour n'a pas pu être lu. Vérifiez-le.",
        commentFailed: "Le retour n'a pas pu être ajouté. Réessayez.",
      },
    },
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
      coproducer: "Coproducteur (phonographique)",
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
    // « Complet » is the arithmetic only; the validation is separate
    // (retours 44, 46, 48).
    review: {
      states: {
        preparing: "En préparation",
        to_check: "À vérifier",
        validated: "Validée",
        changed: "Modifiée depuis la validation",
      },
      validate: "Valider la répartition",
      validateTitle: (kind: string) => `Valider la répartition ${kind} ?`,
      validateBody:
        "La répartition telle qu'elle est maintenant devient la version validée. Une modification ultérieure ne la remplace pas : elle devra être validée à son tour.",
      validated: "Répartition validée.",
      notComplete: "Seule une répartition à 100 % se valide.",
      failed: "La validation n'a pas pu être enregistrée. Réessayez.",
      validatedBy: (who: string) =>
        who ? `Validée par ${who} le` : "Validée le",
      changedNote: (who: string) =>
        `Les parts ont changé depuis la validation${who ? ` de ${who}` : ""}. La version validée reste celle-ci tant que la nouvelle n'est pas validée :`,
      notLegal:
        "Une répartition complète n'est pas une preuve de droits : seule sa validation l'atteste.",
    },
    // Retour 47: every change, with before and after.
    history: {
      title: (count: number) => `Historique des modifications (${count})`,
      added: (party: string, share: string) => `${party} ajouté à ${share}`,
      updated: (before: string, after: string) => `${before} → ${after}`,
      removed: (party: string, share: string) => `${party} retiré (${share})`,
      validated: "Répartition validée",
      by: (who: string) => (who ? ` · ${who}` : ""),
    },
    // Retour 52: never a share added, only said.
    gaps: {
      title: "Cohérence à vérifier",
      line: (name: string, roles: string) =>
        `${name} est crédité ${roles} sans part d'édition visible.`,
      note: "Ce peut être voulu. Aucune part n'est proposée ni ajoutée automatiquement.",
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
      roleKind: "Ce rôle ne correspond pas à ce type de part.",
    },
    confirmTitle: "Supprimer cette part ?",
    confirmBody: (name: string) => `La part de « ${name} » sera supprimée.`,
  },

  rights: {
    title: "Droits",
    description: "L'œuvre et le titulaire des droits sur l'enregistrement.",
    edit: "Modifier",
    // Proposed, then confirmed by a person (retours 54 and 58).
    confirm: "Confirmer le titulaire du ℗",
    confirmDone: "Titulaire du ℗ confirmé.",
    confirmTitle: "Confirmer le titulaire et l'année du ℗ ?",
    confirmBody:
      "La mention ℗ sera tenue pour vérifiée. Si le titulaire ou l'année change ensuite, elle redeviendra à confirmer.",
    confirmed: (date: string, by: string | null) =>
      by ? `Confirmé le ${date} par ${by}` : `Confirmé le ${date}`,
    proposed: "Proposé, à confirmer selon les accords",
    review: (name: string) =>
      `À revoir : la répartition master propose désormais « ${name} ».`,
    confirmIncomplete: "Renseignez le titulaire et l'année avant de confirmer.",
    confirmFailed: "La confirmation n'a pas pu être enregistrée. Réessayez.",
    fields: {
      iswc: "ISWC",
      // Retour 57: facultative, never made up, not the ISRC.
      iswcHint:
        "Facultatif : le code de l'œuvre, attribué par la SACEM après la déclaration, par exemple T-034.524.680-1. Ce n'est pas l'ISRC, qui identifie l'enregistrement.",
      rightsHolder: "Titulaire du ℗",
      rightsHolderHint: "Le producteur phonographique.",
      rightsHolderSuggested: (role: "label" | "producer") =>
        `Proposé d'après la répartition master du titre (${role === "label" ? "label" : "producteur"}).`,
      rightsYear: "Année du ℗",
      // Retour 55: never the release dates of a project.
      rightsYearHint:
        "Année de première publication de l'enregistrement : elle ne suit pas les dates de sortie d'un projet, et une réédition garde la sienne.",
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
    description:
      "Dépôts auprès des sociétés de gestion collective. Qualifiez chaque organisme : à vérifier, à effectuer ou non applicable ; seules les démarches applicables comptent dans le dossier.",
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
    // The final list (retour 63).
    statuses: {
      to_verify: "À vérifier",
      to_do: "À effectuer",
      submitted: "Déposée",
      confirmed: "Confirmée",
      to_correct: "À corriger",
      rejected: "Refusée",
      not_applicable: "Non applicable",
    },
    statusHints: {
      to_verify: "On ne sait pas encore si la déclaration est nécessaire.",
      to_do: "La déclaration doit être réalisée.",
      submitted: "La déclaration a été transmise à l'organisme.",
      confirmed:
        "L'organisme l'a confirmée ; avec un justificatif, la confirmation est vérifiée.",
      to_correct: "Des modifications sont nécessaires.",
      rejected: "L'organisme a refusé la déclaration.",
      not_applicable: "Cette déclaration ne concerne pas le titre.",
    },
    verified: "Vérifiée (justificatif)",
    declaredOnly: "Confirmée, sans justificatif",
    followedBy: (who: string) => `Suivie par ${who}`,
    proof: "Justificatif",
    noProof: "Aucun justificatif",
    history: "Historique",
    historyEmpty: "Aucun changement enregistré.",
    historyLine: (field: string, before: string, after: string) =>
      `${field} : ${before} → ${after}`,
    historyFields: {
      status: "Statut",
      reference: "Référence",
      declared_on: "Date",
      third_party: "Suivi par",
      proof_file_id: "Justificatif",
    } as Record<string, string>,
    empty: "—",
    declare: "Qualifier",
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
      thirdParty: "Suivie par un tiers",
      thirdPartyHint:
        "Le nom de la personne ou de la structure qui fait la démarche, quand ce n'est pas l'équipe.",
      proof: "Justificatif",
      proofHint:
        "Un fichier du titre : récépissé, confirmation ou document de l'organisme. Déposez-le d'abord dans l'onglet Fichiers.",
      noProof: "Aucun",
    },
    dialogTitle: (organism: string) => `Déclaration ${organism}`,
    formDescription:
      "Notez où en est la démarche. Un statut renseigné n'est pas une preuve : joignez le justificatif quand l'organisme confirme.",
    confirmTitle: "Retirer cette déclaration ?",
    confirmBody: (name: string) =>
      `La déclaration ${name} repassera « À vérifier ».`,
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
    emptyBody:
      "Aucun projet ne rattache ce titre pour l'instant : créez-en un, ou rattachez-le à un EP ou un album déjà créé.",
    create: "Créer un projet",
    // Retours 16 et 64: join an existing project instead of a duplicate.
    link: {
      button: "Rattacher à un projet existant",
      title: "Rattacher ce titre à un projet",
      description:
        "Un projet musical pas encore lancé : le titre y est relié, jamais copié. Un single garde un seul titre.",
      field: "Projet",
      none: "Aucun projet ne peut accueillir ce titre : un projet lancé ne change plus de titres, un single en a déjà un.",
      submit: "Rattacher",
      done: "Titre rattaché au projet.",
      errors: {
        failed: "Le rattachement n'a pas abouti. Réessayez.",
        single: "Ce projet est un single : il a déjà son titre.",
        launched:
          "Ce projet est lancé : ses titres ne changent plus. Seule la direction rattache un titre avant le lancement.",
      },
    },
    // Retours 55 et 66: three dates kept apart, never one replacing another.
    dates: {
      title: "Dates de sortie",
      description:
        "La date visée du projet, la date confirmée de sa sortie, la date où elle a été vue en ligne : chacune garde sa valeur.",
      project: "Projet",
      target: "Visée",
      confirmed: "Confirmée",
      effective: "Effective",
    },
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
      audioReclassified: (name: string, from: string, to: string) =>
        `Fichier audio ${name} reclassé de ${from} en ${to}`,
      audioApproved: (state: string, name: string) =>
        `Version ${state} ${name} validée`,
      audioChangesRequested: (state: string, name: string) =>
        `Corrections demandées sur la version ${state} ${name}`,
      projectCreated: (title: string) => `Projet ${title} créé avec ce titre`,
      projectLinked: (title: string) => `Titre rattaché au projet ${title}`,
    },
  },

  remove,
} as const;
