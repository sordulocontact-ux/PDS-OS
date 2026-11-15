/** Finance › Vue d'ensemble, new style (Sacha 15/11/2026, docs/FINANCE-V2.md,
 * proto `docs/protos/finance-midday.html` v8): a greeting, then cards that
 * each say one thing with its figure in bold and open its page. Every figure
 * is computed by code (lib/finance/treasury.ts, cockpit.ts). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeHome = {
  hello: "Bonjour",
  sub: "voici où en est la Finance",
  subWatch: (count: number) =>
    `, avec ${plural(count, "point à surveiller", "points à surveiller")}`,
  horizon: "Horizon de la prévision",
  horizonDays: (days: number) => `${days} jours`,
  cards: "Finance en un coup d'œil",
  brief: {
    title: "En bref",
    belowReserve: (day: string) =>
      `Le solde passe sous la réserve le ${day} si rien ne bouge.`,
    reserveHeld: (days: number) =>
      `La réserve tient sur les ${days} prochains jours.`,
    late: (amount: string) => `${amount} d'entrées en retard, à relancer.`,
    budget: (title: string, percent: number) =>
      `${title} a consommé ${percent} % de son budget.`,
    noProof: (count: number) =>
      `${plural(count, "dépense attend", "dépenses attendent")} son justificatif.`,
    calm: "Rien d'urgent : tout suit la prévision.",
    source: "Calculé par PDS OS",
  },
  treasury: {
    title: "Trésorerie",
    // « Le solde est de 72 320 € ; dans 90 jours il sera de 71 790 €. »
    lead: "Le solde est de ",
    middle: (days: number) => ` ; dans ${days} jours il sera de `,
    end: ".",
    noStatement: "Aucun relevé de compte : importez-en un pour voir le solde.",
    open: "Voir la trésorerie",
  },
  low: {
    title: "Point bas et réserve",
    lead: (days: number) => `Le point bas des ${days} jours tombe le `,
    below: ", et le solde passe sous la réserve le ",
    held: ", au-dessus de la réserve de ",
    end: ".",
    open: "Voir le calendrier",
  },
  // « 3 entrées ouvertes, dont 4 400 € en retard. »
  flow: { of: ", dont ", late: " en retard", end: "." },
  incoming: {
    title: "À encaisser",
    count: (count: number) =>
      count === 0
        ? "Rien n'attend d'être encaissé"
        : plural(count, "entrée ouverte", "entrées ouvertes"),
    openLate: "Voir les entrées en retard",
    open: "Voir les encaissements",
  },
  outgoing: {
    title: "À payer",
    count: (count: number, days: number) =>
      count === 0
        ? `Rien à payer d'ici ${days} jours`
        : `${plural(count, "dépense", "dépenses")} à payer d'ici ${days} jours`,
    open: "Voir les dépenses à payer",
  },
  budgets: {
    title: "Budgets",
    top: (title: string, percent: number) => `${title} a consommé ${percent} %`,
    rest: (amount: string, count: number) =>
      ` ; ${amount} disponibles sur ${plural(count, "enveloppe", "enveloppes")}.`,
    none: "Aucune enveloppe de projet en cours.",
    bar: (title: string, percent: number) => `${title} : ${percent} %`,
    open: "Voir les budgets",
  },
  proof: {
    title: "Justificatifs",
    missing: (count: number) =>
      plural(
        count,
        "dépense facturée ou payée",
        "dépenses facturées ou payées",
      ),
    missingEnd: " sans justificatif.",
    done: "Chaque dépense facturée ou payée a son justificatif.",
    open: "Voir les dépenses sans justificatif",
  },
  watch: {
    title: "À surveiller",
    count: (count: number) =>
      plural(count, "point demande", "points demandent"),
    end: " votre attention.",
    none: "Rien à surveiller pour l'instant.",
    open: "Voir les alertes",
  },
  actions: "Actions rapides",
  importStatement: "Importer un relevé Qonto",
  export: "Exporter pour le comptable",
} as const;
