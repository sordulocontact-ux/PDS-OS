/** The Finance page: the team's spending as a whole (12/11/2026). */
export const finance = {
  title: "Finance",
  description:
    "Ce que l'équipe a engagé et payé, tous projets et artistes confondus.",
  loadError:
    "Une partie des chiffres n'a pas pu être chargée. Rechargez la page.",
  emptyTitle: "Aucune dépense pour l'instant",
  emptyBody:
    "Les dépenses saisies dans le Budget d'un projet ou d'un artiste sont additionnées ici.",
  periods: {
    label: "Période",
    mois: "Ce mois",
    trimestre: "Ce trimestre",
    annee: "Cette année",
    tout: "Tout",
  },
  // « par rapport à … », after a change in percents.
  previous: {
    mois: "le mois dernier",
    trimestre: "le trimestre dernier",
    annee: "l'an dernier",
  },
  tiles: {
    engaged: "Engagé",
    paid: "Payé",
    toPay: "À payer",
    overruns: "Enveloppes dépassées",
    change: (percent: number, previous: string) =>
      `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${Math.abs(percent)} % par rapport à ${previous}`,
    noChange: "Rien à comparer sur la période d'avant",
    paidShare: (percent: number) => `${percent} % de l'engagé`,
    estimated: (amount: string) => `${amount} encore estimés`,
    overdue: (count: number) =>
      count === 0
        ? "Aucune facture en retard"
        : `dont ${count} facture${count > 1 ? "s" : ""} en retard`,
    overrunsHint: (projects: number, artists: number) =>
      [
        projects > 0 && `${projects} projet${projects > 1 ? "s" : ""}`,
        artists > 0 && `${artists} artiste${artists > 1 ? "s" : ""}`,
      ]
        .filter(Boolean)
        .join(" · ") || "Aucun dépassement",
  },
  chart: {
    title: "Dépenses par mois",
    legendLabel: "Légende",
    paid: "Payé",
    unpaid: "Engagé, pas encore payé",
    estimated: "Estimé",
    total: "Total",
    tableCaption: "Dépenses par mois, en euros HT",
    month: "Mois",
    empty: "Aucune dépense sur ces mois.",
  },
  byFamily: {
    title: "Par poste",
    none: "Sans poste",
  },
  byArtist: {
    title: "Par artiste",
    none: "Sans artiste",
  },
  // The rest of a ranking, folded into one line.
  others: (count: number) => `${count} autre${count > 1 ? "s" : ""}`,
  rankEmpty: "Rien d'engagé sur la période.",
  ofEngaged: (percent: number) => `${percent} %`,
  projects: {
    title: "Budgets des projets",
    empty: "Aucun projet en cours n'a d'enveloppe ni de dépense.",
    name: "Projet",
    collective: "Projet collectif",
  },
  artists: {
    title: "Enveloppes des artistes",
    empty: "Aucun artiste n'a d'enveloppe ouverte.",
    name: "Artiste",
  },
  budget: {
    envelope: "Enveloppe",
    engaged: "Engagé",
    rest: "Reste",
    noEnvelope: "Sans enveloppe",
    over: (amount: string) => `Dépassé de ${amount}`,
    estimated: (amount: string) => `${amount} estimés en plus`,
    progress: (percent: number) => `${percent} % de l'enveloppe engagés`,
  },
  toPay: {
    title: "À payer",
    empty: "Aucune facture à payer.",
    due: (day: string) => `À payer le ${day}`,
    late: "En retard",
    noDue: "Sans échéance",
  },
  largest: {
    title: "Plus grosses dépenses",
    empty: "Rien d'engagé sur la période.",
  },
  noProof: {
    title: "Sans justificatif",
    body: (count: number) =>
      `${count} dépense${count > 1 ? "s" : ""} facturée${count > 1 ? "s" : ""} ou payée${count > 1 ? "s" : ""} sans ticket ni facture sur la période.`,
    none: "Toutes les dépenses facturées ou payées de la période ont leur justificatif.",
    open: "Voir les dépenses",
  },
} as const;
