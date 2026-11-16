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
    // Where the titles come from: the Distribution since the contract's
    // start, and those delivered outside PDS OS.
    origin: (delivered: number, fromDistribution: number, outside: number) =>
      [
        plural(delivered, "titre livré", "titres livrés"),
        fromDistribution > 0 && `${fromDistribution} par la Distribution`,
        outside > 0 && `${outside} hors PDS OS`,
      ]
        .filter(Boolean)
        .join(" · "),
    figures: {
      contract: "Contrat",
      received: "Reçu",
      left: "Reste à recevoir",
    },
    complete: "Contrat entièrement versé.",
    planned: "Avance prévue",
    trancheOf: (n: number, of: number | null) =>
      of === null ? `Avance n° ${n}` : `Avance ${n}/${of}`,
    // The show whose provisional titles complete the tranche.
    plannedBy: (show: string) => `Déclenchée par « ${show} »`,
    due: "Tranche complète : avance attendue",
    nextUnknown: "Aucune avance prévue avec les émissions planifiées.",
    received: "Avance reçue",
    receivedTitle: "Marquer l'avance comme reçue ?",
    receivedBody: (amount: string) =>
      `L'avance de ${amount} compte comme versée par The Orchard et sort des prévisions.`,
    receivedConfirm: "Avance reçue",
    receivedPending: "Enregistrement…",
    stale: "Les avances ont changé entre-temps : rechargez la page.",
    setUp: "Renseigner le contrat",
    editShort: "Modifier le contrat",
    deliveries: {
      title: "Titres livrés à The Orchard",
      row: (project: string, release: string | null) =>
        release ? `${project} · ${release}` : project,
      sub: (day: string, titles: number) =>
        `Déposé le ${day} · ${plural(titles, "titre", "titres")}`,
    },
    form: {
      title: "Contrat The Orchard",
      description:
        "Les avances sont versées par tranche de titres livrés, jusqu'au montant du contrat.",
      contract: "Montant du contrat",
      contractHint: "Vide : les avances continuent sans limite.",
      tranche: "Avance par tranche",
      per: "Titres par tranche",
      countsFrom: "Début du contrat",
      countsFromHint:
        "Les titres déposés dans The Orchard depuis cette date sont comptés par la Distribution.",
      counted: "Titres livrés hors PDS OS",
      countedHint:
        "Avant le début du suivi ici, ou déposés sans passer par la Distribution.",
      received: "Avances déjà reçues",
      save: "Enregistrer",
      saving: "Enregistrement…",
      errors: {
        contract: "Un montant en euros, ou rien.",
        tranche: "Indiquez un montant en euros.",
        per: "Un nombre de 1 à 1 000.",
        counted: "Un nombre positif.",
        received: "Un nombre de 0 à 1 000.",
      },
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
    settings: "Contrat The Orchard enregistré",
    received: "Avance The Orchard reçue",
    format: "Format créé",
    show: "Émission enregistrée",
    showCancelled: "Émission annulée",
    line: "Crédit Pay Later créé",
    draw: "Dépense financée",
    drawRemoved: "Achat retiré",
  },
} as const;
