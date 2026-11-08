import type {
  ArtistExpenseCategory,
  ArtistExpenseStatus,
} from "@/lib/catalog/artist-expenses";

/** « Budget » tab of a signed artist (retour de Sacha du 07/11/2026): the
 * spends of no release in particular, and its projects added up. */
export const artistBudget = {
  tab: "Budget",
  title: "Budget de l'artiste",
  description:
    "Les frais qui ne dépendent d'aucune sortie : transport, repas, Uber Eats, studio, coaching, marketing… Les dépenses d'un single ou d'un EP restent dans le Budget de son projet.",
  add: "Nouvelle dépense",
  loadError: "Le budget n'a pas pu être chargé. Rechargez la page.",
  tiles: {
    paid: "Frais payés",
    paidHint: "Hors projet, déjà réglés.",
    planned: "Frais prévus",
    plannedHint: "Hors projet, à venir.",
    projects: "Projets",
    projectsHint: (count: number) =>
      count === 0
        ? "Aucun budget de projet lisible."
        : `Engagé, facturé ou payé sur ${count} projet${count > 1 ? "s" : ""}.`,
    total: "Total",
    totalHint: "Frais payés et engagé des projets.",
  },
  empty: {
    title: "Aucune dépense pour l'instant",
    body: "Ajoutez ici ce que coûte l'artiste en dehors de ses sorties : un trajet, un Uber Eats de session, une journée de studio, un coach vocal, une pub…",
  },
  table: {
    label: "Dépense",
    date: "Date",
    status: "Statut",
    amount: "Montant",
    actions: "Actions",
    total: "Total",
  },
  categories: {
    transport: "Transport",
    lodging: "Hébergement",
    food: "Restauration",
    food_delivery: "Livraison de repas",
    per_diem: "Per diem",
    studio: "Studio",
    equipment: "Matériel",
    coaching: "Coaching",
    image: "Image",
    photo_video: "Photo et vidéo",
    marketing: "Marketing",
    other: "Autre",
  } satisfies Record<ArtistExpenseCategory, string>,
  categoryHints: {
    transport: "Train, avion, taxi, Uber, essence, péage…",
    lodging: "Hôtel, Airbnb…",
    food: "Restaurant, repas de session…",
    food_delivery: "Uber Eats, Deliveroo…",
    per_diem: "Indemnité par jour en déplacement, en tournée…",
    studio: "Location de studio, ingé son hors projet…",
    equipment: "Instrument, micro, location de matériel…",
    coaching: "Coach vocal, scénique, média training…",
    image: "Stylisme, tenues, coiffure, maquillage…",
    photo_video: "Shooting, contenu pour les réseaux hors projet…",
    marketing: "Pub, sponsorisation, promo hors projet…",
    other: "Précisez ce que c'est.",
  } satisfies Record<ArtistExpenseCategory, string>,
  statuses: {
    planned: "Prévue",
    paid: "Payée",
  } satisfies Record<ArtistExpenseStatus, string>,
  byCategory: {
    title: "Par poste",
    hint: "Ses dépenses hors projet, payées et prévues, additionnées par poste.",
    count: (count: number) => `${count} dépense${count > 1 ? "s" : ""}`,
    planned: (amount: string) => `dont ${amount} prévus`,
  },
  projects: {
    title: "Ses projets",
    hint: "Ce que doit chaque projet de l'artiste, d'après son Budget.",
    open: (title: string) => `Ouvrir le budget de ${title}`,
  },
  form: {
    newTitle: "Nouvelle dépense",
    editTitle: "Modifier la dépense",
    description:
      "Un libellé, un montant, une catégorie : la dépense rejoint le Budget de l'artiste.",
    label: "Libellé",
    labelPlaceholder: "Ex. Uber Eats session du 12/11",
    amount: "Montant HT (€)",
    amountHint: "Ex. 45 ou 45,50",
    invalidAmount: "Indiquez un montant en euros, plus grand que zéro.",
    category: "Catégorie",
    categoryDetail: "Précision",
    categoryDetailMissing: "Précisez ce qu'est cette dépense.",
    date: "Date",
    status: "Statut",
    note: "Note",
    submit: "Enregistrer",
    cancel: "Annuler",
    close: "Fermer",
    saved: "Dépense enregistrée",
  },
  edit: (label: string) => `Modifier ${label}`,
  remove: (label: string) => `Supprimer ${label}`,
  confirm: {
    title: "Supprimer cette dépense ?",
    body: (label: string) =>
      `« ${label} » sera supprimée définitivement du Budget de l'artiste.`,
    confirm: "Supprimer",
    deleting: "Suppression…",
    deleted: "Dépense supprimée",
  },
};
