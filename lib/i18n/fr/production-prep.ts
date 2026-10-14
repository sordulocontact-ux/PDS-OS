/** Marketing › Production: one deliverable's preparation, its entry and what
 * it inherits from Conception (parcours 1). */
export const productionPrep = {
  title: "Préparation",
  back: "Production",
  prepare: "Préparer",
  openPrep: "Ouvrir la préparation",
  notValidated:
    "La préparation s'ouvre depuis une Fiche Livrable validée en Conception.",
  notValidatedTitle: "Pas encore de version validée",
  toConception: "Ouvrir la Conception",
  locked: "La production n'est plus en cours : la préparation est en lecture.",
  readOnly:
    "Seul le responsable du projet prépare la production. Vous la lisez.",
  source: (n: number) => `Version source : v${n}`,
  validatedBy: (who: string, date: string) => `Validée par ${who} le ${date}`,
  openSource: "Voir la version",
  newer: (n: number) =>
    `Une version plus récente (v${n}) a été validée en Conception depuis l'ouverture.`,
  heritage: {
    title: "Hérité de la Conception",
    description:
      "Ce que la Conception a déjà décidé fait foi : PO ne le redemande pas.",
    facts: {
      lever: "Levier",
      quantity: "Quantité",
      due: "Échéance",
      assignee: "Responsable",
      duration: "Durée",
      ratios: "Ratios",
      subtitles: "Sous-titres",
      budget: "Budget du levier",
      ficheBudget: "Budget prévisionnel",
      shoot: "Tournage",
      post: "Postproduction",
      delivery: "Livraison",
    },
    notFilled: "Non renseigné",
    notFilledHint: "à préciser dans la Fiche Livrable",
    concept: "Concept et direction",
    conceptLabel: "Concept",
    intentionLabel: "Intention",
    constraints: "Contraintes",
    productionNotes: "Laissé à la Production",
    items: "Éléments de la série",
    durationRange: (min: string, max: string) => `de ${min} à ${max}`,
    period: (from: string, to: string) => `du ${from} au ${to}`,
    subtitlesYes: "Oui",
    subtitlesNo: "Non",
    subtitleModes: {
      burned: "intégrés",
      file: "fichier séparé",
      both: "intégrés et fichier",
    },
    direction: "Direction d'ensemble",
    topics: {
      story: "Ce que ça raconte",
      look: "À quoi ça ressemble",
      tone: "Ton",
      musts: "À montrer, à éviter",
    },
    references: "Références",
    milestones: "Dates",
    dependencies: "Dépendances",
    dependsOnConception: (n: number) =>
      `Repose sur la version v${n} validée en Conception`,
    openPoints: "Points ouverts",
    missingTopic: (topic: string) => `${topic} : sans réponse confirmée`,
    pendingProposals: (n: number) =>
      n === 1
        ? "1 proposition de PO attend une confirmation en Conception"
        : `${n} propositions de PO attendent une confirmation en Conception`,
    noOpenPoints: "Aucun point ouvert en Conception.",
    budgetLine: (committed: string, planned: string) =>
      `${committed} engagé · ${planned} estimé`,
  },
  modes: {
    title: "Comment organiser la production ?",
    description:
      "Le choix organise le travail dans PDS OS : rien n'est envoyé, réservé ni commandé.",
    current: "Organisation",
    change: "Changer",
    submit: "Commencer la préparation",
    save: "Enregistrer",
    changeTitle: "Changer d'organisation",
    changeDescription: "Le brief et les équipes déjà saisis sont gardés.",
    options: {
      direct: {
        label: "Préparer directement avec PO",
        description:
          "Vous complétez le brief réalisateur et les équipes ici, PO suggère les postes.",
      },
      call: {
        label: "Préparer un call de production",
        description:
          "PO prépare l'ordre du jour avec ce qui manque ; les décisions reviennent ensuite ici.",
      },
      import: {
        label: "Importer une organisation existante",
        description:
          "Collez une note ou un document déjà écrit : PO propose, vous relisez avant d'enregistrer.",
      },
    },
    startsStage:
      "Commencer la préparation démarre l'étape Production si elle ne l'est pas encore.",
  },
  holderGroups: { members: "Membres de PDS", network: "Réseau" },
  tabsLabel: "Production du livrable",
  tabs: {
    preparation: "Préparation",
    preproduction: "Préproduction",
    shoot: "Tournage",
    post: "Postproduction",
    delivery: "Livraison",
    history: "Historique",
  },
  phases: {
    to_prepare: "À préparer",
    preproduction: "Préproduction",
    ready: "Prête pour tournage",
    shooting: "Tournage en cours",
    shot: "Tournage terminé",
    post: "Postproduction",
    final_check: "Contrôle final",
    delivered: "Livrée",
    handed_off: "Transmise à Activations",
  },
  fiche: (n: number) => `Fiche Livrable v${n}`,
  handedOn: (date: string) => `transférée par la Conception le ${date}`,
  newerFiche: (n: number) =>
    `Une version plus récente de la Fiche Livrable (v${n}) a été transférée depuis l'ouverture : la préparation repose toujours sur celle d'origine.`,
  close: "Fermer",
  cancel: "Annuler",
  saving: "Enregistrement…",
  errors: {
    forbidden: "Seul le responsable du projet prépare la production.",
    locked: "La production n'est pas en cours.",
    notApproved:
      "Aucune version validée en Conception pour ce livrable : la préparation attend la Fiche Livrable.",
    invalid: "Ces informations ne sont pas valides.",
    notFound: "Cette préparation n'existe plus. Rechargez la page.",
    fileTooLarge: "Le fichier dépasse 500 Mo : déposez plutôt un lien.",
    uploadFailed: "L'envoi du fichier a échoué. Réessayez.",
    generic: "L'enregistrement a échoué. Réessayez.",
  },
} as const;
