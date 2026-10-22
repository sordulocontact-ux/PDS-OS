// Texts of the common module frame (components/shell/module): the header of
// every module of a launched project (proto « Projet complet », C2), its
// facts and the result banner after a gesture (C5).

export const moduleFrame = {
  crumbs: "Fil d'Ariane",
  subModules: "Sous-modules",
  mine: (n: number) => `${n} à vous`,
  done: "fait",
  facts: {
    label: "Le projet en bref",
    budget: "Budget",
    owner: "Responsable",
    release: "Sortie",
  },
  result: {
    label: "Résultat",
    // The viewer's own next action, and the step opened for them.
    mine: "À vous :",
    opened: "Étape ouverte pour vous :",
    waiting: "En attente de",
    unlocked: "Débloqué :",
    viaLink: "lien privé",
    close: "Fermer",
  },
} as const;
