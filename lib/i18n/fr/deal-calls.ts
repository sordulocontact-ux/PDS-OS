/** The calls of a deal (BIZ 6): « Préparer un call », its list, PO's
 * proposals from its report. */
export const dealCalls = {
  section: "Calls",
  empty: "Aucun call pour ce deal.",
  open: (title: string) => `Ouvrir le call « ${title} »`,
  prepare: {
    button: "Préparer un call",
    dialogTitle: "Préparer un call",
    description:
      "Le call reprend le contexte du deal et les termes encore à négocier ; vous enregistrez l'échange depuis sa page.",
    title: (name: string) => `Call · ${name}`,
    titlePlaceholder: "Call avec le manager",
    participantsHint:
      "Les invités du Réseau ou par e-mail. Les membres qui lisent le deal voient le call.",
    agendaTitle: "Ordre du jour",
    contextTopic: "Où en est le deal",
    contextStage: (stage: string) => `Étape : ${stage}`,
    lastSaid: (state: string, value: string) => `${state} : ${value}`,
    toDefine: "À définir",
    nothingToNegotiate: "Tous les termes sont confirmés.",
    submit: "Créer le call",
    pending: "Création…",
    cancel: "Annuler",
  },
  // PO's proposals from a call's report (lib/deals/call-proposals.ts).
  proposals: {
    title: "Propositions des calls",
    from: (call: string, day: string) => `D'après « ${call} », ${day}`,
    term: (label: string, value: string, state: string) =>
      `${label} : ${value} (${state})`,
    stage: (stage: string) => `Passer à l'étape « ${stage} »`,
    next: (action: string, day: string | null) =>
      day
        ? `Prochaine action : ${action} · ${day}`
        : `Prochaine action : ${action}`,
    check: "Vérifier",
    dismiss: "Écarter",
    dismissed: "Proposition écartée",
    applied: "Proposition appliquée",
    errors: {
      proposal_not_found: "Cette proposition n'existe plus.",
      proposal_settled: "Cette proposition a déjà été traitée.",
    },
  },
} as const;
