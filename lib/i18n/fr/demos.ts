// Maquettes of the Catalogue (retours d'Ibé du 01 et du 05/11/2026): their
// list, their statuses, the release decision that makes one a master.

export const demos = {
  title: "Maquettes",
  tab: "Maquettes",
  subtitle:
    "Les morceaux en travail, pas encore décidés pour une sortie. Une maquette retenue passe au catalogue des masters, sans rien recréer.",
  newDemo: "Nouvelle maquette",
  statuses: {
    draft: "Brouillon",
    developing: "En développement",
    validated: "Validée",
    abandoned: "Abandonnée",
  },
  // The badge of a maquette's page and lists (« Maquette · Brouillon »).
  badge: (status: string) => `Maquette · ${status}`,
  views: {
    label: "Statut des maquettes",
    active: "En cours",
    draft: "Brouillons",
    developing: "En développement",
    validated: "Validées",
    abandoned: "Abandonnées",
  },
  columns: {
    title: "Maquette",
    artists: "Artistes",
    status: "Statut",
    sessions: "Sessions",
  },
  search: {
    label: "Rechercher une maquette",
    placeholder: "Nom de travail, artiste…",
    noResult: (query: string) =>
      `Aucune maquette ne correspond à « ${query} ».`,
  },
  empty: {
    title: "Aucune maquette",
    body: "Une maquette naît d'une session studio (son compte rendu) ou de « Nouvelle maquette ».",
    view: "Aucune maquette dans cet onglet",
    viewBody: "Les autres maquettes sont dans les autres onglets.",
  },
  loadError: "Les maquettes n'ont pas pu être lues. Réessayez dans un instant.",
  createHint:
    "Elle entre dans les Maquettes du Catalogue. Elle passera au catalogue des masters quand sa sortie sera décidée.",
  status: {
    label: "Statut de la maquette",
    change: "Changer le statut",
    changed: (status: string) => `Maquette passée en « ${status} »`,
    validateHint:
      "Valider, c'est la validation artistique : elle ne décide pas d'une sortie.",
  },
  promote: {
    action: "Passer au catalogue des masters",
    title: "Passer au catalogue des masters",
    description:
      "La sortie est décidée : la maquette devient un master du Catalogue. Même fiche : ses sessions, fichiers, crédits et son historique restent.",
    name: "Titre du master",
    nameHint: "Le nom de sortie, s'il change du nom de travail.",
    submit: "Passer au catalogue",
    done: "La maquette est passée au catalogue des masters",
    onlyValidated: "Seule une maquette validée passe au catalogue des masters.",
    since: "Passé au catalogue des masters",
  },
  back: "Toutes les maquettes",
  errors: {
    failed: "L'enregistrement n'a pas abouti. Réessayez dans un instant.",
    forbidden:
      "Valider ou abandonner une maquette validée revient à la direction et à la direction créative.",
    promoteForbidden: "La décision de sortie revient à la direction.",
    notValidated: "Seule une maquette validée passe au catalogue des masters.",
  },
} as const;
