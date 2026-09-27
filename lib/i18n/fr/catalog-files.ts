// Files tab of the artist and title pages.
export const catalogFiles = {
  title: "Fichiers",
  emptyTitle: "Aucun fichier pour l'instant",
  emptyBody:
    "Glissez un fichier ici, ou cliquez pour le choisir : dossier de presse, photos, contrats, audio. Vous direz ensuite où le classer.",
  emptyBodyReadOnly: "Les documents de l'artiste apparaîtront ici.",
  // A view of the library that has no file yet.
  emptyViewTitle: (view: string) => `Rien dans « ${view} » pour l'instant`,
  emptyViewBody:
    "Glissez un fichier ici, ou cliquez pour le choisir : il sera classé ici.",
  emptyViewBodyReadOnly: "Les fichiers de cette catégorie apparaîtront ici.",
  viewsLabel: "Catégories de fichiers",
  // Tabs of the library: every file, then one tab per category.
  views: {
    artist: {
      all: "Tous",
      press: "Presse",
      photo: "Photos",
      contract: "Contrats",
      audio: "Audio",
      other: "Autres",
    },
    master: {
      all: "Tous",
      stems: "Stems",
      artwork: "Pochettes",
      contract: "Contrats",
      other: "Autres",
    },
  },
  loadError: "Les fichiers n'ont pas pu être chargés. Rechargez la page.",
  columns: {
    name: "Nom",
    category: "Catégorie",
    addedBy: "Ajouté par",
    addedAt: "Ajouté le",
    actions: "Actions",
  },
  categories: {
    artist: {
      press: "Presse",
      photo: "Photo",
      contract: "Contrat",
      audio: "Audio",
      other: "Autre",
    },
    master: {
      audio: "Audio",
      stems: "Stems",
      artwork: "Pochette",
      contract: "Contrat",
      other: "Autre",
    },
  },
  upload: {
    add: "Ajouter un fichier",
    // Shown over the list while a file is dragged above it.
    dropHere: "Déposez pour ajouter à la bibliothèque",
  },
  // After a drop or a pick: where to classify the file(s).
  add: {
    title: (count: number) =>
      count === 1 ? "Ajouter un fichier" : `Ajouter ${count} fichiers`,
    description:
      "Dites où le classer : il apparaîtra dans Tous et dans sa catégorie.",
    descriptionMany:
      "Ils seront classés ensemble : ils apparaîtront dans Tous et dans leur catégorie.",
    submit: "Ajouter",
    uploading: "Envoi…",
    uploadingMany: (done: number, count: number) => `Envoi ${done}/${count}…`,
    partial: (count: number) =>
      count === 1
        ? "Un fichier n'a pas pu être envoyé. Réessayez."
        : `${count} fichiers n'ont pas pu être envoyés. Réessayez.`,
  },
  fields: {
    category: "Catégorie",
    categoryRequired: "Choisissez une catégorie.",
    description: "Précision",
    descriptionHint: "Facultatif. Ce qu'est ce fichier, en quelques mots.",
    // Example shown in the empty field, by category.
    placeholders: {
      press: "Ex. Dossier de presse 2026",
      photo: "Ex. Portrait presse — septembre 2026",
      contract: "Ex. Contrat artiste 2026",
      audio: "Ex. Maquette voix",
      stems: "Ex. Stems V2",
      artwork: "Ex. Pochette finale",
      other: "Ex. Fiche technique",
    } as Record<string, string>,
    name: "Nom du fichier",
    contractNote:
      "Les contrats ne sont visibles que par la direction et les chefs de projet.",
  },
  hint: "50 Mo au plus par fichier.",
  edit: {
    title: "Modifier le fichier",
    description:
      "Changer la catégorie déplace le fichier : il n'existe toujours qu'une fois.",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
  },
  menu: {
    label: (name: string) => `Actions pour « ${name} »`,
    open: "Ouvrir",
    download: "Télécharger",
    edit: "Modifier",
    remove: "Supprimer",
  },
  open: (name: string) => `Ouvrir ${name} dans un nouvel onglet`,
  remove: (name: string) => `Retirer ${name}`,
  confirmTitle: "Supprimer ce fichier ?",
  confirmBody: (name: string) =>
    `« ${name} » sera supprimé définitivement pour toute l'équipe.`,
  confirm: "Supprimer",
  deleting: "Suppression…",
  cancel: "Annuler",
  close: "Fermer",
  empty: "Ce fichier est vide.",
  tooLarge: "Fichier trop lourd : 50 Mo au plus.",
  failed: "Le fichier n'a pas pu être envoyé. Réessayez.",
  deleteFailed: "Le fichier n'a pas pu être supprimé. Réessayez.",
  updateFailed: "Le fichier n'a pas pu être modifié. Réessayez.",
  invalid: "Vérifiez le nom, la catégorie et la précision.",
} as const;
