/** The calls of a deal (BIZ 6): « Préparer un call », its list, PO's
 * proposals from its report. */
export const dealCalls = {
  section: "Calls",
  empty: "Aucun call pour ce deal.",
  actions: (title: string) => `Actions pour « ${title} »`,
  prepare: {
    button: "Préparer un call",
    dialogTitle: "Préparer un call",
    description:
      "Le call reprend le contexte du deal et les termes encore à négocier ; vous enregistrez l'échange depuis sa page.",
    title: (name: string) => `Call · ${name}`,
    titlePlaceholder: "Call avec le manager",
    agendaTitle: "Ordre du jour",
    contextTopic: "Où en est le deal",
    contextStage: (stage: string) => `Étape : ${stage}`,
    lastSaid: (state: string, value: string) => `${state} : ${value}`,
    nothingToNegotiate: "Tous les termes sont confirmés.",
    submit: "Créer le call",
    pending: "Création…",
    cancel: "Annuler",
  },
  // « Caler le call » (Ibé 18/11/2026): the project's owner plans the call
  // of negotiation between the business manager and the artist's side, on
  // his free slots; she is not in the call.
  negotiation: {
    button: "Caler le call",
    dialogTitle: "Caler le call",
    description: (who: string | null) =>
      `Entre ${who ?? "le business manager"} et le manager de l'artiste. Vous n'êtes pas dans le call.`,
    who: "Business manager",
    noNegotiator:
      "Aucun membre ne négocie : la direction donne le poste de business manager dans Équipe.",
    slotsTitle: (who: string) => `Créneaux libres de ${who}`,
    slotsNone: "Aucun créneau libre ce mois-ci.",
    slotsError: "Ses créneaux n'ont pas pu être lus.",
    slotsOf: (day: string) => `Créneaux du ${day}`,
    slot: (day: string, hour: string) => `${day} à ${hour}`,
    other: "Autre horaire",
    back: "Autres créneaux",
    titlePlaceholder: "Call avec le manager",
    submit: "Caler le call",
    pending: "Calage…",
    done: "Call calé",
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
