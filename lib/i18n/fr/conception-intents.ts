/** Conception (ticket « Conception » § 4 et § 5): consolidation of the
 * intentions, responsibles and validators. */
export const conceptionIntents = {
  people: {
    responsibleTitle: "Responsable de la direction artistique",
    responsibleHint:
      "La personne qui prépare les intentions, les références et soumet la direction artistique.",
    sheetResponsibleTitle: "Responsable de la fiche",
    none: "Personne n'est désigné.",
    since: (name: string, date: string) => `${name} · désigné le ${date}`,
    designate: "Désigner",
    change: "Changer",
    dialogTitle: "Désigner le responsable",
    dialogBody:
      "Le chef de projet désigne. PO suggère des personnes de l'équipe créative, sans connaître leur disponibilité : rien n'est affecté sans votre choix.",
    personLabel: "Personne",
    personPlaceholder: "Choisir une personne",
    suggestion: (name: string) => `${name} · Suggestion de PO`,
    submit: "Désigner",
    submitting: "Désignation…",
    cancel: "Annuler",
    close: "Fermer",
    assigned: "Responsable désigné",
    validatorsTitle: "Validateurs",
    validatorsHint:
      "Les personnes qui valident, demandent des modifications ou refusent. Le responsable peut en faire partie si vous le décidez.",
    noValidators: "Aucun validateur nommé.",
    editValidators: "Choisir les validateurs",
    validatorsDialogTitle: "Choisir les validateurs",
    validatorsDialogBody:
      "Une version ne peut être soumise qu'une fois au moins un validateur nommé.",
    validatorsLabel: "Validateurs",
    validatorsPlaceholder: "Choisir une ou plusieurs personnes",
    validatorsSaved: "Validateurs enregistrés",
    save: "Enregistrer",
    saving: "Enregistrement…",
    readOnly: "Seul le chef de projet désigne.",
  },

  consolidation: {
    title: "Intentions consolidées",
    hint: "PO rassemble ce qui a été dit ; vous modifiez, fusionnez ou dissociez, puis le chef de projet confirme.",
    retained: "Retenues",
    noneRetained: "Aucune intention retenue pour cette cible.",
    poProposal: "Proposition de PO",
    confirmed: "Confirmée",
    retainedBadge: "Retenue",
    source: (label: string) => `Source : ${label}`,
    manualSource: "Saisie",
    confirm: "Confirmer les intentions",
    confirming: "Confirmation…",
    confirmedToast: "Intentions confirmées",
    confirmTitle: "Confirmer les intentions ?",
    confirmBody:
      "Elles deviennent la base de la direction artistique. Toute modification ultérieure les repassera « À réviser ».",
    confirmedOn: (name: string, date: string) =>
      name ? `Confirmées par ${name} le ${date}` : `Confirmées le ${date}`,
    blockedProposals: (n: number) =>
      n === 1
        ? "1 proposition de PO attend encore : confirmez-la ou écartez-la."
        : `${n} propositions de PO attendent encore : confirmez-les ou écartez-les.`,
    blockedNothing: "Retenez au moins une intention avant de confirmer.",
    ownerOnly: "Seul le chef de projet confirme les intentions consolidées.",
    // MKT-C2-06: what a revision of the release's direction touches.
    impactsTitle: "Avant de reconfirmer : ce que cette révision touche",
    impactsTopics: (topics: string) =>
      `Changé depuis la dernière confirmation : ${topics}.`,
    impactsDeliverables: "Livrables qui en héritent :",
    impactsNone: "Aucun livrable n'en hérite : chacun a sa propre réponse.",
    sheetValidated: "fiche déjà validée",
    historyTitle: "Confirmations précédentes",
    historyLine: (name: string, date: string) =>
      name ? `${date} · ${name}` : date,
    cancel: "Annuler",
    close: "Fermer",
  },

  merge: {
    start: "Fusionner des propositions",
    cancel: "Annuler",
    select: (n: number) =>
      n === 0
        ? "Cochez au moins deux propositions pour les fusionner."
        : n === 1
          ? "1 proposition cochée"
          : `${n} propositions cochées`,
    pick: (text: string) => `Cocher pour fusionner : ${text}`,
    open: "Fusionner",
    title: "Fusionner les propositions",
    body: "Une seule proposition remplace celles cochées ; leurs sources restent tracées.",
    valueLabel: "Texte fusionné",
    topicLabel: "Sujet",
    targetLabel: "Rattachée à",
    submit: "Fusionner",
    submitting: "Fusion…",
    done: "Propositions fusionnées",
  },

  split: {
    open: "Dissocier",
    title: "Dissocier la proposition",
    body: "Chaque partie devient une proposition à part, avec sa cible et son sujet ; la source reste la même.",
    part: (n: number) => `Partie ${n}`,
    valueLabel: "Texte",
    topicLabel: "Sujet",
    targetLabel: "Cible",
    add: "Ajouter une partie",
    remove: "Retirer cette partie",
    submit: "Dissocier",
    submitting: "Dissociation…",
    done: "Proposition dissociée",
    minParts: "Il faut au moins deux parties, chacune avec un texte.",
  },

  targets: {
    direction: "Direction créative",
    unassigned: "À rattacher",
  },
};
