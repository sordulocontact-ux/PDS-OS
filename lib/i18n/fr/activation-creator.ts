// The creator's private link, after « Bon pour accord » (proto creatorPortal):
// her content, her publication, her invoice. Words of the proto.

export const activationCreator = {
  contentTitle: "Déposer votre contenu",
  feedbackOn: (label: string) => `Retours sur la ${label} :`,
  videoLink: "Lien de la vidéo (non publiée)",
  sendVersion: (n: number) => `Envoyer la V${n}`,
  reviewTitle: "Votre contenu est en validation",
  reviewBody: (label: string) =>
    `La ${label} est entre les mains de PDS. Vous serez prévenue ici.`,
  publishTitle: "Votre publication",
  publishBody: "Contenu validé : vous pouvez publier.",
  publicationLink: "Lien de la publication",
  declare: "Déclarer la publication",
  publishedTitle: "Publication déclarée",
  publishedBody: (verified: boolean) =>
    verified
      ? "PDS a vérifié votre publication. Merci !"
      : "PDS va vérifier votre publication. Rien à faire pour vous pour l'instant.",
  invoiceTitle: "Votre facture",
  invoiceFile: "Votre facture (PDF ou image)",
  sendInvoice: "Envoyer la facture",
  invoiceSent: "Facture envoyée : PDS la valide, puis déclare le paiement.",
  closedTitle: "Collaboration terminée",
  nothing: "Rien à faire pour vous pour l'instant.",
  terms: (fee: string, deliverables: string) => `${deliverables} · ${fee}`,
  sent: {
    content: "Contenu envoyé",
    publication: "Publication déclarée",
    invoice: "Facture envoyée",
  },
  errors: {
    url: "Collez un lien complet (https://…).",
    file: "Choisissez le fichier de votre facture.",
    closed: "Ce lien n'est plus ouvert : demandez un nouveau lien à PDS.",
    step: "Cette étape est déjà passée : la page s'est mise à jour.",
    upload: "Le fichier n'a pas été reçu : réessayez.",
    failed: "L'envoi a échoué : réessayez dans un instant.",
    paused:
      "La campagne est en pause chez PDS : rien ne peut être envoyé pour l'instant. Contactez votre interlocuteur.",
  },
} as const;
