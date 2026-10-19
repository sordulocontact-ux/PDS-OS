// The place retained and its replacement (proto « Projet complet » BODY.locs,
// replaceForm, locFit; production.md § 2.10).
export const productionPlace = {
  retained: (name: string) => `Lieu retenu : ${name}`,
  same: " · le même pour tous les intervenants autorisés.",
  fits: (n: number, loc: string) =>
    `Compris dans le devis V${n} (${loc} prévus pour les lieux)`,
  over: (gap: string, loc: string, n: number) =>
    `Dépasse de ${gap} le montant prévu pour les lieux (${loc}, devis V${n}) : révision du devis à prévoir`,
  decisions: "Décisions sur le lieu",
  decision: (at: string, by: string, name: string) =>
    `${at} · ${by} retient ${name}`,
  replacedOn: (at: string) => ` · remplacé ${at}`,
  replace: {
    open: "Remplacer le lieu retenu",
    title: (name: string) => `Remplacer ${name}`,
    description:
      "Une nouvelle décision : l'ancienne reste dans l'historique, avec sa validation. Le reste du projet continue.",
    place: "Nouveau lieu",
    fitsShort: "compris dans le devis",
    overShort: (gap: string) => `dépasse de ${gap}`,
    reason: "Motif",
    reasonPlaceholder: "Ex. : la copropriété refuse le tournage sur le toit",
    linked: "Informations liées",
    linkedHint:
      "Notées dans Décisions, encore à confirmer. Cochées, elles passent en « Décidé » avec ce remplacement.",
    review: "Ce qu'il faut revoir",
    reviewHint:
      "Choisi par vous : chaque case crée une tâche pour la bonne personne.",
    items: {
      creative: "Découpage et scénario",
      gear: "Matériel",
      plan: "Planning et feuille de service",
      budget: "Budget : révision du devis",
    },
    tasks: {
      creative: (place: string) => `Revoir le découpage pour ${place}`,
      gear: (place: string) => `Revoir le matériel pour ${place}`,
      plan: (place: string) =>
        `Revoir le planning et la feuille de service pour ${place}`,
    },
    to: (who: string) => `→ ${who}`,
    submit: "Remplacer le lieu",
    done: (next: string, prev: string) => `${next} remplace ${prev}`,
    errors: {
      place: "Choisissez le nouveau lieu.",
      reason: "Dites pourquoi le lieu change.",
    },
    none: "Aucun autre lieu proposé : il en faut un pour remplacer celui-ci.",
  },
} as const;
