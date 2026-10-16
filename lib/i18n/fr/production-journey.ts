// Production as a journey (Ibé, 14/10, docs/PRODUCTION-METIER.md § 0): the
// steps of each organisation, who acts and what for, the « Maintenant » of
// each person.
export const productionJourney = {
  label: "Parcours de la production",
  steps: {
    organisation: {
      title: "Organisation",
      why: "Qui produit décide de tout le reste : qui agit, qui valide, ce que PDS saisit.",
    },
    call: {
      title: {
        internal: "Call technique",
        external: "Call de présentation à la société",
      },
      why: {
        internal:
          "Chaque métier dit ses besoins à partir du découpage ; PO en tire les actions.",
        external:
          "La société découvre le projet, les attentes, les contraintes et l'enveloppe avant de chiffrer.",
      },
    },
    quote: {
      title: { internal: "Devis et budget", external: "Devis de la société" },
      why: {
        internal:
          "Les locations ne se réservent qu'une fois les devis validés.",
        external:
          "La société ne lance la préproduction qu'une fois son devis validé par PDS.",
      },
    },
    direction: {
      title: "Proposition de réalisation et découpage",
      why: "Le découpage dit ce qu'on tourne : calls techniques, matériel et lieux en partent.",
    },
    "follow-up": {
      title: (company: string) => `Préproduction par ${company}`,
      why: "La société organise calls techniques, matériel, équipes et planning. PDS suit.",
    },
    gear: {
      title: "Équipe et matériel",
      why: "Les besoins techniques deviennent des postes à pourvoir et des lignes de matériel à chiffrer.",
    },
    locations: {
      title: "Lieux",
      why: "Le lieu retenu alimente la feuille de service et le contrôle avant tournage.",
    },
    "call-sheet": {
      title: "Planning et feuille de service",
      why: "Composée depuis le lieu, l'équipe et le planning validés : jamais rédigée de zéro.",
    },
    readiness: {
      title: "Contrôle avant tournage",
      why: "Rien ne part en tournage sans lieu, devis et convocations confirmés.",
    },
    shoot: {
      title: "Tournage",
      why: "Le jour J, ce qui a été tourné, les rushes et leur sauvegarde.",
    },
    post: {
      title: "Postproduction",
      why: "Les versions, les retours et la validation du montage.",
    },
    delivery: {
      title: "Livraison et clôture",
      why: "Les fichiers contrôlés, livrés, transmis aux Activations, puis la clôture.",
    },
  },
  todo: {
    organize: "Choisir qui produit",
    callPlan: "Planifier le call",
    callReport: "Après le call, lancer le compte rendu",
    callProposals: "Relire et attribuer les actions proposées par PO",
    quoteDeposit: {
      internal: "Ajouter les devis des loueurs",
      external: "Déposer le devis",
    },
    quoteRedo: "Déposer un devis corrigé",
    quoteCheck: "Vérifier le devis et le soumettre",
    quoteDecide: "Valider le devis",
    directionWrite: "Écrire la proposition et le découpage",
    directionChanges: "Revoir la proposition",
    directionDecide: "Valider la proposition de réalisation",
    directionNobody: "Désigner le réalisateur",
    progress: "Mettre à jour la préproduction",
    gearList: "Lister les besoins en matériel",
    team: "Compléter l'équipe",
    locationsPropose: "Proposer des lieux",
    locationsChoose: "Retenir un lieu",
    callSheet: "Compléter et diffuser la feuille de service",
    ready: "Marquer prêt pour tournage",
  },
  summary: {
    organization: {
      internal: "Interne",
      external: (company: string) => `Externe · ${company}`,
    },
    calls: (n: number) =>
      n === 1 ? "1 action attribuée" : `${n} actions attribuées`,
    quote: {
      approved: "Validé",
      submitted: "Soumis au validateur",
      deposited: "Reçu, à vérifier",
      rejected: "Refusé, à corriger",
    },
    direction: {
      approved: "Validée",
      submitted: "Envoyée, à valider",
      changes: "Modifications demandées",
    },
    progress: (n: number) => `${n} / 4 faits`,
    gear: (lines: number) =>
      lines === 1 ? "1 ligne de matériel" : `${lines} lignes de matériel`,
    locations: (n: number) =>
      n === 1 ? "1 lieu proposé" : `${n} lieux proposés`,
    callSheet: (n: number) => `V${n} diffusée`,
    ready: "Prêt pour tournage",
  },
  meta: {
    fiche: "Fiche Livrable validée",
  },
  now: {
    waitingTitle: "La production avance sans vous pour l'instant",
    finished: "La production est terminée",
  },
  roles: {
    owner: "Cheffe ou chef de projet",
    producer: "Chargé de production",
    validator: "Valide les devis",
    company: "Société de production",
    director: "Réalisateur",
    dop: "Chef opérateur",
    creative: "Validation créative",
  },
  history: "Historique",
  header: {
    organization: {
      internal: "Production interne",
      external: "Production externe",
      none: "Organisation à choisir",
    },
    envelope: "Enveloppe",
    shoot: "Tournage visé",
    delivery: "Livraison",
  },
} as const;
