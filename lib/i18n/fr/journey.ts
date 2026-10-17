// Texts of the generic journey (components/shell/journey), shared by the
// modules that guide step by step.

export const journey = {
  label: "Parcours",
  title: "Parcours",
  status: {
    done: "Fait",
    current: "En cours",
    blocked: "Plus tard",
    upcoming: "À venir",
  },
  after: (titles: string) => `Après : ${titles}`,
  me: "À vous",
  viaLink: "sur son lien privé",
  meta: {
    owner: "Responsable",
    validation: "Validation",
    prereq: "Prérequis",
    next: "Ensuite",
    none: "Aucune",
    noPrereq: "Aucun",
  },
  blocked: (titles: string) =>
    `Normalement après ${titles}. Vous pouvez déjà préparer cette étape.`,
  now: {
    label: "Maintenant",
    mine: "À vous",
    alsoMine: "Aussi à vous",
    nothing: "Rien à faire pour vous",
    waitingTitle: "Le parcours avance sans vous pour l'instant",
    finished: "Le parcours est terminé",
    open: "Ouvrir l'étape",
    others: (n: number, list: string) =>
      `Et ${n} autre${n > 1 ? "s" : ""} : ${list}`,
    waitFor: (who: string) => `En attente de ${who}`,
    see: "Voir",
  },
} as const;
