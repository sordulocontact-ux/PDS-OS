/** Pages shown when a page is missing or a read failed (in place of Next's
 * English defaults). */
export const errors = {
  notFound: {
    title: "Page introuvable",
    body: "Cette page n'existe pas, ou vous n'y avez plus accès.",
    home: "Retour à l'accueil",
    projects: "Voir les projets",
  },
  failed: {
    title: "Lecture impossible pour l'instant",
    body: "La page n'a pas pu être chargée. Rien n'a été perdu : réessayez dans un instant.",
    retry: "Réessayer",
  },
} as const;
