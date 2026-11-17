/** Finance › the treasury and the money coming in (Ibé's ticket « Cockpit
 * Finance », 13/11/2026). */

import { horizonSpan } from "@/lib/i18n/fr/horizon";

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const treasury = {
  tabs: {
    label: "Sections de Finance",
    // Said after a section's name when something waits in it.
    waiting: (count: number) => `, ${count} à traiter`,
    overview: "Vue d'ensemble",
    treasury: "Trésorerie",
    planning: "Planning",
    budgets: "Budgets",
    incomes: "Factures",
    fundings: "Financements",
    reconcile: "Rapprochement",
    receipts: "Justificatifs",
    alerts: "Alertes",
    exports: "Exports",
    // The second sidebar's groups.
    groups: {
      steer: "Piloter",
      spend: "Dépenser",
      earn: "Encaisser et financer",
      bank: "Banque et comptabilité",
    },
    expenses: "Dépenses",
  },
  titles: {
    overview: "Vue d'ensemble",
    treasury: "Trésorerie",
    budgets: "Budgets",
    incomes: "Factures",
  },
  loadError:
    "Une partie des chiffres n'a pas pu être chargée. Rechargez la page.",

  overview: {
    balance: {
      title: "Solde du compte",
      caption: (day: string) => `D'après le relevé du ${day}`,
      ahead: (days: number, amount: string, delta: string) =>
        `${amount} prévus dans ${horizonSpan(days)} (${delta})`,
      signed: (amount: string, up: boolean) => `${up ? "+" : "−"}${amount}`,
      open: "Trésorerie",
      openLabel: "Ouvrir la trésorerie et la courbe du solde",
    },
    incoming: {
      title: "À encaisser",
      caption: (count: number) =>
        count === 0
          ? "Rien en attente"
          : plural(count, "entrée attendue", "entrées attendues"),
      late: (amount: string) => `dont ${amount} en retard`,
      empty: "Aucune entrée prévue.",
      all: "Tout voir",
    },
    outgoing: {
      title: "À payer",
      caption: (count: number, days: number) =>
        count === 0
          ? `Rien d'ici ${horizonSpan(days)}`
          : `${plural(count, "dépense", "dépenses")} d'ici ${horizonSpan(days)}`,
      late: (amount: string) => `dont ${amount} en retard`,
      empty: "Aucune dépense à payer.",
      all: "Tout voir",
    },
    available: {
      title: "Disponible sur les budgets",
      caption: (count: number) =>
        count === 0
          ? "Aucun budget en cours"
          : `${count} ${count > 1 ? "budgets" : "budget"} en cours`,
      rest: (left: string) => `Reste ${left}`,
      over: (over: string) => `Dépassé de ${over}`,
      progress: (title: string, engaged: string, envelope: string) =>
        `${title} : ${engaged} dépensés sur ${envelope}`,
      empty: "Aucun budget en cours.",
      all: "Tous les budgets",
    },
    due: (day: string) => `En retard · prévue le ${day}`,
    // The rows are the Alertes page's (finance-alerts.ts).
    watch: {
      title: "À surveiller",
      all: "Tout voir",
      empty: "Rien à surveiller.",
    },
    noStatement: {
      title: "Saisissez le solde du compte",
      body: "La trésorerie part du dernier relevé.",
      reader: "Le solde du compte n'a pas encore été saisi.",
    },
  },

  chart: {
    legend: "Légende",
    real: "Réel",
    forecast: "Prévu",
    reserve: "Réserve",
    today: "Aujourd'hui",
    low: "Point bas",
    summary: (today: string, low: string, lowDay: string) =>
      `Solde aujourd'hui ${today}, point bas prévu ${low} le ${lowDay}.`,
    balanceReal: "Solde",
    balanceForecast: "Solde prévu",
  },

  // « Entrées et sorties » by month (Trésorerie, after the proto's Rapports).
  flows: {
    title: "Entrées et sorties",
    in: "Entrées",
    out: "Sorties",
    legend: "Légende des entrées et sorties",
    ahead: "prévu",
    month: (
      month: string,
      inAmount: string,
      outAmount: string,
      ahead: boolean,
    ) =>
      `${month}${ahead ? " (prévu)" : ""} : entrées ${inAmount}, sorties ${outAmount}`,
    empty: "Aucun mouvement sur la période.",
  },
  // The envelope whose spends the split by poste shows.
  envelopeFilter: { label: "Budget", all: "Tous les budgets" },
  page: {
    figures: {
      label: "Sur la période",
      in: "Entrées",
      out: "Sorties",
      atHorizon: (days: number) => `Solde dans ${horizonSpan(days)}`,
      low: "Point bas",
      lowOn: (day: string) => `le ${day}`,
      reserve: "Réserve minimale",
      noReserve: "Aucune",
      below: "Sous la réserve",
    },
    horizon: "Horizon",
    horizonOption: (days: number) => horizonSpan(days),
    updateBalance: "Mettre à jour le solde",
    enterBalance: "Saisir le solde",
    reserve: "Réserve minimale",
    reserveSet: (amount: string) => `Réserve : ${amount}`,
    calendar: {
      title: "Calendrier financier",
      empty: "Aucun mouvement prévu sur cette période.",
      date: "Date",
      operation: "Opération",
      source: "Pour",
      nature: "Statut",
      amount: "Montant",
      balance: "Solde prévu",
      late: (day: string) => `En retard · prévue le ${day}`,
      in: "Entrée",
      out: "Sortie",
      spend: "Dépense",
    },
  },

  // The state of an income (lib/finance/money-in.ts).
  states: {
    expected: "Prévue",
    draft: "Pas envoyée",
    sent: "Envoyée",
    late: "En retard",
    partial: "Partiellement encaissée",
    received: "Encaissée",
    credited: "Avoir",
    cancelled: "Annulée",
  },
  // The state of a spend still to pay, in the calendar.
  spendStates: {
    planned: "Prévue",
    proposed: "Proposée",
    committed: "Engagée",
    invoiced: "Facturée",
    paid: "Payée",
  },
  kinds: {
    advance: "Avance",
    service: "Prestation",
    label_refund: "Remboursement label",
    rebilling: "Refacturation",
    distribution: "Distribution",
    partnership: "Partenariat",
    other: "Autre entrée",
  },

  incomes: {
    tiles: {
      expected: "Sans facture",
      expectedHint: (count: number) =>
        count === 0
          ? "Aucune entrée sans facture"
          : plural(count, "entrée", "entrées"),
      toCollect: "Facturé",
      toCollectHint: (count: number) =>
        count === 0
          ? "Aucune facture à encaisser"
          : `${plural(count, "facture", "factures")} à encaisser`,
      late: "En retard",
      lateHint: (count: number) =>
        count === 0 ? "Aucune en retard" : plural(count, "entrée", "entrées"),
      received: "Encaissé ce mois",
      receivedHint: (count: number) =>
        count === 0
          ? "Aucun encaissement"
          : plural(count, "encaissement", "encaissements"),
    },
    views: {
      label: "Entrées",
      open: "À encaisser",
      late: "En retard",
      received: "Encaissées",
      cancelled: "Annulées",
    },
    columns: {
      label: "Entrée",
      target: "Projet / artiste",
      due: "Échéance",
      state: "État",
      amount: "Montant",
      actions: "Actions",
      // The proto's columns (Sacha 15/11/2026).
      invoice: "Facture",
      client: "Client",
      status: "Statut",
      reminder: "Relance",
      left: "Reste TTC",
      total: "Montant TTC",
    },
    // The days under a due day, computed by the code from today.
    dueIn: {
      ago: (days: number) => `il y a ${days} j`,
      ahead: (days: number) => `dans ${days} j`,
      today: "aujourd'hui",
    },
    chase: {
      last: (day: string) => `Dernière le ${day}`,
      never: "Jamais",
      next: (action: string, parts: string[]) =>
        ["Prochaine : " + action, ...parts].join(" · "),
    },
    emptyTitle: "Aucune entrée d'argent",
    emptyBody:
      "Avances, prestations, remboursements : tout ce qui doit arriver sur le compte.",
    emptyView: "Aucune entrée ici.",
    searchLabel: "Rechercher une facture",
    search: "Rechercher une facture, un client",
    noResult: (query: string) => `Aucune facture ne correspond à « ${query} ».`,
    // « Entrée prévue » was misread (UX test of 15/11/2026).
    add: "Ajouter une entrée",
    rowActions: (label: string) => `Actions pour « ${label} »`,
    receive: "Enregistrer un encaissement",
    edit: "Modifier",
    cancel: "Annuler la facture",
    cancelEntry: "Annuler l'entrée",
    partOf: (received: string, total: string) => `${received} sur ${total}`,
    invoice: (number: string) => `Facture ${number}`,
  },

  incomeForm: {
    newTitle: "Ajouter une entrée",
    editTitle: "Modifier l'entrée",
    description: "",
    label: "Libellé",
    kind: "Nature",
    amount: "Montant attendu TTC",
    payer: "Client ou payeur",
    project: "Projet",
    artist: "Artiste",
    none: "Aucun",
    search: "Rechercher",
    noMatch: "Aucun résultat",
    expectedOn: "Attendue le",
    invoiceTitle: "Facture",
    invoiceNumber: "Numéro de facture",
    invoicedOn: "Date d'émission",
    dueOn: "Échéance",
    note: "Note",
    save: "Enregistrer",
    saving: "Enregistrement…",
    errors: {
      label: "Donnez un libellé.",
      amount: "Indiquez un montant en euros.",
      expectedOn: "Indiquez la date prévue.",
      invoicedOn: "Indiquez la date d'émission de la facture.",
      invoiceNumber: "Indiquez le numéro de la facture.",
      dueOn: "L'échéance suit l'émission de la facture.",
      sentOn: "L'envoi suit l'émission de la facture.",
      missing: (count: number) =>
        count === 1 ? "Un champ à corriger." : `${count} champs à corriger.`,
    },
    done: { created: "Entrée enregistrée", changed: "Entrée modifiée" },
  },

  receiptForm: {
    title: "Enregistrer un encaissement",
    description: (label: string) => `Argent reçu pour « ${label} ».`,
    earlier: "Déjà encaissé",
    remove: (amount: string, day: string) => `Retirer ${amount} du ${day}`,
    removeTitle: "Retirer cet encaissement ?",
    removeBody: "Il sort du calcul de la trésorerie. L'historique le garde.",
    removeConfirm: "Retirer",
    removing: "Retrait…",
    removed: "Encaissement retiré",
    amount: "Montant reçu",
    remaining: (amount: string) => `Reste à encaisser : ${amount}`,
    receivedOn: "Date de réception",
    note: "Note",
    save: "Enregistrer",
    saving: "Enregistrement…",
    errors: {
      amount: "Indiquez un montant en euros.",
      over: (amount: string) => `Au plus ${amount}, ce qui reste à encaisser.`,
      receivedOn: "Indiquez la date de réception.",
    },
    done: "Encaissement enregistré",
  },

  cancelForm: {
    title: "Annuler la facture",
    entryTitle: "Annuler l'entrée",
    description: "Elle sort des prévisions et reste dans l'historique.",
    reason: "Motif",
    reasonMissing: "Donnez le motif.",
    confirm: "Annuler la facture",
    entryConfirm: "Annuler l'entrée",
    pending: "Annulation…",
    done: "Entrée annulée",
  },

  statementForm: {
    title: "Mettre à jour le solde",
    description: "",
    amount: "Solde du compte",
    asOf: "Date du relevé",
    note: "Note",
    save: "Enregistrer",
    saving: "Enregistrement…",
    errors: {
      amount: "Indiquez le solde en euros (un « - » devant s'il est négatif).",
      asOf: "Indiquez la date du relevé.",
      future: "La date du relevé n'est pas encore passée.",
    },
    done: "Solde enregistré",
  },

  reserveForm: {
    title: "Réserve minimale",
    description: "Sous ce montant, la trésorerie le signale.",
    amount: "Réserve",
    save: "Enregistrer",
    saving: "Enregistrement…",
    error: "Indiquez un montant en euros.",
    done: "Réserve enregistrée",
  },

  errors: {
    forbidden: "Seules la direction et la Finance modifient la trésorerie.",
    invalid: "Certaines informations ne sont pas valides.",
    overAmount: "Les encaissements dépasseraient le montant de l'entrée.",
    belowReceived:
      "Le montant ne peut pas passer sous ce qui est déjà encaissé.",
    hasReceipts:
      "Cette entrée a déjà reçu de l'argent : elle ne peut plus être annulée.",
    hasCredits: "Cette facture a un avoir : elle ne peut plus être annulée.",
    creditOver: "L'avoir dépasserait ce qui reste à encaisser.",
    creditWithoutInvoice:
      "Un avoir corrige une facture : numérotez-la d'abord.",
    creditBeforeInvoice: "L'avoir ne peut pas précéder la facture.",
    cancelled: "Cette entrée est annulée.",
    generic: "L'enregistrement n'a pas abouti. Réessayez.",
  },
} as const;
