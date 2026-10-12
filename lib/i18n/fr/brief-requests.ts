// The validator's requests on the Brief de cadrage, the comparison of its
// versions and what « complet » means (PROJ-UX-06, PROJ-BUG-05).
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const briefRequests = {
  title: "Demandes de correction",
  description:
    "Chaque demande pointe vers la question à corriger et garde qui l'a faite, quand, et comment elle a été traitée.",
  views: {
    open: "Ouvertes",
    all: "Toutes",
  },
  emptyOpen: "Aucune demande ouverte.",
  states: {
    open: "Ouverte",
    modified: "Corrigée",
    justified: "Justifiée",
    withdrawn: "Levée",
  },
  mandatory: "Obligatoire",
  optional: "Facultative",
  asked: (name: string | null, date: string, version: number | null) =>
    `${name ? `Demandée par ${name}` : "Demandée"} le ${date}${version ? `, sur la V${version}` : ""}`,
  answered: {
    modified: (name: string | null, date: string, version: number | null) =>
      `${name ? `Corrigée par ${name}` : "Corrigée"} le ${date}${version ? ` dans la V${version}` : ""}`,
    justified: (name: string | null, date: string) =>
      `${name ? `Justifiée par ${name}` : "Justifiée"} le ${date}`,
    withdrawn: (name: string | null, date: string) =>
      `${name ? `Levée par ${name}` : "Levée"} le ${date}`,
  },
  correct: "Corriger",
  open: "Ouvrir la question",
  changed: "Modifié dans la dernière version du Brief.",
  notChanged: "Pas encore modifié dans le Brief.",
  resolve: "Marquer comme corrigée",
  justify: "Justifier sans modifier",
  resolveTitle: "Marquer la demande comme corrigée",
  resolveBody:
    "La dernière version du Brief a changé ce point depuis la demande.",
  justifyTitle: "Justifier sans modifier",
  justifyBody:
    "Ce point n'a pas changé dans le Brief. Expliquez au valideur pourquoi vous le gardez tel quel.",
  noteLabel: "Ce que vous avez changé",
  justificationLabel: "Pourquoi vous ne modifiez pas ce point",
  resolved: "Demande marquée comme corrigée.",
  justified: "Justification enregistrée.",
  withdraw: "Lever la demande",
  withdrawTitle: "Lever la demande",
  withdrawBody:
    "La demande ne bloquera plus la validation. Votre raison reste dans l'historique.",
  withdrawLabel: "Pourquoi vous levez cette demande",
  withdrawn: "Demande levée.",
  callout: (n: number) =>
    `${plural(n, "demande de correction ouverte", "demandes de correction ouvertes")}`,
  calloutBody:
    "Chaque demande ouvre la question à corriger. Une fois le Brief mis à jour, marquez-la comme corrigée sur le Brief, ou justifiez pourquoi vous ne la modifiez pas.",
  seeAll: "Voir les demandes sur le Brief",
  atQuestion: "Demande du valideur sur ce point",
  blocking: (n: number) =>
    `${plural(n, "demande obligatoire encore ouverte", "demandes obligatoires encore ouvertes")} : elle doit être corrigée, justifiée ou levée avant la validation.`,
  approveBlockedTitle: "Validation impossible pour l'instant",
  form: {
    title: "Demander une modification",
    intro:
      "Une demande par point à corriger, chacune rattachée à sa dimension ou à sa question : seules les dimensions concernées seront rouvertes.",
    request: (n: number) => `Demande ${n}`,
    add: "Ajouter une demande",
    remove: "Retirer cette demande",
    dimension: "Dimension",
    question: "Question",
    wholeDimension: "Toute la dimension",
    body: "Ce qu'il faut corriger",
    mandatory: "Obligatoire avant la validation",
    mandatoryHint:
      "Une demande obligatoire doit être corrigée ou justifiée avant que vous puissiez valider.",
    comment: "Commentaire général",
    submit: (n: number) =>
      n > 1 ? `Envoyer les ${n} demandes` : "Envoyer la demande",
    missingBody: "Écrivez ce qu'il faut corriger.",
    missingCount: (n: number) =>
      `${plural(n, "demande sans texte", "demandes sans texte")}.`,
  },
  compare: {
    title: "Comparer les versions",
    body: "Ce qui a changé entre deux versions du Brief, question par question.",
    with: (n: number) => `Avec la V${n}`,
    changes: (from: number, to: number) => `De la V${from} à la V${to}`,
  },
  unchanged: {
    warning: (n: number) =>
      `Cette version dit exactement la même chose que la V${n}, déjà envoyée. Corrigez le cadrage, ou expliquez pourquoi vous la renvoyez telle quelle.`,
    reasonLabel: "Pourquoi la renvoyer sans changement",
    derogation: (reason: string) => `Renvoyée sans changement : « ${reason} »`,
  },
  readiness: {
    complete: "Cadrage complet",
    incomplete: "Cadrage incomplet",
    prerequisites: (done: number, total: number) =>
      `Prérequis opérationnels : ${done} sur ${total} ${total > 1 ? "satisfaits" : "satisfait"}`,
    noPrerequisites: "Aucun prérequis opérationnel noté dans le cadrage.",
    open: (labels: string[]) => `Encore à satisfaire : ${labels.join(" · ")}`,
    hint: "Un cadrage complet dit que toutes les questions ont une réponse, pas que tout est prêt pour avancer.",
  },
} as const;
