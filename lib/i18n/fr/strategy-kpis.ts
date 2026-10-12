/** Objectifs & KPIs of the Stratégie (step 7). */
export const strategyKpis = {
  // MKT-S1-13: how each KPI is measured, said by code from its metric.
  definitions: {
    streams: {
      definition: "Écoutes du titre sur les plateformes de streaming.",
      formula: "Somme des écoutes comptées par les plateformes sur la période.",
    },
    fans: {
      definition: "Fans de l'artiste sur Deezer.",
      formula: "Nombre de fans au jour du relevé (pas une somme).",
    },
    views: {
      definition: "Vues des vidéos liées à la sortie.",
      formula: "Somme des vues comptées par chaque plateforme sur la période.",
    },
    playlists: {
      definition: "Playlists éditoriales ou tierces qui reprennent le titre.",
      formula: "Nombre de playlists distinctes au jour du relevé.",
    },
    other: {
      definition: "Ce que dit son libellé.",
      formula: "À préciser avec l'équipe.",
    },
  },
  sources: {
    deezer: "Source : Deezer, relevé chaque jour après la sortie.",
    manual: "Source : relevé à la main, une fois par semaine.",
    to_connect:
      "Source à connecter : relevé à la main en attendant, une fois par semaine.",
  },
  period: (due: string | null) =>
    due ? `Période : de la sortie au ${due}` : "Période : à fixer",
  owner: "Responsable",
  ownerNone: "Personne",
  ownerLine: (name: string) => `Suivi par ${name}`,
  unitFixed: "L'unité suit la mesure choisie.",
  // MKT-S1-13: the Cadrage's objective, proposed, never typed again.
  fromFraming: {
    objective: (text: string) => `Le Cadrage dit : « ${text} »`,
    useObjective: "Reprendre comme objectif stratégique",
    kpi: (text: string) => `Objectif mesurable du Cadrage : ${text}`,
    useKpi: "Préparer ce KPI",
  },
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
