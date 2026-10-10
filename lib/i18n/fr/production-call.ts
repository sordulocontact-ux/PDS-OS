/** Marketing › Production: « Préparer un call de production ». */
export const productionCall = {
  sectionTitle: "Calls de production",
  sectionDescription:
    "Le call sert à décider ce qui manque à la préparation. Rien n'est envoyé ni réservé.",
  empty: "Aucun call de production préparé pour ce livrable.",
  columns: {
    call: "Call",
    date: "Date",
    state: "État",
  },
  prepare: "Préparer un call de production",
  title: "Préparer un call de production",
  body: "PO a préparé le call à partir de ce qui manque à la préparation. Ajustez, puis vérifiez avant de le créer.",
  defaultTitle: (deliverable: string) => `Call de production · ${deliverable}`,
  purposeLabel: "Objectif du call",
  purpose: (deliverable: string, topics: string[]) =>
    `Décider ce qui manque pour préparer « ${deliverable} » : ${topics.join(", ")}`,
  purposeReview: (deliverable: string) =>
    `Faire le point sur la préparation de « ${deliverable} »`,
  topics: "Sujets à aborder",
  noTopics:
    "Rien ne manque à la préparation : ajoutez les sujets que vous voulez aborder.",
  noParticipants: "Ajoutez au moins une personne.",
  failed: "Le call n'a pas pu être créé. Réessayez.",
  // One topic per kind of gap, in this order.
  topicLabels: {
    brief: "Brief réalisateur",
    director: "Réalisateur",
    families: "Équipes à définir",
    staffing: "Postes à pourvoir",
    availability: "Disponibilités à confirmer",
  },
  questions: {
    brief: {
      stagingIntent: "Quelle intention de mise en scène ?",
      coverage: "Plan-séquence, montage ou les deux ?",
      camera: "Une caméra ou plusieurs ?",
      sound: "Son en playback, capté en direct ou les deux ?",
      runOfShow: "Quel déroulé pour le tournage ?",
      constraintsNote: "Quelles contraintes : lieu, horaires, autorisations ?",
      referencesNote: "Quelles références pour le réalisateur ?",
    },
    director: "Qui réalise : un membre de PDS ou un contact du Réseau ?",
    family: (family: string) => `${family} : quels postes faut-il ?`,
    staff: (role: string, filled: number, headcount: number) =>
      filled === 0
        ? headcount === 1
          ? `${role} : qui tient le poste ?`
          : `${role} : qui pour les ${headcount} places ?`
        : `${role} : ${filled} sur ${headcount}, qui pour la suite ?`,
    availability: (name: string, role: string) =>
      `${name} (${role}) : disponibilité confirmée ?`,
  },
  // On the call's page (PreparedCallDetails).
  detailsTitle: "Call de production préparé",
  detailsDeliverable: "Livrable",
  toPreproduction: "Ouvrir la Préproduction",
} as const;
