/** Finance › Financements: Orchard, the shows, Pay Later, the rebillings and
 * the reserve (Ibé's ticket « Cockpit Finance », maquette 7, lot 5). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const fundings = {
  title: "Financements",
  more: "Autres actions",
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
    plannedBy: (show: string) => `Avance déclenchée par « ${show} »`,
    due: "Tranche déjà complète : avance attendue",
    nextUnknown: "Aucune avance prévue avec les émissions planifiées.",
    edit: "Modifier la règle",
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
    plan: "Planifier une émission",
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
      description: "",
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
    add: "Nouveau format d'émission",
    // The unit a format knows itself by, read from its name (émission,
    // live, tournage): « 7 600 € / live ».
    unitOf: (name: string) =>
      /live/i.test(name)
        ? "live"
        : /tournage|shoot/i.test(name)
          ? "tournage"
          : "émission",
    cost: (amount: string, unit: string) => `${amount} / ${unit}`,
    noFormat:
      "Aucun format : un format donne son coût et ses titres provisoires.",
    form: {
      title: "Nouveau format d'émission",
      description: "",
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
    empty: "Aucun crédit Pay Later.",
    noDraws: "Aucun achat en plusieurs fois.",
    figures: { total: "Crédit total", used: "Utilisé", free: "Disponible" },
    summary: (amount: string, fee: string) =>
      `Mensualité ${amount} dont ${fee} d'intérêts`,
    progress: (paid: number, total: number) => `${paid} payées sur ${total}`,
    nextDay: (day: string) => `prochaine le ${day}`,
    installment: (n: number, of: number) => `Mensualité ${n}/${of}`,
    noInstallments: "Aucune mensualité à venir.",
    draws: "Achats en plusieurs fois",
    addLine: "Nouveau crédit Pay Later",
    draw: "Financer une dépense",
    remove: "Retirer l'achat",
    removeTitle: "Retirer cet achat ?",
    removeBody:
      "Ses mensualités sortent des prévisions. L'historique le garde.",
    removing: "Retrait…",
    columns: {
      label: "Achat",
      next: "Prochaine mensualité",
      left: "Reste",
      actions: "Actions",
    },
    drawLine: (amount: string, n: number, fee: string) =>
      `${amount} en ${n} fois · frais ${fee}`,
    nextOn: (amount: string, day: string) => `${amount} le ${day}`,
    done: "Remboursé",
    lineForm: {
      title: "Nouveau crédit Pay Later",
      description: "",
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
      title: "Financer une dépense",
      description:
        "Ce que finance le Pay Later. La dépense choisie sort alors par ses mensualités, plus à sa date.",
      line: "Crédit Pay Later",
      spend: "Dépense",
      noSpend: "Aucune",
      label: "Libellé",
      amount: "Montant financé",
      drawnOn: "Date du financement",
      installments: "Nombre de mensualités",
      fee: "Frais du crédit",
      feeHint: "En % du montant, pour toute la durée.",
      save: "Enregistrer",
      saving: "Enregistrement…",
      errors: {
        line: "Choisissez un crédit Pay Later.",
        label: "Donnez un libellé.",
        amount: "Indiquez un montant en euros.",
        drawnOn: "Indiquez la date.",
        installments: "De 1 à 60 mensualités.",
        fee: "Un pourcentage de 0 à 50.",
      },
    },
  },
  rebill: {
    title: "Refacturations et réserve",
    expected: (count: number) =>
      plural(count, "refacturation attendue", "refacturations attendues"),
    missing: (count: number) =>
      plural(
        count,
        "dépense à refacturer sans entrée prévue",
        "dépenses à refacturer sans entrée prévue",
      ),
    none: "Rien à rembourser.",
    row: "Refacturations attendues",
  },
  reserve: {
    title: "Réserve",
    caption: (amount: string) => `Réserve minimale ${amount}`,
    none: "Aucune réserve minimale.",
  },
  loadError: "Les financements n'ont pas pu être chargés.",
  errors: {
    overLimit: "Cette dépense dépasserait le crédit disponible.",
  },
  done: {
    settings: "Règle enregistrée",
    format: "Format créé",
    show: "Émission enregistrée",
    showCancelled: "Émission annulée",
    line: "Crédit Pay Later créé",
    draw: "Dépense financée",
    drawRemoved: "Achat retiré",
  },
} as const;
