/**
 * Shared words of the decision and fact components (components/ui:
 * VersionCard, StartChoices, ProposalRow / ProposalGroup, DecisionPanel,
 * ReturnCallout, ResubmitForm, FactRow, PickList). The exact words of the
 * proto (docs/protos/src/mk.js, master-v2.html); a module gives its own
 * labels in props when the step names them (« Valider le Brief de sortie »).
 */
export const decisions = {
  start: {
    recommended: "Recommandé",
  },

  proposal: {
    confirm: "Confirmer",
    edit: "Modifier",
    discard: "Écarter",
    save: "Enregistrer",
    cancel: "Annuler",
    textLabel: "Texte",
    textRequired: "Écrivez le texte avant d'enregistrer.",
    states: {
      proposed: "À vérifier",
      kept: "Confirmé",
      discarded: "Écarté",
    },
    proposed: (text: string) => `Proposé : ${text}`,
    editedBy: (who: string) => `Modifié par ${who}`,
    decidedBy: (kept: boolean, who: string) =>
      `${kept ? "Confirmé" : "Écarté"} par ${who}`,
    quote: (quote: string) => `« ${quote} »`,
    confirmed: "Confirmé.",
    discarded: "Écarté.",
    saved: "Modifié et confirmé.",
    toConfirm: (n: number) => `${n} à vérifier`,
    nothingSaid: "Rien n'a été dit pendant l'échange.",
    add: "Ajouter",
  },

  decision: {
    title: "Votre décision",
    comment: "Commentaire",
    commentHint: "Obligatoire pour des réserves ou une modification",
    commentRequired:
      "Écrivez un commentaire : il dit à la personne ce qui doit changer.",
    outcomes: {
      approve: "Valider",
      approve_reserves: "Valider avec réserves",
      request_changes: "Demander une modification",
      request_info: "Demander une précision",
      refuse: "Refuser",
    },
    // The outcome running (lot 3 of Ibé's feedback).
    pending: {
      approve: "Validation en cours…",
      approve_reserves: "Validation en cours…",
      request_changes: "Envoi de la demande…",
      request_info: "Envoi de la question…",
      refuse: "Refus en cours…",
    },
    // « Claire Morel (demander une modification) » : the verb in lower case.
    returnBy: (who: string, outcome: string) => `${who} (${outcome})`,
    decided: "Décision enregistrée.",
    answer: "Votre réponse",
    answerHint: "Ce qui a changé depuis la demande",
    answerRequired: "Écrivez votre réponse : elle accompagne le nouvel envoi.",
    resubmit: "Répondre et transmettre à nouveau",
    resubmitted: "Transmis à nouveau.",
    saving: "Enregistrement…",
  },

  fact: {
    edit: "Modifier",
    change: "Changer",
    choose: "Choisir",
    save: "Enregistrer",
    cancel: "Annuler",
    missing: "À choisir",
    changedBy: (who: string) => `Modifié par ${who}`,
    // The source of a fact, in its hint (Sacha, 27/11/2026: no grey line).
    source: (where: string) => `Source : ${where}`,
    proposal: (value: string, source: string | null) =>
      `Proposition : ${value}${source ? ` · ${source}` : ""} — Entrée enregistre, Échap annule.`,
    saved: "Enregistré.",
    required: "Renseignez une valeur avant d'enregistrer.",
  },

  pick: {
    search: "Chercher une personne ou une structure",
    placeholder: "Nom, structure…",
    linked: "Liées au projet",
    network: "Réseau",
    choose: "Choisir",
    chosen: "Choisie",
    chooseNamed: (name: string) => `Choisir ${name}`,
    createContact: "Créer un contact",
    keepName: "Garder seulement le nom",
    nameRequired: "Tapez d'abord le nom à garder dans la recherche.",
    noResult: (query: string) => `Aucun résultat pour « ${query} ».`,
    done: "Choisi.",
    listen: (name: string) => `Écouter ${name}`,
    loading: "Chargement…",
  },
} as const;
