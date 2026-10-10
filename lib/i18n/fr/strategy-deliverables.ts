/** Livrables engagés of the Stratégie (step 4). */
export const strategyDeliverables = {
  // « Capsules × 5 »: the quantity only when there is more than one.
  withQuantity: (title: string, quantity: number) => `${title} × ${quantity}`,
  quantity: "Quantité",
  quantityHint: "Laissez vide pour un seul.",
  noLeverGroup: "Aucun livrable pour ce levier.",
  add: "Ajouter le livrable",
  save: "Enregistrer",
  cancel: "Annuler",
  edit: "Modifier",
  editLabel: (title: string) => `Modifier le livrable « ${title} »`,
  newTitle: "Nouveau livrable",
  titlePlaceholder: "Cover, session acoustique, capsules, kit RP…",
} as const;
