// The project's shell (proto « Projet complet », docs/protos/src/global/
// host.js): overview, the workflows' lock, Travail, Validations, Activité.
// Words of the proto.

export const projectShell = {
  // The project's own state, next to its name on the overview.
  status: {
    notStarted: "Non démarré",
    running: "En cours",
    done: "Terminé",
  },
  facts: {
    masterFinal: "Master final",
  },
  // The Cadrage's steps until its journey comes (zone Cadrage): what the
  // overview shows before the workflows.
  framing: {
    steps: {
      start: "Démarrer le cadrage",
      dimensions: "Les 6 dimensions",
      brief: "Brief de cadrage",
      plan: "Plan du projet",
    },
    why: {
      start:
        "Commencer directement avec PO, ou préparer un échange : les deux chemins mènent au même Brief de cadrage.",
      dimensions:
        "Ce que le projet sait déjà, ce qui reste à confirmer, ce qui manque. PO pose une question à la fois et ne redemande jamais ce qui est connu.",
      brief:
        "Les 6 dimensions dans un document versionné, avec leurs sources. La direction le valide ; une demande de modification ne rouvre que les dimensions concernées.",
      plan: "Ce qui commence maintenant, ce qui suit, ce qui avance en parallèle, ce qu'il faut prévoir. Rien ne démarre avant « Lancer le plan ».",
    },
    todo: {
      start: "Démarrer le cadrage",
      dimensions: "Répondre aux questions de PO",
      brief: "Valider le Brief de cadrage",
      plan: "Lancer le plan du projet",
    },
    summary: {
      start: "Commencé",
      brief: "Brief validé",
      plan: (day: string) => `Lancé le ${day}`,
    },
  },
  // The overview (retour d'Akili du 05/11/2026, proto validated by Sacha
  // 10/11): one title per zone, no state pills, the Cadrage's deliverable.
  overview: {
    info: "Informations",
    infoTitle: "Informations du projet",
    infoDescription: "Ce qui a été saisi à la création du projet.",
    owner: "Chef de projet",
    now: {
      label: "Maintenant",
      nothing: "Rien à faire pour vous",
      allDone: "Tout ce qui vous concerne est fait",
      open: "Ouvrir l'étape",
      also: "Aussi à vous :",
      more: (n: number) => `et ${n} autre${n > 1 ? "s" : ""}`,
    },
    progress: {
      title: "Progression",
      framing: "Progression du cadrage",
      mine: "À vous",
      mineTodo: (todo: string) => `À vous : ${todo}`,
      stepOf: (n: number, total: number, title: string) =>
        `Étape ${n} sur ${total} · ${title}`,
      done: "Terminé",
      restricted: "Réservé à la direction et aux chefs de projet",
      // Read by a screen reader after each step.
      state: { done: "fait", current: "en cours", later: "à venir" },
      steps: (done: number, total: number) =>
        `${done} étape${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${total}`,
    },
    deliverable: {
      label: "Livrable du cadrage",
      locked:
        "Il se rédige à partir des 6 dimensions, puis la direction le valide. C'est la référence du Plan du projet.",
      open: "Ouvrir le Brief",
      mine: (todo: string) => `À vous : ${todo}.`,
    },
    dependencies: {
      title: "Ce qui dépend d'un autre workflow",
      flow: (from: string, to: string) => `${from} → ${to}`,
      items: {
        masterFinal: "Master final",
        cover: "Pochette livrée",
        ready: "Prêt pour la sortie",
        duration: "Durée du master final",
      },
      sacem: "Juridique · SACEM",
      available: "Disponible",
      expected: "Attendu",
    },
  },
  // The project's image (lib/projects/cover-rules.ts).
  cover: {
    label: "Pochette",
    add: "Ajouter une pochette",
    change: "Changer la pochette",
    remove: "Retirer la pochette",
    alt: (title: string) => `Pochette de ${title}`,
    defaultAlt: (title: string) => `${title} n'a pas encore de pochette`,
    saving: "Enregistrement de la pochette…",
    saved: "Pochette enregistrée.",
    removed: "Pochette retirée : le visuel par défaut revient.",
    failed: "La pochette n'a pas pu être enregistrée. Réessayez.",
    problem: {
      type: "Choisissez une image JPG, PNG ou WebP.",
      size: "L'image dépasse 5 Mo : choisissez-en une plus légère.",
    },
  },
  locked: {
    body: "Ce workflow démarre au lancement du plan du projet, après le Cadrage.",
    open: "Ouvrir le Cadrage",
    // The plan was launched without this workflow (workflowGate `absent`).
    absentBody:
      "Ce workflow n'est pas dans le plan du projet : le chef de projet responsable peut l'ajouter et le lancer depuis le Plan du projet.",
    // In the plan, still waiting for « Lancer maintenant ».
    waitingBody:
      "Ce workflow est dans le plan du projet : il démarre quand le chef de projet responsable le lance depuis le Plan du projet.",
    openPlan: "Ouvrir le Plan du projet",
  },
  work: {
    empty: "Rien ne vous attend pour l'instant.",
    validationsEmpty: "Aucune validation ne vous attend.",
    listLabel: "Vos actions dans ce projet",
    due: (day: string) => `avant le ${day}`,
  },
  activity: {
    empty: "Rien ne s'est encore passé dans ce projet.",
    label: "Journal du projet",
    // « Juridique · Contrat de Sami Kader signé · Lina Haddad 19/10, 11:16 »
    project: "Projet",
  },
} as const;
