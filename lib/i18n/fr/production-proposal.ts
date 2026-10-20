// Production › Proposition de réalisation in versions (proto « Projet
// complet » BODY.creative, production.md § 2.8, PR-11): the director
// deposits V1, V2…, the internal creative validation and, when « Qui fait
// quoi » names one, the external one decide each.
export const productionProposal = {
  versions: "Versions",
  piece: {
    treatment: "Traitement",
    moodboard: "Moodboard",
    cutting: "Découpage technique",
  },
  open: "Ouvrir",
  version: (n: number) => `V${n}`,
  status: {
    retained: "Retenue",
    pending: "À valider",
    changes: "Modifications demandées",
    replaced: (next: number) => `Remplacée par la V${next}`,
  },
  // The validations of one version (proto valStrip, CSTATE).
  side: {
    int: "Interne",
    ext: "Externe",
    states: {
      pending: "À valider",
      approved: "Validée",
      changes: "Modifications demandées",
      none: "Pas de validation externe",
      stale: "Sans suite",
    },
    as: { int: "interne", ext: "externe" },
  },
  deposited: (who: string, at: string) => `Déposée par ${who} le ${at}`,
  saidPlain: (who: string, text: string) => `${who} : « ${text} »`,
  said: (who: string, as: string, text: string) =>
    `${who} (${as}) : « ${text} »`,
  retained: (n: number) => `Version retenue : V${n}`,
  retainedPending: (n: number, ext: boolean) =>
    ` · une nouvelle version devra être validée à nouveau, en interne${ext ? " et en externe" : ""} ; la V${n} reste retenue d'ici là.`,
  requested: (who: string, at: string, reason: string) =>
    `Nouvelle version demandée par ${who} le ${at} : « ${reason} »`,
  requestedBare: (at: string, reason: string) =>
    `Nouvelle version demandée le ${at} : « ${reason} »`,
  decide: {
    title: (n: number, slot: string) => `Votre décision sur la V${n} · ${slot}`,
    slots: {
      int: "validation créative interne",
      ext: "validation créative externe",
    },
    comment: "Commentaire",
    commentHint: "Obligatoire pour demander des modifications",
    commentRequired: "Dites ce qui doit changer.",
    approve: (n: number) => `Valider la V${n}`,
    changes: "Demander des modifications",
    approved: (n: number) => `Proposition V${n} validée`,
    asked: "Modifications demandées",
  },
  deposit: {
    title: (n: number) => `Déposer la proposition V${n}`,
    asked: (reason: string) =>
      `PDS demande une nouvelle version : « ${reason} »`,
    hint: "Le lien du PDF (Drive, WeTransfer…), commence par https://",
    note: "Note pour PDS",
    submit: (n: number) => `Déposer la V${n}`,
    done: (n: number) => `Proposition V${n} déposée`,
    missing: "Joignez au moins le traitement et le découpage.",
    url: "Un lien qui commence par https://.",
  },
  request: {
    open: "Demander une nouvelle version",
    note: (n: number) =>
      `La V${n} reste retenue jusqu'à la validation de la nouvelle.`,
    reason: "Motif",
    reasonRequired: "Dites pourquoi.",
    submit: (who: string) => `Demander à ${who}`,
    done: "Nouvelle version demandée",
  },
  // The external creative validation in « Qui fait quoi ».
  ext: {
    none: "Pas de validation externe",
    what: "Valide en plus de la validation interne, jamais à sa place.",
    done: "Validation créative externe enregistrée",
  },
  todo: {
    deposit: "Déposer la proposition de réalisation",
    again: "Déposer une nouvelle version de la proposition",
    validate: (n: number) => `Valider la proposition V${n}`,
  },
  summary: {
    retained: (n: number) => `V${n} retenue`,
    pending: (n: number) => `V${n} à valider`,
    changes: (n: number) => `V${n} : modifications demandées`,
  },
  // On the director's or the management's private link.
  link: {
    title: "Proposition de réalisation",
    hint: "Traitement, moodboard, découpage : ce qu'on tourne. Validé en interne, et en externe quand c'est requis.",
  },
  errors: {
    pieces_required: "Joignez au moins le traitement et le découpage.",
    invalid_url: "Un lien qui commence par https://.",
    version_pending:
      "La dernière version attend encore sa décision : pas de nouvelle version d'ici là.",
    version_replaced: "Une version plus récente a été déposée.",
    invalid_transition: "Cette décision est déjà prise.",
    reason_required: "Dites ce qui doit changer.",
    nothing_retained: "Aucune version n'est retenue pour l'instant.",
    already_requested: "Une nouvelle version est déjà demandée.",
    version_not_found: "Cette version n'existe plus.",
    link_closed: "Ce lien n'est plus valable.",
    stage_locked: "La production est fermée : rien ne peut plus être déposé.",
    failed: "L'envoi n'a pas abouti. Réessayez.",
  },
} as const;
