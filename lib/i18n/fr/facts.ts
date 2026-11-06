// Shared by the first step of every specialised workflow (Juridique's État
// des lieux, Master's État du master): their lists and the Réseau.
export const facts = {
  columns: {
    actions: "Actions",
  },
  failed: "Impossible de lire ces informations pour l'instant.",
  noMasters: "Aucun titre n'est rattaché à ce projet.",
  states: {
    inNetwork: "Dans le Réseau",
    notInNetwork: "Pas dans le Réseau",
    sameName: "Même nom dans le Réseau",
  },
  addToNetwork: "Ajouter au Réseau",
  link: "Relier",
  linkTitle: (name: string, count: number) =>
    count > 1
      ? `Relier les ${count} crédits « ${name} » du projet à ce contact du Réseau`
      : `Relier ce crédit à « ${name} » du Réseau`,
  // Said before saving: the server links every unlinked credit of that name,
  // on every title (lib/network/link-credits.ts), not only this project's.
  linkMany: (count: number, name: string) =>
    count > 1
      ? `Les crédits « ${name} » reliés à personne y seront reliés, dont ${count} dans ce projet.`
      : `Les crédits « ${name} » reliés à personne y seront reliés, dont celui-ci.`,
  linkFailed: "Le crédit n'a pas pu être relié. Réessayez.",
} as const;
