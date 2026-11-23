/** Page « Mails » : la boîte de PO, ses mails reçus et envoyés. */
export const mailbox = {
  title: "Mails",
  viewsLabel: "Filtrer par sens",
  views: { all: "Tous", received: "Reçus", sent: "Envoyés" },
  kinds: {
    signature: "Signature",
    quote: "Devis",
    invoice: "Facture",
    contract: "Contrat",
    proof: "Justificatif",
    deal_memo: "Deal memo",
    clearance: "Autorisation",
  },
  // « À » before the recipients of a sent mail.
  to: "À",
  noSubject: "(sans objet)",
  noName: "Inconnu",
  attachmentsLabel: (count: number) =>
    count === 1 ? "1 pièce jointe" : `${count} pièces jointes`,
  filters: { kindLabel: "Type", kindAll: "Tous les types" },
  search: {
    label: "Rechercher un mail",
    placeholder: "Objet, correspondant, extrait…",
    noResult: (query: string) => `Aucun mail ne correspond à « ${query} ».`,
  },
  states: {
    notConnectedTitle: "La boîte n'est pas branchée",
    notConnectedBody:
      "Le compte de po@ n'est pas configuré : aucun mail n'est lu pour l'instant.",
    emptyTitle: "Aucun mail pour l'instant",
    emptyBody:
      "Les mails arrivent toutes les 10 minutes : revenez dans un instant.",
    viewEmptyTitle: (view: string) => `Aucun mail dans « ${view} »`,
    viewEmptyBody: "Les autres mails restent dans l'onglet « Tous ».",
    filtersEmpty: "Aucun mail ne correspond à ces filtres.",
    filtersEmptyBody: "Retirez un filtre pour élargir la liste.",
    truncated: (limit: number) =>
      `Les ${limit} mails les plus récents sont affichés.`,
    loadError: "Les mails n'ont pas pu être chargés. Rechargez la page.",
  },
  // The reading pane beside the list (Outlook, Sacha 23/11/2026).
  reader: {
    listLabel: "Liste des mails",
    pickTitle: "Aucun mail ouvert",
    pickBody: "Choisissez un mail dans la liste pour le lire ici.",
  },
  sheet: {
    to: "À",
    cc: "Cc",
    attachments: "Pièces jointes",
    download: (name: string) => `Télécharger ${name}`,
    bodyLoading: "Chargement du texte du mail",
    bodyEmpty: "Ce mail n'a pas de texte.",
    bodyError: "Le texte du mail n'a pas pu être chargé.",
  },
  links: {
    deal: "Ouvrir le deal",
    contract: "Ouvrir le contrat",
    clearance: "Ouvrir la demande d'autorisation",
    proofs: "Ouvrir les justificatifs",
  },
  errors: {
    unauthorized: "Vous n'avez pas accès à ce mail.",
    notFound: "Ce mail est introuvable.",
    unavailable: "La boîte de PO est indisponible pour l'instant.",
  },
} as const;
