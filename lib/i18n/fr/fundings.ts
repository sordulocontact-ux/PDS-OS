/** Finance › Financements: Orchard, the shows, Pay Later, the rebillings and
 * the reserve (Ibé's ticket « Cockpit Finance », maquette 7, lot 5). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const fundings = {
  title: "Financements",
  moves: {
    orchard: "Avance The Orchard",
    show: (label: string) => label,
    installment: (label: string, n: number, of: number) =>
      `Pay Later · ${label} (${n}/${of})`,
  },
  engines: {
    orchard: "Orchard",
    show: "Émission",
    pay_later: "Pay Later",
  },
  orchard: {
    title: "The Orchard · avances",
    caption: (per: number) => `tous les ${per} titres livrés`,
    counted: (count: number, per: number) => `${count} sur ${per} titres`,
    countedLine: (count: number, per: number) =>
      `Titres comptés vers la prochaine avance : ${count} / ${per}`,
    planned: "Avance prévue",
    // The show whose provisional titles complete the tranche.
    plannedBy: (show: string) => `Avec « ${show} »`,
    due: "Tranche déjà complète : avance attendue",
    nextUnknown: "Aucune avance prévue avec les émissions planifiées.",
    edit: "Régler",
    form: {
      title: "Règle The Orchard",
      description:
        "L'avance par tranche, les titres d'une tranche, et ceux livrés depuis la dernière avance (à remettre à zéro quand elle arrive).",
      tranche: "Avance par tranche",
      per: "Titres par tranche",
      counted: "Titres livrés depuis la dernière avance",
      save: "Enregistrer",
      saving: "Enregistrement…",
      error: "Des nombres positifs.",
    },
  },
  shows: {
    title: "Émissions et lives",
    budgetOpen: "Budget ouvert",
    planned: "Prévue",
    onDay: (day: string, titles: number) =>
      titles
        ? `${day} · ${plural(titles, "titre provisoire", "titres provisoires")}`
        : day,
    noShows: "Aucune émission planifiée.",
    plan: "Nouvelle émission",
    move: "Changer la date",
    cancel: "Annuler l'émission",
    cancelTitle: "Annuler cette émission ?",
    cancelBody:
      "Son coût et ses titres sortent des prévisions. L'historique la garde.",
    cancelling: "Annulation…",
    rowActions: (label: string) => `Actions pour « ${label} »`,
    form: {
      title: "Planifier une émission",
      moveTitle: "Changer la date",
      description:
        "Un format, un nom et une date : son coût et ses titres suivent.",
      format: "Format",
      label: "Nom",
      day: "Date",
      save: "Enregistrer",
      saving: "Enregistrement…",
      errors: {
        format: "Choisissez un format.",
        label: "Donnez un nom.",
        day: "Indiquez la date.",
      },
    },
  },
  formats: {
    add: "Nouveau format",
    cost: (amount: string) => `${amount} / émission`,
    noFormat:
      "Aucun format : un format donne son coût et ses titres provisoires.",
    form: {
      title: "Nouveau format",
      description:
        "Une émission, un live, un tournage : ce qu'il coûte et les titres qu'il donne.",
      name: "Nom",
      cost: "Coût par émission",
      titles: "Titres provisoires par émission",
      save: "Créer",
      saving: "Création…",
      errors: {
        name: "Donnez un nom.",
        cost: "Indiquez un montant en euros.",
        titles: "Un nombre de 0 à 100.",
      },
    },
  },
  payLater: {
    title: "Pay Later",
    empty: "Aucune ligne de crédit.",
    noDraws: "Aucun tirage.",
    figures: { total: "Crédit total", used: "Utilisé", free: "Disponible" },
    summary: (amount: string, fee: string) =>
      `Mensualité ${amount} dont ${fee} d'intérêts`,
    progress: (paid: number, total: number) => `${paid} payées sur ${total}`,
    nextDay: (day: string) => `prochaine le ${day}`,
    installment: (n: number, of: number) => `Mensualité ${n}/${of}`,
    noInstallments: "Aucune mensualité à venir.",
    draws: "Tirages",
    addLine: "Nouvelle ligne de crédit",
    draw: "Nouveau tirage",
    remove: "Retirer le tirage",
    removeTitle: "Retirer ce tirage ?",
    removeBody:
      "Ses mensualités sortent des prévisions. L'historique le garde.",
    removing: "Retrait…",
    columns: {
      label: "Tirage",
      next: "Prochaine mensualité",
      left: "Reste",
      actions: "Actions",
    },
    drawLine: (amount: string, n: number, fee: string) =>
      `${amount} en ${n} fois · frais ${fee}`,
    nextOn: (amount: string, day: string) => `${amount} le ${day}`,
    done: "Remboursé",
    lineForm: {
      title: "Nouvelle ligne de crédit",
      description: "Un Pay Later et son plafond.",
      name: "Nom",
      limit: "Plafond",
      save: "Créer",
      saving: "Création…",
      errors: {
        name: "Donnez un nom.",
        limit: "Indiquez un montant en euros.",
      },
    },
    drawForm: {
      title: "Nouveau tirage",
      description:
        "Ce que finance le Pay Later. La dépense choisie sort alors par ses mensualités, plus à sa date.",
      line: "Ligne de crédit",
      spend: "Dépense financée",
      noSpend: "Aucune",
      label: "Libellé",
      amount: "Montant financé",
      drawnOn: "Date du tirage",
      installments: "Nombre de mensualités",
      fee: "Frais du crédit",
      feeHint: "En % du montant, pour toute la durée.",
      save: "Enregistrer",
      saving: "Enregistrement…",
      errors: {
        line: "Choisissez une ligne de crédit.",
        label: "Donnez un libellé.",
        amount: "Indiquez un montant en euros.",
        drawnOn: "Indiquez la date.",
        installments: "De 1 à 60 mensualités.",
        fee: "Un pourcentage de 0 à 50.",
      },
    },
  },
  rebill: {
    title: "Remboursements et réserve",
    expected: (count: number) =>
      plural(count, "refacturation attendue", "refacturations attendues"),
    missing: (count: number) =>
      plural(
        count,
        "dépense refacturable sans remboursement",
        "dépenses refacturables sans remboursement",
      ),
    none: "Rien à rembourser.",
    row: "Remboursements à refacturer",
  },
  reserve: {
    title: "Réserve",
    caption: (amount: string) => `Réserve minimale ${amount}`,
    none: "Aucune réserve minimale.",
  },
  loadError: "Les financements n'ont pas pu être chargés.",
  errors: {
    overLimit: "Ce tirage dépasserait le crédit disponible.",
  },
  done: {
    settings: "Règle enregistrée",
    format: "Format créé",
    show: "Émission enregistrée",
    showCancelled: "Émission annulée",
    line: "Ligne de crédit créée",
    draw: "Tirage enregistré",
    drawRemoved: "Tirage retiré",
  },
} as const;
