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
  // The call of an external production (proto PREP_CALL.ext): four points.
  external: {
    topics: {
      project: "Le projet et le Brief créatif",
      constraints: "Contraintes : dates, lieu, enveloppe",
      quote: "Ce que le devis doit contenir",
      next: "Prochaines étapes",
    },
    questions: {
      project: [
        "Ce que le livrable doit raconter, d'après la Fiche Livrable",
        "Les références validées",
      ],
      constraints: [
        "Les dates de tournage et de livraison",
        "Le lieu envisagé",
        "Ce que l'enveloppe permet",
      ],
      quote: [
        "Les postes attendus : réalisation, équipe, matériel, lieux, régie, postproduction",
        "Le montant prévu pour les lieux",
      ],
      next: ["Qui propose le réalisateur", "Quand le devis est déposé"],
    },
    goal: (company: string) =>
      `Présenter le projet à ${company} et cadrer le devis : attentes, contraintes, enveloppe.`,
    documents: (deliverable: string, version: number | null, refs: number) =>
      [
        `Fiche Livrable « ${deliverable} »${version ? ` V${version}` : ""}`,
        "Brief créatif",
        refs > 0
          ? refs === 1
            ? "1 référence validée"
            : `${refs} références validées`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
  },
  step: {
    meetingName: "Call de production",
    direct: "Organisation",
    directValue: "Préparation directe avec PO, sans call",
    imported: "Organisation importée",
    po: {
      call: "PO propose ce qui a été dit pendant le call, avec la phrase exacte. Retenez, corrigez ou écartez chaque point ; une phrase ambiguë reste « à confirmer ».",
      direct:
        "PO propose les points d'après la fiche et le Brief créatif. Retenez, corrigez ou écartez chacun.",
      import:
        "PO propose les points tirés du document importé. Retenez, corrigez ou écartez chacun.",
    },
    processing:
      "Le call est enregistré : la transcription puis le compte rendu arrivent ici.",
    openCall: "Ouvrir le call",
    hold: "tenir le call et l'enregistrer dans PDS OS",
    items: {
      call: "Ce qui a été dit",
      direct: "Points proposés par PO",
      import: "Points tirés du document",
    },
    itemsDescription:
      "Une proposition de PO ne compte qu'une fois confirmée ; une action confirmée devient une tâche, avec qui et quand.",
  },
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
