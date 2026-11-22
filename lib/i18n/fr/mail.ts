// The e-mail PDS OS sends, shown before it leaves (docs/VISION-UX.md rule
// 19, components/ui/mail-card.tsx): the Master's package, a fiche, a
// contract to sign. The card's defaults; a module overrides what it says
// otherwise (the Master names who it is sent for).

export const mail = {
  to: "À",
  // The envelope written in the card (MailCard `envelope`, Sacha 22/11/2026).
  cc: "Cc",
  bcc: "Cci",
  // The recipients picked in the Réseau or typed (RecipientsField).
  addFirst: "Un nom du Réseau ou une adresse e-mail",
  addMore: "Ajouter",
  addAddress: (email: string) => `Ajouter ${email}`,
  suggestions: "Contacts du Réseau",
  remove: (name: string) => `Retirer ${name}`,
  notEmail: (text: string) => `« ${text} » n'est pas une adresse e-mail.`,
  nobody: "Personne",
  edit: (label: string) => `Modifier « ${label} »`,
  done: "OK",
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
