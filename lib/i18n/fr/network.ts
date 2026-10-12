/** Network: the people and organizations PDS works with. */
export const network = {
  title: "Réseau",
  description:
    "Les personnes et les organisations avec qui PDS travaille : artistes, techniciens, labels, studios, médias, prestataires…",
  new: "Nouveau contact",
  viewsLabel: "Filtrer le réseau",
  // Tabs: every contact, by kind, and the spotted artists (ticket « Retour
  // PO / Réseau » of 11/10/2026).
  views: {
    all: "Tous",
    people: "Personnes",
    organizations: "Organisations",
    spotted: "Artistes repérés",
  },
  // Filters under the tabs: domains of roles, then relation types.
  filters: {
    domainLabel: "Métier",
    domainAll: "Tous les métiers",
    domains: {
      music: "Musique",
      image: "Image & vidéo",
      press: "Presse & influence",
      business: "Affaires & conseil",
      other: "Autres",
    },
    relationLabel: "Type de relation",
    relationAll: "Toutes les relations",
    cityLabel: "Ville",
    cityAll: "Toutes les villes",
  },
  kinds: {
    person: "Personne",
    organization: "Organisation",
  },
  relations: {
    client: "Client",
    provider: "Prestataire",
    partner: "Partenaire",
    supplier: "Fournisseur",
  },
  // Plural, for the relation filter.
  relationsPlural: {
    client: "Clients",
    provider: "Prestataires",
    partner: "Partenaires",
    supplier: "Fournisseurs",
  },
  // Picking someone of the Réseau from another form (a credit, a share).
  picker: {
    searchLabel: "Chercher dans le Réseau",
    placeholder: "Nom d'une personne ou d'une organisation du Réseau…",
    create: "Ajouter au Réseau",
    createNamed: (name: string) => `Ajouter « ${name} » au Réseau`,
    noResult: (name: string) => `Personne nommée « ${name} » dans le Réseau.`,
    allSelected: "Tout le Réseau est déjà proposé.",
    noSuggestion:
      "Personne du Réseau n'a encore ce rôle : tapez un nom pour chercher dans tout le Réseau.",
    remove: (name: string) => `Changer ${name}`,
    keepName: "Garder seulement le nom",
    search: "Chercher dans le Réseau",
    loading: "Chargement du Réseau…",
  },
  roles: {
    artist: "Artiste",
    beatmaker: "Beatmaker",
    musician: "Musicien·ne",
    songwriter: "Auteur·rice-compositeur·rice",
    engineer: "Ingé son",
    producer: "Réalisateur·rice",
    art_director: "Directeur·rice artistique",
    videographer: "Vidéaste",
    photographer: "Photographe",
    designer: "Graphiste",
    lawyer: "Avocat·e",
    journalist: "Journaliste",
    influencer: "Influenceur·se",
    manager: "Management",
    label: "Label",
    studio: "Studio",
    agency: "Agence",
    production_company: "Société de production",
    publisher: "Éditeur",
    distributor: "Distributeur",
    media: "Média",
    company: "Entreprise",
    other: "Autre",
  },
  columns: {
    name: "Nom",
    roles: "Métier ou activité",
    contact: "Coordonnées",
    city: "Ville",
    actions: "Actions",
  },
  search: {
    label: "Rechercher dans le réseau",
    placeholder: "Nom, métier, organisation, ville…",
    noResult: (query: string) =>
      `Personne ne correspond à « ${query} » dans le réseau.`,
  },
  emptyTitle: "Le réseau est vide",
  emptyBody:
    "Ajoutez les personnes et les organisations avec qui vous travaillez : elles seront partagées avec toute l'équipe et pourront être parties d'un contrat.",
  emptyViewTitle: (view: string) => `Personne dans « ${view} »`,
  emptyViewBody: "Les autres contacts restent dans l'onglet « Tous ».",
  emptyFilterTitle: "Aucun contact pour ce filtre",
  emptyFilterBody: "Changez de métier ou de type de relation.",
  loadError: "Le réseau n'a pas pu être chargé. Rechargez la page.",
  // A person's organization, under their name.
  memberOf: (organization: string) => `chez ${organization}`,
  form: {
    createTitle: "Nouveau contact",
    createDescription:
      "Une personne ou une organisation : elle sera partagée avec toute l'équipe.",
    kind: "Type",
    name: "Nom",
    // A professional name is an identity on its own (PROJ-BUG-07): the civil
    // names are asked only where a document needs them.
    nameLabel: {
      person: "Nom ou nom professionnel",
      organization: "Nom",
    },
    nameHint: {
      person:
        "Le nom sous lequel la personne travaille. Ses nom et prénom civils ne sont demandés que pour un contrat ou une fiche de renseignements.",
      organization: "",
    },
    namePlaceholder: {
      person: "Ex. Inès Morel, ou DJ Lumen",
      organization: "Ex. Studio Lumière",
    },
    // « Métiers » of a person, « Activités » of an organization.
    roles: { person: "Métiers", organization: "Activités" },
    rolesPlaceholder: {
      person: "Choisir un ou plusieurs métiers",
      organization: "Choisir une ou plusieurs activités",
    },
    relations: "Type de relation",
    relationsPlaceholder: "Client, prestataire, partenaire…",
    relationsHint: "Comment PDS travaille avec ce contact.",
    parent: "Organisation associée",
    // « Garder seulement le nom » on the organization: a name is not a link.
    artist: "Artiste du catalogue",
    artistNone: "Aucun",
    // A new contact named exactly as an artist of the catalog (UX test of
    // 09/10/2026, section 8): linked unless removed.
    artistLinked: (name: string) => `Relié à l'artiste du catalogue ${name}`,
    artistLinkedHint: "Même nom que sa fiche artiste.",
    artistUnlink: "Retirer",
    artistUnlinked: "Pas relié à un artiste du catalogue.",
    artistRelink: (name: string) => `Relier à ${name}`,
    // Contacts of the Réseau of the same name (ticket of 11/10/2026):
    // never blocking, people may share a name.
    duplicates: (count: number) =>
      count > 1
        ? `${count} contacts du Réseau portent déjà ce nom.`
        : "Un contact du Réseau porte déjà ce nom.",
    duplicatesHint:
      "Ouvrez sa fiche pour le réutiliser, ou continuez si c'est quelqu'un d'autre.",
    openContact: "Ouvrir la fiche",
    // Changing the kind of a saved contact: what goes with it, said before.
    kindChange: {
      title: (kind: string) => `En passant en « ${kind} » :`,
      roles: (roles: string) => `ces rôles sont retirés : ${roles} ;`,
      parent: (name: string) =>
        `l'organisation associée ${name} est détachée ;`,
      artist: (name: string) =>
        `le lien avec l'artiste du catalogue ${name} est retiré ;`,
      members: (count: number) =>
        count > 1
          ? `${count} personnes y sont rattachées : détachez-les d'abord de leur fiche.`
          : "une personne y est rattachée : détachez-la d'abord de sa fiche.",
      kept: "contrats, crédits, projets et historique restent liés au contact.",
    },
    email: "E-mail",
    phone: "Téléphone",
    website: "Site web",
    websitePlaceholder: "https://…",
    city: "Ville",
    notes: "Notes",
    notesPlaceholder: "Tarifs, disponibilités, dernier projet ensemble…",
    // An artist's accounts: a handle, or the profile link pasted as is.
    accounts: "Réseaux",
    tiktok: "TikTok",
    tiktokPlaceholder: "@pseudo ou lien du profil",
    instagram: "Instagram",
    instagramPlaceholder: "@pseudo ou lien du profil",
    spotify: "Spotify",
    spotifyPlaceholder: "Lien de la page artiste",
    deezer: "Deezer",
    deezerPlaceholder: "Lien de la page artiste",
    submitCreate: "Ajouter au réseau",
    submitEdit: "Enregistrer",
    pending: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
  },
  errors: {
    invalid: "Vérifiez le nom, les métiers et les coordonnées.",
    email: "Adresse e-mail invalide.",
    website: "Le site doit commencer par http:// ou https://.",
    accounts: {
      tiktok: "Pseudo TikTok illisible : « @pseudo » ou le lien tiktok.com/@…",
      instagram:
        "Pseudo Instagram illisible : « @pseudo » ou le lien instagram.com/…",
      spotify: "Lien Spotify illisible : la page open.spotify.com/artist/…",
      deezer: "Lien Deezer illisible : la page deezer.com/artist/…",
    },
    forbidden: "Vous ne pouvez pas modifier le réseau.",
    parent: "L'organisation choisie n'existe plus dans le réseau.",
    members:
      "Des personnes sont rattachées à cette organisation : détachez-les avant d'en faire une personne.",
    failed: "Le contact n'a pas pu être enregistré. Réessayez.",
  },
  page: {
    back: "Tout le réseau",
    facts: "Coordonnées",
    kind: "Type",
    roles: "Métiers",
    relations: "Type de relation",
    email: "E-mail",
    phone: "Téléphone",
    website: "Site web",
    city: "Ville",
    parent: "Organisation associée",
    artist: "Fiche artiste",
    notes: "Notes",
    accounts: "Réseaux",
    none: "non renseigné",
    members: "Personnes associées",
    membersDescription: "Les personnes du réseau qui y travaillent.",
    membersEmpty: "Aucune personne du réseau rattachée à cette organisation.",
    contracts: "Contrats",
    contractsDescription:
      "Les contrats où ce contact est partie, parmi ceux que vous pouvez lire.",
    contractsEmpty: "Aucun contrat visible avec ce contact.",
    archived: "Ce contact est archivé : il n'apparaît plus dans le réseau.",
    // Marketing › Activations: the campaigns a profile took part in, and
    // its dated observations (tickets Influence and RP, « Capitalisation »).
    campaigns: "Campagnes",
    campaignsEmpty: "Aucune campagne visible avec ce profil.",
    campaignTarget: "Ciblé en interne",
    campaignAgency: "Proposé par une agence",
    observations: "Relevés datés",
    observationsEmpty:
      "Aucun relevé : une audience ou un tarif se note avec sa date et sa source.",
    observationsHint:
      "Chaque relevé garde sa date et sa source ; un nouveau n'écrase jamais l'ancien. Une performance passée ne garantit rien.",
    addObservation: "Noter un relevé",
    observationTitle: "Noter un relevé",
    observationKinds: {
      followers: "Abonnés",
      engagement_rate: "Taux d'engagement",
      rate: "Tarif connu",
      category: "Catégorie",
    },
    observationKind: "Relevé",
    observationValue: "Valeur",
    observationText: "Catégorie",
    observationPlatform: "Plateforme",
    observationDate: "Observé le",
    observationSource: "Source",
    observationSources: {
      agency: "Agence",
      creator: "Le créateur",
      internal: "Relevé interne",
      platform: "Plateforme",
      independent: "Vérification indépendante",
    },
    observationNote: "Note",
    observationSaved: "Relevé noté.",
    invalidate: "Invalider",
    invalidateTitle: "Invalider le relevé",
    invalidateDescription:
      "Il reste dans l'historique, marqué invalidé, avec votre raison.",
    invalidateReason: "Raison",
    invalidated: "Relevé invalidé.",
    invalidatedLabel: "Invalidé",
    observationValueRequired: "Donnez une valeur.",
  },
} as const;
