/** Finance › Justificatifs (new style lot 6, docs/FINANCE-V2.md; proto
 * `docs/protos/finance-midday.html`, page Justificatifs): the box where
 * tickets and invoices arrive, are read, then attached to their spend. Same
 * words as Rapprochement: « Proposition », the button on the line. */

const plural = (count: number, one: string, many: string) =>
  `${count} ${count > 1 ? many : one}`;

export const financeReceipts = {
  title: "Justificatifs",
  loadError: "Les justificatifs n'ont pas pu être lus. Réessayez.",
  search: "Rechercher un fournisseur, une dépense",
  searchLabel: "Rechercher un justificatif",
  noResult: (query: string) =>
    `Aucun justificatif ne correspond à « ${query} ».`,
  views: {
    label: "Justificatifs",
    open: "À traiter",
    attached: "Rattachés",
    all: "Tous",
  },
  layout: { label: "Affichage", grid: "Grille", list: "Liste" },
  drop: "Déposer",
  dropHere: "Déposez vos tickets et factures pour les ajouter",
  dropHint: "PDF, PNG ou JPEG, 20 Mo au plus",
  forward: "Transférez vos tickets et factures à",
  copy: "Copier",
  copied: "Adresse copiée",
  emptyOpen: "Tout est rattaché",
  showAttached: "Voir les justificatifs rattachés",
  emptyOpenBody:
    "Les tickets déposés ou transférés par e-mail arrivent ici, lus, avec la dépense qui leur correspond.",
  emptyAll: "Aucun justificatif",
  emptyAllBody:
    "Déposez un ticket ou une facture : PDS OS le lit et propose la dépense qu'il justifie.",
  // One toast that changes its words (Midday).
  upload: {
    sending: (count: number) =>
      `Envoi de ${plural(count, "justificatif", "justificatifs")}…`,
    reading: (count: number) =>
      `Lecture de ${plural(count, "justificatif", "justificatifs")}…`,
    done: (count: number) =>
      `${plural(count, "justificatif ajouté", "justificatifs ajoutés")}`,
    doneHint: "PDS OS propose la dépense de chacun quand il la trouve.",
    type: "Ce fichier n'est pas un PDF, un PNG ni un JPEG.",
    size: "Ce fichier dépasse 20 Mo.",
    failed: "Le fichier n'a pas pu être envoyé. Réessayez.",
  },
  states: {
    reading: "Lecture…",
    toCheck: "À vérifier",
    proposed: "Proposition",
    waiting: "Sans dépense",
    other: "Autre document",
    attached: "Rattaché",
    dismissed: "Écarté",
  },
  kinds: { receipt: "Ticket", invoice: "Facture", other: "Autre document" },
  fileKind: { pdf: "PDF", photo: "Photo" },
  card: {
    open: (name: string) => `Ouvrir ${name}`,
    from: (day: string, who: string) => `${day} · de ${who}`,
    proposed: "Dépense proposée",
    attachedTo: "Rattaché à",
    waiting: "Aucune dépense ne correspond encore",
    unknownVendor: "Fournisseur à lire",
  },
  columns: {
    received: "Reçu le",
    vendor: "Fournisseur",
    amount: "Montant",
    spend: "Dépense",
    state: "Statut",
  },
  reasons: {
    amount: "même montant",
    party: "même fournisseur",
    date: "date proche",
    reference: "même référence",
  },
  attachedBy: (who: string) => `rattaché par ${who}`,
  photo: "photo",
  offBudget: "Hors budget",
  // The sheet.
  sheet: {
    eyebrow: (who: string, day: string) => `Reçu de ${who} · ${day}`,
    byEmail: (address: string) => `Par e-mail, de ${address}`,
    preview: "Aperçu du document",
    openFile: "Ouvrir le fichier",
    read: "Ce que PDS OS a lu",
    readIn: { text: "Lu dans le PDF", photo: "Lu sur la photo, à vérifier" },
    values: {
      vendor: "Fournisseur",
      amount: "Montant TTC",
      vat: "TVA",
      issuedOn: "Date",
      reference: "Référence",
    },
    kind: "Type",
    sources: {
      text: "Lu dans le PDF",
      photo: "À vérifier : photo",
      notFound: "À vérifier : absent du texte",
      changed: (who: string) => `Modifié par ${who}`,
      checked: (who: string) => `Vérifié par ${who}`,
      none: "Non lu",
    },
    readingNow: "PDS OS lit le document…",
    readFailed:
      "PDS OS n'a pas pu lire ce document : saisissez le montant et la date.",
    photoNotice:
      "Une photo : relisez le montant et la date avant de rattacher.",
    notFoundNotice:
      "Le montant ou la date n'a pas été retrouvé tel quel dans le PDF : relisez-les avant de rattacher.",
    check: "Vérifier les valeurs",
    proposal: "Correspond à",
    noProposal:
      "Aucune dépense ne correspond encore. PDS OS cherche à nouveau à chaque nouvelle dépense.",
    otherNotice: "Ce document ne semble pas être un justificatif de dépense.",
    attachedTo: (label: string) => `Rattaché à « ${label} ».`,
    attachedBy: (who: string) => `Par ${who}`,
    dismissed: (reason: string) => `Écarté : ${reason}`,
    someone: "PDS OS",
  },
  actions: {
    attach: "Rattacher",
    check: "Vérifier",
    other: "Choisir une autre dépense",
    create: "Créer la dépense",
    dismiss: "Écarter",
    restore: "Remettre à traiter",
    spendLabel: "Dépense justifiée",
    spendSearch: "Rechercher une dépense",
    spendEmpty: "Aucune dépense sans justificatif ne correspond.",
    spendPlaceholder: "Choisir une dépense",
    spendMissing: "Choisissez la dépense que ce document justifie.",
    attachChosen: "Rattacher à cette dépense",
  },
  check: {
    title: "Vérifier les valeurs",
    description: "Relisez ce qui a été lu sur le document, corrigez si besoin.",
    amountHint: "Le total à payer, TVA comprise.",
    save: "Confirmer les valeurs",
    saving: "Enregistrement…",
    saved: "Valeurs vérifiées",
    amountMissing: "Saisissez le montant TTC du document.",
    dateMissing: "Saisissez la date du document.",
    missingCount: (count: number) =>
      `${plural(count, "champ manque", "champs manquent")} : voir en rouge.`,
  },
  dismiss: {
    title: "Écarter ce document",
    description:
      "Il quitte les justificatifs à traiter ; il reste consultable dans « Tous ».",
    reason: "Pourquoi",
    reasonPlaceholder: "Doublon, pas une dépense du label…",
    save: "Écarter",
    saved: "Document écarté",
    restored: "Document remis à traiter",
  },
  create: {
    title: "Créer la dépense",
    description:
      "La dépense est pré-remplie avec ce que PDS OS a lu ; le justificatif lui est rattaché.",
  },
  attached: "Justificatif rattaché",
  errors: {
    invalid: "Ce justificatif n'a pas pu être enregistré.",
    forbidden: "Seule la Finance traite les justificatifs.",
    unchecked:
      "Vérifiez le montant et la date du document avant de le rattacher.",
    attached: "Ce justificatif est déjà rattaché.",
    dismissed: "Ce justificatif a été écarté.",
    hasProof: "Cette dépense a déjà un justificatif.",
    noLine: "Cette dépense n'existe plus.",
    refused: "Cette dépense a été refusée.",
    read: "Le document n'a pas pu être lu. Saisissez ses valeurs.",
    generic: "L'enregistrement a échoué. Réessayez.",
  },
};
