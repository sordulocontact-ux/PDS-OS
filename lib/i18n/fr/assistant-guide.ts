/**
 * app_guide (docs/ASSISTANT.md § 3 quater): the frame code puts around a
 * topic of PO's guide. Model context, also shown under PO's answer.
 */
export const assistantGuide = {
  topic: (title: string) => `Guide de PDS OS — ${title}.`,
  where: (where: string) => `Où : ${where}.`,
  sidebar: (label: string) => `barre latérale › ${label}`,
  inThisProject: (title: string) => `${title} de ce projet`,
  faq: (q: string, a: string) => `Question fréquente : « ${q} » Réponse : ${a}`,
  notFound: (subject: string, keys: string) =>
    `Aucun sujet du guide ne correspond à « ${subject} ». Sujets disponibles : ${keys}. Rappelle app_guide avec l'un d'eux, ou dis ce que tu ne sais pas et où chercher.`,
  // explain_notion: the frame of a notion of the business, explained by
  // the model from its general knowledge (never PDS OS data).
  notion: {
    label: (name: string) =>
      `« ${name} » : explication de connaissance générale du métier, à vérifier. Ce n'est ni une donnée de PDS OS ni un conseil juridique.`,
    unknown:
      "Explication de connaissance générale du métier, à vérifier. Ce n'est ni une donnée de PDS OS ni un conseil juridique.",
    place: (place: string) => `Dans PDS OS : ${place}`,
  },
};
