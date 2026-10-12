// The strategy drafted by PO (MKT-S1-09) and the narrative's synthesis
// (MKT-S1-06).
export const strategyDraft = {
  initialContext: "le contexte initial du projet",
  summarySource: "les parties du récit",
  draft: {
    button: "Préparer un brouillon",
    working: "PO prépare le brouillon…",
    hint: "PO rédige les textes encore vides depuis le Cadrage validé et les calls. Chaque proposition garde sa source et reste à confirmer ; rien de confirmé n'est remplacé.",
    created: (n: number) =>
      n === 0
        ? "Aucune proposition : les sources ne fondent aucun texte encore vide."
        : n === 1
          ? "1 proposition rédigée, à relire et confirmer."
          : `${n} propositions rédigées, à relire et confirmer.`,
    noSources:
      "Rien à analyser : validez le Cadrage ou importez un compte rendu de call d'abord.",
    failed: "PO n'a pas pu préparer le brouillon. Réessayez.",
    questionsTitle: "Questions à traiter en priorité",
    questionsHint:
      "Les sources ne disent rien de ces points : à répondre par l'équipe.",
    open: "Répondre",
    close: "Fermer",
    redraft: "Proposer à nouveau",
    redrafting: "PO réécrit…",
    redraftNone: "PO n'a rien trouvé de plus solide dans les sources.",
  },
  summary: {
    title: "Synthèse du récit",
    hint: "Le récit en un seul texte, rédigé par PO à partir des parties ci-dessous. Toujours à confirmer.",
    tone: "Ton",
    length: "Longueur",
    tones: {
      sober: "Sobre",
      warm: "Chaleureux",
      punchy: "Percutant",
    },
    lengths: {
      short: "Courte",
      developed: "Développée",
    },
    write: "Rédiger la synthèse",
    rewrite: "Rédiger à nouveau",
    writing: "PO rédige…",
    written: "Synthèse proposée, à relire et confirmer.",
    noParts: "Écrivez au moins une partie du récit avant la synthèse.",
    confirmed:
      "La synthèse est confirmée : modifiez-la directement pour la changer.",
    failed: "PO n'a pas pu rédiger la synthèse. Réessayez.",
    arbitrationTitle: "À arbitrer avant de confirmer",
    repetition: (first: string, second: string) =>
      `« ${first} » et « ${second} » racontent la même chose`,
    contradiction: (first: string, second: string) =>
      `« ${first} » et « ${second} » se contredisent`,
    passage: (text: string) => `Passage commun : « ${text} »`,
  },
} as const;
