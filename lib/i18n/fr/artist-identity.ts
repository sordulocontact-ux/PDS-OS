/** The artist's identity (MKT-C2-04): on the artist, read from a release. */
export const artistIdentity = {
  tab: "Identité",
  title: "Identité artistique",
  intro:
    "Le référentiel permanent de l'artiste : il appartient à l'artiste, pas à une sortie. Chaque sortie le lit comme contexte et garde la version qu'elle a utilisée.",
  empty: "Aucune identité écrite pour cet artiste.",
  emptyHint:
    "Écrivez-la une fois : chaque sortie la reprendra au lieu de la redemander.",
  fields: {
    manifesto: "Manifeste",
    tone: "Tonalité",
    palette: "Palette",
    typography: "Typographies",
    symbols: "Symboles et codes visuels",
  },
  hints: {
    manifesto: "Ce que l'artiste défend et raconte, en quelques phrases.",
    tone: "La voix : comment l'artiste parle, ce qu'il évite.",
    palette: "Couleurs, matières, lumières.",
    typography: "Familles de caractères, styles d'écriture.",
    symbols: "Logos, motifs, objets, gestes récurrents.",
  },
  refKinds: {
    reference: "Références",
    counter: "Contre-références",
    moodboard: "Moodboards",
  },
  refKindOne: {
    reference: "Référence",
    counter: "Contre-référence",
    moodboard: "Moodboard",
  },
  refs: {
    title: "Références, contre-références et moodboards",
    hint: "Des liens https (Are.na, Pinterest, YouTube, site…).",
    add: "Ajouter un lien",
    url: "Lien",
    name: "Titre",
    note: "Note",
    kind: "Type",
    remove: (n: number) => `Retirer le lien ${n}`,
    urlInvalid: "Un lien commence par https://",
    none: "Aucun lien.",
  },
  // Files dropped on the Identité tab (retour du 31/10/2026): outside the
  // versions, kept in the artist's Fichiers (category Moodboard).
  moodboards: {
    title: "Moodboards",
    description:
      "Les moodboards du directeur artistique, déposés tels quels : une image ou un PDF. Ils sont aussi rangés dans les Fichiers de l'artiste.",
    drop: "Glissez un moodboard ici, ou cliquez pour le choisir",
    dropHint: "Image (PNG, JPEG, WebP) ou PDF, 50 Mo au plus.",
    sending: (done: number, total: number) =>
      total > 1 ? `Envoi ${done + 1}/${total}…` : "Envoi…",
    sent: (count: number) =>
      count > 1 ? `${count} moodboards déposés` : "Moodboard déposé",
    empty: "Aucun moodboard pour l'instant.",
    open: (name: string) => `Ouvrir ${name}`,
    remove: (name: string) => `Supprimer ${name}`,
    by: (date: string, name: string) => (name ? `${date} · ${name}` : date),
    confirm: {
      title: "Supprimer ce moodboard ?",
      body: (name: string) =>
        `« ${name} » sera supprimé définitivement, aussi des Fichiers de l'artiste.`,
      confirm: "Supprimer",
      deleting: "Suppression…",
      cancel: "Annuler",
      close: "Fermer",
      deleted: "Moodboard supprimé",
    },
  },
  changeNote: "Ce qui change",
  changeNoteHint: "Une phrase pour l'historique.",
  edit: "Modifier l'identité",
  write: "Écrire l'identité",
  editTitle: "Nouvelle version de l'identité",
  editBody: (validates: boolean) =>
    validates
      ? "Elle devient l'identité en vigueur dès l'enregistrement. Les sorties gardent la version qu'elles utilisent."
      : "Elle est proposée au DG, qui l'approuve ou la refuse. D'ici là, l'identité en vigueur ne change pas.",
  save: "Enregistrer la version",
  saved: "Version enregistrée.",
  proposed: "Version proposée au DG.",
  current: "En vigueur",
  version: (n: number) => `V${n}`,
  versionLine: (n: number, date: string) => `V${n} du ${date}`,
  inForce: (from: string, until: string | null) =>
    until
      ? `En vigueur du ${from} au ${until}`
      : `En vigueur depuis le ${from}`,
  statuses: {
    proposed: "Proposée",
    approved: "Approuvée",
    rejected: "Refusée",
  },
  by: (who: string | null) => (who ? `par ${who}` : ""),
  fromProject: "Proposée depuis une sortie",
  pendingTitle: "Propositions à décider",
  historyTitle: "Historique des versions",
  approve: "Approuver",
  approved: "Version approuvée : elle est en vigueur.",
  reject: "Refuser",
  rejectTitle: "Refuser la version",
  rejectBody:
    "L'identité en vigueur ne change pas. Le motif reste dans l'historique.",
  rejectReason: "Pourquoi la refuser ?",
  rejected: "Version refusée.",
  decision: (comment: string) => `Motif : ${comment}`,
  ownProposal: "Vous l'avez proposée : un autre valideur la décide.",
  // « Maintenant » of the artist: the direction decides a proposal.
  now: {
    toValidate: "À valider",
    eyebrow: (artist: string) => `${artist} · Identité`,
    title: (n: number) => `Décider de la proposition d'identité V${n}`,
    why: (who: string | null, day: string, what: string | null) =>
      `${who ?? "Un membre de l'équipe"} propose le ${day}${what ? ` : ${what}` : "."}`,
    inForce: "En vigueur",
    inForceValue: (n: number, day: string) => `V${n}, approuvée le ${day}`,
    noneInForce: "Aucune version approuvée",
    approve: (n: number) => `Approuver la V${n}`,
    refuse: "Refuser",
    reason: "Motif",
    reasonHint: (who: string | null) =>
      who ? `Il revient à ${who}.` : "Il revient à son auteur.",
    refuseSubmit: "Refuser la proposition",
    decideAbove: "À décider dans « Maintenant », en haut de la fiche.",
  },
  errors: {
    forbidden: "Vous n'avez pas le droit de faire cela sur cette identité.",
    invalid_identity: "Une valeur n'est pas valable (lien https, longueur).",
    reason_required: "Écrivez la raison du refus.",
    own_proposal: "Vous ne pouvez pas décider votre propre proposition.",
    already_decided: "Cette version a déjà été décidée.",
    generic: "L'identité n'a pas pu être enregistrée. Réessayez.",
  },
  // In the Conception of a release.
  conception: {
    title: "Identité de l'artiste",
    used: (n: number, date: string) =>
      `Cette sortie utilise la V${n} du ${date}, en lecture seule.`,
    none: "Cet artiste n'a pas encore d'identité écrite : la sortie construit sa direction sans référentiel.",
    noArtist: "Le projet n'est rattaché à aucun artiste.",
    newer: (n: number) => `Une version plus récente existe : V${n}.`,
    use: (n: number) => `Utiliser la V${n}`,
    used_: "Version utilisée par la sortie.",
    see: "Voir l'identité complète",
    addToRelease: "Ajouter aux références de la sortie",
    added: "Ajoutée aux références de la sortie, liée à l'identité.",
    alreadyAdded: "Déjà dans les références",
    deviation: "Dérogation de cette sortie",
    deviationEmpty: "La sortie suit l'identité habituelle.",
    deviate: "Signaler une dérogation",
    deviateEdit: "Modifier la dérogation",
    deviateTitle: "Dérogation à l'identité",
    deviateBody:
      "Ce que cette sortie fait volontairement autrement. C'est visible dans le brief créatif ; l'identité de l'artiste ne change pas.",
    deviateLabel: "En quoi la sortie s'écarte de l'identité",
    deviateSave: "Enregistrer la dérogation",
    deviated: "Dérogation enregistrée.",
    propose: "Proposer une évolution de l'identité",
    proposeTitle: "Proposer une évolution de l'identité",
    proposeBody:
      "Une nouvelle version de l'identité de l'artiste, proposée au DG. Elle ne change ni l'identité en vigueur ni cette sortie tant qu'elle n'est pas approuvée.",
  },
} as const;
