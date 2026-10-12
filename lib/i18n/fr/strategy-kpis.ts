/** Objectifs & KPIs of the Stratégie (step 7). */
export const strategyKpis = {
  objectiveLabel: "Objectif stratégique",
  objectiveHint: "Ce que la sortie doit accomplir, en une ou deux phrases.",
  kpisTitle: "KPIs",
  kpisHint:
    "Quelques signaux pour juger le résultat, chiffrés ou non. Pas besoin d'en mettre beaucoup.",
  empty: "Aucun KPI pour l'instant.",
  kind: "Type de KPI",
  kinds: {
    quantitative: "Quantitatif",
    qualitative: "Qualitatif",
  },
  label: {
    quantitative: "Ce que l'on mesure",
    qualitative: "Signal observé",
  },
  labelPlaceholder: {
    quantitative: "Streams du single le premier mois, fans Deezer…",
    qualitative: "Retours de la presse spécialisée, reprises en playlists…",
  },
  metric: "Métrique",
  metrics: {
    streams: "Streams",
    fans: "Fans / abonnés",
    views: "Vues",
    playlists: "Ajouts en playlist",
    other: "Autre",
  },
  unitPlaceholders: {
    streams: "streams",
    fans: "fans",
    views: "vues",
    playlists: "playlists",
    other: "unité",
  },
  noSource:
    "Aucune source n'est encore connectée pour cette métrique : ce KPI se suit à la main.",
  tracking: {
    deezer:
      "Source : Deezer, fans de l'artiste principal du projet, relevés à chaque ouverture à partir de la sortie",
    manual: "Suivi manuel",
    to_connect: "Source à connecter, suivi manuel en attendant",
  },
  target: "Cible",
  unit: "Unité",
  dueOn: "Échéance",
  source:
    "Mesurer automatiquement les fans Deezer de l'artiste après la sortie",
  noTarget: "Cible à fixer",
  noDueOn: "sans échéance",
  noFigure: "sans chiffre",
  targetLine: (target: string) => `cible ${target}`,
  measured: (value: string) => `${value} fans Deezer aujourd'hui`,
  pending: "Mesuré automatiquement après la sortie (Deezer)",
  unavailable: "Donnée indisponible",
  add: "Ajouter le KPI",
  save: "Enregistrer",
  cancel: "Annuler",
  edit: "Modifier",
  remove: "Retirer",
  removeLabel: (label: string) => `Retirer le KPI « ${label} »`,
  editLabel: (label: string) => `Modifier le KPI « ${label} »`,
} as const;
