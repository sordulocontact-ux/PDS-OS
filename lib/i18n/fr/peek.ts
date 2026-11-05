/** A record's preview in a modal (RecordPeek): what a row of a step shows
 * of an artist, a person of the Réseau or a contract, without leaving the
 * page (Sacha, 05/11/2026: « ne presque jamais quitter la page »). */
export const peek = {
  kinds: {
    artist: "Artiste du catalogue",
    contact: "Réseau",
    contract: "Contrat",
  },
  open: {
    artist: "Voir la fiche",
    contact: "Voir la fiche",
    contract: "Ouvrir le contrat",
  },
  // Read by a screen reader before the row (the row opens the preview).
  see: "Voir",
  loading: "Lecture de la fiche…",
  failed: "La fiche n'a pas pu être lue. Réessayez.",
  gone: "Cette fiche n'existe plus ou vous n'y avez pas accès.",
  close: "Fermer",
  facts: {
    relation: "Relation avec PDS",
    legalName: "Nom légal",
    country: "Pays",
    titles: "Titres au catalogue",
    projects: "Projets",
    kind: "Type",
    roles: "Rôles",
    organization: "Structure",
    email: "E-mail",
    phone: "Téléphone",
    city: "Ville",
    type: "Type",
    state: "État",
    parties: "Parties",
    owner: "Responsable",
    due: "Échéance",
    project: "Projet",
  },
  count: (n: number) => String(n),
};
