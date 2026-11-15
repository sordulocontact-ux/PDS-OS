/** Finance › Budgets: every envelope, its posts and sub-posts, revisions,
 * PDS share, templates and import (Ibé's ticket « Cockpit Finance »,
 * maquettes 2 et 3, lot 4). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeBudgets = {
  title: "Budgets",
  kinds: {
    label: "Enveloppes",
    all: "Toutes",
    project: "Projets",
    artist: "Artistes",
    cost_center: "Centres de coût",
  },
  kindOne: {
    project: "Projet",
    artist: "Artiste",
    cost_center: "Centre de coût",
  },
  tiles: {
    envelopes: "Enveloppes actives",
    envelopesHint: (count: number, revisions: string | null) =>
      [
        plural(count, "enveloppe", "enveloppes"),
        revisions && `révisions ${revisions}`,
      ]
        .filter(Boolean)
        .join(" · "),
    engaged: "Engagé",
    engagedHint: (invoiced: string, paid: string) =>
      `dont ${invoiced} facturés, ${paid} payés`,
    rest: "Reste disponible",
    restHint: (planned: string) => `${planned} encore prévus`,
    gap: "Écart au prévisionnel",
    gapHint: (forecast: string) => `sur ${forecast} prévus à la saisie`,
    pdsPart: "Part PDS",
    pdsPartHint: (percent: number) => `${percent} % financés par PDS`,
  },
  pie: {
    title: "Répartition par poste",
    caption: "Ce que coûtent les lignes aujourd'hui, HT.",
    none: "Sans poste",
    rest: "Autres postes",
    empty: "Aucune ligne.",
  },
  chart: {
    title: "Mois par mois",
  },
  columns: {
    envelope: "Enveloppe",
    budget: "Budget",
    planned: "Prévu",
    engaged: "Engagé",
    invoiced: "Facturé",
    paid: "Payé",
    rest: "Reste",
    rebillable: "Refacturable",
    gap: "Écart",
  },
  initial: (amount: string) => `Initial ${amount}`,
  noBudget: "Sans enveloppe",
  over: (amount: string) => `Dépassé de ${amount}`,
  signed: (amount: string, up: boolean) => `${up ? "+" : "−"}${amount}`,
  emptyTitle: "Aucune enveloppe",
  emptyBody: "Les budgets des projets, des artistes et les centres de coût.",
  emptyView: "Aucune enveloppe ici.",
  loadError: "Les budgets n'ont pas pu être chargés.",
  back: "Budgets",
  // The envelope's figures (new style, lot 4, docs/FINANCE-V2.md).
  figures: {
    rest: "Reste disponible",
    restOf: (total: string, percent: number) =>
      `sur ${total} · ${percent} % consommé`,
    noEnvelope: "Sans enveloppe : rien ne limite ces dépenses.",
    initial: "Budget initial",
    revisions: "Révisions",
    planned: "Prévu",
    committed: "Engagé",
    invoiced: "Facturé",
    paid: "Payé",
    rebill: "Refacturable",
    gap: "Écart au prévisionnel",
    pds: (percent: number) => `Part PDS (${percent} %)`,
    used: (title: string, percent: number) =>
      `${title} : ${percent} % du budget consommé`,
  },
  filter: {
    label: "Statut des lignes",
    all: "Toutes",
    planned: "Prévu",
    committed: "Engagé",
    invoiced: "Facturé",
    paid: "Payé",
  },
  detail: {
    posts: "Postes et sous-postes",
    post: "Poste",
    forecast: "Prévisionnel",
    now: "Aujourd'hui",
    stage: "Engagé · payé",
    gap: "Écart",
    noSubpost: "Sans sous-poste",
    revisions: "Révisions",
    revision: (before: string, after: string) => `${before} → ${after}`,
    noRevision: "Aucune révision depuis sa création.",
    noLines: "Aucune ligne dans cette enveloppe.",
    period: (from: string, to: string | null) =>
      to ? `Du ${from} au ${to}` : `Depuis le ${from}`,
  },
  actions: {
    newCenter: "Nouveau centre de coût",
    // To Financements › Émissions et lives (UX test of 15/11/2026: an
    // emission was created as a cost center and never reached the forecast).
    planShow: "Planifier une émission",
    rename: "Renommer",
    revise: "Réviser l'enveloppe",
    share: "Part financée par PDS",
    template: "Enregistrer comme modèle",
    import: "Importer des lignes",
  },
  centerForm: {
    title: "Nouveau centre de coût",
    description:
      "Une enveloppe hors projet et hors artiste : frais de structure, une émission, un live. Une émission à venir se planifie dans Financements, pour compter dans la prévision.",
    name: "Nom",
    amount: "Enveloppe",
    amountHint: "Vide avec un modèle : le total de ses lignes.",
    template: "Modèle",
    noTemplate: "Aucun",
    templateTotal: (count: number, amount: string) =>
      `${plural(count, "ligne", "lignes")} · ${amount}`,
    save: "Créer",
    saving: "Création…",
    errors: { name: "Donnez un nom.", amount: "Indiquez un montant en euros." },
  },
  renameForm: {
    title: "Renommer le centre de coût",
    description: "L'historique de Finance garde l'ancien nom.",
    name: "Nom",
    save: "Renommer",
    saving: "Enregistrement…",
    errors: { name: "Donnez un nom." },
  },
  reviseForm: {
    title: "Réviser l'enveloppe",
    description:
      "La nouvelle enveloppe et pourquoi : l'historique garde les deux.",
    amount: "Nouvelle enveloppe",
    reason: "Motif",
    save: "Réviser",
    saving: "Révision…",
    errors: {
      amount: "Indiquez un montant en euros.",
      reason: "Donnez le motif.",
    },
  },
  shareForm: {
    title: "Part financée par PDS",
    description: "Le reste est financé par un partenaire. De 0 à 100 %.",
    percent: "Part PDS",
    save: "Enregistrer",
    saving: "Enregistrement…",
    error: "Un pourcentage de 0 à 100.",
  },
  templateForm: {
    title: "Enregistrer comme modèle",
    description: (count: number) =>
      `Les ${plural(count, "ligne", "lignes")} de cette enveloppe, à reprendre pour un prochain centre de coût.`,
    name: "Nom du modèle",
    save: "Enregistrer",
    saving: "Enregistrement…",
    error: "Donnez un nom.",
  },
  importForm: {
    title: "Importer des lignes",
    description:
      "Collez le tableau depuis un tableur : Libellé, Poste, Sous-poste, Montant HT, Fournisseur, Échéance, Statut. Une ligne par dépense.",
    paste: "Tableau",
    file: "Ou un fichier .csv",
    preview: (count: number, amount: string) =>
      `${plural(count, "ligne prête", "lignes prêtes")} · ${amount} HT`,
    problem: {
      label: (line: number) => `Ligne ${line} : libellé manquant.`,
      amount: (line: number) => `Ligne ${line} : montant illisible.`,
      day: (line: number) => `Ligne ${line} : date illisible (JJ/MM/AAAA).`,
    },
    save: (count: number) => `Importer ${plural(count, "ligne", "lignes")}`,
    saving: "Import…",
    empty: "Collez au moins une ligne.",
  },
  errors: {
    nameTaken: "Un centre de coût porte déjà ce nom.",
  },
  done: {
    center: "Centre de coût créé",
    renamed: "Centre de coût renommé",
    revised: "Enveloppe révisée",
    share: "Part PDS enregistrée",
    template: "Modèle enregistré",
    imported: (count: number) =>
      `${plural(count, "ligne importée", "lignes importées")}`,
  },
} as const;
