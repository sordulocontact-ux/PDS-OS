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
  // The artistic director's pistes (retours du 31/10 et du 10/11/2026): one
  // folder per moodboard, its images inside, outside the versions, kept in
  // the artist's Fichiers (category Moodboard).
  moodboards: {
    title: "Moodboards",
    description:
      "Les pistes du directeur artistique : un dossier par moodboard, ses images dedans. Créez-le ici ou importez-le depuis Figma ; les images sont aussi rangées dans les Fichiers de l'artiste.",
    create: "Nouveau moodboard",
    empty: "Aucun moodboard pour l'instant.",
    emptyHint:
      "Créez une piste et glissez-y ses images, ou importez un moodboard fait sur Figma.",
    count: (n: number) =>
      n === 0 ? "Vide" : n > 1 ? `${n} images` : "1 image",
    by: (date: string, name: string) => (name ? `${date} · ${name}` : date),
    fromFigma: "Figma",
    openFolder: (title: string) => `Ouvrir le moodboard ${title}`,
    // The moodboard files in no folder (filed from the Fichiers tab).
    loose: "Non classés",
    looseNote: "Déposés depuis les Fichiers de l'artiste, hors d'un dossier.",
    back: "Tous les moodboards",
    openInFigma: "Ouvrir dans Figma",
    edit: "Modifier",
    remove: "Supprimer",
    drop: "Glissez des images ici, ou cliquez pour les choisir",
    dropHint: "PNG, JPEG, WebP, GIF ou PDF, 50 Mo au plus chacune.",
    sending: (done: number, total: number) =>
      total > 1 ? `Envoi ${done + 1}/${total}…` : "Envoi…",
    sent: (count: number) =>
      count > 1 ? `${count} images ajoutées` : "Image ajoutée",
    folderEmpty: "Aucune image dans ce moodboard.",
    openImage: (name: string) => `Agrandir ${name}`,
    removeImage: (name: string) => `Supprimer ${name}`,
    viewer: {
      close: "Fermer",
      previous: "Image précédente",
      next: "Image suivante",
      title: (n: number, total: number) => `Image ${n} sur ${total}`,
    },
    form: {
      createTitle: "Nouveau moodboard",
      createBody:
        "Une piste : donnez-lui un nom, ses images se déposent ensuite dedans.",
      editTitle: "Modifier le moodboard",
      editBody: "Son nom et son intention.",
      title: "Nom",
      titlePlaceholder: "Ex. Piste 1 — Néons froids",
      titleMissing: "Donnez un nom au moodboard.",
      note: "Intention",
      noteHint: "Facultatif. Ce que la piste cherche à dire.",
      submitCreate: "Créer le moodboard",
      submitEdit: "Enregistrer",
      created: "Moodboard créé",
      saved: "Moodboard enregistré",
    },
    figma: {
      action: "Importer depuis Figma",
      title: "Importer depuis Figma",
      body: "Collez le lien d'un cadre (frame) Figma : il devient un moodboard avec ses images. Le lien d'une page importe chacun de ses cadres comme une piste.",
      link: "Lien Figma",
      linkPlaceholder: "https://www.figma.com/design/…?node-id=…",
      linkHint:
        "Dans Figma : clic droit sur le cadre → Copier/Coller en tant que → Copier le lien.",
      submit: "Importer",
      pending: "Import en cours…",
      done: (boards: number, images: number) =>
        `${boards > 1 ? `${boards} moodboards importés` : "Moodboard importé"} · ${images > 1 ? `${images} images` : "1 image"}`,
      partial: (failed: number) =>
        failed > 1
          ? `${failed} images n'ont pas pu être récupérées.`
          : "Une image n'a pas pu être récupérée.",
      errors: {
        link: "Ce n'est pas un lien Figma (figma.com/design/…).",
        not_configured:
          "L'import Figma n'est pas configuré (jeton Figma manquant).",
        not_found:
          "Rien trouvé à ce lien : vérifiez qu'il pointe vers un cadre ou une page du fichier.",
        forbidden:
          "PDS OS n'a pas accès à ce fichier : partagez-le avec le compte Figma relié à PDS OS.",
        rate_limited:
          "Figma limite les imports pour le moment : réessayez dans une minute.",
        empty: "Aucune image trouvée à ce lien.",
        failed: "L'import n'a pas abouti. Réessayez.",
      },
    },
    errors: {
      invalid: "Vérifiez le nom du moodboard.",
      failed: "Le moodboard n'a pas pu être enregistré. Réessayez.",
      deleteFailed: "Le moodboard n'a pas pu être supprimé. Réessayez.",
      deleteBlocked:
        "Ce moodboard contient des images ajoutées par quelqu'un d'autre : le Catalogue peut le supprimer.",
    },
    confirm: {
      title: "Supprimer ce moodboard ?",
      body: (name: string, count: number) =>
        count > 0
          ? `« ${name} » et ${count > 1 ? `ses ${count} images` : "son image"} seront supprimés définitivement, aussi des Fichiers de l'artiste.`
          : `« ${name} » sera supprimé définitivement.`,
      imageTitle: "Supprimer cette image ?",
      imageBody: (name: string) =>
        `« ${name} » sera supprimée définitivement, aussi des Fichiers de l'artiste.`,
      confirm: "Supprimer",
      deleting: "Suppression…",
      cancel: "Annuler",
      close: "Fermer",
      deleted: "Moodboard supprimé",
      imageDeleted: "Image supprimée",
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
