/** Finance › Budgets: every envelope, its posts and sub-posts, revisions,
 * PDS share, templates and import (Ibé's ticket « Cockpit Finance »,
 * maquettes 2 et 3, lot 4). */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeBudgets = {
  title: "Budgets",
  kinds: {
    label: "Type de budget",
    all: "Tous",
    project: "Projets",
    artist: "Artistes",
    cost_center: "Autres",
  },
  kindOne: {
    project: "Projet",
    artist: "Artiste",
    cost_center: "Autre",
  },
  templates: {
    title: (name: string) => `Modèle ${name}`,
    lines: (count: number) => plural(count, "ligne", "lignes"),
    use: "Nouveau budget depuis le modèle",
  },
  pie: {
    title: "Répartition par poste",
    caption: "Ce que coûtent les lignes aujourd'hui, HT.",
    none: "Sans poste",
    rest: "Autres postes",
    total: "Total",
    empty: "Aucune ligne.",
  },
  split: {
    title: "Répartition des budgets",
    caption: "Le montant de chaque budget, HT.",
    rest: "Autres budgets",
    total: "Total des budgets",
    empty: "Aucun budget chiffré.",
  },
  chart: {
    title: "Mois par mois",
  },
  columns: {
    envelope: "Budget",
    type: "Type",
    budget: "Montant",
    used: "Dépensé",
    rest: "Reste",
    consumed: "Utilisé",
  },
  percent: (value: number) => `${value} %`,
  revised: (before: string, after: string) => `Révisé : ${before} → ${after}`,
  noBudget: "Sans montant",
  over: (amount: string) => `Dépassé de ${amount}`,
  overWord: "Dépassé de",
  restWord: "Reste",
  signed: (amount: string, up: boolean) => `${up ? "+" : "−"}${amount}`,
  emptyTitle: "Aucun budget",
  emptyBody: "Les budgets des projets, des artistes et les autres budgets.",
  emptyView: "Aucun budget ici.",
  loadError: "Les budgets n'ont pas pu être chargés.",
  back: "Budgets",
  // The envelope's figures (new style, lot 4, docs/FINANCE-V2.md).
  figures: {
    rest: "Reste",
    over: (amount: string) => `Dépassé de ${amount}`,
    restOf: (total: string, percent: number) =>
      `sur ${total} · ${percent} % utilisé`,
    noEnvelope: "Sans montant : rien ne limite ces dépenses.",
    initial: "Budget initial",
    revisions: "Révisions",
    planned: "Prévu",
    spent: "Dépensé",
    paid: "Payé",
    rebill: "Refacturable",
    gap: "Écart",
    pds: (percent: number) => `Part PDS (${percent} %)`,
    used: (title: string, percent: number) =>
      `${title} : ${percent} % du budget utilisé`,
  },
  filter: {
    label: "Statut des dépenses",
    all: "Toutes",
    planned: "Prévue",
    committed: "Engagée",
    invoiced: "Facturée",
    paid: "Payée",
  },
  detail: {
    posts: "Postes et sous-postes",
    post: "Poste",
    forecast: "Prévu",
    spent: "Dépensé",
    paid: "Payé",
    gap: "Écart",
    noSubpost: "Sans sous-poste",
    revisions: "Révisions",
    revision: (before: string, after: string) => `${before} → ${after}`,
    noRevision: "Aucune révision depuis sa création.",
    noLines: "Aucune dépense dans ce budget.",
    period: (from: string, to: string | null) =>
      to ? `Du ${from} au ${to}` : `Depuis le ${from}`,
  },
  actions: {
    newBudget: "Nouveau budget",
    // The same form as in Financements, in the panel (UX test of 16/11/2026).
    planShow: "Planifier une émission",
    addSpend: "Ajouter une dépense",
    more: "Autres actions",
    rename: "Renommer",
    revise: "Réviser le budget",
    share: "Part financée par PDS",
    template: "Enregistrer comme modèle",
    import: "Importer des lignes",
    addPart: "Ajouter un sous-budget",
    removeBudget: "Supprimer le budget",
  },
  // A budget cut into named parts (retour d'Ibé du 18/11/2026).
  parts: {
    title: "Sous-budgets",
    // Always there for the Finance (UX test of 23/11/2026: cutting was
    // only found in « ⋯ »).
    none: "Aucun sous-budget.",
    cut: "Découper ce budget",
    part: "Sous-budget",
    amount: "Montant HT",
    planned: "Prévu",
    spent: "Dépensé",
    rest: "Reste",
    // What no part holds: the budget's amount left to cut and the spends
    // filed in no part. Spends to file are not an overrun (UX test of
    // 23/11/2026: « j'ai cassé quelque chose ? »).
    outside: "Hors sous-budget",
    toFile: (count: number) =>
      plural(count, "dépense à ranger", "dépenses à ranger"),
    rowActions: (name: string) => `Actions pour « ${name} »`,
    open: (name: string) => `Ranger des dépenses dans « ${name} »`,
    edit: "Modifier",
    attach: "Ranger des dépenses",
    remove: "Supprimer",
  },
  // What PO says of a cut budget (computed by code, lib/assistant/read).
  partsRead: {
    line: (name: string, amount: string, spent: string, rest: string) =>
      `Sous-budget « ${name} » : ${amount}, dépensé ${spent}, ${rest}.`,
    unallocated: (amount: string, spent: string) =>
      `Non réparti : ${amount} du budget, ${spent} dépensés hors sous-budget.`,
    over: (amount: string) => `dépassé de ${amount}`,
    rest: (amount: string) => `reste ${amount}`,
  },
  partForm: {
    addTitle: "Ajouter un sous-budget",
    editTitle: "Modifier le sous-budget",
    name: "Nom",
    amount: "Montant HT",
    save: "Enregistrer",
    saving: "Enregistrement…",
    errors: { name: "Donnez un nom.", amount: "Indiquez un montant en euros." },
  },
  attachForm: {
    title: (name: string) => `Dépenses de « ${name} »`,
    none: "Aucune dépense dans ce budget.",
    inPart: (name: string) => `Dans « ${name} »`,
    save: "Enregistrer",
    saving: "Enregistrement…",
  },
  removePart: {
    title: "Supprimer ce sous-budget ?",
    body: "Ses dépenses restent dans le budget, sans sous-budget.",
    confirm: "Supprimer",
    pending: "Suppression…",
  },
  removeBudget: {
    title: "Supprimer ce budget ?",
    body: "Sans dépense, il est supprimé. Avec des dépenses, il est archivé : il quitte la liste et ses dépenses restent consultables.",
    confirm: "Supprimer",
    pending: "Suppression…",
  },
  errors: {
    nameTaken: "Un budget porte déjà ce nom.",
    partNameTaken: "Ce budget a déjà un sous-budget de ce nom.",
    partOther: "Une dépense d'un autre budget ne peut pas y entrer.",
  },
  centerForm: {
    title: "Nouveau budget",
    name: "Nom",
    amount: "Montant",
    template: "Modèle",
    noTemplate: "Aucun",
    templateTotal: (count: number, amount: string) =>
      `${plural(count, "ligne", "lignes")} · ${amount}`,
    save: "Créer",
    saving: "Création…",
    errors: { name: "Donnez un nom.", amount: "Indiquez un montant en euros." },
  },
  renameForm: {
    title: "Renommer le budget",
    name: "Nom",
    save: "Renommer",
    saving: "Enregistrement…",
    errors: { name: "Donnez un nom." },
  },
  reviseForm: {
    title: "Réviser le budget",
    amount: "Nouveau montant",
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
    percent: "Part PDS",
    save: "Enregistrer",
    saving: "Enregistrement…",
    error: "Un pourcentage de 0 à 100.",
  },
  templateForm: {
    title: "Enregistrer comme modèle",
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
  done: {
    center: "Budget créé",
    renamed: "Budget renommé",
    revised: "Budget révisé",
    share: "Part PDS enregistrée",
    template: "Modèle enregistré",
    partAdded: "Sous-budget ajouté",
    partSaved: "Sous-budget enregistré",
    partDeleted: "Sous-budget supprimé",
    partSpends: "Dépenses rattachées",
    removed: "Budget supprimé",
    archived: "Budget archivé",
    imported: (count: number) =>
      `${plural(count, "ligne importée", "lignes importées")}`,
  },
} as const;
