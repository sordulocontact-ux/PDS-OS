// Texts of the generic journey (components/shell/journey), shared by the
// modules that guide step by step (proto « Projet complet »).

const joined = (titles: string) => titles.includes(" et ");

export const journey = {
  label: "Parcours",
  title: "Parcours",
  // « Parcours · Stratégie » (Marketing, Cadrage).
  titleOf: (module: string) => `Parcours · ${module}`,
  status: {
    done: "Fait",
    current: "En cours",
    waiting: "En attente d'un retour",
    rework: "À revoir",
    blocked: "Plus tard",
    upcoming: "Plus tard",
    obsolete: "Obsolète",
  },
  after: (titles: string) => `Après : ${titles}`,
  me: "À vous",
  waitingFor: (who: string) => `En attente de ${who}`,
  rework: "À revoir",
  alert: {
    overdue: "Échéance dépassée",
    decision: "Décision requise",
    // The step's own summary says what blocks (« 3 éléments bloquent… »).
    blocking: "",
  },
  reported: "Blocage signalé",
  viaLink: "sur son lien privé",
  privateLink: "lien privé",
  meta: {
    owner: "Responsable",
    validation: "Validation",
    exec: "Exécute",
    coord: "Coordonne",
    valid: "Valide",
    prereq: "Prérequis",
    next: "Ensuite",
    none: "Aucune",
    noValidation: "Aucune validation",
    toAppoint: "À désigner",
    noPrereq: "Aucun",
    more: (n: number) => `et ${n} autre${n > 1 ? "s" : ""}`,
    due: (day: string) => `avant le ${day}`,
  },
  // A locked step: what it waits for, joined by « et ».
  blocked: (titles: string) =>
    joined(titles)
      ? `Se débloque quand ${titles} sont faits.`
      : `Se débloque quand ${titles} est fait.`,
  history: "Déjà fait",
  historyAfter: (cause: string) => `suite à : ${cause}`,
  now: {
    label: "Maintenant",
    mine: "À vous",
    alsoMine: "Aussi à vous",
    elsewhere: "À vous, ailleurs",
    nothing: "Rien à faire pour vous",
    blocker: "Blocage à lever",
    waitingTitle: "Le parcours avance sans vous pour l'instant",
    finished: "Le parcours est terminé",
    // Vue d'ensemble.
    allDone: "Tout ce qui vous concerne est fait",
    othersMove: "Les autres avancent ; la Vue d'ensemble dit qui est attendu.",
    open: "Ouvrir l'étape",
    openShort: "Ouvrir",
    others: (n: number, list: string) =>
      `Et ${n} autre${n > 1 ? "s" : ""} : ${list}`,
    waitFor: (who: string) => `En attente de ${who}`,
    waitingOf: "En attente de",
    due: (day: string) => `pour le ${day}`,
    blockers: (n: number, list: string) =>
      `${n} blocage${n > 1 ? "s" : ""} à lever par vous : ${list}`,
    see: "Voir",
  },
} as const;
