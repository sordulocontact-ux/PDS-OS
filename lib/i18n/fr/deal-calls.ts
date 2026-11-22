/** The calls of a deal (BIZ 6): « Caler le call » (the same for everyone
 * since 21/11/2026), its list, PO's proposals from its report. */
export const dealCalls = {
  section: "Calls",
  empty: "Aucun call pour ce deal.",
  actions: (title: string) => `Actions pour « ${title} »`,
  prepare: {
    title: (name: string) => `Call · ${name}`,
    agendaTitle: "Ordre du jour",
    contextTopic: "Où en est le deal",
    contextStage: (stage: string) => `Étape : ${stage}`,
    lastSaid: (state: string, value: string) => `${state} : ${value}`,
    nothingToNegotiate: "Tous les termes sont confirmés.",
    cancel: "Annuler",
  },
  // « Caler le call » (Ibé 18/11/2026): the project's owner plans the call
  // of negotiation between the business manager and the artist's side, on
  // his free slots; she runs it with him (Sacha 21/11/2026).
  negotiation: {
    button: "Caler le call",
    dialogTitle: "Caler le call",
    description: (who: string | null) =>
      `Avec ${who ?? "le business manager"} et le manager de l'artiste.`,
    who: "Business manager",
    noNegotiator:
      "Aucun membre ne négocie : la direction donne le poste de business manager dans Équipe.",
    slotsTitle: (who: string) => `Créneaux libres de ${who}`,
    slotsNone: "Aucun créneau libre ce mois-ci.",
    slotsError: "Ses créneaux n'ont pas pu être lus.",
    slotsOf: (day: string) => `Créneaux du ${day}`,
    slot: (day: string, hour: string) => `${day} à ${hour}`,
    other: "Autre horaire",
    back: "Créneaux libres",
    slotMissing: "Choisissez un créneau.",
    titlePlaceholder: "Call avec le manager",
    submit: "Caler le call",
    pending: "Calage…",
    done: "Call calé",
    meetFailed:
      "Call calé, mais Google n'a pas créé de lien Meet : ajoutez un lien de visio sur la page du call.",
  },
  // PO's proposals from a call's report (lib/deals/call-proposals.ts), in
  // « Termes négociés » and « Prochaine action ».
  proposals: {
    // The call a passage comes from, opening its transcript (ProposalSource).
    call: (call: string, day: string) => `${call}, ${day}`,
    said: (who: string) => `${who} :`,
    term: (label: string, value: string, state: string) =>
      `${label} : ${value} (${state})`,
    next: (action: string, day: string | null) =>
      day
        ? `Prochaine action : ${action} · ${day}`
        : `Prochaine action : ${action}`,
    check: "Vérifier",
    // The terms PO read, already in their cards (DealTerms).
    toCheck: (n: number) =>
      n > 1
        ? `PO a lu ${n} termes · à vérifier`
        : "PO a lu un terme · à vérifier",
    applyAll: "Tout valider",
    allApplied: (n: number) =>
      n > 1
        ? `${n} termes validés`
        : n === 1
          ? "Terme validé"
          : "Rien à valider",
    dismiss: "Écarter",
    dismissed: "Proposition écartée",
    applied: "Proposition appliquée",
    errors: {
      proposal_not_found: "Cette proposition n'existe plus.",
      proposal_settled: "Cette proposition a déjà été traitée.",
    },
  },
} as const;
