/** Dispositif of the Stratégie (step 3): levers and their states. */
export const strategyDispositif = {
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
