// « Validation du Brief de sortie » and « Stratégie validée » (proto
// « Projet complet »: briefDoc, BODY_MK.st3 / st4, stask, stdecide,
// stresend, strelance). Exact words of the proto.

export const strategyBriefOut = {
  doc: {
    // As the Brief de cadrage's card (« Brief de cadrage · version 1 »).
    title: (v: number) => `Brief de sortie · version ${v}`,
    pdf: "Télécharger le PDF",
    exporting: "Préparation du PDF…",
    pdfFailed: "Le PDF n'a pas pu être préparé. Réessayez.",
    // Under the card, as the Brief de cadrage.
    created: (name: string | null, when: string) =>
      name ? `Créée par ${name} le ${when}` : `Créée le ${when}`,
    validatedMeta: (name: string | null, when: string) =>
      `validée par ${name ?? "la direction"} le ${when}`,
    draftMeta: "Faite depuis les 8 dimensions, créée à l'envoi",
    openPoints: "Restant à arbitrer",
    who: "Pour qui et pourquoi",
    how: "Comment",
    when: "Quand",
    goal: "Objectif et budget",
    positioning: "Positionnement",
    audiences: "Publics prioritaires",
    narrative: "Narratif",
    levers: "Dispositif retenu",
    deliverables: "Livrables",
    objective: "Objectif",
    budget: "Budget proposé",
    // No expense yet: never « 0 € », which reads as a zero envelope (MKT-STR-002).
    noExpense: "Aucune dépense estimée",
    envelopeToConfirm: (envelope: string) =>
      `sur ${envelope} à confirmer · interne`,
    budgetOf: (envelope: string | null) =>
      envelope ? `sur ${envelope} · interne` : "interne",
    empty: "—",
    // The critical alerts of the version (MKT-S1-16), read before deciding.
    alerts: "Points d'attention",
  },
  open: {
    envelopeToConfirm: "L'enveloppe du Brief de cadrage reste à confirmer",
    envelopeUndefined: "Aucune enveloppe n'est définie",
    noReleaseDate: "La date de sortie reste à fixer",
    milestonePassed: (milestone: string, date: string) =>
      `« ${milestone} » était prévu le ${date} : à déplacer ou retirer`,
    legalBlocked: (label: string) => `Juridique : « ${label} » est bloqué`,
    legalNoDate: (label: string) =>
      `Juridique : « ${label} » n'a pas d'échéance`,
  },
  send: {
    title: "Envoyer en validation",
    always: "valide toujours",
    creative: "directrice ou directeur créatif",
    button: "Envoyer en validation",
    done: "Brief de sortie envoyé en validation",
    noValidator:
      "Aucune personne de la direction ne valide encore : nommez-la dans Équipe.",
  },
  validation: {
    title: "Validation",
    pending: "En attente",
    approved: "Validé",
    reserves: "Validé avec réserves",
    changes: "Modification demandée",
    cancelled: "Non commencé",
    remindedOn: (when: string) => `Relancée le ${when}`,
    remind: (name: string) => `Relancer ${name}`,
    reminded: (name: string) => `${name} relancée.`,
  },
  decision: {
    approve: "Valider le Brief de sortie",
    reserves: "Valider avec réserves",
    changes: "Demander une modification",
    hint: "Obligatoire pour des réserves ou une modification",
    done: {
      approve: "Brief de sortie validé",
      reserves: "Brief de sortie validé avec réserves",
      changes: "Modification demandée",
    },
    outcome: "demander une modification",
  },
  resubmit: {
    label: "Répondre et transmettre à nouveau",
    done: "Brief de sortie transmis à nouveau",
  },
  validated: (v: number, when: string) =>
    `le ${when}. Il est figé ; le réviser crée une V${v + 1}.`,
  validatedTitle: (v: number) => `Brief de sortie — V${v} validé`,
  // Stratégie validée (st4).
  final: {
    callout: "Stratégie validée",
    calloutBody: (when: string, v: number) =>
      `le ${when} : Brief de sortie — V${v}. Rien n'oblige à lancer la Conception maintenant.`,
    documents: "Documents",
    mine: "À vous",
    brief: (v: number) => `Brief de sortie — V${v}`,
    briefFor: "Interne · avec le budget",
    plan: "Plan de sortie",
    planFor: "Pour l'équipe de l'artiste · sans budget",
    press: "Dossier de presse",
    pressFor: "Pour les médias · sans budget",
    see: "Voir",
    share: "Partager",
    shared: "Lien du Brief de sortie copié.",
    generate: "Générer",
    open: "Ouvrir",
    states: {
      to_generate: "À générer",
      pending: "Généré",
      sent: "En attente de validation",
      approved: "Validé",
      changes_requested: "Modification demandée",
    },
    feeds: "Ce que la Stratégie alimente",
    design: "Conception",
    designCount: (n: number) =>
      `${n} ${n > 1 ? "livrables" : "livrable"} à concevoir`,
    activations: "Activations",
    activationsCount: (n: number) =>
      `${n} ${n > 1 ? "leviers retenus" : "levier retenu"} à préparer`,
    planning: "Planning",
    planningCount: (milestones: number, upstream: number) =>
      `${milestones} ${milestones > 1 ? "temps forts" : "temps fort"} et ${upstream} ${upstream > 1 ? "échéances amont" : "échéance amont"}`,
    planningFrom: (day: string) => `Calculés depuis la sortie du ${day}`,
    followUp: "Suivi de la stratégie",
    followUpBody:
      "Avant la sortie, l'état de chaque domaine ; après, les KPI face aux données réelles.",
    reserves: "Réserves à lever",
    revise: "Réviser la stratégie",
  },
};
