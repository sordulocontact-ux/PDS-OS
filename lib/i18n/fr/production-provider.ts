/** Production › the provider's own space, by private link (PROD-026,
 * PROD-028, PROD-031, PROD-032, PROD-036). */
export const productionProvider = {
  // The owner's side.
  link: "Lien du prestataire",
  linkAgain: "Nouveau lien",
  linkTitle: (name: string) => `Lien de ${name}`,
  linkDescription:
    "Montré une seule fois : copiez-le et envoyez-le-lui. Sur sa page, sans compte, il retrouve sa mission, les références et les corrections qui lui sont adressées, et dépose lui-même ses versions et ses exports. Un nouveau lien remplace le précédent.",
  linkLabel: (name: string) => `Espace de ${name}`,
  copy: "Copier le lien",
  copied: "Lien copié.",
  close: "Fermer",
  sentOn: (date: string) => `Lien créé le ${date}`,
  openedOn: (date: string) => `ouvert le ${date}`,
  notOpened: "pas encore ouvert",
  expired: "Lien expiré",
  failed: "Le lien n'a pas pu être créé. Réessayez.",
  notAProvider:
    "Ce contact ne tient aucune étape ni demande de corrections de ce livrable.",

  // The provider's page.
  pageTitle: "Espace prestataire",
  intro: (provider: string, deliverable: string, project: string) =>
    `Bonjour ${provider}, voici votre espace pour « ${deliverable} » (${project}).`,
  managed: (manager: string) => `${manager} suit la production côté label.`,
  replaced:
    "Ce lien a été remplacé par un plus récent : demandez-le à la production.",
  expiredPage: "Ce lien a expiré : demandez-en un nouveau à la production.",
  locked:
    "La production n'est plus ouverte aux dépôts : tout reste consultable ici.",
  until: (date: string) => `Lien valable jusqu'au ${date}.`,
  mission: {
    title: "Votre mission",
    none: "Aucune étape ne vous est encore confiée.",
    period: (from: string, to: string) => `Du ${from} au ${to}`,
    until: (to: string) => `Pour le ${to}`,
    from: (from: string) => `À partir du ${from}`,
    expected: "Ce qui est attendu",
    access: "Accès",
    finish: "Mission terminée",
    finished: "Mission marquée terminée : la production est prévenue.",
    done: "Terminée",
  },
  references: {
    title: "Références",
    none: "Aucune référence partagée pour l'instant.",
    open: "Ouvrir",
    file: (name: string) => `Fichier : ${name} (demandez-le à la production)`,
  },
  locations: {
    title: "Lieux à comparer",
    hint: (role: string) =>
      `Votre avis est demandé (${role}). Il est rattaché à chaque lieu et à votre nom.`,
  },
  corrections: {
    title: "Corrections demandées",
    none: "Aucune correction ne vous est adressée.",
    on: (n: number, date: string) => `Sur la V${n} — pour le ${date}`,
    treated: "Traitée par une version suivante",
    general: "Général",
  },
  deposit: {
    title: "Déposer une version",
    hint: "Elle est numérotée automatiquement et soumise aux retours : la production est prévenue. Si des corrections vous ont été demandées, cette version y répond.",
    legend: "Fichier ou lien",
    media: {
      link: { label: "Lien", hint: "Frame.io, Drive, Vimeo…" },
      file: { label: "Fichier", hint: "Un export de relecture." },
    },
    url: "Lien de la version",
    urlHint: "Une adresse qui commence par https://",
    file: "Fichier de la version",
    fileHint: "Ou cliquez pour le choisir.",
    fileChosen: (name: string) => `Fichier choisi : ${name}`,
    notes: "Ce qui a changé",
    submit: "Déposer la version",
    sending: "Envoi…",
    done: (n: number) => `V${n} déposée : la production est prévenue.`,
    missing: {
      url: "Collez un lien qui commence par https://",
      file: "Choisissez le fichier.",
    },
  },
  versions: {
    title: "Versions",
    none: "Aucune version soumise.",
    name: (n: number) => `V${n}`,
    mine: "Déposée par vous",
    statuses: {
      in_review: "En revue",
      final_review: "En revue",
      changes_requested: "Corrections demandées",
      approved: "Validée",
      refused: "Refusée",
      draft: "Brouillon",
    },
  },
  exports: {
    title: "Fichiers attendus",
    hint: "Déposez le lien de chaque export final : la production le contrôle.",
    url: (label: string) => `Lien de l'export « ${label} »`,
    submit: "Déposer",
    replace: "Remplacer",
    done: "Export déposé : il sera contrôlé.",
    states: {
      todo: "À déposer",
      to_check: "Déposé, à contrôler",
      ok: "Conforme",
      not_ok: "Non conforme",
    },
    missing: "Collez un lien qui commence par https://",
  },
  errors: {
    link_closed:
      "Ce lien n'est plus valable : demandez-en un nouveau à la production.",
    stage_locked: "La production n'accepte plus de dépôt.",
    invalid_url: "Le lien doit commencer par https://",
    one_media: "Déposez un fichier ou un lien, pas les deux.",
    file_mismatch: "Le fichier n'a pas été reçu. Réessayez.",
    too_many_deposits: "Trop de dépôts en une heure : réessayez plus tard.",
    invalid_file_name: "Le nom du fichier n'est pas valable.",
    line_not_found: "Ce fichier attendu n'existe plus. Rechargez la page.",
    step_not_found: "Cette étape ne vous est plus confiée. Rechargez la page.",
    upload: "L'envoi du fichier a échoué. Réessayez.",
    tooLarge: "Le fichier dépasse 500 Mo : déposez plutôt un lien.",
    failed: "Le dépôt a échoué. Réessayez.",
  },
} as const;
