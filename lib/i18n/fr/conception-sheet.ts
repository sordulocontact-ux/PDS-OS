/** Conception (ticket « Conception » § 9 à 13): the Fiches Livrables. */
export const conceptionSheet = {
  listTitle: "Fiches Livrables",
  listBody:
    "Une fiche par livrable ou par série. Chacune avance seule : sa validation ne bloque pas les autres.",
  columns: {
    deliverable: "Livrable",
    status: "Statut",
    responsible: "Responsable",
    delivery: "Livraison",
    actions: "Actions",
  },
  noSheet: "Pas encore de fiche",
  noResponsible: "Non désigné",
  empty: "Aucun livrable dans la Conception pour l'instant.",

  create: {
    // MKT-C2-06: what the deliverable inherits from the release's direction.
    inherited: (topic: string, value: string) =>
      `${topic} (hérité de la direction) : ${value}`,
    open: "Créer la fiche",
    title: (deliverable: string) => `Créer la fiche · ${deliverable}`,
    description:
      "Préremplie depuis la Stratégie validée et les intentions confirmées. Rien n'est soumis ni validé.",
    kindLegend: "Forme de la fiche",
    kinds: { single: "Fiche unique", series: "Fiche série" },
    kindHints: {
      single: "Un seul élément à livrer.",
      series:
        "Des éléments numérotés qui partagent un univers, chacun suivi à part.",
    },
    countLabel: "Nombre d'éléments",
    countHint: (planned: number | null) =>
      planned
        ? `${planned} prévus dans la Stratégie, modifiable ensuite.`
        : "Autant que nécessaire, modifiable ensuite.",
    submit: "Créer la fiche",
    submitting: "Création…",
    cancel: "Annuler",
    close: "Fermer",
    created: "Fiche créée",
    itemTitle: (title: string, n: number) => `${title} ${n}`,
  },

  kinds: {
    single: "Fiche unique",
    series: (n: number) =>
      n === 1 ? "Série · 1 élément" : `Série · ${n} éléments`,
  },
  header: {
    id: "Identifiant",
    type: "Type",
    project: "Projet",
    version: "Version",
    noVersion: "Jamais soumise",
    versionLabel: (n: number) => `V${n}`,
    origin: "Origine",
    role: "Rôle dans la Stratégie",
  },
  sections: {
    creative: "Concept et intention",
    intentions: "Intentions confirmées",
    references: "Références du livrable",
    people: "Responsable et validateurs",
    formats: "Formats",
    dates: "Dates clés",
    budget: "Budget prévisionnel",
    production: "Pour la Production",
    items: "Éléments de la série",
    checks: "Avant de soumettre",
    review: "Validation",
  },
  fields: {
    title: "Nom",
    concept: "Concept",
    intention: "Intention",
    durationMin: "Durée cible",
    durationMax: "Jusqu'à (fourchette)",
    durationHint:
      "En minutes:secondes, ex. 3:00. Le second champ donne une fourchette.",
    duration: "Durée cible",
    ratios: "Ratios et formats",
    ratioOther: "Autre ratio",
    ratioOtherPlaceholder: "ex. 21:9",
    ratioAdd: "Ajouter",
    ratioInvalid: "Écrivez un ratio comme 21:9.",
    subtitles: "Sous-titres",
    subtitleChoices: { "": "À décider", yes: "Oui", no: "Non" },
    subtitleRatios: "Formats sous-titrés",
    subtitleMode: "Livraison des sous-titres",
    subtitleModes: {
      burned: "Intégrés à l'image",
      file: "Fichier séparé",
      both: "Les deux",
    },
    variants: "Déclinaisons supplémentaires",
    notes: "Notes",
    constraints: "Contraintes",
    shootDate: "Tournage (si applicable)",
    postStart: "Début de postproduction",
    postDeadline: "Deadline de postproduction",
    deliveryDate: "Livraison finale",
    budget: "Montant prévisionnel (€)",
    budgetHint: "Prévisionnel : ce n'est pas une dépense engagée.",
    budgetState: "État du budget",
    budgetStates: { not_committed: "Non engagé", committed: "Engagé" },
    dependencies: "Dépendances",
    productionNotes: "Points à préciser en Production",
    productionNotesHint:
      "Lieu, musiciens, équipe technique, matériel… peuvent rester ouverts.",
  },
  none: "Non renseigné",
  nothing: "Aucune",
  duration: (min: string, max: string | null) =>
    max && max !== min ? `${min} à ${max}` : min,
  euros: (amount: string) => `${amount} €`,
  save: "Enregistrer la fiche",
  saving: "Enregistrement…",
  saved: "Fiche enregistrée",
  frozen:
    "Une version attend une décision : la fiche est figée jusqu'à cette décision.",
  readOnly:
    "Lecture seule : seuls le chef de projet et le responsable de la fiche la modifient, pendant la conception.",
  newVersion: (n: number) =>
    `La version validée V${n} reste celle transmise tant que la suivante n'est pas validée.`,

  provenance: {
    strategy: "Stratégie validée",
    intention: "Intentions confirmées",
    call: "Call",
    manual: "Saisie",
    file: "Fichier",
    suggestion: "Suggestion de PO acceptée",
  },
  provenanceLabel: (source: string) => `Provenance : ${source}`,

  intentions: { empty: "Aucune intention confirmée pour ce livrable." },
  references: {
    empty: "Aucune référence rattachée à ce livrable.",
    file: "Fichier",
    link: "Lien",
  },
  people: {
    responsible: "Responsable de la fiche",
    validators: "Validateurs",
    unavailable:
      "Les responsables et validateurs se désignent ici dès que le module de désignation est disponible.",
  },

  items: {
    empty: "Aucun élément.",
    add: "Ajouter un élément",
    number: (n: number) => `N° ${n}`,
    title: "Titre",
    objective: "Objectif",
    deliveryDate: "Livraison",
    notes: "Notes",
    save: "Enregistrer",
    saving: "Enregistrement…",
    remove: "Retirer",
    removeLabel: (title: string) => `Retirer ${title}`,
    edit: "Modifier",
    editLabel: (title: string) => `Modifier ${title}`,
    cancel: "Annuler",
    saved: "Élément enregistré",
    removed: "Élément retiré",
    added: "Élément ajouté",
    undecided: "Pas encore décidé",
    // MKT-C2-07: each item may be its own content.
    responsible: "Responsable de ce contenu",
    noResponsible: "Le responsable de la fiche",
    concept: "Concept de ce contenu",
    reference: "Référence (lien https)",
    referenceInvalid: "Un lien commence par https://",
    referenceOpen: "Voir la référence",
    by: (name: string) => `par ${name}`,
  },
  inheritedTopic: (topic: string) => `${topic} (hérité de la direction)`,
  // MKT-C2-07: a series followed as one block, or content by content.
  tracking: {
    title: "Suivi de la série",
    global: "En bloc",
    globalHint: "Une seule décision pour toute la série.",
    perItem: "Contenu par contenu",
    perItemHint: "Une décision par contenu : chacun avance à son rythme.",
    project: "Selon le mode du projet",
    rule: "Statut de la série : celui de son contenu le moins avancé (Refusé, puis Modifications demandées, puis En attente, puis Validé).",
    saved: "Suivi de la série enregistré.",
  },

  checks: {
    title: "PO signale",
    computed: "Calculé à partir de la fiche : ce n'est pas une décision.",
    blockersTitle: "À régler avant de soumettre",
    warningsTitle: "À vérifier",
    deferredTitle: "Peut être finalisé en Production",
    none: "Rien ne bloque la soumission.",
    blockers: {
      responsible: "Aucun responsable de fiche n'est désigné.",
      validators:
        "Aucun validateur n'est nommé : l'identité du validateur est à vérifier.",
      ratios: "Aucun ratio ni format attendu.",
      duration: "La durée cible n'est pas renseignée.",
      subtitles: "Les sous-titres ne sont pas décidés (oui ou non).",
      subtitleDetails:
        "Sous-titres : précisez les formats concernés et leur livraison.",
      subtitleRatios:
        "Un format sous-titré ne fait pas partie des ratios attendus.",
      deliveryDate: "La date de livraison finale manque.",
      shootAfterPost: "Le tournage est après le début de la postproduction.",
      postOrder: "La postproduction finit avant de commencer.",
      postAfterDelivery: "La postproduction finit après la livraison.",
      shootAfterDelivery: "Le tournage est après la livraison.",
      afterStrategyDue:
        "La livraison est après l'échéance fixée par la Stratégie : à arbitrer.",
      afterMilestone:
        "La livraison est après le temps fort où le livrable sort : à arbitrer.",
      itemAfterMilestone:
        "Un élément de la série est livré après le temps fort : à arbitrer.",
    },
    warnings: {
      budgetMissing: "Aucun budget prévisionnel : PO n'en invente pas.",
      selfValidation:
        "Le responsable est aussi validateur : vérifiez que les règles du projet l'autorisent.",
      itemWithoutDate: "Un élément de la série n'a pas de date de livraison.",
      noShootDate:
        "Pas de date de tournage : à renseigner si le livrable se tourne.",
    },
    deferred: {
      place: "Le lieu exact",
      musicians: "Le ou les musiciens",
      crew: "L'équipe technique",
      equipment: "Le matériel",
    },
  },

  suggest: {
    open: "Proposer une formulation",
    loading: "PO rédige…",
    title: "Suggestion de PO",
    hint: "Rédigée à partir des intentions confirmées. Rien n'est enregistré tant que vous ne l'utilisez pas, puis n'enregistrez la fiche.",
    use: "Utiliser",
    dismiss: "Ignorer",
    failed: "PO n'a pas pu proposer de formulation. Réessayez.",
    noSource:
      "Aucune intention confirmée pour ce livrable : PO n'a rien sur quoi s'appuyer.",
  },

  review: {
    submit: "Soumettre",
    submitting: "Envoi…",
    submitted: "Fiche soumise aux validateurs",
    confirmTitle: "Soumettre la fiche ?",
    confirmBody:
      "La version part chez les validateurs et la fiche est figée jusqu'à leur décision.",
    cancel: "Annuler",
    close: "Fermer",
    blocked: "Réglez les points bloquants avant de soumettre.",
    pending: (n: number) => `V${n} en attente de validation`,
    versions: "Versions",
    version: (n: number) => `Version ${n}`,
    submittedBy: (name: string, date: string) =>
      name ? `Soumise par ${name} · ${date}` : `Soumise · ${date}`,
    sectionSheet: "La fiche",
    global: "Toute la version",
    comment: "Commentaire",
    commentPlaceholder: "Ce qu'il faut reprendre, ou pourquoi.",
    commentRequired: "Un commentaire est nécessaire pour cette décision.",
    confirm: "Confirmer la décision",
    deciding: "Envoi…",
    decidedBy: (decision: string, name: string, date: string) =>
      name ? `${decision} par ${name} · ${date}` : `${decision} · ${date}`,
    awaiting: "En attente de décision",
    decided: "Décision enregistrée",
    validatorNote: "Vous êtes validateur de cette fiche.",
    snapshotTitle: "Ce que voient les validateurs",
    neverSubmitted: "Pas encore soumise.",
  },

  handoff: {
    open: "Transférer à Production",
    title: "Transférer à Production ?",
    body: (n: number) =>
      `Production récupère la version validée V${n} : le Brief créatif, les références, formats, durée, sous-titres, dates, budget et points ouverts, sans rien ressaisir. Rien n'est réservé, aucune équipe ni tâche n'est créée, le tournage n'est pas pour autant prêt.`,
    confirm: "Transférer",
    pending: "Transfert…",
    done: "Version transmise à Production",
    transferred: (n: number, date: string) =>
      `V${n} transmise à Production le ${date}`,
    newer: (old: number, n: number) =>
      `La V${n} est validée depuis le transfert de la V${old} : Production travaille encore sur la V${old}.`,
    refresh: "Actualiser le transfert",
    cancel: "Annuler",
    close: "Fermer",
  },

  errors: {
    duration:
      "Durée illisible : écrivez par exemple 3:00, ou une fourchette 2:30 et 3:00.",
    budget: "Montant illisible : écrivez un nombre en euros, par exemple 2000.",
    invalid: "Vérifiez les champs de la fiche.",
    count: "Entre 1 et 200 éléments.",
    exists: "Ce livrable a déjà sa fiche.",
  },
};
