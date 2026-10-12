/** Dispositif of the Stratégie (step 3): levers and their states. */
export const strategyDispositif = {
  // MKT-S1-07: the legal side is a dependency, not a lever.
  legal: {
    title: "Prérequis et dépendances",
    description:
      "Suivis dans le Juridique : le Dispositif en dépend, ils n'en font pas partie.",
    statuses: {
      action_now: "À traiter",
      waiting_external: "En attente d'un retour",
      blocked: "Bloqué",
    },
    responsible: (name: string) => `suivi par ${name}`,
    due: (date: string) => `pour le ${date}`,
    source: "source : Juridique",
    needs: (labels: string) =>
      `Le Cadrage cite aussi : ${labels}. Ce sont des prérequis juridiques, à traiter dans le Juridique.`,
    flagged: (word: string) =>
      `Ce levier ressemble à un prérequis juridique (« ${word} ») : il se suit dans le Juridique, pas dans le Dispositif.`,
    remove: "Retirer du Dispositif",
  },
  counts: (selected: number, toDecide: number, rejected: number) =>
    [
      `${selected} retenu${selected > 1 ? "s" : ""}`,
      `${toDecide} à arbitrer`,
      `${rejected} non retenu${rejected > 1 ? "s" : ""}`,
    ].join(" · "),
  stateLabel: (lever: string) => `État du levier « ${lever} »`,
  presetsTitle: "Leviers courants",
  presetsHint: "Un clic l'ajoute à arbitrer ; rien n'est retenu sans vous.",
  addPreset: (lever: string) => `Ajouter le levier « ${lever} »`,
  // Common levers of a release, offered by code (never by PO).
  presets: {
    organic_social: "Social organique",
    influence: "Influence",
    press: "Relations presse / médias",
    playlist_pitching: "Pitching playlists",
    partnerships: "Partenariats",
    paid_ads: "Publicité en ligne",
    radio: "Radio",
    live: "Live / showcase",
    video: "Clip / contenus vidéo",
  },
  otherTitle: "Autre levier",
  activations:
    "Le détail opérationnel de chaque levier retenu (qui, quand, comment) se traite ensuite dans Activations.",
} as const;
