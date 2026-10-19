// « Qui fait quoi » of any module (proto rolesModal / BODY.org, sub-lot C7).

export const roles = {
  button: "Qui fait quoi",
  title: "Qui fait quoi",
  description:
    "Chaque rôle, qui le tient et ce qu'il fait ; les liens privés de ceux qui n'ont pas de compte.",
  kinds: { exec: "Exécute", coord: "Coordonne", valid: "Valide" },
  none: "Aucune",
  viaLink: "lien privé",
  change: "Changer",
  multi: (name: string, count: number) =>
    `${name} tient ${count} rôles : chaque action dit à quel titre elle est faite.`,
  history: "Changements de rôle",
  // « Lina Haddad a confié la production à Studio Ressac · 19/10, 11:16 ».
  historyLine: (text: string, who: string | null, at: string) =>
    who ? `${who} ${text} · ${at}` : `${text} · ${at}`,
  production: {
    company: "Production exécutive",
    owner: "Responsable du projet",
    producer: "Responsable de production",
    validator: "Validation budgétaire",
    director: "Réalisation",
    dop: "Image",
    member: "Compte PDS",
  },
  distribution: {
    owner: "Responsable de la distribution",
    ownerWhat:
      "Prépare le dossier, le dépose à la main dans The Orchard et déclare ses réponses.",
    validator: "Validateur Distribution",
    validatorWhat: "Valide le dossier avant le dépôt, puis la clôture.",
    proposed: "proposé : la direction valide les dossiers",
    distributor: "Distributeur",
    distributorWhat:
      "Reçoit, accepte et livre la sortie ; ce qu'il répond est déclaré dans PDS OS.",
    noLink: "sans lien : ses réponses sont déclarées",
    validatorSet: "Validateur Distribution désigné",
  },
  design: {
    owner: "Responsable du projet",
    owners:
      "Suit l'ensemble, désigne les rôles, peut agir à la place du responsable (tracé).",
    responsible: "Responsable",
    responsibleWhat: "Prépare et soumet à la validation.",
    since: (date: string) => `désigné le ${date}`,
    validator: "Validation",
    validatorWhat: "Valide ou demande des modifications.",
    delegation: (role: string, from: string, to: string, until: string) =>
      `${role} de ${from} confié à ${to} jusqu'au ${until}`,
  },
  links: {
    title: "Liens privés",
    hint: "Chaque lien ne montre que la part de la personne : ni l'enveloppe, ni les échanges internes, ni les autres prestataires.",
    active: (n: number) => `Lien n° ${n} actif`,
    none: "Pas encore de lien",
    created: (day: string, by: string | null) =>
      by ? `créé le ${day} par ${by}` : `créé le ${day}`,
    sent: (day: string) => `envoyé le ${day}`,
    opened: (day: string) => `ouvert le ${day}`,
    notOpened: "jamais ouvert",
    expires: (day: string) => `valable jusqu'au ${day}`,
    revoked: (day: string) => `Révoqué le ${day} · ce qu'il a déposé reste`,
    copy: "Copier le lien",
    copied: "Lien copié",
    remind: "Relancer",
    renew: "Nouveau lien",
    renewHint:
      "Un nouveau lien remplace l'ancien, qui cesse de marcher ; ce qui a été déposé reste.",
  },
} as const;
