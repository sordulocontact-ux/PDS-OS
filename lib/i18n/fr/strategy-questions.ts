// PO's one question in « Les 8 dimensions » of the Stratégie (Sacha
// 06/11/2026), in the box every question of PO uses (po-question.ts):
// the written points nothing answers yet, then the levers to arbitrate.

export const strategyQuestions = {
  // What the dimension's line is called, for the banner after an answer.
  labels: {
    positioning: "Positionnement",
    positioning_promise: "Promesse",
    positioning_difference: "Différence",
    positioning_proof: "Preuve",
    positioning_tone: "Tonalité",
    audiences: "Publics",
    narrative: "Angle à raconter",
    narrative_origin: "Histoire du morceau",
    narrative_story: "Ce qu'il raconte",
    narrative_context: "Contexte artistique",
    narrative_why_now: "Pourquoi maintenant",
    strategic_objective: "Objectif stratégique",
  },
  ask: {
    positioning: "Qu'est-ce qu'on privilégie avec cette sortie ?",
    positioning_promise:
      "Qu'est-ce que cette sortie apporte à ceux qui l'écoutent ?",
    positioning_difference: "Qu'est-ce qui la distingue des autres sorties ?",
    positioning_proof: "Qu'est-ce qui le montre, concrètement ?",
    positioning_tone: "Sur quel ton en parle-t-on ?",
    audiences: "À qui s'adresse la sortie ?",
    narrative: "Quel angle pour raconter la sortie ?",
    narrative_origin: "D'où vient le morceau ?",
    narrative_story: "Que raconte-t-il ?",
    narrative_context: "Dans quel contexte artistique s'inscrit-il ?",
    narrative_why_now: "Pourquoi sort-il maintenant ?",
    strategic_objective: "Qu'est-ce que la sortie doit accomplir ?",
  },
  why: "Ni le Brief de cadrage ni les calls n'en disent rien pour l'instant.",
  whyProposed:
    "PO l'a rédigé d'après le Brief de cadrage et les calls : à confirmer ou corriger.",
  lever: (name: string) => `Retenir « ${name} » pour cette sortie ?`,
  leverWhy: (source: string, quote: string | null) =>
    quote ? `${source} : « ${quote} »` : source,
  answerLabel: "Votre réponse",
  required: "Écrivez votre réponse avant d'enregistrer.",
  proposal: "Proposition de PO",
  save: "Enregistrer",
  saving: "Enregistrement…",
  help: "M'aider à définir",
  helping: "PO rédige…",
  helpNone:
    "PO n'a rien trouvé dans le Brief ni les calls pour y répondre : à vous de le dire.",
  helpNoSources:
    "Rien à analyser : validez le Cadrage ou importez un compte rendu de call d'abord.",
  helpFailed: "PO n'a pas pu rédiger de proposition. Réessayez.",
  confirm: "Confirmer",
  edit: "Modifier",
  discard: "Écarter",
  cancel: "Annuler",
  retain: "Retenir",
  notRetain: "Ne pas retenir",
  answered: (label: string) => `Réponse enregistrée · ${label}`,
  confirmed: (label: string) => `Réponse confirmée · ${label}`,
  discarded: (label: string) => `Proposition écartée · ${label}`,
  done: "PO n'a plus de question : vérifiez ce qui reste à confirmer dans les dimensions.",
} as const;
