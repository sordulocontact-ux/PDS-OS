// The Brief step of the Master as a document (proto `master-v2.html`):
// how to start it, each fact with its source, changed in place, then
// « Enregistrer le Brief ».

export const masterBrief = {
  // A question asked to the viewer goes first (lot 4 of Ibé's feedback).
  lead: {
    more: "Le Brief en cours",
  },
  prefilled: {
    label: "Déjà pré-rempli",
    value: "Ingénieur, validatrice, livrables, formats et dates",
    source: "Cadrage, Réseau, Catalogue",
  },
  start: {
    legend: "Comment voulez-vous remplir le Brief ?",
    direct: "Commencer directement",
    directBody: (validator: string | null) =>
      validator
        ? `Tout ce qui est connu est déjà là. PO pose à ${validator} la question de la direction artistique ; vous complétez le reste.`
        : "Tout ce qui est connu est déjà là ; vous complétez le reste.",
    exchange: "Préparer un échange",
    exchangeBody:
      "Un call avec l'équipe et l'ingénieur ; PO propose ensuite les réponses, avec leurs citations.",
    reason: (list: string) =>
      `Il manque ${list} : un échange ira plus vite que des questions séparées.`,
    directInstead: "Commencer directement plutôt",
    started: "Brief démarré",
    exchangeChosen: "Échange à préparer",
  },
  document: {
    title: "Brief Mix/Master",
    saved: (day: string, by: string | null) =>
      by ? `Enregistré ${day} par ${by}` : `Enregistré ${day}`,
    notSaved:
      "Pas encore enregistré : ce qui est déjà connu du projet est pré-rempli · ce que l'ingénieur recevra, sans les tarifs",
    states: {
      incomplete: "Incomplet",
      draft: "Brouillon",
      ready: "Prêt à transmettre",
    },
    dirty: "Modifications à enregistrer",
    sent: (day: string) =>
      `Dossier envoyé ${day} : modifier le Brief ne change rien chez l'ingénieur tant que vous ne renvoyez pas le dossier.`,
  },
  missing: {
    mix: "l'ingénieur du mix",
    mastering: "l'ingénieur du mastering",
    direction: "la direction artistique",
  },
  missingSentence: (list: string) => `Il manque ${list}.`,
  // « Exporter en PDF » (lib/master-workflow/brief-html.ts).
  pdf: {
    export: "Voir le PDF",
    exporting: "Préparation du PDF…",
    failed: "Le PDF n'a pas pu être préparé. Réessayez.",
    title: (project: string) => `Brief Mix/Master · ${project}`,
    fileName: (project: string) =>
      `Brief_Mix_Master_${project.replace(/\s+/g, "_")}.pdf`,
    recorded: "Brief enregistré",
    draft: "Brouillon, pas encore enregistré",
    none: "Non renseigné",
  },
  sections: {
    people: "Qui fait quoi sur ce master",
    conditions: "Conditions de prestation",
    direction: "Direction artistique",
    deliverables: "Livrables et formats",
    dates: "Dates",
    message: "Message",
  },
  fields: {
    mix: "Ingénieur du mix",
    same: "Même ingénieur pour le mastering",
    yes: "Oui",
    no: "Non",
    mastering: "Ingénieur du mastering",
    revisions: "Allers-retours inclus dans le tarif",
    revisionsHint:
      "Le nombre de corrections que l'ingénieur fait sans frais en plus.",
    validator: "Qui valide les versions",
    mixRate: "Tarif (interne) · Mix",
    masteringRate: "Tarif (interne) · Mastering",
    direction: "Direction",
    references: "Références",
    constraints: "Contraintes",
    formats: "Formats de livraison",
    message: "Message pour les ingénieurs",
    deliverables: "Livrables attendus",
    mixV1Due: "Mix V1 attendu le",
    mixFinalDue: "Mix final attendu le",
    masteringDue: "Mastering attendu le",
    masterFinalDue: "Master final attendu le",
  },
  sources: {
    framing: "Désigné au Cadrage › Équipe",
    framingFemale: "Désignée au Cadrage › Équipe",
    credited: "Crédité sur le titre au Catalogue",
    owner: "Responsable du projet",
    creative: "Directrice ou directeur créatif du projet",
    nobody: "Personne n'est désigné au Cadrage ni crédité sur le titre",
    usualRevisions: (project: string) =>
      project
        ? `Réseau · leurs conditions habituelles (Brief de « ${project} »)`
        : "Réseau · leurs conditions habituelles",
    estimated: "Estimé",
    fixed: "Mix final et Master final : toujours livrés.",
    dates: {
      mixV1Due: "Calculé : 6 jours avant le master final",
      mixFinalDue: "Calculé : 3 jours avant le master final",
      masteringDue: "Calculé : 1 jour avant le master final",
      masterFinalDue:
        "Brief de cadrage › Temporalité · la date dont tout le reste dépend",
    },
  },
  revisions: (n: number) =>
    n > 1 ? `${n} allers-retours` : `${n} aller-retour`,
  orderError:
    "Les dates doivent se suivre : Mix V1, Mix final, Mastering, puis Master final.",
  picker: {
    search: "Chercher un ingénieur",
    linked: "Déjà liés au projet",
    network: "Réseau",
    team: "Équipe du projet",
    // A member of PDS with an account: the in-house engineer.
    members: "Membres de PDS (ingénieur maison)",
    // Listed once a name is typed; chosen, they get the engineer role.
    others: "Reste du Réseau · devient ingénieur une fois choisi",
    create: (name: string) =>
      name ? `Ajouter « ${name} » au Réseau` : "Ajouter un ingénieur au Réseau",
    createTitle: "Nouvel ingénieur dans le Réseau",
    none: "Aucun ingénieur dans le Réseau.",
  },
  record: "Enregistrer le Brief",
  recordChanges: "Enregistrer les modifications",
  upToDate:
    "Brief enregistré. Pour le changer, modifiez une ligne : l'enregistrement reviendra ici.",
  recording: "Enregistrement…",
  recorded: "Brief enregistré",
  nothingChanged: (day: string) =>
    `Rien à enregistrer : le Brief n'a pas changé depuis ${day}.`,
  changed: "Brief mis à jour",
  // « En attente de X : remplir le Brief » (StepWaiting).
  ownerTodo: "Remplir le Brief",
  errors: {
    failed: "Le Brief n'a pas pu être enregistré. Réessayez.",
    forbidden: "Seul le responsable du projet modifie le Brief.",
    amount: "Un montant en euros, par exemple 800.",
    revisions: "Un nombre de 0 à 20.",
    tooLong: "Ce texte est trop long.",
    date: "Une date, par exemple 15/11/2026.",
    validator: "Cette personne ne peut pas valider les versions de ce projet.",
    roundValidated:
      "Une version de cette étape est déjà validée : son ingénieur ne change plus.",
  },
} as const;
