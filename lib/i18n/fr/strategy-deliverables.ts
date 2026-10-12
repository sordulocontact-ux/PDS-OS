/** Livrables engagés of the Stratégie (step 4). */
export const strategyDeliverables = {
  // MKT-S1-08: a lot per lever, created and edited in one go.
  lots: {
    propose: "Proposer un lot",
    title: (lever: string) => `Lot proposé pour « ${lever} »`,
    description:
      "Cochez, ajustez les quantités, puis créez tout en une fois. Responsable et échéance s'appliquent à toutes les lignes cochées.",
    none: "Rien à proposer pour ce levier : ajoutez les livrables un par un.",
    quantity: "Quantité",
    assignee: "Responsable commun",
    dueDate: "Échéance commune",
    create: (count: number) =>
      count > 1 ? `Créer ${count} livrables` : "Créer le livrable",
    created: (count: number) =>
      count > 1 ? `${count} livrables créés.` : "Livrable créé.",
    items: {
      clip: "Clip officiel",
      teaser: "Teaser vidéo",
      making_of: "Making-of",
      short_videos: "Vidéos courtes",
      post_visuals: "Visuels de posts",
      stories: "Stories",
      influencer_brief: "Brief influenceurs",
      influencer_contents: "Contenus influenceurs",
      press_kit: "Dossier de presse",
      press_release: "Communiqué de presse",
      press_photos: "Photos presse",
      playlist_pitch: "Pitch playlists",
      playlist_targets: "Liste de playlists cibles",
      ad_creatives: "Créations publicitaires",
      ad_targeting: "Plan de ciblage publicitaire",
      radio_edit: "Radio edit",
      radio_pitch: "Pitch radio",
      showcase: "Showcase",
      event_poster: "Affiche de l'événement",
      partner_deck: "Présentation partenaire",
    },
  },
  // Retour MKT-S1-08: a lever without deliverable, said on purpose.
  noneRequired: "Aucun livrable requis",
  noneRequiredSet:
    "Ce levier n'appelle aucun livrable : c'est une décision, pas un oubli.",
  noneRequiredUndo: "Il en faut finalement",
  // Bulk edition of the ticked deliverables.
  bulk: {
    select: (title: string) => `Sélectionner « ${title} »`,
    selected: (count: number) =>
      `${count} livrable${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`,
    apply: "Appliquer à la sélection",
    applied: "Livrables modifiés.",
    clear: "Tout désélectionner",
  },
  milestones: (titles: string) => `Jalons : ${titles}`,
  format: "Format",
  formatHint: "Par exemple « Vidéo 9:16, 30 s » ou « Visuel carré ».",
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
