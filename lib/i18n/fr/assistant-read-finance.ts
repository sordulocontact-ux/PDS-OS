/** Facts of PO's `finance` reading (lot 7 of Finance's new style,
 * docs/FINANCE-V2.md): sentences written by code, every figure and date
 * computed by lib/finance/ and only copied by the model. */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const assistantReadFinance = {
  hidden:
    "La Finance se lit par la direction et la Finance (business managers, poste Business) : ce n'est pas votre cas. Le budget d'un projet se lit par son responsable, dans l'onglet Budget du projet.",
  sources: {
    treasury: "Finance · Trésorerie",
    late: "Finance · Factures en retard",
    incomes: "Finance · Factures",
    toPay: "Finance · Dépenses à payer",
    budgets: "Finance · Budgets",
    noProof: "Finance · Dépenses sans justificatif",
    orchard: "Finance · Financements",
  },
  treasury: {
    noStatement:
      "Aucun relevé de compte n'est saisi : le solde et la prévision ne se calculent pas sans lui (Finance › Trésorerie, « Mettre à jour le solde »).",
    today: (amount: string, asOf: string) =>
      `Solde du compte aujourd'hui : ${amount} (dernier relevé du ${asOf}, plus les encaissements et moins les dépenses payées depuis).`,
    at: (days: number, amount: string) =>
      `Solde prévu dans ${days} jours : ${amount}.`,
    low: (days: number, amount: string, day: string) =>
      `Point bas de trésorerie des ${days} prochains jours : ${amount}, le ${day}.`,
    lowToday: (days: number, amount: string) =>
      `Point bas de trésorerie des ${days} prochains jours : ${amount}, aujourd'hui (le solde ne descend pas plus bas).`,
    noReserve: "Aucune réserve minimale n'est fixée.",
    below: (reserve: string, day: string) =>
      `Le solde passe sous la réserve de ${reserve} le ${day}, si rien ne bouge.`,
    held: (reserve: string, days: number) =>
      `Le solde reste au-dessus de la réserve de ${reserve} sur les ${days} prochains jours.`,
    movesTitle: (count: number) =>
      `Jusqu'au point bas, ${plural(count, "mouvement prévu", "mouvements prévus")} :`,
    move: (day: string, label: string, amount: string, balance: string) =>
      `${day} · ${label} : ${amount} (solde après : ${balance})`,
    late: " (en retard, compté aujourd'hui)",
    noMove: "Aucun mouvement prévu d'ici là.",
    forecastNote:
      "La prévision ajoute ce que chaque entrée attend encore, à son échéance, et retire chaque dépense pas encore payée ; ce qui est en retard compte pour aujourd'hui.",
  },
  incomes: {
    late: (count: number, amount: string) =>
      count === 0
        ? "Aucune entrée d'argent n'est en retard."
        : `${plural(count, "entrée d'argent en retard", "entrées d'argent en retard")}, ${amount} à encaisser au total :`,
    lateLine: (
      label: string,
      payer: string,
      amount: string,
      days: number,
      due: string,
    ) =>
      `${label}${payer} : ${amount} à encaisser, en retard de ${plural(days, "jour", "jours")} (attendue le ${due})`,
    payer: (name: string) => ` (${name})`,
    invoice: (number: string) => `, facture ${number}`,
    lastReminder: (day: string) => `, dernière relance le ${day}`,
    noReminder: ", jamais relancée",
    open: (count: number, amount: string) =>
      count === 0
        ? "Rien n'attend d'être encaissé."
        : `${plural(count, "entrée ouverte", "entrées ouvertes")} en tout, ${amount} à encaisser.`,
    nextTitle: "Prochaines entrées attendues :",
    nextLine: (day: string, label: string, amount: string) =>
      `${day} · ${label} : ${amount}`,
  },
  toPay: {
    total: (count: number, days: number, amount: string) =>
      count === 0
        ? `Rien à payer d'ici ${days} jours.`
        : `${plural(count, "dépense", "dépenses")} à payer d'ici ${days} jours, ${amount} au total :`,
    lateTotal: (amount: string) => `Dont ${amount} déjà échus.`,
    line: (day: string, label: string, amount: string, late: boolean) =>
      `${day} · ${label} : ${amount}${late ? " (échue, comptée aujourd'hui)" : ""}`,
  },
  budgets: {
    notFound: (name: string) =>
      `Aucune enveloppe de Finance (projet, artiste, centre de coût) ne s'appelle « ${name} ».`,
    kinds: {
      project: "projet",
      artist: "artiste",
      cost_center: "centre de coût",
    },
    noAmount: (name: string, kind: string) =>
      `L'enveloppe ${name} (${kind}) n'a pas de montant fixé : rien ne se calcule en reste.`,
    envelope: (name: string, kind: string, amount: string) =>
      `Enveloppe ${name} (${kind}) : ${amount}.`,
    period: (from: string, to: string | null) =>
      to
        ? `Elle couvre la période du ${from} au ${to}.`
        : `Elle couvre la période depuis le ${from}.`,
    engaged: (
      amount: string,
      percent: number,
      committed: string,
      invoiced: string,
      paid: string,
    ) =>
      `Engagé : ${amount}, soit ${percent} % de l'enveloppe (commandé ${committed}, facturé ${invoiced}, payé ${paid}).`,
    planned: (amount: string) =>
      `Prévu, pas encore engagé : ${amount} (n'entame pas l'enveloppe).`,
    rest: (amount: string) => `Reste disponible : ${amount}.`,
    overrun: (amount: string) =>
      `Dépassement : ${amount} au-delà de l'enveloppe.`,
    lines: (count: number) =>
      plural(count, "ligne de dépense", "lignes de dépense"),
    listTitle: (count: number, amount: string) =>
      `${plural(count, "enveloppe en cours", "enveloppes en cours")}, ${amount} disponibles au total (les plus consommées d'abord) :`,
    listLine: (
      name: string,
      kind: string,
      engaged: string,
      envelope: string,
      percent: number,
      rest: string,
    ) =>
      `${name} (${kind}) : ${engaged} engagés sur ${envelope} (${percent} %), ${rest}`,
    listRest: (amount: string) => `reste ${amount}`,
    listOverrun: (amount: string) => `dépassement de ${amount}`,
    none: "Aucune enveloppe en cours n'a de montant fixé.",
    ht: "Montants des budgets hors taxes.",
  },
  noProof: {
    total: (count: number) =>
      count === 0
        ? "Chaque dépense facturée ou payée a son justificatif."
        : `${plural(count, "dépense facturée ou payée", "dépenses facturées ou payées")} sans justificatif :`,
    line: (label: string, supplier: string, amount: string, day: string) =>
      `${label}${supplier} : ${amount}, du ${day}`,
    supplier: (name: string) => ` (${name})`,
  },
  orchard: {
    contract: (tranche: string, per: number, total: string | null) =>
      total
        ? `Contrat The Orchard de ${total} : une avance de ${tranche} tous les ${per} titres livrés.`
        : `Contrat The Orchard : une avance de ${tranche} tous les ${per} titres livrés, sans montant total saisi.`,
    received: (count: number, received: string, left: string | null) =>
      `${plural(count, "avance reçue", "avances reçues")} (${received})${left === null ? "" : `, reste ${left} à recevoir`}.`,
    complete:
      "Le contrat est entièrement versé : plus aucune avance n'est attendue.",
    delivered: (
      total: number,
      fromDistribution: number,
      since: string | null,
      outside: number,
    ) =>
      `${plural(total, "titre livré", "titres livrés")} : ${fromDistribution} déposés par la Distribution${since ? ` depuis le ${since}` : " (aucune date de début du contrat saisie, rien n'est compté par la Distribution)"}, ${outside} saisis hors PDS OS.`,
    toward: (counted: number, per: number) =>
      `Vers la prochaine avance : ${counted} titres sur ${per}, il en manque ${per - counted}.`,
    due: (count: number, amount: string) =>
      `${count > 1 ? `${count} tranches complètes` : "Tranche complète"} : ${amount} attendus de The Orchard, pas encore marqués reçus.`,
    next: (label: string, day: string, amount: string, show: string) =>
      `${label} prévue le ${day} : ${amount}, déclenchée par les titres provisoires de « ${show} ».`,
    noNext: "Aucune autre avance n'est prévue avec les émissions planifiées.",
    deliveriesTitle: (count: number) =>
      `${plural(count, "dépôt compté", "dépôts comptés")}, du plus récent :`,
    delivery: (day: string, name: string, titles: number) =>
      `${day} · ${name} : ${plural(titles, "titre", "titres")}`,
  },
} as const;
