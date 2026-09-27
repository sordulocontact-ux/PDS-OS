// Files tab of the artist and title pages.
export const catalogFiles = {
  title: "Fichiers",
  emptyTitle: "Aucun fichier pour l'instant",
  emptyBody:
    "Dossier de presse, photos, contrats, audio : ajoutez ici les documents de l'artiste.",
  emptyBodyReadOnly: "Les documents de l'artiste apparaîtront ici.",
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
    categoryLabel: "Catégorie du fichier",
    add: "Ajouter un fichier",
    uploading: "Envoi…",
    hint: "50 Mo au plus. Les contrats ne sont visibles que par la direction et les chefs de projet.",
  },
  download: (name: string) => `Télécharger ${name}`,
  remove: (name: string) => `Supprimer ${name}`,
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
} as const;
