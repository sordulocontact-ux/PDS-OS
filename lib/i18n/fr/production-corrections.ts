/** Production › Postproduction: a correction request addressed to someone
 * (PROD-030 to PROD-032). */
export const productionCorrections = {
  dialogTitle: (name: string) => `Demander des corrections sur ${name}`,
  dialogDescription:
    "La version passe en « Corrections demandées ». Rien n'est envoyé par e-mail : vous transmettez ensuite la demande (un membre est prévenu dans l'app).",
  comments: "Retours à transmettre",
  commentsHint:
    "Les retours ouverts de cette version, cochés par défaut. Décochez un doublon : il reste sur la version, il n'est pas envoyé.",
  noComments: "Aucun retour ouvert : écrivez la demande dans le message.",
  recipient: "À qui",
  recipientHint:
    "L'auteur de la version ou l'intervenant du montage, proposé quand il est connu.",
  recipientNone: "Choisir",
  due: "Pour quand",
  dueHint: "L'échéance de l'étape de montage, proposée quand elle est connue.",
  message: "Message",
  submit: "Demander les corrections",
  done: "Corrections demandées : transmettez la demande.",
  missingCount: (n: number) =>
    n === 1 ? "1 information manque." : `${n} informations manquent.`,
  missing: {
    recipient: "Choisissez qui doit faire les corrections.",
    due: "Indiquez une échéance.",
    content: "Gardez au moins un retour, ou écrivez un message.",
  },
  // The request on its version.
  title: "Demande de corrections",
  statuses: {
    draft: "Brouillon : pas encore transmise",
    sent: "Transmise",
    viewed: "Consultée",
    treated: "Traitée",
  },
  to: (who: string) => `À : ${who}`,
  dueOn: (date: string) => `Pour le ${date}`,
  sentOn: (who: string, date: string) => `Transmise par ${who} le ${date}`,
  reminders: (n: number) => (n === 1 ? "1 relance" : `${n} relances`),
  treatedBy: (n: number) => `Traitée par la V${n}`,
  count: (n: number) =>
    n === 1 ? "1 retour transmis" : `${n} retours transmis`,
  send: "Copier et marquer transmise",
  resend: "Relancer",
  sentDone: "Demande copiée et marquée transmise.",
  resentDone: "Relance copiée et enregistrée.",
  edit: "Réaffecter ou changer l'échéance",
  editTitle: "Modifier la demande de corrections",
  editDescription:
    "La même demande, avec un autre destinataire, une autre échéance ou un autre message : rien n'est dupliqué.",
  editDone: "Demande mise à jour.",
  copyHint:
    "Le texte est copié dans le presse-papiers : collez-le dans votre message.",
  copyHintProvider:
    "PDS OS envoie le texte par e-mail quand le contact a une adresse dans le Réseau ; il est aussi copié dans le presse-papiers. Envoyez-lui aussi son lien : il y retrouve ces corrections et dépose lui-même la version suivante ; la demande passe « Consultée » quand il l'ouvre.",
  // The e-mail PDS OS sends itself to a Réseau contact (lib/production/post/correction-actions.ts).
  email: {
    subject: (title: string) => `« ${title} » : corrections à apporter`,
    intro:
      "Voici les corrections à apporter. Répondez simplement à cet e-mail pour toute question.",
    sent: (name: string) => `Demande envoyée par e-mail à ${name}`,
    failed:
      "La demande est transmise, mais l'e-mail n'est pas parti : le texte est copié, envoyez-le vous-même.",
  },
  // On the next version: what it had to correct (PROD-032).
  answersTitle: (n: number) => `Corrections demandées sur la V${n}`,
  answersHint:
    "Vérifiez chaque correction sur cette version : résolue, ou à reprendre.",
  heading: (name: string, due: string) =>
    `Corrections — ${name} — pour le ${due}`,
} as const;
