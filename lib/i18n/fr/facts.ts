// Shared by the first step of every specialised workflow (Juridique's État
// des lieux, Master's État du master): the fact tables and the Réseau.
export const facts = {
  columns: {
    title: "Titre",
    fact: "Élément",
    source: "Source",
    state: "État",
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
  linkMany: (count: number, name: string) =>
    `Il sera relié aux ${count} crédits « ${name} » du projet.`,
  linkFailed: "Le crédit n'a pas pu être relié. Réessayez.",
} as const;
