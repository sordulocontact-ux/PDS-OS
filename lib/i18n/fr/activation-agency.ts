const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Marketing › Activations, agency mode (tickets Influence parcours B and
 * RP § 6): read-only source, refresh preview, PDS decisions, recap, report. */
export const activationAgency = {
  agencyData: "Données agence",
  notVerified: "non vérifiées indépendamment",
  sources: {
    title: "Sources de l'agence",
    description:
      "Le tableau ou le plan reste l'outil de l'agence, sans compte PDS OS : il est lu, jamais modifié. Chaque actualisation garde un instantané daté.",
    add: "Connecter une source",
    addTitle: "Connecter une source",
    addDescription:
      "Un lien Google Sheets partagé en lecture (un onglet), un fichier Excel ou CSV déposé à chaque actualisation, ou une saisie à la main (plan en PDF).",
    label: "Nom de la source",
    labelHint:
      "Pour un Excel à plusieurs onglets, le nom de l'onglet à lire (« Djuno »).",
    kind: "Type",
    kinds: {
      google_sheet: "Google Sheets",
      file: "Fichier Excel ou CSV",
      manual: "Saisie à la main",
    },
    url: "Lien du Google Sheets",
    gid: "Onglet (gid)",
    gidHint:
      "Le nombre après « gid= » dans le lien de l'onglet ; vide = premier onglet.",
    agency: "Agence (Réseau)",
    person: "Interlocuteur",
    connected: "Source connectée.",
    refresh: "Actualiser",
    more: "Plus d'actions",
    refreshTitle: "Actualiser depuis un fichier",
    refreshDescription: "Déposez la dernière version du tableau de l'agence.",
    file: "Fichier",
    analysed: "Lecture analysée : vérifiez les changements avant de confirmer.",
    never: "Jamais actualisée",
    last: (date: string, status: string) =>
      `Dernière lecture le ${date} · ${status}`,
    statuses: {
      preview: "Changements à confirmer",
      applied: "Actualisée",
      partial: "Partiellement actualisée",
      discarded: "Abandonnée",
    },
    mapping: "Correspondance des colonnes",
    mappingTitle: "Correspondance des colonnes",
    mappingDescription:
      "Proposée par PDS OS d'après les en-têtes, à vérifier. Les colonnes sans correspondance restent gardées telles quelles.",
    keyFields: "Colonnes qui identifient une ligne",
    none: "— Non utilisée —",
    mappingSaved: "Correspondance enregistrée.",
    needsMapping: "Vérifiez la correspondance des colonnes, puis actualisez.",
    openSource: "Ouvrir la source",
    addRow: "Saisir une ligne",
    addRowTitle: "Saisir une ligne à la main",
    addRowDescription:
      "Pour un plan reçu en PDF ou par message : la ligne est gardée comme donnée agence.",
    rowAdded: "Ligne ajoutée.",
    importMetrics: "Importer les statistiques",
    importMetricsTitle: "Importer les statistiques de cette source",
    importMetricsBody:
      "Chaque chiffre lu (vues, likes, commentaires…) devient un relevé daté d'aujourd'hui, source « Agence », non vérifié. Les relevés précédents sont gardés.",
    imported: (n: number) =>
      `${n} ${plural(n, "relevé importé", "relevés importés")}.`,
    nothingToImport: "Aucun chiffre lisible dans les lignes actuelles.",
    empty: "Aucune source connectée.",
    pdfNote:
      "Fichier gardé en lecture seule ; ses lignes se saisissent à la main.",
  },
  preview: {
    title: "Changements à confirmer",
    description:
      "Rien n'est appliqué avant votre confirmation. Les décisions PDS et les notes ne sont jamais remplacées.",
    added: "Ajouts",
    modified: "Modifications",
    absent: "Absentes de la source",
    unchanged: "Inchangées",
    errors: "Lignes avec erreur",
    rule: "Ajout : identifiant jamais vu ; modification : valeurs différentes de la dernière lecture appliquée ; absente : présente avant, plus dans ce fichier (gardée, jamais supprimée).",
    changes: {
      added: "Ajout",
      modified: "Modification",
      absent: "Absente",
      unchanged: "Inchangée",
    },
    fileErrors: "Erreurs du fichier",
    skipped: (lines: string) =>
      `Lignes sans identifiant, non importées : ${lines}.`,
    select: "Garder",
    confirmAll: "Confirmer l'actualisation",
    confirmSelected: (n: number) =>
      `Confirmer ${n} ${plural(n, "changement", "changements")}`,
    confirmed: "Actualisation confirmée.",
    discard: "Abandonner",
    discarded: "Lecture abandonnée.",
    nothing: "Aucun changement depuis la dernière lecture.",
    errorsMessages: {
      cellError: (column: string, value: string) => `${column} : ${value}`,
      notNumber: (column: string, value: string) =>
        `${column} : « ${value} » n'est pas un nombre`,
      badUrl: (column: string) => `${column} : lien invalide`,
      category: (label: string, followers: number) =>
        `Catégorie « ${label} » avec ${new Intl.NumberFormat("fr-FR").format(followers)} abonnés, au-delà du seuil indiqué`,
      unreadable:
        "Le tableau n'est pas lisible : vérifiez qu'il est partagé en lecture par lien.",
      emptyFile: "Aucune ligne lisible dans ce fichier.",
      notSpreadsheet:
        "Ce fichier n'est ni un Excel (.xlsx) ni un CSV : il est gardé, ses lignes se saisissent à la main.",
      missingKey: "Aucune colonne d'identifiant n'est associée.",
    },
  },
  gallery: {
    title: "Propositions de l'agence",
    titlePress: "Plan médias de l'agence",
    description:
      "Le statut de l'agence est montré tel quel ; la décision PDS est à part et survit à chaque actualisation.",
    filter: "Décision PDS",
    all: "Toutes",
    agencyStatus: "Statut agence",
    pdsDecision: "Décision PDS",
    decisions: {
      to_review: "À examiner",
      validated: "Validé",
      refused: "Refusé",
      to_discuss: "À discuter",
      waiting_info: "En attente d'information",
      to_fix: "À corriger",
    },
    decide: "Décider",
    decideTitle: "Décision PDS",
    decideDescription:
      "Elle reste à PDS : l'agence ne voit ni la décision ni la note.",
    note: "Note interne",
    decided: "Décision enregistrée.",
    absent: "Absente de la dernière source",
    divergence: "Statut agence en avance sur la décision PDS",
    link: "Rattacher au Réseau",
    linkTitle: "Rattacher au Réseau",
    linkDescription:
      "Le profil existe une seule fois dans le Réseau : cette ligne y est reliée, rien n'est fusionné automatiquement.",
    linked: "Ligne rattachée au Réseau.",
    inNetwork: "Dans le Réseau",
    followers: "Abonnés",
    source: (label: string, date: string) => `${label} · lu le ${date}`,
    empty: "Aucune ligne lue pour l'instant.",
    emptyView: "Aucune ligne pour cette décision.",
    errorsLabel: "À vérifier",
    links: { profile_url: "Profil", video_url: "Vidéo", coverage_url: "Lien" },
  },
  recap: {
    title: "Retour à l'agence",
    subject: (campaign: string) => `Retour PDS — ${campaign}`,
    intro: "Bonjour,\n\nVoici nos retours sur vos propositions :",
    sections: {
      validated: "Validés",
      refused: "Refusés",
      to_discuss: "À discuter",
      waiting_info: "En attente d'information",
      to_fix: "À corriger",
    },
    outro:
      "Merci de mettre à jour votre tableau ; nous l'actualiserons de notre côté.\n\nBien à vous,",
  },
  report: {
    title: "Bilan de l'agence",
    description:
      "Le bilan est gardé tel que reçu. Toute synthèse dit sa source, sa date et l'absence de vérification indépendante.",
    add: "Rattacher le bilan",
    addTitle: "Rattacher le bilan reçu",
    addDescription:
      "Le fichier, le lien ou le texte du bilan, et la date de réception.",
    file: "Fichier",
    url: "Lien",
    body: "Texte du bilan",
    receivedOn: "Reçu le",
    received: "Bilan rattaché.",
    statuses: {
      received: "Reçu",
      provisional: "Validé provisoirement avec réserves",
      complements_requested: "Compléments demandés",
      archived: "Archivé sans validation",
      validated: "Validé",
    },
    decide: {
      provisional: "Valider provisoirement",
      complements_requested: "Demander des compléments",
      archived: "Archiver comme reçu",
      validated: "Valider définitivement",
    },
    decideTitle: "Décision sur le bilan",
    decideDescription:
      "Les réserves objectives sont listées par PDS OS et gardées avec la décision ; une validation définitive malgré elles exige un motif.",
    comment: "Commentaire",
    commentHint:
      "Facultatif pour une validation provisoire ; obligatoire pour des compléments ou une validation définitive avec réserves.",
    decided: "Décision enregistrée.",
    reserves: "Réserves",
    noReserves: "Aucune réserve objective.",
    reserveLabels: {
      to_review: (n: number) =>
        `${n} ${plural(n, "proposition", "propositions")} encore « À examiner »`,
      divergence: (n: number) =>
        `${n} ${plural(n, "écart", "écarts")} entre statut agence et décision PDS`,
      unproven: (n: number) =>
        `${n} ${plural(n, "action déclarée", "actions déclarées")} sans preuve vérifiée`,
      no_metrics: "Aucune statistique relevée",
      metrics_declared: "Statistiques déclarées par l'agence, non vérifiées",
      row_errors: (n: number) =>
        `${n} ${plural(n, "ligne", "lignes")} avec erreur de lecture`,
    },
    synthesis: "Synthèse des résultats",
    synthesisDescription:
      "Additionnée par le code depuis le dernier relevé valide de chaque ligne ; « données agence » tant qu'aucune vérification indépendante n'existe.",
    bySource: "Par source",
    total: "Total",
    none: "Aucun bilan rattaché.",
    by: (who: string, date: string) => `par ${who} le ${date}`,
    openFile: "Voir le fichier",
  },
  fieldLabels: {
    name: "Nom",
    handle: "@",
    platform: "Plateforme",
    category: "Catégorie",
    followers: "Abonnés",
    likes: "Likes",
    engagement: "Engagement",
    views: "Vues",
    comments: "Commentaires",
    saves: "Enregistrements",
    shares: "Partages",
    profile_url: "Lien profil",
    video_url: "Lien vidéo",
    sponsor_code: "Code sponsor",
    agency_status: "Statut agence",
    media: "Média",
    journalist: "Journaliste",
    action_type: "Type d'action",
    angle: "Angle",
    priority: "Priorité",
    due: "Échéance",
    comment: "Commentaire",
    coverage_url: "Lien de retombée",
  },
  errors: {
    sourceRequired: "Donnez un nom à la source.",
    urlRequired: "Collez le lien du Google Sheets.",
    fileRequired: "Déposez le fichier.",
    previewOpen: "Une lecture attend déjà sa confirmation pour cette source.",
  },
};
