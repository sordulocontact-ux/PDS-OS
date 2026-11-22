// The e-mail PDS OS sends, shown before it leaves (docs/VISION-UX.md rule
// 19, components/ui/mail-card.tsx): the Master's package, a fiche, a
// contract to sign. The card's defaults; a module overrides what it says
// otherwise (the Master names who it is sent for).

export const mail = {
  to: "À",
  // The envelope written in the card (MailCard `envelope`, Sacha 22/11/2026).
  cc: "Cc",
  bcc: "Cci",
  addresses: "Séparez les adresses par une virgule",
  addressesInvalid: (list: string) => `Adresse non valide : ${list}`,
  toMissing: "Indiquez au moins un destinataire.",
  subjectMissing: "Indiquez l'objet.",
  subject: "Objet",
  attachment: "Pièce jointe",
  message: "Message",
  title: "L'e-mail que PDS OS enverra",
  line: "De : l'adresse de PO · gardé dans l'historique, c'est la preuve d'envoi",
  fromNetwork: "Réseau",
  added: "Ajouté automatiquement à la fin de l'e-mail :",
  pageLink: "le lien de sa page, sans compte",
  validity: "Lien privé, valable pour tout le projet",
} as const;
