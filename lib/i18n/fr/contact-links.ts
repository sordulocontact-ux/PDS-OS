// The person's page by project (lot 11), seen from the app: « Liens
// privés » of « Qui fait quoi » and next to each workflow's own link.

export const contactLinks = {
  title: "Une page par personne",
  hint: "Un seul lien par personne et par projet : ce que chaque workflow attend d'elle, sur une page, sans compte. Il ne montre que sa part.",
  objects: (n: number, todo: number) =>
    `${n} élément${n > 1 ? "s" : ""} dans le projet${todo > 0 ? ` · ${todo} à faire` : ""}`,
  revokedLine: (day: string, reason: string) =>
    `Révoqué le ${day} : « ${reason} »`,
  create: "Créer le lien",
  created: "Lien créé",
  copy: "Copier le lien",
  copied: "Lien copié",
  markSent: "Marquer comme envoyé",
  marked: "Marqué comme envoyé",
  renew: "Nouveau lien",
  renewed: "Nouveau lien créé",
  renewHint:
    "Un nouveau lien remplace l'ancien, qui cesse de marcher ; ce qui a été déposé reste.",
  remind: "Relancer",
  remindHint: "Renvoie le lien par e-mail, avec un petit rappel.",
  reminded: "Rappel envoyé par e-mail",
  noAddress: "Cette personne n'a pas d'adresse e-mail dans le Réseau.",
  // The e-mail PDS OS sends itself (lib/email/contact-email.ts).
  email: {
    sent: (name: string) => `Lien créé et envoyé par e-mail à ${name}`,
    renewedSent: (name: string) =>
      `Nouveau lien créé et envoyé par e-mail à ${name}`,
    failed:
      "Le lien est créé, mais l'e-mail n'est pas parti : copiez le lien et envoyez-le vous-même.",
    remindFailed:
      "Le rappel n'est pas parti : copiez le lien et envoyez-le vous-même.",
    subject: (title: string) => `« ${title} » : votre page`,
    body: "Tout ce que nous attendons de vous sur ce projet est réuni sur votre page.",
    renewedBody:
      "Voici votre nouveau lien : l'ancien ne fonctionne plus. Tout ce que nous attendons de vous sur ce projet est sur votre page.",
    remindSubject: (title: string) => `« ${title} » : votre page vous attend`,
    remindBody:
      "Petit rappel : ce que nous attendons de vous sur ce projet est sur votre page.",
    open: "Ouvrir votre page :",
  },
  revoke: "Révoquer",
  revokeTitle: (name: string) => `Révoquer le lien de ${name}`,
  revokeDescription:
    "Le lien cesse de marcher tout de suite ; ce que la personne a déposé reste. Ses liens de chaque workflow ne changent pas.",
  revokeReason: "Pourquoi révoquer ce lien",
  revoked: "Lien révoqué",
  // Next to a workflow's own link.
  offer: (name: string) =>
    `Sa page du projet : tout ce que PDS attend de ${name}, en un seul lien.`,
  errors: {
    forbidden: "Seul le responsable du projet gère les liens.",
    reason: "Dites pourquoi vous révoquez ce lien.",
    failed: "Le lien n'a pas pu être modifié. Réessayez.",
  },
} as const;
