// Production › Proposition de réalisation (Ibé, 14/10): the director's
// intention and découpage, sent, then approved or sent back by the creative
// side of PDS.
export const productionDirection = {
  title: "Validation de la proposition",
  status: {
    draft: "Brouillon",
    submitted: "À valider",
    approved: "Validée",
    changes: "Modifications demandées",
  },
  submit: "Envoyer la proposition à la validation",
  submitted: "Proposition envoyée : la validation créative est prévenue.",
  byLink: (who: string) =>
    `${who} écrit et envoie sa proposition sur son lien privé.`,
  changes: (who: string, comment: string) => `${who} demande : « ${comment} »`,
  comment: "Commentaire, si vous demandez des modifications",
  commentPlaceholder: "Ce qu'il faut revoir",
  commentRequired: "Dites ce qu'il faut revoir.",
  approve: "Valider la proposition",
  askChanges: "Demander des modifications",
  approvedToast: "Proposition validée.",
  changesToast: "Modifications demandées.",
  approved: (who: string, date: string) =>
    `Validée par ${who} le ${date}. Le découpage sert maintenant au call technique, au matériel et aux lieux.`,
  wait: (who: string) => `En attente de ${who} : valider la proposition.`,
  errors: {
    direction_incomplete:
      "Écrivez l'intention et le découpage avant d'envoyer.",
    direction_not_submitted:
      "La proposition n'est plus en attente de validation.",
    reason_required: "Dites ce qu'il faut revoir.",
  },
} as const;
