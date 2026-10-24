// « Prêt pour la sortie » (ticket Juridique 08, proto « Projet complet »):
// the controls, the verdict, the waivers, the label's policy and the
// direction's final validation.

export const legalReadiness = {
  domains: {
    master: "Master & audio",
    rights: "Droits & juridique",
    metadata: "Métadonnées",
    assets: "Assets & contenus",
    distribution: "Distribution & validations",
  },
  sources: {
    master: "Master",
    catalog: "Catalogue",
    design: "Marketing › Conception",
    project: "Distribution",
    legal: "Juridique",
  } as Record<string, string>,
  contractOf: (name: string) => `Contrat de ${name}`,
  // An invoice received and not paid: followed, never blocking (20/10/2026).
  invoice: {
    label: (name: string) => `Facture de ${name}`,
    rib: (at: string) => `Reçue le ${at} : nouveau RIB à confirmer`,
    toPay: (at: string, due: string) =>
      `Reçue le ${at} : à payer avant le ${due}`,
    paid: (day: string) => `Payée le ${day}`,
    nextRib: "Confirmer le nouveau RIB",
    nextPay: "Payer la facture",
    source: "Budget du projet",
  },
  final: "Validation finale avant The Orchard",
  finalLast: "En dernier, par la direction",
  validatedBy: (name: string) => `Validée par ${name}`,
  done: "Fait",
  notYet: "Pas encore",
  verdictBody: {
    no: (n: number) =>
      n === 1
        ? "1 point bloque la livraison."
        : `${n} points bloquent la livraison.`,
    risk: "Rien ne bloque, des points restent à suivre.",
    ok: "Tout est en ordre pour la livraison.",
  },
  blockingTitle: "À résoudre avant sortie",
  followTitle: "Reste à suivre",
  badge: {
    blocking: "Bloquant",
    notBlocking: "Ne bloque pas",
    ok: "Fait",
    waived: "Dérogation",
    follow: "À suivre",
  },
  responsible: (name: string) => `Responsable : ${name}`,
  next: (text: string) => `Prochaine action : ${text}`,
  source: (source: string, proof: string) =>
    `Source : ${source} · Preuve : ${proof}`,
  noProof: "—",
  waiver: {
    grant: "Accorder une dérogation",
    why: "Pourquoi vous accordez une dérogation",
    whyMissing: "Une dérogation est motivée : écrivez pourquoi.",
    body: "La sortie passe « À risque » ; la dérogation reste dans l'historique.",
    done: "Dérogation accordée",
    by: (who: string, at: string, reason: string) =>
      `Dérogation de ${who} le ${at} : « ${reason} »`,
  },
  all: "Voir tous les contrôles",
  allCount: (done: number, total: number) => `${done} faits sur ${total}`,
  policy: {
    title: "Politique du label",
    body: (sacem: boolean) =>
      sacem
        ? "Bloque la sortie : master final absent, œuvre existante non autorisée, métadonnées ou visuels manquants, déclaration SACEM non déposée."
        : "Bloque la sortie : master final absent, œuvre existante non autorisée, métadonnées ou visuels manquants. SACEM : ne bloque pas, la sortie passe « À risque ».",
    by: "Réglée par la direction",
    sacem: "SACEM bloquante",
    saved: "Politique du label enregistrée",
  },
  validate: {
    action: "Valider la sortie avant The Orchard",
    closed:
      "La validation finale s'ouvre quand plus rien ne bloque, ou avec une dérogation.",
    done: "Sortie validée",
    by: (who: string, at: string) => `Sortie validée par ${who} le ${at}.`,
    blocked:
      "Un point bloque encore la sortie : résolvez-le ou accordez une dérogation.",
  },
  errors: {
    failed: "L'action n'a pas pu être faite. Réessayez.",
    already: "La sortie est déjà validée.",
  },
  open: "Ouvrir",
} as const;
