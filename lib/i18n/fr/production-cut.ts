// The edit of an external production on the private links (proto
// « Projet complet » BODY.post / BODY.delivery, production.md § 2.16): the
// company deposits the versions and the final file, the external creative
// validation gives its feedback — in addition to the internal one.
export const productionCut = {
  title: "Montage et retours",
  hint: "Chaque version a son lien et ses retours ; elle est en revue, à modifier ou validée.",
  versions: "Versions du montage",
  version: (n: number) => `Montage V${n}`,
  status: {
    review: "En revue",
    changes: "Modifications demandées",
    approved: "Validée",
    replaced: (next: number) => `Remplacé par la V${next}`,
  },
  deposited: (at: string) => `Déposé le ${at}`,
  asked: (text: string) => `PDS demande : « ${text} »`,
  saidExt: (text: string) => `Validation externe : « ${text} »`,
  side: {
    int: (state: string) => `Interne · ${state}`,
    ext: (state: string) => `Externe · ${state}`,
    states: {
      pending: "À valider",
      approved: "Validée",
      changes: "Modifications demandées",
    },
    none: "Pas de validation externe",
  },
  deposit: {
    label: (n: number) => `Lien du montage V${n}`,
    submit: (n: number) => `Déposer le montage V${n}`,
    done: (n: number) => `Montage V${n} déposé`,
    missing: "Collez le lien du montage.",
  },
  decide: {
    title: (n: number) => `Votre retour sur le montage V${n}`,
    comment: "Retours",
    hint: "Obligatoire pour demander des modifications",
    required: "Dites ce qui doit changer.",
    approve: (n: number) => `Valider le montage V${n}`,
    changes: "Demander des modifications",
    approved: (n: number) => `Montage V${n} validé`,
    asked: "Modifications demandées",
  },
  todo: {
    deposit: (n: number) => `Déposer le montage V${n}`,
    review: (n: number) => `Revoir le montage V${n}`,
    final: "Déposer le fichier final validé",
    deliver: "Confirmer la livraison",
  },
  delivery: {
    title: "Livraison",
    validated: (n: number) => `La version validée : montage V${n}.`,
    final: "Lien du fichier final",
    submit: (n: number) => `Déposer le fichier final du montage V${n}`,
    done: "Fichier final déposé",
    missing: "Collez le lien du fichier final.",
    sent: (at: string) => `Fichier final déposé le ${at}.`,
    delivered: (to: string, at: string) =>
      `Livré à ${to} le ${at}. Livré ne veut pas dire publié.`,
    waiting: "PDS contrôle les fichiers puis confirme la livraison.",
  },
  // Light journeys on the link: the cover, teasers drawn from the clip.
  light: {
    title: "Versions",
    cover: "Versions de la pochette",
    hint: "Chaque version a son fichier et ses retours ; elle est validée sur pièce, jamais par absence de commentaire.",
  },
  errors: {
    invalid_url: "Un lien qui commence par https://.",
    no_validated_version: "Aucune version n'est encore validée.",
    already_delivered: "La livraison est déjà confirmée.",
    version_not_found: "Cette version n'existe plus.",
    invalid_transition: "Cette décision est déjà prise.",
    reason_required: "Dites ce qui doit changer.",
    link_closed: "Ce lien n'est plus valable.",
    stage_locked: "La production est fermée : rien ne peut plus être déposé.",
    failed: "L'envoi n'a pas abouti. Réessayez.",
  },
} as const;
