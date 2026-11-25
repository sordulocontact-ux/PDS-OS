// « Plans de sortie » of a collective (lot 14 of docs/pds-mic-plan.md,
// § 3.1 « Sortie ≠ plan de sortie »): one editorial plan per title, shared
// with the artist's team, in versions.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const titleReleasePlans = {
  title: "Plans de sortie",
  description:
    "Un plan par titre, à partager avec l'artiste et son équipe. Il lit la date de la sortie du titre ; chaque version enregistrée reste telle quelle.",
  facts: {
    plans: "Plans",
    shared: "Partagés ou actifs",
    archived: "Archivés",
  },
  statuses: {
    draft: "Brouillon",
    provisional: "Planning provisoire",
    internal: "Version interne",
    ready_to_share: "Prêt à partager",
    revised: "Version révisée",
    active: "Plan actif",
    archived: "Plan archivé",
  } as Record<string, string>,
  statusHints: {
    draft:
      "Le titre et l'artiste sont là : posez la date cible pour passer en planning provisoire.",
    provisional:
      "La date cible est posée. Enregistrez la version interne une fois l'accord de principe obtenu.",
    internal:
      "Version interne enregistrée. Marquez-la prête à partager quand elle peut partir chez l'artiste.",
    ready_to_share:
      "Copiez le lien de la dernière version dans « Versions ». Après le retour de l'artiste, enregistrez une version révisée.",
    revised:
      "Version révisée enregistrée : partagez-la, puis activez le plan quand la campagne démarre.",
    active:
      "La campagne suit ce plan. Une nouvelle version le repasse en version révisée.",
    archived: "Plan archivé : lecture seule.",
  } as Record<string, string>,
  draftWithDate:
    "La date cible est posée : passez le plan en planning provisoire.",
  archivedBecause: {
    title_abandoned:
      "Plan archivé : le titre est abandonné. Il retrouvera son statut si le titre est réactivé.",
    closed: "Plan archivé : le bilan de la campagne est fait.",
  } as Record<string, string>,
  readOnly: "Seul le ou la responsable du projet modifie les plans de sortie.",
  priorities: {
    high: "Haute",
    normal: "Normale",
    low: "Basse",
  } as Record<string, string>,
  channels: {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    streaming: "Plateformes de streaming",
    press: "Presse / médias",
    live: "Live / événement",
    other: "Autre",
  } as Record<string, string>,

  // The list.
  list: {
    columns: {
      title: "Titre",
      date: "Date cible",
      status: "Statut",
      version: "Version",
      actions: "Actions",
    },
    groups: { live: "Titres", abandoned: "Titres abandonnés" },
    noVersion: "Aucune",
    version: (n: number) => `V${n}`,
    changed: "Actions modifiées depuis la dernière version",
    empty: {
      title: "Aucun titre pour l'instant",
      body: "Chaque titre du projet reçoit son plan de sortie dès qu'il est ajouté.",
      action: "Titres",
    },
  },

  // The page of a plan.
  page: {
    back: "Plans de sortie",
    title: (title: string) => `Plan de sortie · ${title}`,
    facts: {
      status: "Statut",
      date: "Date cible",
      version: "Version",
    },
    steps: "Étapes du plan",
  },
  gestures: {
    provisional: "Passer en planning provisoire",
    record_internal: "Enregistrer la version interne",
    record_internal_again: "Nouvelle version interne",
    ready: "Marquer prêt à partager",
    activate: "Activer le plan",
    record_revised: "Enregistrer une version révisée",
    archive: "Archiver le plan",
    reopen: "Rouvrir le plan",
    more: "Autres gestes du plan",
  },
  gestureDone: {
    provisional: "Planning provisoire.",
    record_internal: "Version interne enregistrée.",
    ready: "Plan prêt à partager.",
    activate: "Plan actif.",
    record_revised: "Version révisée enregistrée.",
    archive: "Plan archivé.",
    reopen: "Plan rouvert.",
  } as Record<string, string>,
  noDateHint:
    "La date cible vient de la sortie du titre : fixez-la dans « Sorties ».",
  noDateLink: "Sorties",
  record: {
    internalTitle: "Enregistrer la version interne",
    revisedTitle: "Enregistrer une version révisée",
    description:
      "La version garde le document tel qu'il est maintenant, son auteur et sa date. Les versions déjà enregistrées et leurs liens ne changent pas.",
    note: "Note (facultatif)",
    notePlaceholderInternal: "Accord de principe de l'artiste, le 12/11",
    notePlaceholderRevised: "Retours de l'équipe de l'artiste intégrés",
    submit: "Enregistrer la version",
  },
  archive: {
    title: "Archiver le plan",
    description:
      "Le bilan de la campagne est fait : le plan passe en lecture seule. Il pourra être rouvert.",
    note: "Bilan",
    notePlaceholder: "Campagne terminée, bilan fait le 20/12",
    noteRequired: "Écrivez le bilan en une phrase.",
    submit: "Archiver",
  },

  // The changed actions since the latest version.
  signal: {
    title: (version: number) =>
      `Des actions ont changé depuis la version ${version}`,
    added: (names: string) => `Ajoutées : ${names}.`,
    removed: (names: string) => `Retirées : ${names}.`,
    changed: (names: string) => `Modifiées : ${names}.`,
    body: "Les versions enregistrées et leurs liens restent tels quels ; enregistrez une version pour reprendre ces changements.",
  },

  // Sections.
  sections: {
    release: {
      title: "Couverture et sortie",
      description:
        "Lues sur le titre, ses participations et sa sortie. Plateformes, placements et lien d'écoute se règlent ici.",
      cover: "Couverture",
      noCover:
        "Pas de pochette : ajoutez-la dans les fichiers du titre, au Catalogue, ou choisissez une image du moodboard.",
      mainArtist: "Artiste principal",
      guests: "Invités",
      noGuest: "Aucun invité confirmé",
      notConfirmed: (names: string) => `Pas encore confirmés : ${names}`,
      date: "Date cible",
      noDate: "À fixer",
      withCompilation: "Avec la compilation",
      distribution: "Statut Distribution",
      noRelease: "Pas encore de sortie",
      platforms: "Plateformes",
      noPlatform: "Aucune",
      placements: "Placements",
      noPlacement: "Aucun",
      listening: "Lien d'écoute",
      noListening: "À ajouter",
      edit: "Modifier",
      editLabel: "Modifier les plateformes, les placements et le lien d'écoute",
    },
    intent: {
      title: "Intention",
      description:
        "Ce que la sortie du titre doit produire. La priorité reste interne : elle n'apparaît jamais dans le document partagé.",
      objective: "Objectif",
      audience: "Audience",
      message: "Message",
      priority: "Priorité",
      internal: "Interne",
      fromStrategy: "Repris de la Stratégie validée",
      empty: "Non renseigné",
      edit: "Modifier",
      editLabel: "Modifier l'intention",
    },
    phases: {
      title: "Phases de campagne",
      description: "Les temps de la campagne, chacun avec son texte.",
      empty: "Aucune phase : le document passe directement aux contenus.",
      edit: "Modifier",
      editLabel: "Modifier les phases de campagne",
    },
    actions: {
      title: "Actions",
      description:
        "Les actions marketing ciblées sur ce titre et les actions globales du projet, reprises du ciblage du Marketing. Chacune devient une page du moodboard.",
      dedicated: "Dédiées au titre",
      global: "Globales du projet",
      noDedicated:
        "Aucune action ciblée sur ce titre : le ciblage se règle dans le Marketing.",
      noGlobal: "Aucune action globale.",
      kinds: { deliverable: "Livrable", activation: "Activation" },
      inDocument: "Dans le document",
      outOfDocument: "Hors du document",
      noDate: "Sans date",
      edit: "Modifier pour le document",
      editShort: "Modifier",
      editLabel: (title: string) => `Modifier « ${title} » pour le document`,
      marketing: "Marketing",
    },
    timeline: {
      title: "Timeline",
      description:
        "Les dates des contenus. Les actions datées y figurent d'office ; le jour de sortie est marqué en rouge dans le document.",
      columns: {
        date: "Date",
        format: "Format",
        channel: "Canal",
        owner: "Responsable",
        validation: "Validation",
        actions: "Actions",
      },
      releaseDay: "Jour de sortie",
      release: (title: string) => `Sortie de « ${title} »`,
      fromAction: "Action",
      validated: "Validée",
      toValidate: "À valider",
      noOwner: "—",
      add: "Ajouter une date",
      empty: "Aucune date : ajoutez-en ou datez les actions dans le Marketing.",
      rowLabel: (format: string) => `Actions pour « ${format} »`,
      edit: "Modifier",
      remove: "Retirer",
      removed: "Date retirée.",
    },
    moodboard: {
      title: "Moodboard et assets",
      description:
        "Les images du plan (couverture, contenus, timeline) et les liens de travail de l'équipe. Les liens restent internes.",
      images: "Images",
      count: (n: number) => (n > 1 ? `${n} images` : "1 image"),
      noImage:
        "Aucune image : ajoutez-en, ou déposez une pochette au Catalogue.",
      add: "Ajouter des images",
      uploading: "Envoi…",
      groups: {
        cover: "Pochette du titre",
        artist: "Artistes",
        project: "Fichiers du projet",
        uploads: "Ajoutées ici",
      } as Record<string, string>,
      links: "Liens",
      noLink: "Aucun lien : Drive, dossier d'assets…",
      addLink: "Ajouter un lien",
      removeLink: (label: string) => `Retirer le lien « ${label} »`,
      linkRemoved: "Lien retiré.",
      useAsCover: "Utiliser en couverture",
      isCover: "Couverture",
      coverSaved: "Couverture enregistrée.",
      imageActions: (name: string) => `Actions pour l'image « ${name} »`,
      added: (n: number) =>
        n > 1 ? `${n} images ajoutées.` : "Image ajoutée.",
    },
    versions: {
      title: "Versions",
      description:
        "Chaque version garde son document, son auteur, sa date et son statut. Un lien de partage montre une version, jamais l'interface.",
      empty:
        "Aucune version : la première s'enregistre en version interne, une fois le planning provisoire posé.",
      columns: {
        version: "Version",
        status: "Statut",
        by: "Par",
        at: "Le",
        actions: "Actions",
      },
      linkLive: "Lien actif",
      view: "Voir",
      pdf: "Télécharger le PDF",
      share: "Copier le lien de partage",
      shared: "Lien copié : il montre cette version, en lecture seule.",
      shareFailed: "Le lien n'a pas pu être créé. Réessayez.",
      revoke: "Retirer le lien",
      revoked: "Lien retiré : il ne s'ouvre plus.",
      rowLabel: (n: number) => `Actions pour la version ${n}`,
    },
  },

  // Dialogs.
  forms: {
    release: {
      title: "Plateformes, placements et lien d'écoute",
      description:
        "Ce que le document annonce sur la page de la date de sortie.",
      platforms: "Plateformes",
      platformsHint: "Une par ligne : Spotify, Apple Music, Deezer…",
      placements: "Placements",
      placementsHint:
        "Playlists, radios… Avec son logo si vous en choisissez un parmi les images du plan, sinon son nom seul.",
      placement: (n: number) => `Placement ${n}`,
      placementLabel: (n: number) => `Nom du placement ${n}`,
      placementPlaceholder: "Placement playlist « Ilebon »",
      placementRequired: "Nommez le placement ou retirez-le.",
      placementImage: "Logo",
      addPlacement: "Ajouter un placement",
      removePlacement: (n: number) => `Retirer le placement ${n}`,
      listening: "Lien d'écoute",
      listeningHint: "Le lien multi-plateforme (https).",
      listeningImage: "Image de la page d'écoute",
      chooseImage: "Choisir une image",
      changeImage: "Changer",
      closeImages: "Fermer",
      removeImage: "Retirer",
      badUrl: "Un lien commence par https://",
      tooMany: "8 lignes au plus.",
      submit: "Enregistrer",
    },
    intent: {
      title: "Intention",
      description:
        "Repris de la Stratégie validée tant que rien n'est écrit ici.",
      submit: "Enregistrer",
    },
    phases: {
      title: "Phases de campagne",
      description: "Jusqu'à 6 phases, dans l'ordre. Le document les numérote.",
      name: (n: number) => `Phase ${n}`,
      nameLabel: (n: number) => `Nom de la phase ${n}`,
      namePlaceholder: "Activation",
      text: (n: number) => `Texte de la phase ${n}`,
      add: "Ajouter une phase",
      remove: (n: number) => `Retirer la phase ${n}`,
      nameRequired: "Nommez la phase.",
      submit: "Enregistrer",
    },
    action: {
      title: (title: string) => `« ${title} » dans le document`,
      description:
        "Sa page du moodboard : un texte et jusqu'à 5 images. Hors du document, elle n'apparaît ni en page ni dans la timeline.",
      include: "Dans le document",
      text: "Texte de la page",
      visuals: "Images (5 au plus)",
      noVisual: "Ajoutez des images dans « Moodboard et assets ».",
      tooMany: "5 images au plus.",
      submit: "Enregistrer",
    },
    entry: {
      addTitle: "Ajouter une date",
      editTitle: "Modifier la date",
      actionTitle: (title: string) => `Date de « ${title} »`,
      description:
        "La date, le format et le compte apparaissent dans le document ; le responsable et la validation restent internes.",
      actionDescription:
        "Sa date est celle de l'action, réglée dans le Marketing. Le compte apparaît dans le document ; la validation reste interne.",
      date: "Date",
      format: "Format",
      formatPlaceholder: "Playback 1",
      channel: "Canal",
      noChannel: "Aucun",
      account: "Compte",
      accountPlaceholder: "@artiste",
      owner: "Responsable",
      noOwner: "Personne",
      validated: "Validée",
      visual: "Image",
      noVisual: "Aucune",
      dateRequired: "Choisissez une date.",
      formatRequired: "Écrivez le format.",
      submit: "Enregistrer",
    },
    link: {
      title: "Ajouter un lien",
      description:
        "Un lien de travail de l'équipe (Drive, assets). Il reste interne.",
      label: "Libellé",
      labelPlaceholder: "Dossier Drive",
      url: "Lien",
      labelRequired: "Écrivez un libellé.",
      badUrl: "Un lien commence par https://",
      submit: "Ajouter",
    },
    saved: "Plan de sortie enregistré.",
  },

  errors: {
    status_changed:
      "Le plan a changé entre-temps (un autre onglet ?) : rechargez la page pour voir son état actuel.",
    no_target_date:
      "La date cible manque : fixez la date de la sortie du titre dans « Sorties ».",
    not_provisional: "Passez d'abord le plan en planning provisoire.",
    plan_archived: "Le plan est archivé : il est en lecture seule.",
    note_required: "Écrivez le bilan en une phrase.",
    title_abandoned:
      "Le titre est abandonné : le plan se rouvrira quand le titre sera réactivé.",
    not_shareable:
      "Seule la dernière version d'un plan prêt à partager, révisé ou actif se partage.",
    no_link: "Cette version n'a pas de lien actif.",
    too_large: "Le plan est trop volumineux : retirez des images ou des dates.",
    invalid:
      "Ce qui est saisi ne peut pas être enregistré : vérifiez les champs.",
    failed: "Le plan n'a pas pu être enregistré. Réessayez.",
  } as Record<string, string>,

  // The shared document and its PDF (design of the plan Jeho).
  doc: {
    coverTitle: (single: boolean) =>
      single ? "Plan de sortie single" : "Plan de sortie",
    // « PDS - Marina (feat. Lou Vega) », as the platforms write it.
    by: (artist: string, track: string) => `${artist} - ${track}`,
    releaseDate: "Date de sortie",
    noDate: "À fixer",
    listening: "Lien d'écoute multi-plateforme",
    listeningImage: "Page du lien d'écoute",
    intent: { objective: "Objectif", audience: "Audience", message: "Message" },
    phases: (n: number) => (n === 1 ? "1 phase" : `${n} phases`),
    moodboard: "Moodboard des contenus",
    timeline: "Timeline des contenus",
    releaseDay: "Jour de sortie",
    release: "Sortie du titre",
    documentTitle: (title: string) => `Plan de sortie · ${title}`,
    pdfFileName: (title: string, version: number) =>
      `Plan de sortie - ${title} - V${version}.pdf`,
    unavailable: "Ce lien n'est plus disponible.",
  },

  versionsCount: (n: number) => plural(n, "version", "versions"),
} as const;
