/** Framing as a guided review: one question at a time, then the Brief. */
const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const framingGuide = {
  stepsLabel: "Points du cadrage",
  steps: {
    objective: "Objectif",
    timing: "Temporalité",
    needs: "Besoins & activations",
    frame: "Cadre & contraintes",
    team: "Équipe projet",
  },
  summaryStep: "Récapitulatif",
  statuses: {
    empty: "à définir",
    to_review: "à confirmer",
    confirmed: "confirmé",
  },
  line: {
    empty: "À définir",
    needs: (needs: number, activations: number) =>
      `${plural(needs, "besoin", "besoins")} · ${plural(activations, "activation", "activations")}`,
    noConstraint: "Aucune contrainte",
    team: (confirmed: number, open: number) =>
      [
        confirmed > 0 && plural(confirmed, "confirmé", "confirmés"),
        open > 0 && plural(open, "rôle à pourvoir", "rôles à pourvoir"),
      ]
        .filter(Boolean)
        .join(" · ") || "À définir",
  },
  overview: {
    titleFromCall: (count: number) =>
      `Relire les ${count} points compris pendant le call`,
    titleManual: "Cadrer la sortie en 5 points",
    start: "Commencer la relecture",
    resume: "Reprendre la relecture",
    toSummary: "Voir le récapitulatif",
  },
  objective: {
    title: "Qu'est-ce qui compte le plus pour cette sortie ?",
    other: "Autre formulation",
    otherLabel: "Votre intention, en une phrase",
    suggest: "Proposer des formulations",
    suggestHint:
      "PO reformule l'objectif à partir des calls, chaque proposition citée mot pour mot.",
    confirm: "Confirmer cet objectif",
    suggestErrors: {
      no_sources: "Aucun call ni objectif sur lequel s'appuyer.",
      provider: "PO n'a pas pu répondre. Réessayez dans un instant.",
      stage_locked: "Le cadrage n'est plus modifiable.",
      generic: "Une erreur est survenue. Réessayez.",
    },
    noneFound: "PO n'a trouvé aucune formulation vérifiable dans les calls.",
  },
  timing: {
    title: "Quand cette sortie doit-elle arriver ?",
    label: "Temporalité, telle que vous la diriez",
    placeholder: "Ex. sortie visée le 24 octobre",
    confirm: "Confirmer",
    edit: "Modifier",
  },
  needs: {
    title: "De quoi cette sortie a-t-elle besoin ?",
    // Labels of the Brief's facts (lib/framing/brief-summary.ts).
    needsTitle: "Besoins",
    activationsTitle: "Activations",
    needsGroup: "Production & contenus",
    activationsGroup: "Promotion & diffusion",
    proposedHint: "Proposé depuis un call",
    confirm: "Confirmer cette sélection",
    add: "Ajouter un besoin",
    addDescription: "Un besoin qui n'est pas dans la liste.",
    label: "Besoin",
    family: "Famille",
  },
  frame: {
    title: "Les limites à respecter",
    empty: "Aucune contrainte pour l'instant.",
    types: {
      budget: "Budget",
      production: "Production",
      artistic: "Artistique",
      rights: "Droits",
      other: "Autre",
    },
    type: "Type",
    text: "Contrainte",
    confirm: "Confirmer le cadre",
    add: "Ajouter une contrainte",
    addDescription: "Budget, production, artistique, droits…",
    editTitle: "Modifier la contrainte",
    editDescription: "Corriger le texte ou le type de cette ligne.",
    remove: "Retirer",
  },
  team: {
    title: "Qui s'en occupe ?",
    roles: {
      artistic_direction: "Direction artistique",
      creative_direction: "Direction créative",
      clip_production: "Réalisation du clip",
      press_relations: "Relations presse",
      influence_marketing: "Influence & marketing",
      playlisting: "Playlisting",
    },
    toFind: "À trouver",
    others: "Autres personnes",
    confirm: "Confirmer l'équipe",
    assign: "Attribuer un rôle",
    assignTitle: (role: string) => `Attribuer : ${role}`,
    assignDescription: "Le nom de la personne ou de la structure retenue.",
    assignAny: "Attribuer un rôle",
    assignAnyDescription: "Choisissez le rôle, puis la personne.",
    role: "Rôle",
    name: "Nom",
    release: "Libérer le rôle",
    remove: "Retirer",
  },
  summary: {
    noObjective: "Objectif à définir",
    todoTitle: "Reste à faire",
    todoEmpty: "Rien d'ouvert : le Brief est prêt à être validé.",
    toReview: (step: string) => `${step} · à confirmer`,
    roleToFind: (role: string) => `Trouver : ${role}`,
    openPoint: "Point ouvert",
    openBrief: "Ouvrir le brief partageable",
    approve: "Valider et clôturer",
    approved: "Cadrage validé.",
  },
  brief: {
    eyebrow: "Brief de cadrage",
    objective: "Objectif",
    sources: "Sources",
    sourcesLine: (calls: string[]) =>
      calls.length ? calls.join(" · ") : "Saisi sans call",
    callTitle: (title: string) => `Call « ${title} »`,
    back: "Retour au récapitulatif",
    print: "Exporter en PDF",
    exporting: "Préparation du PDF…",
    pdfFailed: "Le PDF n'a pas pu être préparé. Réessayez.",
    share: "Copier le lien",
    copied:
      "Lien copié. Il ne s'ouvre que pour les membres qui voient ce projet.",
  },
  unknownCall: "Un call",
  back: "Précédent",
  next: "Point suivant",
  close: "Fermer",
  cancel: "Annuler",
  save: "Enregistrer",
} as const;
