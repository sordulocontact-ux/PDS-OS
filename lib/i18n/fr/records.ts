// Row actions of the lists (artists, titles, projects, network contacts):
// "⋯" menu, edit panel, archiving, deleting one row or a selection
// (docs/ARCHITECTURE.md § 2 quater).

type Kind = "artist" | "master" | "project" | "contact";

// Singular and plural nouns, for the selection counts.
const nouns = {
  artist: ["artiste", "artistes"],
  master: ["titre", "titres"],
  project: ["projet", "projets"],
  contact: ["contact", "contacts"],
} as const satisfies Record<Kind, readonly [string, string]>;

const count = (kind: Kind, n: number) =>
  `${n}\u00a0${nouns[kind][n === 1 ? 0 : 1]}`;

export const records = {
  menu: {
    column: "Actions",
    label: (name: string) => `Actions pour « ${name} »`,
    edit: "Modifier",
    archive: "Archiver",
    restore: "Restaurer",
    delete: "Supprimer",
  },
  // Checkboxes of the main lists and the bar shown once a row is ticked.
  selection: {
    column: "Sélection",
    all: "Tout sélectionner",
    row: (name: string) => `Sélectionner « ${name} »`,
    bar: "Actions sur la sélection",
    count: (n: number) => (n === 1 ? "1 sélectionné" : `${n} sélectionnés`),
    clear: "Tout désélectionner",
    delete: "Supprimer",
  },
  // The list filter: live rows, or the archive (director only).
  view: {
    label: "Affichage",
    live: "Actifs",
    archived: "Archivés",
  },
  archivedEmpty: {
    artist: "Aucun artiste archivé.",
    master: "Aucun titre archivé.",
    project: "Aucun projet archivé.",
    contact: "Aucun contact archivé.",
  } satisfies Record<Kind, string>,
  archivedEmptyBody:
    "Ce qui est archivé depuis le menu « ⋯ » d'une ligne apparaît ici, prêt à être restauré.",
  edit: {
    title: {
      artist: "Modifier l'artiste",
      master: "Modifier le titre",
      project: "Modifier le projet",
      contact: "Modifier le contact",
    } satisfies Record<Kind, string>,
    description: {
      artist: "Photo, identité et biographie.",
      master: "Titre, artistes crédités, état audio, variante, ISRC et durée.",
      project: "Modifiable tant que le projet n'est pas lancé.",
      contact: "Rôles, coordonnées et notes.",
    } satisfies Record<Kind, string>,
    loading: "Préparation du formulaire…",
    loadFailed: "Le formulaire n'a pas pu être préparé. Réessayez.",
    saved: "Modifications enregistrées.",
    close: "Fermer",
  },
  archive: {
    title: (name: string) => `Archiver « ${name} » ?`,
    body: {
      artist:
        "L'artiste disparaît du catalogue et des sélecteurs. Sa fiche, ses contacts et ses fichiers sont conservés : vous pourrez le restaurer depuis « Archivés ».",
      master:
        "Le titre disparaît du catalogue et des sélecteurs. Il est conservé : vous pourrez le restaurer depuis « Archivés ».",
      project:
        "Le projet disparaît des listes, et sa transmission en attente est suspendue. Il est conservé : vous pourrez le restaurer depuis « Archivés ».",
      contact:
        "Le contact disparaît du réseau et des sélecteurs. Sa fiche est conservée : vous pourrez le restaurer depuis « Archivés ».",
    } satisfies Record<Kind, string>,
    confirm: "Archiver",
    pending: "Archivage…",
    done: "Archivé.",
    // Known before asking: the dialog explains instead of confirming.
    blockedTitle: (name: string) => `« ${name} » ne peut pas être archivé`,
    blocked: {
      artistHasMasters: (count: number) =>
        count === 1
          ? "Un titre actif crédite cet artiste. Archivez d'abord ce titre."
          : `${count} titres actifs créditent cet artiste. Archivez d'abord ces titres.`,
      masterHasProjects: (count: number) =>
        count === 1
          ? "Un projet actif utilise ce titre. Archivez d'abord ce projet."
          : `${count} projets actifs utilisent ce titre. Archivez d'abord ces projets.`,
      projectLaunched:
        "Ce projet est lancé : son travail vit dans ses étapes. Seul un projet pas encore lancé peut être archivé.",
    },
    understood: "Compris",
  },
  restore: {
    title: (name: string) => `Restaurer « ${name} » ?`,
    body: {
      artist:
        "L'artiste revient dans le catalogue et les sélecteurs, tel qu'il a été archivé.",
      master:
        "Le titre revient dans le catalogue et les sélecteurs, tel qu'il a été archivé.",
      project:
        "Le projet revient dans les listes, avec sa transmission en attente s'il en avait une.",
      contact: "Le contact revient dans le réseau, tel qu'il a été archivé.",
    } satisfies Record<Kind, string>,
    confirm: "Restaurer",
    pending: "Restauration…",
    done: "Restauré.",
  },
  delete: {
    title: (name: string) => `Supprimer « ${name} » ?`,
    titleMany: (kind: Kind, n: number) => `Supprimer ${count(kind, n)} ?`,
    body: {
      artist:
        "L'artiste est supprimé avec ses contacts, ses fichiers et son journal. C'est définitif : pour le mettre de côté sans rien perdre, archivez-le plutôt.",
      master:
        "Le titre est supprimé avec ses crédits, ses splits, ses déclarations, ses fichiers et son journal. C'est définitif : pour le mettre de côté sans rien perdre, archivez-le plutôt.",
      project:
        "Le projet est supprimé avec tout ce qu'il contient : étapes, calls, tâches, stratégie, budget, fichiers, juridique, master et contrats du projet. Ses titres et son artiste restent au catalogue. C'est définitif : pour le mettre de côté, archivez-le plutôt.",
      contact:
        "Le contact est supprimé du Réseau. Les crédits et les parts qui le nommaient gardent son nom, sans lien. C'est définitif : pour le mettre de côté, archivez-le plutôt.",
    } satisfies Record<Kind, string>,
    bodyMany: {
      artist:
        "Chaque artiste est supprimé avec ses contacts, ses fichiers et son journal. Ceux encore crédités sur un titre, ou liés à un projet ou un contrat, sont gardés et signalés. C'est définitif.",
      master:
        "Chaque titre est supprimé avec ses crédits, ses splits, ses déclarations, ses fichiers et son journal. Ceux qu'un projet utilise encore sont gardés et signalés. C'est définitif.",
      project:
        "Chaque projet est supprimé avec tout ce qu'il contient : étapes, calls, tâches, stratégie, budget, fichiers, juridique, master et contrats du projet. Leurs titres et artistes restent au catalogue. C'est définitif.",
      contact:
        "Chaque contact est supprimé du Réseau ; les crédits et les parts qui le nommaient gardent son nom, sans lien. Ceux encore nommés dans un contrat ou un dossier sont gardés et signalés. C'est définitif.",
    } satisfies Record<Kind, string>,
    // Only drafts of the new project form ticked in the projects list.
    drafts: {
      titleMany: (n: number) => `Supprimer ${n}\u00a0brouillons ?`,
      body: "La saisie de ce brouillon est perdue. C'est définitif.",
      bodyMany: "La saisie de ces brouillons est perdue. C'est définitif.",
    },
    confirm: "Supprimer définitivement",
    pending: "Suppression…",
    done: (kind: Kind, n: number) =>
      n === 1 ? "Supprimé." : `${count(kind, n)} supprimés.`,
    draftsDone: (n: number) =>
      n === 1 ? "Brouillon supprimé." : `${n}\u00a0brouillons supprimés.`,
    // Some rows of a selection stayed: one line each, with its reason.
    partial: (kind: Kind, n: number) =>
      n === 1
        ? "1 élément n'a pas pu être supprimé."
        : `${count(kind, n)} n'ont pas pu être supprimés.`,
    reason: (name: string, reason: string) => `« ${name} » : ${reason}`,
    // Known before asking: the dialog explains instead of confirming.
    blockedTitle: (name: string) => `« ${name} » ne peut pas être supprimé`,
    blocked: {
      artistHasMasters: (n: number) =>
        n === 1
          ? "Un titre crédite cet artiste. Supprimez d'abord ce titre, ou retirez-en l'artiste."
          : `${n} titres créditent cet artiste. Supprimez d'abord ces titres, ou retirez-en l'artiste.`,
      masterHasProjects: (n: number) =>
        n === 1
          ? "Un projet utilise ce titre. Supprimez d'abord ce projet."
          : `${n} projets utilisent ce titre. Supprimez d'abord ces projets.`,
    },
    errors: {
      forbidden: "Seul le directeur général peut supprimer.",
      not_found: "Cet élément n'existe plus ou ne vous est pas visible.",
      artist_in_use:
        "encore crédité sur un titre, ou lié à un projet ou un contrat.",
      master_in_use: "encore utilisé par un projet.",
      contact_in_use:
        "encore partie à un contrat, ou nommé dans le Brief, le juridique ou un envoi d'un projet.",
      generic: "La suppression n'a pas abouti. Réessayez.",
    },
  },
  cancel: "Annuler",
  errors: {
    forbidden: "Seul le directeur général peut archiver ou restaurer.",
    not_found: "Cet élément n'existe plus ou ne vous est pas visible.",
    artist_in_use:
      "Cet artiste est encore crédité sur un titre ou lié à un projet actif. Archivez-les d'abord.",
    master_in_use:
      "Ce titre est encore utilisé par un projet actif. Archivez d'abord ce projet.",
    project_launched:
      "Ce projet est lancé : seul un projet pas encore lancé peut être archivé.",
    artist_name_taken:
      "Un artiste actif porte déjà ce nom ou ce profil Deezer : renommez l'un des deux avant de restaurer.",
    master_uses_archived:
      "Un artiste crédité sur ce titre est archivé : restaurez-le d'abord.",
    project_uses_archived:
      "Ce projet utilise un titre ou un artiste archivé : restaurez-le d'abord.",
    contact_in_use:
      "Ce contact est partie à un contrat en cours. Il pourra être archivé une fois le contrat résilié.",
    generic: "L'opération n'a pas abouti. Réessayez.",
  },
} as const;
