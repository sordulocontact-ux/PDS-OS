// Statuts communs des workflows d'un projet (ticket « Architecture globale »,
// 08/10/2026, § 8) : un vocabulaire pour l'agrégation, chaque workflow garde
// ses états détaillés. Les phrases sont écrites par le code
// (lib/workflow-status/rules.ts), jamais par PO.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const workflowStatus = {
  statuses: {
    not_started: "Non démarré",
    in_progress: "En cours",
    waiting: "En attente",
    blocked: "Bloqué",
    done: "Terminé",
  },
  restricted: "Accès restreint",
  restrictedBody: "Réservé à la direction et aux chefs de projet.",
  // La Vue d'ensemble (lot 4) : ce que le code tire des statuts et des
  // sources, jamais une copie.
  board: {
    title: "Vue d'ensemble",
    description:
      "Où en est chaque workflow, ce qui attend et ce qui bloque, lus dans les workflows eux-mêmes.",
    workflowsLabel: "Workflows du projet",
    // A card: the steps really done out of the workflow's steps.
    stepsDone: (done: number, total: number) => `${done} / ${total} étapes`,
    stepsDoneLabel: (done: number, total: number) =>
      `${done} étape${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${total}`,
    open: (name: string) => `Ouvrir ${name}`,
    launch: "Lancer",
    notApplicable: (names: string) =>
      `${names} ne s'applique${names.includes(" et ") ? "nt" : ""} pas à ce projet.`,
    framing: "Cadrage",
    framingValidated: (date: string) => `Validé le ${date}`,
    framingOpen: "Ouvrir le Cadrage",
    actions: {
      title: "À faire ensuite",
      description: "Par échéance, les retards d'abord",
      empty: "Rien à faire pour l'instant.",
      overdue: "En retard",
      views: "Filtrer par workflow",
      all: "Tout",
      columns: {
        what: "Action",
        workflow: "Workflow",
        who: "Responsable",
        due: "Échéance",
      },
    },
    blockers: {
      title: "Blocages",
      empty: "Aucun blocage.",
      cause: "Cause",
      impact: "Impact",
      source: "Source",
      actions: "Actions possibles",
      openSource: (workflow: string) => `Ouvrir dans ${workflow}`,
      waitingFor: (toWhat: string, what: string) =>
        `${toWhat} : attend ${what.toLowerCase()}`,
      dependencyImpact: (workflow: string, toWhat: string) =>
        `${workflow} ne peut pas faire « ${toWhat.toLowerCase()} » tant que cet élément manque ; le reste de ses étapes avance.`,
      clearanceImpact:
        "Un titre avec un emprunt non sécurisé ne part pas au distributeur : la sortie attend.",
    },
    deadlines: {
      title: "Prochaine échéance",
      later: "Ensuite",
      planning: "Voir le planning",
      empty: "Aucune échéance datée.",
      project: "Échéance principale du projet",
      release: "Sortie prévue",
      dates: {
        mixV1Due: "Mix V1",
        mixFinalDue: "Mix final",
        masteringDue: "Mastering",
        masterFinalDue: "Master final",
      } as Record<string, string>,
      overdue: "En retard",
    },
  },
  notLaunched: "Se lance depuis le Plan du projet",
  // Ce qu'un workflow attend d'un autre (lot 5), calculé par le code depuis
  // les sources : jamais une table saisie à la main.
  dependencies: {
    title: "Dépendances entre workflows",
    description: "Ce qu'un workflow attend d'un autre, et où ça en est",
    empty: "Aucune dépendance entre les workflows de ce projet.",
    columns: {
      what: "Attendu",
      flow: "De → pour",
      state: "État",
      due: "Échéance",
      who: "Responsable",
    },
    forStep: (step: string) => `pour : ${step}`,
    states: {
      ready: "Disponible",
      in_progress: "En cours",
      waiting: "En attente",
      blocked: "Bloqué",
    },
    // The Juridique closed to the viewer: that it provides, never what.
    restricted: {
      what: "Ce que le Juridique fournit aux autres workflows",
      flow: "Juridique → autres workflows",
      note: "Réservé à la direction et aux chefs de projet : emprunts, accords et contrats ne sont pas affichés.",
      state: "Accès restreint",
    },
    master: {
      what: "Master final de chaque titre",
      toWhat: "Mise en ligne",
      ready: "Chaque titre a son master final",
    },
    clearances: {
      what: "Emprunts sécurisés",
      toWhat: "Mise en ligne",
      ready: (n: number) =>
        `${n} emprunt${n > 1 ? "s" : ""} sécurisé${n > 1 ? "s" : ""} sur ${n}`,
      open: (n: number, names: string) =>
        `${plural(n, "emprunt à sécuriser", "emprunts à sécuriser")} : ${names}`,
    },
    engineers: {
      what: "Ingénieurs du mix et du mastering",
      toWhat: "Contrats de prestation",
      missing: "À choisir dans le Brief Mix/Master",
    },
    blockedBy: (list: string) => `La mise en ligne attend : ${list}`,
  },
  master: {
    noTitle: "Aucun titre rattaché au projet",
    sources: (n: number) =>
      `Source du mix à confirmer pour ${plural(n, "titre", "titres")}`,
    brief: "Brief Mix/Master et ingénieur à compléter",
    send: "Dossier à envoyer au mixeur",
    sendMastering: "Dossier de mastering à envoyer",
    acknowledge: (who: string | null) =>
      `Accusé de réception attendu${who ? ` de ${who}` : " de l'ingénieur"}`,
    firstVersion: (who: string | null) =>
      `Première version attendue${who ? ` de ${who}` : " de l'ingénieur"}`,
    newVersion: (who: string | null) =>
      `Nouvelle version demandée${who ? ` à ${who}` : ""}`,
    decide: (version: string, who: string | null) =>
      `${version} à valider${who ? ` par ${who}` : ""}`,
    deliverables: (n: number) =>
      `${plural(n, "livrable", "livrables")} du Brief à recevoir`,
    done: "Chaque titre a son master final et ses livrables",
    alreadyFinal: "Chaque titre avait déjà son master final : rien à mixer",
    progressAlreadyFinal: (n: number) =>
      `${plural(n, "titre", "titres")} déjà au master final`,
    progressPrepare: (done: number) => `Préparation : ${done} sur 3`,
    progressRound: (round: string, done: number, total: number) =>
      `${round} validé pour ${done} titre${done > 1 ? "s" : ""} sur ${total}`,
    mix: "Mix",
    mastering: "Master",
    progressFinal: (done: number, total: number) =>
      `${done} livrable${done > 1 ? "s" : ""} reçu${done > 1 ? "s" : ""} sur ${total}`,
  },
  legal: {
    questions: (n: number) =>
      `${plural(n, "question de PO", "questions de PO")} à répondre`,
    confirm: "Dossier à confirmer",
    launch: "Plan d'action à lancer",
    decisions: (n: number) =>
      plural(n, "décision requise", "décisions requises"),
    now: (n: number) => plural(n, "action à traiter", "actions à traiter"),
    waiting: (n: number) => plural(n, "retour attendu", "retours attendus"),
    done: "Toutes les actions du plan sont faites",
    progressDossier: (known: number) =>
      `${plural(known, "question répondue", "questions répondues")}`,
    progressPlan: (done: number, total: number) =>
      `${done} action${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${total}`,
  },
  marketing: {
    inProgress: (step: string) => `${step} en cours`,
    toStart: (step: string) => `${step} à démarrer`,
    awaiting: (step: string) => `${step} à valider par la direction`,
    done: "Toutes les étapes du Marketing sont validées",
    progress: (done: number, total: number) =>
      `${done} étape${done > 1 ? "s" : ""} validée${done > 1 ? "s" : ""} sur ${total}`,
  },
  distribution: {
    record: "Sortie à enregistrer : titre, ISRC, date",
    isrc: "ISRC à renseigner",
    date: "Date de sortie à renseigner",
    online: (date: string | null) =>
      date
        ? `Pas encore détectée en ligne (sortie prévue le ${date})`
        : "Pas encore détectée en ligne",
    done: (date: string) => `En ligne depuis le ${date}`,
    progress: (done: number) => `Identifiants et date : ${done} sur 2`,
  },
};
