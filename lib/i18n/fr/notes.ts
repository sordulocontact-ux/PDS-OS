/** Notes page: the calls' content and the notes written by hand (27/11/2026). */

export const notes = {
  title: "Notes",
  tabs: {
    label: "Filtrer les notes",
    all: "Toutes",
    calls: "Calls",
    written: "Écrites",
    todo: "À compléter",
    upcoming: "À venir",
  },
  columns: {
    note: "Note",
    date: "Date",
    link: "Rattaché à",
    content: "Contenu",
    by: "Par",
    actions: "Actions",
  },
  // A past call still without report: the link to its page.
  complete: "Compléter",
  more: (title: string) => `Actions pour « ${title} »`,
  search: {
    label: "Rechercher dans les notes",
    placeholder: "Rechercher dans les notes…",
  },
  filters: {
    link: "Rattaché à",
    person: "Personne",
    allLinks: "Tous",
    everyone: "Tout le monde",
  },
  // Where a row belongs when it has no project.
  internalCall: "Interne",
  teamNote: "Note de l'équipe",
  kinds: {
    call: "Call",
    written: "Note",
  },
  noContent: "Pas encore de compte rendu",
  empty: {
    all: "Aucune note",
    calls: "Aucun call passé",
    written: "Aucune note écrite",
    todo: "Rien à compléter",
    upcoming: "Aucun call à venir",
    search: "Aucune note ne correspond",
  },
  loadError: "Impossible de charger les notes. Réessayez.",
  newNote: "Nouvelle note",
  // A title left empty is saved so.
  untitled: "Sans titre",
  // What a written note is linked to (20261127210101): one record at most.
  link: {
    add: "Rattacher à un projet, un deal ou un contrat",
    menu: "Rattacher à",
    back: "Retour",
    groups: { project: "Projets", deal: "Deals", contract: "Contrats" },
    kinds: { project: "Projet", deal: "Deal", contract: "Contrat" },
    search: {
      project: "Rechercher un projet…",
      deal: "Rechercher un deal…",
      contract: "Rechercher un contrat…",
    },
    none: "Aucun résultat",
    loading: "Chargement…",
    deal: (name: string | null) => (name ? `Deal · ${name}` : "Deal"),
    open: (label: string) => `Ouvrir « ${label} »`,
    remove: (label: string) => `Détacher de « ${label} »`,
  },
  // A note is a document saved as one types (Sacha 27/11/2026, after
  // Accordee): no button, its state in the panel's bar.
  document: {
    title: "Titre",
    body: "Texte",
    bodyPlaceholder: "Commencez à écrire…",
    edited: "Modifiée le",
    saving: "Enregistrement…",
    saved: "Enregistré",
    failed: "Non enregistré",
  },
  sheet: {
    loading: "Chargement de la note",
    loadFailed: "Cette note n'a pas pu être chargée.",
    delete: "Supprimer",
  },
  remove: {
    title: "Supprimer cette note ?",
    body: "Elle disparaît pour tout le monde.",
    confirm: "Supprimer",
    cancel: "Annuler",
    done: "Note supprimée",
  },
  errors: {
    titleTooLong: "Le titre fait plus de 200 caractères.",
    bodyTooLong: "Le texte fait plus de 20 000 caractères.",
    forbidden:
      "Seul son auteur peut modifier cette note, liée à ce qu'il voit.",
    notFound: "Cette note n'existe plus.",
    generic: "La note n'a pas pu être enregistrée. Réessayez.",
  },
} as const;
