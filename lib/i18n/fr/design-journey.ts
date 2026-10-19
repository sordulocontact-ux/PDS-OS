// The Conception as a journey of six steps (proto « Projet complet », module
// design: STEPS de0 / de1 / deR / de2 / deB / de3, actorsMk, summaryMk,
// doneMk). Exact words of the proto; written here, never in components.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const designJourney = {
  module: "Conception",
  roles: {
    owner: "Responsable du projet",
    creative: "Responsable créatif",
    validator: "Validation de la direction",
  },
  // « Qui fait quoi » of the Conception.
  roleWhat: {
    owner:
      "Désigne le responsable créatif et chaque responsable de fiche, ajoute un livrable, transfère les fiches en Production",
    creative:
      "Confirme les intentions, rattache les références, soumet la direction et établit le Brief créatif",
    validator: "Valide la direction artistique et chaque Fiche Livrable",
  },
  blocked: (prereqs: string) =>
    prereqs.includes(" et ")
      ? `S'ouvre quand ${prereqs} sont faits.`
      : `S'ouvre quand ${prereqs} est fait.`,
  now: {
    waitingTitle: "La Conception avance sans vous pour l'instant",
    finished: "La Conception est terminée",
  },
  // Prerequisite of the Accueil, in the Stratégie.
  strategyPrereq: {
    module: "Stratégie",
    label: "Validation du Brief de sortie",
    source: (version: number, at: string) =>
      `Brief de sortie V${version} validé le ${at}`,
  },
  productionNext: { module: "Production", label: "Qui produit ?" },
  steps: {
    home: {
      title: "Accueil",
      why: "Les livrables reçus de la Stratégie, le responsable créatif, et la façon de commencer : préparer un échange créatif ou commencer directement.",
    },
    intentions: {
      title: "Intentions",
      why: "Ce que la sortie et chaque livrable doivent raconter. Chaque intention est confirmée avant la direction artistique.",
    },
    references: {
      title: "Références",
      why: "Moodboards et références, rattachés à un ou plusieurs livrables. Elles restent des propositions jusqu'à la validation de la direction.",
    },
    direction: {
      title: "Direction artistique",
      why: "Le concept, les codes, le ton et les lignes rouges, avec les références choisies, soumis à la direction.",
    },
    brief: {
      title: "Brief créatif",
      why: "Le cadre commun à tous les livrables, établi par le code depuis ce qui est validé. Il ne remplace pas les fiches.",
    },
    sheets: {
      title: "Fiches Livrables",
      why: "Une fiche par livrable ou par série : chacune a son responsable, se complète, se valide et part en Production seule.",
    },
  },
  todo: {
    designate: "Désigner le responsable créatif",
    choose: "Choisir comment commencer la Conception",
    createCall: "Créer l'échange créatif",
    holdCall: "Tenir l'échange créatif",
    confirm: (n: number) =>
      `Confirmer ou écarter ${plural(n, "intention", "intentions")}`,
    write: "Écrire les intentions",
    attach: (n: number) => `Rattacher ${plural(n, "référence", "références")}`,
    addReferences: "Ajouter des références",
    submitDirection: (validator: string) =>
      `Soumettre la direction à ${validator}`,
    validateDirection: "Valider la direction artistique",
    resubmit: "Répondre et soumettre à nouveau",
    brief: (n: number) => `Établir le Brief créatif V${n}`,
    sheetResponsible: (title: string) =>
      `Désigner le responsable de la fiche ${title}`,
    sheetValidate: (title: string) => `Valider la fiche ${title}`,
    sheetTransfer: (title: string) => `Transférer ${title} en Production`,
    sheetFix: (title: string) => `Corriger la fiche ${title}`,
    sheetComplete: (title: string) =>
      `Compléter et soumettre la fiche ${title}`,
  },
  summary: {
    direct: "Commencé directement",
    exchange: (day: string) => `Échange créatif du ${day}`,
    intentions: (n: number) =>
      plural(n, "intention confirmée", "intentions confirmées"),
    references: (n: number) =>
      plural(n, "référence rattachée", "références rattachées"),
    direction: "Direction validée",
    brief: (n: number) => `Brief créatif V${n}`,
    sheets: (n: number) =>
      `${plural(n, "fiche transférée", "fiches transférées")} en Production`,
  },
};
