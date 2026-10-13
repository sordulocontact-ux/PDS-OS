/** Roles, delegations and governance of a Conception (MKT-C2-08). */
export const conceptionRoles = {
  // Who does what: the rights matrix, as the database enforces it.
  matrixTitle: "Qui fait quoi",
  matrixHint:
    "Ce que l'application laisse faire à chacun dans la Conception. Une exception passe par une délégation, datée et motivée.",
  matrixHeads: ["Rôle", "Prépare et soumet", "Décide", "Organise"],
  matrix: [
    [
      "Chef de projet",
      "Exceptionnellement, à la place du responsable (tracé)",
      "Non",
      "Désigne, délègue, consolide, transfère",
    ],
    [
      "Responsable créatif (DA)",
      "Oui, sur sa direction ou sa fiche",
      "Non sur ce qu'il a soumis",
      "Non",
    ],
    ["Valideur", "Non", "Oui, sur son périmètre", "Non"],
    ["Délégué", "Selon le rôle délégué", "Selon le rôle délégué", "Non"],
    [
      "Équipe créative",
      "Répond aux questions, ajoute des références",
      "Non",
      "Non",
    ],
    ["Observateur", "Lit seulement", "Non", "Non"],
  ],
  substitution: (name: string) =>
    `${name} est responsable ici. Vous pouvez intervenir à sa place, à titre exceptionnel : chaque modification est tracée à votre nom.`,
  selfApproval:
    "Vous avez soumis cette version : un autre valideur la décide, sauf si la gouvernance du projet l'autorise.",
  delegations: {
    title: "Délégations",
    hint: "Un rôle confié à une autre personne pour un temps, avec sa raison. Révocable, jamais effacée.",
    empty: "Aucune délégation.",
    add: "Déléguer",
    addTitle: "Déléguer un rôle",
    addBody:
      "La personne choisie agit comme le rôle délégué pendant la période. Tout est tracé dans l'historique.",
    role: "Rôle",
    roles: { responsible: "Responsable", validator: "Valideur" },
    from: "Personne qui délègue",
    to: "Délégué à",
    reason: "Raison",
    startsOn: "Du",
    endsOn: "Au",
    submit: "Déléguer",
    done: "Délégation enregistrée.",
    revoke: "Révoquer",
    revoked: "Délégation révoquée.",
    line: (
      role: string,
      from: string,
      to: string,
      starts: string,
      ends: string,
    ) => `${role} : ${from} → ${to}, du ${starts} au ${ends}`,
    states: {
      active: "Active",
      upcoming: "À venir",
      ended: "Terminée",
      revoked: "Révoquée",
    },
    nobody: "Personne ne tient encore ce rôle : désignez-le d'abord.",
    required: "Complétez ce champ.",
    datesOrder: "La fin vient après le début.",
  },
  governance: {
    title: "Gouvernance des approbations",
    allowed:
      "Exception active : une personne peut approuver ce qu'elle a soumis.",
    refused: "Règle : personne n'approuve ce qu'il a soumis.",
    allow: "Autoriser l'auto-approbation",
    refuse: "Rétablir la règle",
    allowTitle: "Autoriser l'auto-approbation ?",
    refuseTitle: "Rétablir la règle ?",
    body: "La décision est tracée avec sa raison dans l'historique de la Conception.",
    reason: "Raison",
    done: "Gouvernance mise à jour.",
  },
};
