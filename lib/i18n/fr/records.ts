// Row actions of the lists (artists, titles, projects, network contacts):
// "⋯" menu, edit panel, archiving (docs/ARCHITECTURE.md § 2 quater).

type Kind = "artist" | "master" | "project" | "contact";

export const records = {
  menu: {
    column: "Actions",
    label: (name: string) => `Actions pour « ${name} »`,
    edit: "Modifier",
    archive: "Archiver",
    restore: "Restaurer",
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
