// Deliverables without a shoot of their own (proto « Projet complet »
// lightSteps / lightBody, PR-13): the cover and the teasers drawn from the
// clip — Versions, Contrôle technique, Livraison — and the delivery's
// recipients of every deliverable.
export const productionLight = {
  steps: {
    versions: {
      title: "Versions",
      cover: "Versions de la pochette",
      why: "Chaque version a son fichier et ses retours ; elle est validée sur pièce, jamais par absence de commentaire.",
    },
    control: {
      title: "Contrôle technique",
      why: "Une version validée n'est pas encore livrable : on contrôle les fichiers attendus, un par un.",
    },
    delivery: {
      title: "Livraison",
      why: "Version validée, fichiers conformes, puis livraison : trois décisions distinctes.",
    },
  },
  // « Qui produit ? » by kind of deliverable (proto PROD_CHOICES).
  choices: {
    cover: {
      internal: {
        label: "Interne",
        detail: "PDS la réalise ou la fait réaliser",
      },
      external: {
        label: "Externe",
        detail: "Un photographe ou un illustrateur du Réseau",
        hint: "Le photographe ou l'illustrateur se choisit juste en dessous",
      },
      who: "Qui la réalise ?",
      none: "Aucun photographe ni illustrateur dans le Réseau pour l'instant.",
      create: "Créer la fiche d'un photographe",
    },
    teasers: {
      derived: {
        label: "Décliné du Clip officiel",
        detail: "La même production les tire du montage du clip",
      },
      internal: { label: "Interne", detail: "PDS les monte à part" },
      clipBy: (who: string) => `Production du clip : ${who}`,
    },
  },
  todo: {
    deposit: (n: number) => `Déposer la V${n}`,
    validate: (n: number) => `Valider la V${n}`,
    control: "Contrôler les fichiers",
    deliver: "Confirmer la livraison",
  },
  summary: {
    validated: (n: number) => `V${n} validée`,
    pending: (n: number) => `V${n} en revue`,
    changes: (n: number) => `V${n} : modifications demandées`,
    checked: "Fichiers conformes",
    delivered: "Livré",
  },
  derived: "Décliné du Clip officiel",
  gate: "Montage du clip validé",
  gateWait: (clip: string) =>
    `Les versions attendent la validation du montage de « ${clip} ».`,
  facts: {
    production: "Production",
    fiche: "Fiche",
    ficheValue: (n: number, format: string | null) =>
      format ? `V${n} · ${format}` : `V${n}`,
  },
  version: (n: number) => `V${n}`,
  status: {
    in_review: "En revue",
    final_review: "En revue",
    changes_requested: "Modifications demandées",
    approved: "Validée",
    refused: "Modifications demandées",
    draft: "En revue",
  },
  deposited: (who: string, at: string) => `Déposée par ${who} le ${at}`,
  read: (name: string, w: number, h: number) =>
    `${name} · ${w} × ${h} px · lu par le code`,
  said: (who: string, text: string) => `${who} : « ${text} »`,
  deposit: {
    title: (n: number) => `Déposer la version V${n}`,
    drop: "Glissez l'image de la pochette, ou choisissez-la",
    dropHint: "Le code lit sa taille et son format.",
    chosen: "Image choisie",
    link: (n: number) => `Lien de la version V${n}`,
    linkHint: "Commence par https://",
    submit: (n: number) => `Déposer la V${n}`,
    done: (n: number) => `V${n} déposée`,
    missingImage: "Choisissez l'image de la pochette.",
    missingLink: "Collez le lien de la version.",
    notImage: "Seules les images sont acceptées.",
    unreadable: "Le code n'a pas pu lire cette image.",
  },
  decide: {
    title: (n: number) => `Votre décision sur la V${n}`,
    comment: "Retours",
    hint: "Obligatoire pour demander des modifications",
    required: "Dites ce qui doit changer.",
    approve: (n: number) => `Valider la V${n}`,
    changes: "Demander des modifications",
    approved: (n: number) => `V${n} validée`,
    asked: "Modifications demandées",
  },
  control: {
    auto: "Contrôlé par le code",
    rules: {
      size: "3000 × 3000 px",
      format: "JPG ou PNG",
      square: "Carré",
      weight: "10 Mo au plus",
    },
    yes: "Oui",
    no: "Non",
    conforming: "Conforme",
    notConforming: "Non conforme",
    manual: "À contrôler",
    cover: [
      "Lisible en petit (vignette de 64 px)",
      "Couleurs conformes à la version validée",
    ],
    video: {
      export: (ratio: string) => `Export ${ratio} présent et lisible`,
      duration: "Durée conforme à la fiche",
      sound: "Son contrôlé",
      subtitles: "Sous-titres présents",
      naming: "Nommage des fichiers conforme",
    },
    confirm: "Confirmer : fichiers conformes",
    confirmed: "Fichiers conformes",
    done: (who: string, at: string) => `, contrôlés par ${who} le ${at}.`,
    bad: "Le fichier validé n'est pas conforme : demandez une nouvelle version.",
    unchecked: "Cochez chaque contrôle avant de confirmer.",
    waitVersion: "Une version doit d'abord être validée.",
  },
  delivery: {
    version: "Version",
    versionValue: (n: number) => `V${n} validée, fichiers conformes`,
    confirm: "Confirmer la livraison",
    done: "Livraison confirmée",
    delivered: "Livré",
    deliveredLine: (at: string, by: string, to: string) =>
      ` le ${at} par ${by} à : ${to}. Livré ne veut pas dire publié.`,
  },
  // The delivery's recipients (proto recipientsPick), every deliverable.
  recipients: {
    legend: "Destinataires de la livraison",
    hint: "Pré-cochés : ceux qui en ont besoin dans PDS OS. Les autres viennent du projet et du Réseau.",
    you: " (vous)",
    purposes: {
      distribution: "Distribution",
      distributionCover: "Distribution · pochette validée",
      activations: "Activations",
      validation: "validation externe",
    },
    network: "Réseau",
    added: "Destinataire ajouté",
    nameOnly: "nom seul",
    add: "Ajouter un destinataire",
    addTitle: "Ajouter un destinataire",
    addedToast: (name: string) => `${name} ajouté aux destinataires`,
    required: "Choisissez au moins un destinataire.",
    deliveredTo: "Livré à",
  },
  errors: {
    clip_not_validated:
      "Le montage du clip n'est pas encore validé : les versions attendent.",
    version_pending: "La dernière version attend encore sa décision.",
    one_media: "Une image ou un lien, pas les deux.",
    reason_required: "Dites ce qui doit changer.",
    invalid_transition: "Cette étape est déjà passée.",
    cover_not_conforming:
      "Le fichier validé n'est pas conforme : demandez une nouvelle version.",
    recipients_required: "Choisissez au moins un destinataire.",
    invalid_source: "Le clip n'a pas encore de production choisie.",
    link_closed: "Ce lien n'est plus valable.",
    stage_locked: "La production est fermée : rien ne peut plus être déposé.",
    file_mismatch: "Le fichier n'a pas été reçu. Réessayez.",
    failed: "L'envoi n'a pas abouti. Réessayez.",
  },
} as const;
