// Production as a journey (Ibé, 14/10, docs/PRODUCTION-METIER.md § 0; proto
// « Projet complet », production.md § 2): the steps of each organisation,
// their words, who acts and what for, the « Maintenant » of each person.
export const productionJourney = {
  label: "Parcours de la production",
  spine: "Parcours · Production",
  steps: {
    organisation: {
      title: "Qui produit ?",
      why: "Interne : PDS pilote, avec ses freelances. Externe : une société ou un prestataire est mandaté. Le choix se fait par livrable.",
    },
    call: {
      title: "Call de production",
      why: "Chaque point devient une décision, une hypothèse, une action proposée ou un point à arbitrer ; les actions deviennent des tâches.",
    },
    quote: {
      title: "Devis",
      why: "Déposé par la société, vérifié par la production, validé par la validation budgétaire. Un dépôt ne vaut jamais validation.",
    },
    direction: {
      title: "Proposition de réalisation",
      why: "Traitement, moodboard, découpage : ce qu'on tourne. Validé en interne, et en externe quand c'est requis.",
    },
    "follow-up": {
      title: "Préproduction",
      why: "La société organise ; PDS suit les tâches, les échéances et les blocages.",
    },
    gear: {
      title: "Équipes et matériel",
      why: "Équipe image, équipe son et musiciens sont séparées ; chaque poste est confirmé, jamais supposé.",
    },
    locations: {
      title: "Lieux",
      why: "La société propose, PDS retient un lieu. Le remplacer crée une nouvelle décision, l'ancienne reste.",
    },
    "call-sheet": {
      title: "Planning et feuille de service",
      why: "Composée depuis le lieu, l'équipe et le planning validés : jamais rédigée de zéro.",
    },
    readiness: {
      title: "Contrôle avant tournage",
      why: "La synthèse de ce qui est réellement prêt, confirmée explicitement, puis gardée telle quelle.",
    },
    shoot: {
      title: "Tournage",
      why: "Confirmer qu'il a eu lieu ; ensuite, les fichiers sont attendus.",
    },
    rushes: {
      title: "Rushes",
      why: "Le lien des rushes, puis leur réception. Un transfert seulement si quelqu'un d'autre que la société monte.",
    },
    post: {
      title: "Montage et retours",
      why: "Chaque version a son lien et ses retours ; elle est en revue, à modifier ou validée.",
    },
    control: {
      title: "Contrôle technique",
      why: "Une version validée n'est pas encore livrable : on contrôle les fichiers attendus, un par un.",
    },
    delivery: {
      title: "Livraison et clôture",
      why: "Le fichier final validé, sa date, son valideur et ses destinataires ; puis la clôture.",
    },
  },
  // The proto's words where the organisation changes them.
  variants: {
    call: {
      direct: "Préparation avec PO",
      call: "Call de production",
      import: "Organisation importée",
    },
    internal: {
      call: "Chaque métier dit ses besoins à partir du découpage ; PO en tire les actions, qui deviennent des tâches à l'approbation du plan.",
      direction: {
        title: "Brief réalisateur",
        why: "L'approche de réalisation : mise en scène, découpage, caméra, son. Elle complète la direction créative.",
      },
      quote: {
        title: "Devis et budget",
        why: "Les locations ne se réservent qu'une fois les devis validés.",
      },
      shoot:
        "Préparation confirmée, tournage déclaré, puis rushes et sauvegarde vérifiés séparément.",
      post: {
        title: "Versions",
        why: "Chaque version a son fichier et ses retours ; elle est validée sur pièce, jamais par absence de commentaire.",
      },
    },
  },
  todo: {
    organize: "Choisir qui produit",
    callPlan: "Planifier le call de production",
    callReport: "Après le call, lancer le compte rendu",
    callProposals: "Trancher les tâches proposées par PO",
    prepare: "Trancher les points proposés par PO",
    importPlan: "Importer l'organisation existante",
    quoteDeposit: {
      internal: "Ajouter les devis des loueurs",
      external: "Déposer le devis",
    },
    quoteRedo: "Déposer une nouvelle version du devis",
    quoteCheck: "Vérifier le devis",
    quoteDecide: (n: number) => `Valider le devis V${n}`,
    directionWrite: "Écrire la proposition et le découpage",
    directionChanges: "Revoir la proposition",
    directionDecide: "Valider la proposition de réalisation",
    directionNobody: "Proposer un réalisateur",
    directorRetain: "Retenir un réalisateur",
    progress: "Faire avancer la préproduction",
    progressTasks: (n: number) =>
      n === 1
        ? "Faire avancer 1 tâche de préproduction"
        : `Faire avancer ${n} tâches de préproduction`,
    gearList: "Lister les besoins en matériel",
    team: "Compléter l'équipe du tournage",
    locationsPropose: "Proposer des lieux",
    locationsChoose: "Retenir un lieu",
    callSheet: "Compléter et diffuser la feuille de service",
    ready: "Confirmer que la préparation du tournage est validée",
    readyAgain: "Contrôler à nouveau la préparation du tournage",
    readyDecide: "Décider la dérogation avant tournage",
    shootDone: "Confirmer que le tournage a eu lieu",
    rushesLink: "Transmettre le lien des rushes",
    rushesReceived: "Confirmer la réception des rushes",
    rushesBackup: "Vérifier la sauvegarde des rushes",
  },
  summary: {
    organization: {
      internal: "Interne",
      external: (company: string) => `Externe · ${company}`,
    },
    tasks: (n: number) =>
      n === 1 ? "1 tâche confirmée" : `${n} tâches confirmées`,
    callOf: (day: string, n: number) =>
      `Call de production du ${day} · ${n === 1 ? "1 tâche confirmée" : `${n} tâches confirmées`}`,
    quote: {
      approved: (n: number, amount: string) => `V${n} validé · ${amount}`,
      submitted: "Soumis au validateur",
      deposited: "Reçu, à vérifier",
      rejected: "Refusé",
      changes: "Modification demandée",
    },
    direction: {
      approved: "Validée",
      submitted: "Envoyée, à valider",
      changes: "Modifications demandées",
    },
    progress: (done: number, total: number) =>
      `${done} / ${total} tâches faites`,
    gear: (lines: number) =>
      lines === 1 ? "1 ligne de matériel" : `${lines} lignes de matériel`,
    locations: (n: number) =>
      n === 1 ? "1 lieu proposé" : `${n} lieux proposés`,
    callSheet: (n: number) => `V${n} diffusée`,
    ready: "Préparation validée",
    shot: "Tournage terminé",
    rushes: "Rushes reçus · sauvegarde vérifiée",
  },
  meta: {
    fiche: "Fiche Livrable validée",
  },
  now: {
    waitingTitle: "La production avance sans vous pour l'instant",
    finished: "La production est terminée",
  },
  roles: {
    owner: "Responsable du projet",
    producer: "Responsable de production",
    validator: "Validation budgétaire",
    company: "Production exécutive",
    director: "Réalisation",
    dop: "Chef opérateur",
    creative: "Responsable créatif",
    creativeInt: "Validation créative interne",
    creativeExt: "Validation créative externe",
    post: "Postproduction",
  },
  history: "Historique",
  header: {
    organization: {
      internal: "Interne",
      external: "Externe",
      none: "Qui produit ? à choisir",
    },
    envelope: "Enveloppe interne",
    shoot: "Tournage visé",
    delivery: "Livraison",
  },
  bar: {
    label: "Livrables en Production",
    toChoose: "Qui produit ? à choisir",
    delivered: "livré",
    mine: (n: number) =>
      n === 1 ? "1 action pour vous" : `${n} actions pour vous`,
  },
  empty: {
    title: "Aucun livrable en Production",
    body: "La Production commence quand une fiche validée y est transférée depuis la Conception.",
    action: "Ouvrir la Conception",
  },
} as const;
