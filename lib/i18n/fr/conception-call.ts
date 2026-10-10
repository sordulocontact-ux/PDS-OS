/** Conception, Chemin A (ticket « Conception »): the creative exchange. */
export const conceptionCall = {
  prepare: "Préparer un échange créatif",
  title: "Préparer un échange créatif",
  body: "PO a préparé l'échange à partir de ce qui manque aux livrables. Ajustez, puis vérifiez avant de le créer.",
  defaultTitle: "Échange créatif",
  purposeLabel: "Objectif de l'échange",
  purpose: (deliverables: string[]) =>
    deliverables.length
      ? `Poser les intentions créatives : ${deliverables.join(", ")}`
      : "Poser la direction créative d'ensemble",
  purposeReview: "Relire ensemble les intentions créatives",
  deliverables: "Livrables concernés",
  deliverablesHint: "Les sujets suivent les livrables choisis.",
  noDeliverables: "Aucun livrable dans la Conception pour l'instant.",
  topics: "Sujets à aborder",
  noTopics:
    "Rien ne manque aux livrables choisis : ajoutez les sujets que vous voulez aborder.",
  noParticipants: "Ajoutez au moins une personne.",
  directionTopic: "Direction créative",
  deliverableTopic: (title: string) => `Livrable · ${title}`,
  questions: {
    direction: {
      story: "Quelle histoire porte l'ensemble de la campagne ?",
      look: "Quel univers visuel commun aux livrables ?",
      tone: "Quel ton, quelle émotion pour l'ensemble ?",
      musts: "Qu'est-ce qui doit toujours être là, ou jamais ?",
    },
    deliverable: {
      story: (title: string) => `Que doit raconter « ${title} » ?`,
      look: (title: string) => `À quoi doit ressembler « ${title} » ?`,
      tone: (title: string) => `Quel ton, quelle émotion pour « ${title} » ?`,
      musts: (title: string) =>
        `Qu'est-ce qui doit absolument être dans « ${title} », ou en être absent ?`,
    },
    qualify: (title: string) =>
      `« ${title} » est à qualifier : le garde-t-on, sous quelle forme ?`,
  },
  recapDeliverables: "Livrables concernés",
  failed: "L'échange n'a pas pu être créé. Réessayez.",
  locked: "La Conception est soumise ou validée : plus d'échange à préparer.",
  detailsTitle: "Échange créatif",
  detailsDeliverables: "Livrables concernés",
  toConception: "Voir la conception",
  afterCall:
    "PO a relevé les intentions du call. Relisez et confirmez-les livrable par livrable.",
};
