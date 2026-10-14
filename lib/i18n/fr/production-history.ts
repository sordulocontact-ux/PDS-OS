/** Production › one deliverable › Historique (PROD-002, PROD-008). */
export const productionHistory = {
  title: "Historique",
  description:
    "Qui a fait quoi et quand, avec l'avant et l'après : statuts, responsables, échéances, contrôles et décisions. Rien ne s'y efface.",
  none: "Rien n'a encore été enregistré sur cette fiche.",
  someone: "Quelqu'un",
  provider: "Le prestataire, par son lien",
  nobody: "personne",
  arrow: (before: string, after: string) => `${before} → ${after}`,
  version: {
    created: (n: number) => `a déposé la V${n}`,
    status: {
      draft: (n: number) => `a remis la V${n} en brouillon`,
      in_review: (n: number) => `a soumis la V${n} aux retours`,
      final_review: (n: number) => `a soumis la V${n} aux retours`,
      changes_requested: (n: number) =>
        `a demandé des corrections sur la V${n}`,
      approved: (n: number) => `a validé la V${n}`,
      refused: (n: number) => `a refusé la V${n}`,
    },
  },
  request: {
    created: (n: number, who: string, due: string) =>
      `a demandé des corrections sur la V${n} à ${who}, pour le ${due}`,
    holder: (n: number, change: string) =>
      `a confié les corrections de la V${n} : ${change}`,
    due: (n: number, change: string) =>
      `a changé l'échéance des corrections de la V${n} : ${change}`,
    sent: (n: number) => `a transmis la demande de corrections de la V${n}`,
    reminded: (n: number) => `a relancé la demande de corrections de la V${n}`,
    viewed: (n: number) => `a consulté la demande de corrections de la V${n}`,
    treated: (n: number) =>
      `La demande de corrections de la V${n} est traitée par une nouvelle version`,
  },
  action: {
    status: {
      draft: (title: string) => `a remis « ${title} » en brouillon`,
      approved: (title: string) => `a approuvé l'action « ${title} »`,
      removed: (title: string) => `a retiré l'action « ${title} »`,
    },
    holder: (title: string, change: string) =>
      `a confié « ${title} » : ${change}`,
    due: (title: string, change: string) =>
      `a changé l'échéance de « ${title} » : ${change}`,
  },
  check: {
    confirmed: (label: string) => `a confirmé le contrôle « ${label} »`,
    reopened: (label: string) => `a rouvert le contrôle « ${label} »`,
    required: (label: string) => `a rendu le contrôle « ${label} » requis`,
    optional: (label: string) => `a rendu le contrôle « ${label} » facultatif`,
  },
  sheet: {
    dates: (changes: string) => `a changé ${changes}`,
    dateLabels: {
      shoot: "la date de tournage",
      postStart: "le début de la postproduction",
      postEnd: "la fin de la postproduction",
      delivery: "la date de livraison",
      envelope: "l'enveloppe",
    },
    location: (change: string) => `a mis à jour le lieu : ${change}`,
    ready: "a déclaré la fiche prête pour tournage",
    notReady: "La fiche n'est plus prête pour tournage",
  },
  shoot: (state: string) => `Tournage : ${state}`,
  export: {
    link: (label: string) => `a déposé l'export « ${label} »`,
    ok: (label: string) => `a contrôlé « ${label} » : conforme`,
    notOk: (label: string) => `a contrôlé « ${label} » : non conforme`,
    reset: (label: string) => `Le contrôle de « ${label} » est à refaire`,
  },
  step: {
    holder: (label: string, change: string) =>
      `a confié l'étape « ${label} » : ${change}`,
    status: (label: string, status: string) => `Étape « ${label} » : ${status}`,
  },
  link: (who: string) => `a créé le lien prestataire de ${who}`,
  callSheet: (n: number) => `a diffusé la feuille de service V${n}`,
  place: {
    created: (name: string) => `a ajouté le lieu candidat « ${name} »`,
    chosen: (name: string) => `a retenu le lieu « ${name} »`,
    discarded: (name: string) => `a écarté le lieu « ${name} »`,
    restored: (name: string) => `a remis « ${name} » en candidat`,
    verified: (name: string) => `a marqué « ${name} » comme vérifié`,
    unverified: (name: string) => `a remis « ${name} » à vérifier`,
  },
  delivery: {
    approved: "Validation créative enregistrée",
    checked: "a confirmé les exports contrôlés",
    delivered: "a marqué le livrable comme livré",
    reopened: "La livraison a été rouverte",
  },
  note: (text: string) => `« ${text} »`,
} as const;
