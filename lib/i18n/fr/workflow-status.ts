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
    stepOf: (index: number, total: number) => `étape ${index} sur ${total}`,
    dossierStep: "étape du dossier",
    launch: "Lancer",
    notApplicable: (names: string) =>
      `${names} ne s'applique${names.includes(" et ") ? "nt" : ""} pas à ce projet.`,
    framing: "Cadrage",
    framingValidated: (date: string) => `Validé le ${date}`,
    framingOpen: "Ouvrir le Cadrage",
    seeBrief: "Voir le Brief",
    actions: {
      title: "À faire ensuite",
      description: "Par échéance, les retards d'abord",
      empty: "Rien à faire pour l'instant.",
      overdue: "En retard",
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
        "Un titre avec une œuvre existante non autorisée ne part pas au distributeur : la sortie attend.",
      rightsCause:
        "Contrainte de droits confirmée au cadrage : à sécuriser dans le Juridique.",
    },
    deadlines: {
      title: "Échéances",
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
  // The dot of a workflow not started yet, in the project's navigation.
  notStartedHint:
    "Non démarré · démarre au lancement du plan du projet, après le Cadrage",
  // The plan is launched without it (WorkflowLocked `absent`).
  notInPlanHint:
    "Non démarré · pas dans le plan du projet : à ajouter depuis le Plan du projet",
  // In the launched plan, not launched yet (WorkflowLocked `waiting`).
  waitingInPlanHint:
    "Non démarré · dans le plan du projet : démarre quand le chef de projet le lance",
  notLaunched: "Démarre au lancement du plan du projet, après le Cadrage",
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
    master: {
      what: "Master final de chaque titre",
      toWhat: "Dépôt chez le distributeur",
      ready: "Chaque titre a son master final",
    },
    clearances: {
      what: "Autorisations d'utilisation obtenues",
      toWhat: "Dépôt chez le distributeur",
      ready: (n: number) =>
        `${n} autorisation${n > 1 ? "s" : ""} obtenue${n > 1 ? "s" : ""} sur ${n}`,
      open: (n: number, names: string) =>
        `${plural(n, "autorisation à obtenir", "autorisations à obtenir")} : ${names}`,
    },
    cover: {
      what: "Pochette livrée",
      toWhat: "Dossier de livraison",
      ready: (title: string) => `${title} · livrée par la Production`,
      waiting: (title: string) =>
        `${title} · pas encore livrée par la Production`,
      none: "Aucune Fiche Livrable de pochette en Conception",
    },
    engineers: {
      what: "Ingénieurs du mix et du mastering",
      toWhat: "Contrats de prestation",
      missing: "À choisir dans le Brief Mix/Master",
    },
    blockedBy: (list: string) =>
      `La livraison au distributeur attend : ${list}`,
  },
  master: {
    noTitle: "Aucun titre rattaché au projet",
    sources: (n: number) =>
      `Source du mix à confirmer pour ${plural(n, "titre", "titres")}`,
    // A collective's live titles still without any audio (lot 9).
    withoutAudio: (n: number) =>
      `${plural(n, "titre", "titres")} encore sans audio`,
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
    progressPrepare: (done: number) => `Avant le mix : ${done} sur 3`,
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
    // Every stage validated: Suivi & bilan remains, until the Marketing's own
    // closing (ticket « Suivi & bilan »).
    review: (status: string) => `Suivi & bilan : ${status.toLowerCase()}`,
    progress: (done: number, total: number) =>
      `${done} étape${done > 1 ? "s" : ""} validée${done > 1 ? "s" : ""} sur ${total}`,
  },
  distribution: {
    notLaunched: "Démarre au lancement du Plan du projet",
    params: "Paramètres de distribution à confirmer",
    record: "Sortie à enregistrer : titre, ISRC, date",
    isrc: "ISRC à renseigner",
    date: "Date de sortie à renseigner",
    submit: "Dossier de livraison à soumettre à validation",
    pending: (n: number) => `V${n} du dossier en attente de validation`,
    rejected: (n: number) => `V${n} du dossier refusée : à reprendre`,
    deposit: (n: number) =>
      `Dossier V${n} validé : dépôt manuel à faire dans The Orchard, puis à déclarer`,
    corrections: "Corrections demandées par le distributeur",
    waiting: (deposited: string, planned: string | null) =>
      `Dépôt déclaré le ${deposited} : en attente du distributeur${planned ? ` (sortie prévue le ${planned})` : ""}`,
    platforms: (verified: number, total: number) =>
      `Plateformes vérifiées : ${verified} sur ${total}`,
    closure: "Plateformes vérifiées : clôture du suivi à faire",
    closurePending: "Clôture proposée : en attente du validateur",
    reservesOpen: (n: number) =>
      `Clôturée avec réserves : ${n} réserve${n > 1 ? "s" : ""} à lever`,
    closedNormal: (date: string) => `Clôturée normalement le ${date}`,
    closedReserves: (date: string, n: number) =>
      `Clôturée avec réserves le ${date} (${n} réserve${n > 1 ? "s" : ""} non vérifiée${n > 1 ? "s" : ""})`,
    progress: (done: number) => `Étapes déclarées : ${done} sur 3`,
    // A collective's live titles without a release yet (lot 15).
    withoutRelease: (n: number) =>
      `${plural(n, "titre", "titres")} encore sans sortie`,
  },
};
