// The Distribution as a journey of seven steps (proto « Projet complet »,
// docs/protos/distribution.html, lib/distribution/journey.ts): titles, why,
// what each one gave, who acts and the module's frame. The proto's words.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const distributionJourney = {
  module: "Distribution",
  distributor: "The Orchard",
  groups: {
    dossier: "Dossier",
    deposit: "Dépôt",
    online: "En ligne",
    closure: "Clôture",
  },
  steps: {
    prep: {
      title: "Préparation",
      why: "Ce que le dépôt réutilise, lu dans le module qui en est propriétaire. On corrige à la source : rien n'est recopié ici.",
    },
    params: {
      title: "Paramètres de distribution",
      why: "Ce qui appartient à la distribution elle-même. Tout le reste se corrige dans son module source.",
    },
    dossier: {
      title: "Dossier de livraison",
      why: "Ce que vous saisirez dans The Orchard, section par section, contrôlé par une personne puis validé avant le dépôt.",
    },
    deposit: {
      title: "Dépôt dans The Orchard",
      why: "Vous saisissez le dossier validé dans The Orchard, puis vous déclarez le dépôt ici.",
    },
    orchard: {
      title: "Réponse de The Orchard",
      why: "Réception, acceptation, puis livraison aux plateformes : chacune se déclare à part, aucune n'est déduite d'une autre.",
    },
    platforms: {
      title: "Plateformes",
      why: "Le lien officiel de chaque plateforme, puis ce qu'une personne a constaté en l'ouvrant. PDS OS ne vérifie rien tout seul.",
    },
    closure: {
      title: "Clôture",
      why: "Fermer le suivi : normalement si tout est déclaré et vérifié, sinon avec des réserves arbitrées. Une réserve ne devient jamais une vérification.",
    },
  },
  prep: {
    verdict: (ready: number, total: number) =>
      `${ready} élément${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""} sur ${total} · chacun se corrige dans son module.`,
    readyTitle: "Prêt pour contrôle.",
    readyBody:
      "Toutes les sources sont prêtes : le dossier de livraison peut être établi. Ce n'est pas une validation : les contrôles viennent ensuite.",
    footer:
      "Cette liste se relit seule à chaque ouverture : rien ne s'y coche à la main.",
    correctIn: (module: string) => `Corriger dans ${module}`,
    badges: {
      to_prepare: "À préparer",
      partial: "Incomplet",
      ready: "Prêt pour contrôle",
    },
  },
  params: {
    labels: {
      territories: "Territoires",
      preorder: "Précommande",
      prelisten: "Écoute en avant-première",
      priceTier: "Catégorie tarifaire",
      cover: "Pochette",
      validator: "Validateur Distribution",
      notes: "Notes pour la saisie",
    },
    sources: {
      territories:
        "Par défaut · le contrôle « Droits et territoires » le confirme",
      notes: "Ce qu'il faut savoir au moment de remplir The Orchard",
      coverGuessed: "Trouvée par son titre en Conception : confirmez-la",
      coverChosen: "Conception · désignée dans les paramètres",
      validatorProposed:
        "Proposé : la direction valide les dossiers. Jamais le responsable lui-même.",
      validatorChosen: "Désigné dans les paramètres",
      saved: "Distribution · paramètres",
    },
    preorderSource: (title: string) => `Stratégie › Temps forts · « ${title} »`,
    toFill: "À renseigner",
    none: "Aucune",
    noCover: "Aucune Fiche Livrable de pochette",
    noValidator: "Personne ne peut valider : à désigner",
    edit: "Modifier",
    fill: "Renseigner",
    change: "Changer",
    save: "Enregistrer",
    cancel: "Annuler",
    proposed: (value: string, source: string) =>
      `Proposé : ${value}${source ? ` · ${source}` : ""}`,
    yes: "Oui",
    no: "Non",
    yesOn: (day: string) => `Oui, à partir du ${day}`,
    country: "Pays",
    preorderOn: "Ouverture de la précommande",
    prelistenOn: "Début de l'écoute en avant-première",
    beforeRelease: (day: string) =>
      `La sortie est le ${day} : la date doit la précéder.`,
    coverHint:
      "La pochette reste validée dans sa Fiche Livrable ; seul le lien est gardé ici.",
    validatorHint:
      "Parmi les personnes qui ont le droit de valider, jamais vous-même.",
    notesPlaceholder: "Ce qu'il faut savoir au moment de remplir The Orchard.",
    sheetLine: (status: string) => `Fiche Livrable · ${status}`,
    required: {
      preorder: "Dites s'il y a une précommande.",
      prelisten: "Dites s'il y a une écoute en avant-première.",
      priceTier: "Choisissez une catégorie tarifaire : The Orchard la demande.",
      validator: "Désignez le validateur Distribution.",
    },
    errors: {
      countries: "Choisissez au moins un pays.",
      yesNo: "Choisissez oui ou non.",
      date: "Indiquez la date.",
      tier: "Choisissez une catégorie.",
      preorderLate: (day: string) =>
        `La précommande doit commencer avant la sortie, le ${day}.`,
      prelistenLate: (day: string) =>
        `L'avant-première doit commencer avant la sortie, le ${day}.`,
      afterRelease: "Une date doit précéder la sortie.",
      frozen:
        "Une version attend une décision ou est validée : les paramètres sont figés.",
      generic: "L'enregistrement a échoué. Réessayez.",
    },
    missing: (n: number) =>
      n > 1
        ? `${n} informations manquent : elles sont en rouge.`
        : "1 information manque : elle est en rouge.",
    confirm: "Confirmer les paramètres",
    confirmed: "Paramètres de distribution confirmés",
    done: {
      territories: "Territoires modifiés",
      preorder: "Précommande modifiée",
      prelisten: "Écoute en avant-première renseignée",
      priceTier: "Catégorie tarifaire choisie",
      cover: "Pochette changée",
      validator: "Validateur Distribution changé",
      notes: "Notes pour la saisie modifiées",
    },
  },
  // The 4-column grid.
  computed: { name: "Calculé par le code", role: "à chaque ouverture" },
  ownerRole: "Cheffe ou chef de projet",
  validatorRole: "Validateur Distribution",
  toAppoint: "À désigner",
  rootPrereq: "Projet lancé",
  nextOf: {
    prep: "Soumission du dossier",
    platforms: "Clôture normale",
    closure: "Clôture du projet",
  },
  // The sources the Préparation waits for, in the grid.
  external: {
    master: "Master final",
    cover: "Pochette",
    clearance: (work: string) => `Emprunt « ${work} »`,
    masterModule: "Master",
    coverModule: "Conception",
    legalModule: "Juridique",
  },
  todo: {
    confirmParams: "Confirmer les paramètres",
    controlDossier: (n: number) => `Contrôler le dossier V${n}`,
    submit: (n: number) => `Soumettre la V${n} à validation`,
    validate: (n: number) => `Valider la V${n}`,
    prepareNext: (n: number) => `Préparer la V${n}`,
    deposit: "Déclarer le dépôt",
    receive: "recevoir le dossier",
    accept: "accepter la sortie",
    deliver: "livrer les plateformes",
    verify: (n: number) => `Vérifier les plateformes (${n} sur 5)`,
    reverify: "Revérifier les plateformes",
    followAnomaly: "Suivre l'anomalie ouverte",
    detection: "la détection automatique",
    detectionTodo: (day: string) => `trouver les liens, à partir du ${day}`,
    detectionTodoUndated: "trouver les liens, à partir de la sortie",
    proposeClosure: "Proposer la clôture",
    validateClosure: "Valider la clôture",
  },
  summary: {
    prepReady: (ready: number, total: number) =>
      `Prêt pour contrôle · ${ready} éléments sur ${total}`,
    prepBlocking: (n: number) =>
      `${plural(n, "élément bloque", "éléments bloquent")} le dossier`,
    paramsConfirmed: (by: string | null) =>
      by ? `Confirmés par ${by}` : "Confirmés",
    dossierApproved: (n: number) => `V${n} validée`,
    depositProven: "Déclaré, preuve jointe",
    depositDeclared: "Déclaré, sans preuve",
    orchardDone: "Acceptée et livrée, déclarées",
    platformsDone: "5 plateformes vérifiées sur 5",
    closurePossible: "Possible avec réserves dès maintenant",
    closedNormal: "Clôturée normalement",
    closedReserves: (n: number) => `Clôturée avec réserves (${n})`,
  },
  // A locked step: what it will ask, and who.
  coming: "Ce qui viendra",
  acts: {
    params: ["Confirmer les paramètres"],
    dossier: ["Soumettre à validation", "Valider le dossier"],
    deposit: ["Déclarer le dépôt"],
    orchard: [
      "Déclarer la réception",
      "Déclarer l'acceptation",
      "Déclarer la livraison aux plateformes",
    ],
    platforms: ["Vérifier les plateformes"],
    closure: ["Proposer la clôture", "Valider la clôture"],
  },
  // « Maintenant » of the module.
  now: {
    waitingTitle: "La Distribution avance sans vous pour l'instant",
    finished: "La distribution est clôturée",
  },
  footer: {
    anomalies: "Anomalies",
    anomaliesOpen: (n: number) =>
      `Anomalies (${plural(n, "ouverte", "ouvertes")})`,
    history: "Historique de la distribution",
  },
  back: "← Parcours",
  // The workflow's status next to the title (wfStatus of the proto).
  status: {
    not_started: "Non démarré",
    in_progress: "En cours",
    waiting: "En attente",
    blocked: "Bloqué",
    done: "Terminé",
  },
  facts: {
    masterFinal: "Master final",
    release: "Sortie",
    distributor: "Distributeur",
  },
  views: {
    anomalies: "Anomalies",
    history: "Historique de la distribution",
    historyBody:
      "Chaque geste, qui l'a fait et quand, avec ou sans preuve. Une déclaration retirée ou une version remplacée reste ici.",
    historyEmpty: "Rien pour l'instant.",
  },
} as const;
