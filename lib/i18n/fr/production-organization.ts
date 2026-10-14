// Production › Organisation (Ibé, 14/10): who produces and who holds each role.
export const productionOrganization = {
  legend: "Qui produit ce livrable ?",
  kinds: {
    internal: {
      label: "Interne",
      body: "PDS pilote. Les intervenants, freelances compris, travaillent chacun sur leur part.",
    },
    external: {
      label: "Externe",
      body: "Une société de production gère l'opérationnel. PDS suit et valide.",
    },
  },
  roles: "Les rôles",
  rolesHint:
    "Proposés d'après le projet et le Réseau, modifiables tant que rien n'est engagé.",
  fields: {
    company: "Société de production",
    companyHint:
      "Elle reçoit un lien privé : son devis, ses lieux, l'avancement de sa préproduction.",
    lineProducer: "Chargé de production",
    lineProducerHint:
      "Lieux, devis, locations, planning, logistique. Sans lui, c'est la ou le chef de projet.",
    lineProducerNone: "La ou le chef de projet",
    validator: "Validation des devis",
    validatorHint: "Proposé : la direction générale (à confirmer avec Ibé).",
    director: "Réalisateur ou réalisatrice",
    directorHint:
      "Proposition de réalisation et découpage ; un contact du Réseau passe par son lien privé.",
    dop: "Chef opérateur",
    dopHint:
      "Besoins techniques et matériel, par son lien privé s'il vient du Réseau.",
    nobody: "Personne pour l'instant",
  },
  launch: {
    internal: "Lancer la production interne",
    external: "Lancer la production externe",
  },
  save: "Enregistrer l'organisation",
  launched: "Production lancée : chacun voit sa part.",
  saved: "Organisation enregistrée.",
  errors: {
    missing: (n: number) =>
      n === 1
        ? "1 champ obligatoire est vide."
        : `${n} champs obligatoires sont vides.`,
    kind: "Choisissez qui produit.",
    company: "Choisissez la société de production.",
    validator: "Choisissez qui valide les devis.",
    company_required: "Une production externe a sa société de production.",
    quote_validator_required: "Quelqu'un valide les devis.",
  },
  whoDoesWhat: "Qui fait quoi",
  link: "Lien privé",
  account: "Compte PDS",
  tasks: {
    company:
      "Produit le livrable : devis, préproduction, lieux, tournage, postproduction",
    lineProducer: "Lieux, devis, locations, planning, logistique",
    validator: "Valide les devis",
    director: "Proposition de réalisation, découpage, besoins artistiques",
    dop: "Besoins techniques, matériel",
    owner:
      "Suit l'avancement, coordonne, s'assure que les décisions sont prises",
  },
  explain:
    "Chacun ne voit que sa part. Les contacts du Réseau passent par leur lien privé ; la ou le chef de projet suit tout.",
  change: "Modifier l'organisation",
  fiche: "Ce que la Conception a décidé",
  progress: {
    title: "Où en est la société",
    description:
      "Tenu par la société sur son lien privé. PDS suit sans ressaisir.",
    items: {
      calls: "Calls techniques faits",
      gear: "Matériel réservé",
      crew: "Équipe confirmée",
      schedule: "Planning de tournage envoyé",
    },
    updated: (date: string) => `Mis à jour le ${date}`,
    never: "Pas encore mis à jour par la société.",
    count: (n: number) => `${n} sur 4`,
  },
} as const;
