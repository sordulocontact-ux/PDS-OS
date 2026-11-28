// « Sorties » of a collective (lot 13 of docs/pds-mic-plan.md, décision 7):
// a release per title, a compilation, or both; each with its own date and
// UPC.
export const collectiveReleases = {
  title: "Sorties",
  modes: {
    singles: "Sorties individuelles",
    compilation: "Compilation finale",
    singles_then_compilation: "Sorties individuelles puis compilation",
  } as Record<string, string>,
  modeHints: {
    singles: "Une sortie par titre qui a son master, pas de compilation.",
    compilation:
      "Une seule sortie : la compilation des titres du projet, datée par l'échéance du projet.",
    singles_then_compilation:
      "Une sortie par titre, puis la compilation des titres du projet.",
  } as Record<string, string>,
  facts: { mode: "Mode de sortie" },
  mode: {
    label: "Mode de sortie",
    edit: "Modifier le mode",
    editLabel: "Modifier le mode de sortie",
    title: "Mode de sortie",
    description:
      "Les sorties que le nouveau mode n'utilise plus sont archivées, jamais supprimées : revenir à ce mode les ramène. Une sortie déjà partie ne peut pas être retirée.",
    choice: "Mode",
    submit: "Enregistrer",
    done: "Mode de sortie enregistré.",
  },
  groups: {
    titles: "Sorties des titres",
    compilation: "Compilation",
    abandoned: "Titres abandonnés",
  },
  columns: {
    release: "Sortie",
    date: "Date",
    upc: "UPC",
    isrc: "ISRC",
    state: "État",
    distribution: "Distribution",
    actions: "Actions",
  },
  caption: {
    date: "Date",
    upc: "UPC",
    isrc: "ISRC",
    distribution: "Distribution",
  },
  // A release's deposit (lot 15).
  distribution: {
    to_prepare: () => "À préparer",
    pending: (n: number | null) => `V${n ?? 1} à valider`,
    rejected: (n: number | null) => `V${n ?? 1} refusée`,
    approved: (n: number | null) => `V${n ?? 1} validée`,
    deposited: () => "Déposée",
    accepted: () => "Acceptée",
    closing: () => "Clôture à valider",
    closed: () => "Clôturée",
  },
  provisional: (names: string) =>
    `Titre provisoire : ${names}. Donnez-lui son nom pour qu'il puisse partir.`,
  states: {
    planned: "Prévue",
    delivered: "Livrée",
    online: "En ligne",
  } as Record<string, string>,
  noDate: "À fixer",
  dueDate: "Échéance du projet",
  noUpc: "À attribuer",
  noIsrc: "Pas d'ISRC",
  tracks: (titles: string[]) =>
    titles.length === 0
      ? "Aucun titre au Catalogue"
      : `${titles.length} titre${titles.length > 1 ? "s" : ""} : ${titles.join(", ")}`,
  gaps: (names: string) => `Sortie bloquée : contrat non signé de ${names}`,
  // Before the links to the titles still out of the Catalogue.
  waiting: "Pas encore au Catalogue, leur sortie viendra avec leur master :",
  empty: {
    notLaunched: {
      title: "Pas encore de sortie",
      body: "Les sorties se créent au lancement du plan du projet, selon le mode de sortie choisi.",
    },
    none: {
      title: "Aucune sortie pour l'instant",
      body: "La sortie d'un titre se crée dès qu'il a son master au Catalogue.",
    },
  },
  actions: {
    label: (release: string) => `Actions pour la sortie « ${release} »`,
    date: "Modifier la date",
    upc: "Modifier l'UPC",
    distribution: "Ouvrir la Distribution",
  },
  date: {
    title: (release: string) => `Date de sortie · ${release}`,
    description:
      "La date de cette sortie seulement : les autres titres et la compilation gardent la leur.",
    label: "Date de sortie",
    submit: "Enregistrer",
    done: "Date de sortie enregistrée.",
  },
  upc: {
    title: (release: string) => `UPC · ${release}`,
    description:
      "L'UPC de cette sortie seulement (12 ou 13 chiffres). Vide : attribué par le distributeur au dépôt.",
    label: "UPC",
    submit: "Enregistrer",
  },
  errors: {
    mode_unchanged: "C'est déjà le mode de sortie du projet.",
    compilation_submitted:
      "La compilation est déjà soumise en Distribution : un mode sans compilation ne peut plus être choisi.",
    single_released:
      "Une sortie de titre est déjà livrée ou en ligne : un mode sans sorties individuelles ne peut plus être choisi.",
    failed: "La sortie n'a pas pu être enregistrée. Réessayez.",
  },
  // The collective's journal (Activité).
  event: (from: string, to: string) => `Mode de sortie · ${from} → ${to}`,
} as const;
