// Texts of the generic journey (components/shell/journey), shared by the
// modules that guide step by step (proto « Projet complet »).

const joined = (titles: string) => titles.includes(" et ");
// « de » elides before a vowel: « En attente d'Éditions Nocturne ».
const de = (name: string) =>
  /^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`;

export const journey = {
  label: "Parcours",
  title: "Parcours",
  // « Parcours · Stratégie » (Marketing, Cadrage).
  titleOf: (module: string) => `Parcours · ${module}`,
  after: (titles: string) => `Après : ${titles}`,
  me: "À vous",
  // « À vous : choisir comment démarrer » (Figma PDS OS 304:20801).
  joinTodo: (who: string, todo: string) => `${who} : ${todo}`,
  waitingFor: (who: string) => `En attente ${de(who)}`,
  rework: "À revoir",
  alert: {
    overdue: "Échéance dépassée",
    decision: "Décision requise",
    // The step's own summary says what blocks (« 3 éléments bloquent… »).
    blocking: "",
  },
  reported: "Blocage signalé",
  resolveBlocker: "Résoudre le blocage",
  // « Ensuite » names who takes over (« Mixage · Karim »).
  nextBy: (step: string, who: string) => `${step} · ${who}`,
  viaLink: "sur son lien privé",
  privateLink: "lien privé",
  meta: {
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
    elsewhere: "À vous, dans un autre module",
    nothing: "Rien à faire pour vous",
    blocker: "Blocage à lever",
    waitingTitle: "Le parcours avance sans vous pour l'instant",
    finished: "Le parcours est terminé",
    // Vue d'ensemble.
    allDone: "Tout ce qui vous concerne est fait",
    othersMove: "Les autres avancent ; la Vue d'ensemble dit qui est attendu.",
    open: "Aller à l'étape",
    openShort: "Ouvrir",
    others: (n: number, list: string) =>
      `Et ${n} autre${n > 1 ? "s" : ""} : ${list}`,
    waitFor: (who: string) => `En attente ${de(who)}`,
    waitingOf: "En attente de",
    // « En attente d' » before a vowel, then the name in bold.
    waitingOfName: (who: string) =>
      de(who).startsWith("d'") ? "En attente d'" : "En attente de ",
    // « En attente de X : valider le Brief » (StepWaiting).
    waitingOn: (todo: string) => ` : ${todo}`,
    due: (day: string) => `pour le ${day}`,
    blockers: (n: number, list: string) =>
      `${n} blocage${n > 1 ? "s" : ""} à lever par vous : ${list}`,
    see: "Voir",
  },
} as const;
