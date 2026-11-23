// Écrire et répondre à un mail depuis la page « Mails » (Sacha 23/11/2026).
// Importé directement côté client (jamais tout `@/lib/i18n/fr`).

export const mailboxCompose = {
  write: "Écrire un mail",
  reply: "Répondre",
  title: "Écrire un mail",
  replyTitle: "Répondre",
  close: "Fermer",
  line: "De : l'adresse de PO, au nom de vous · gardé dans « Envoyés »",
  send: "Envoyer",
  sending: "Envoi…",
  done: "Mail envoyé",
  replyPrefix: "Re : ",
  messageMissing: "Écrivez votre message.",
  messageTooLong: "Le message est trop long (20 000 caractères au plus).",
  errors: {
    invalid: "Le mail n'est pas valide : vérifiez les adresses et l'objet.",
    notFound: "Le message auquel vous répondez est introuvable.",
    disabled:
      "La boîte de PDS OS n'est pas branchée : le mail n'a pas été envoyé.",
    failed: "Le mail n'est pas parti. Réessayez dans un instant.",
  },
} as const;
