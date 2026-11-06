// The e-mail PDS OS sends, shown before it leaves (docs/VISION-UX.md rule
// 19, components/ui/mail-card.tsx): the Master's package, a fiche, a
// contract to sign. The card's defaults; a module overrides what it says
// otherwise (the Master names who it is sent for).

export const mail = {
  to: "À",
  subject: "Objet",
  message: "Message",
  title: "L'e-mail que PDS OS enverra",
  line: "De : l'adresse de PO · gardé dans l'historique, c'est la preuve d'envoi",
  fromNetwork: "Réseau",
  added: "Ajouté automatiquement à la fin de l'e-mail :",
  pageLink: "le lien de sa page, sans compte",
  validity: "Lien privé, valable pour tout le projet",
} as const;
