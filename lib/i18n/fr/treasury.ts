/** Finance › the treasury and the money coming in (Ibé's ticket « Cockpit
 * Finance », 13/11/2026). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const treasury = {
  tabs: {
    label: "Sections de Finance",
    overview: "Vue d'ensemble",
    treasury: "Trésorerie",
    budgets: "Budgets",
    incomes: "Factures & encaissements",
    fundings: "Financements",
    reconcile: "Rapprochement",
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
    incomes: "Factures & encaissements",
  },
  loadError:
    "Une partie des chiffres n'a pas pu être chargée. Rechargez la page.",

  overview: {
    balance: {
      title: "Solde du compte",
      caption: (day: string) => `Relevé du ${day} et mouvements depuis`,
      ahead: (days: number, amount: string, delta: string) =>
        `${amount} prévus dans ${days} jours (${delta})`,
      signed: (amount: string, up: boolean) => `${up ? "+" : "−"}${amount}`,
      open: "Trésorerie",
    },
    incoming: {
      title: "À encaisser",
      caption: (count: number) =>
        count === 0
          ? "Rien en attente"
          : plural(count, "entrée ouverte", "entrées ouvertes"),
      late: (amount: string) => `dont ${amount} en retard`,
      empty: "Aucune entrée prévue.",
      all: "Tout voir",
    },
    outgoing: {
      title: "À payer",
      caption: (count: number, days: number) =>
        count === 0
          ? `Rien d'ici ${days} jours`
          : `${plural(count, "dépense", "dépenses")} d'ici ${days} jours`,
      late: (amount: string) => `dont ${amount} en retard`,
      empty: "Aucune dépense à payer.",
      all: "Calendrier",
    },
    available: {
      title: "Disponible sur les budgets",
      caption: (count: number) =>
        count === 0
          ? "Aucune enveloppe de projet"
          : plural(count, "enveloppe active", "enveloppes actives"),
      row: (engaged: string, envelope: string) => `${engaged} sur ${envelope}`,
      progress: (title: string, engaged: string, envelope: string) =>
        `${title} : ${engaged} engagés sur ${envelope}`,
      empty: "Aucune enveloppe de projet en cours.",
      all: "Tous les budgets",
    },
    due: (day: string) => `Prévu le ${day}`,
    watch: {
      title: "À surveiller",
      all: "Toutes les alertes",
      empty: "Rien à surveiller.",
      belowReserve: "Sous la réserve minimale",
      belowReserveSub: (day: string, amount: string) =>
        `Le ${day}, solde prévu ${amount}`,
      lowPoint: "Point bas prévu",
      lateIncome: (label: string) => label,
      lateIncomeSub: (days: number) =>
        `Échéance dépassée de ${plural(days, "jour", "jours")}`,
      budget: (title: string, percent: number) => `${title} à ${percent} %`,
      budgetOver: (title: string) => `${title} dépasse son enveloppe`,
      budgetSub: (left: string) => `${left} encore disponibles`,
      budgetOverSub: (over: string) => `Dépassé de ${over}`,
      noProof: (count: number) =>
        plural(
          count,
          "dépense sans justificatif",
          "dépenses sans justificatif",
        ),
      noProofSub: "Facturées ou payées",
      offBudget: (count: number) =>
        plural(count, "dépense hors budget", "dépenses hors budget"),
      offBudgetSub: (amount: string) => `${amount} sur aucune enveloppe`,
      rebill: (count: number) =>
        plural(
          count,
          "dépense refacturable sans remboursement",
          "dépenses refacturables sans remboursement",
        ),
      rebillSub: "Aucune recette attendue ne les rembourse",
      toVerify: "À vérifier",
      urgent: "Urgent",
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
  },

  page: {
    balance: {
      title: "Solde aujourd'hui",
      caption: (day: string) => `Dernier relevé le ${day}`,
    },
    figures: {
      label: "Sur la période",
      in: "Entrées",
      out: "Sorties",
      atHorizon: (days: number) => `Solde dans ${days} jours`,
      low: "Point bas",
      lowOn: (day: string) => `le ${day}`,
      reserve: "Réserve minimale",
      noReserve: "Aucune",
      below: "Sous la réserve",
    },
    horizon: "Horizon",
    horizonOption: (days: number) => `${days} jours`,
    updateBalance: "Mettre à jour le solde",
    enterBalance: "Saisir le solde",
    reserve: "Réserve minimale",
    calendar: {
      title: "Calendrier financier",
      empty: "Aucun mouvement prévu sur cette période.",
      date: "Date",
      operation: "Opération",
      source: "Projet / source",
      nature: "Nature",
      amount: "Montant",
      balance: "Solde prévu",
      late: (day: string) => `Prévu le ${day}`,
      in: "Entrée",
      out: "Sortie",
    },
  },

  // The state of an income (lib/finance/money-in.ts).
  states: {
    expected: "Prévue",
    draft: "Brouillon",
    sent: "Envoyée",
    late: "En retard",
    partial: "Partiellement encaissée",
    received: "Encaissée",
    credited: "Avoir",
    cancelled: "Annulée",
  },
  // The state of a spend still to pay, in the calendar.
  spendStates: {
    planned: "Estimée",
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
      expected: "Prévu",
      expectedHint: (count: number) =>
        count === 0 ? "Rien de prévu" : plural(count, "entrée", "entrées"),
      toCollect: "À encaisser",
      toCollectHint: (count: number) =>
        count === 0 ? "Aucune facture" : plural(count, "facture", "factures"),
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
    },
    emptyTitle: "Aucune entrée d'argent",
    emptyBody:
      "Avances, prestations, remboursements : tout ce qui doit arriver sur le compte.",
    emptyView: "Aucune entrée ici.",
    add: "Entrée prévue",
    rowActions: (label: string) => `Actions pour « ${label} »`,
    receive: "Enregistrer un encaissement",
    edit: "Modifier",
    cancel: "Annuler l'entrée",
    partOf: (received: string, total: string) => `${received} sur ${total}`,
    invoice: (number: string) => `Facture ${number}`,
  },

  incomeForm: {
    newTitle: "Nouvelle entrée prévue",
    editTitle: "Modifier l'entrée",
    description: "L'argent attendu sur le compte, puis sa facture.",
    label: "Libellé",
    kind: "Nature",
    amount: "Montant attendu TTC",
    payer: "Client ou payeur",
    project: "Projet",
    artist: "Artiste",
    none: "Aucun",
    search: "Rechercher",
    noMatch: "Aucun résultat",
    expectedOn: "Date prévue",
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
    title: "Annuler l'entrée",
    description: "Elle sort des prévisions et reste dans l'historique.",
    reason: "Motif",
    reasonMissing: "Donnez le motif.",
    confirm: "Annuler l'entrée",
    pending: "Annulation…",
    done: "Entrée annulée",
  },

  statementForm: {
    title: "Mettre à jour le solde",
    description: "Le solde affiché par la banque, à une date.",
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
