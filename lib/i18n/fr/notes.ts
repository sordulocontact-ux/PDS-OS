/** Notes page: the calls' content and the notes written by hand (27/11/2026). */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

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
    project: "Projet",
    content: "Contenu",
    by: "Par",
    actions: "Actions",
  },
  // A past call still without report: the link to its page.
  complete: "Compléter",
  more: (title: string) => `Actions pour « ${title} »`,
  others: (n: number) => `+${n}`,
  search: {
    label: "Rechercher dans les notes",
    placeholder: "Rechercher dans les notes…",
  },
  filters: {
    project: "Projet",
    person: "Personne",
    allProjects: "Tous les projets",
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
  form: {
    createTitle: "Nouvelle note",
    editTitle: "Modifier la note",
    title: "Titre",
    titlePlaceholder: "Idées de décor",
    project: "Projet",
    noProject: "Aucun (note de l'équipe)",
    body: "Texte",
    submit: "Créer la note",
    save: "Enregistrer",
    saving: "Enregistrement…",
    loading: "Chargement de la note…",
    loadFailed: "Cette note n'a pas pu être chargée.",
    close: "Fermer",
    cancel: "Annuler",
    created: "Note créée",
    saved: "Note enregistrée",
  },
  sheet: {
    expand: "Ouvrir la note",
    loading: "Chargement de la note",
    loadFailed: "Cette note n'a pas pu être chargée.",
    author: "Par",
    edit: "Modifier",
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
    titleRequired: "Donnez un titre à la note.",
    titleTooLong: "200 caractères au plus.",
    bodyRequired: "Écrivez le texte de la note.",
    bodyTooLong: "20 000 caractères au plus.",
    missing: (n: number) => `${plural(n, "champ", "champs")} à corriger.`,
    forbidden:
      "Seul son auteur peut modifier cette note, sur un projet qu'il voit.",
    notFound: "Cette note n'existe plus.",
    generic: "La note n'a pas pu être enregistrée. Réessayez.",
  },
} as const;
