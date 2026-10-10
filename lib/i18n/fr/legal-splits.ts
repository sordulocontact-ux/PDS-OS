// Répartitions confirmées (ticket Juridique 04): the project's page that
// prepares a title's split and follows the answers, and the public page a
// contributor answers from.
export const legalSplits = {
  roles: {
    author: "Auteur (paroles)",
    composer: "Compositeur",
    arranger: "Arrangeur",
    publisher: "Éditeur",
    other: "Autre",
  },
  versionStates: {
    draft: "Brouillon",
    proposed: "Envoyée, en attente",
    partially_confirmed: "Confirmée en partie",
    confirmed: "Confirmée par tous",
    disputed: "Contestée",
    superseded: "Remplacée",
  },
  confirmationStates: {
    none: "Pas encore envoyée",
    pending: "En attente",
    confirmed: "Confirmé",
    disputed: "Contesté",
    revoked: "Lien révoqué",
    expired: "Lien expiré",
  },
  page: {
    title: "Répartitions",
    description:
      "La répartition de l'édition de chaque titre, confirmée par chaque personne par un lien, sans compte. Une modification crée une nouvelle version à confirmer de nouveau. Elle ne remplace pas la répartition SACEM.",
    empty: "Aucun titre dans ce projet.",
    noCreators:
      "Aucun auteur ni compositeur n'est crédité sur ce titre : préparez la répartition à la main.",
    version: (n: number) => `Version ${n}`,
    total: (value: string) => `Total ${value}`,
    fromTitle:
      "Les parts saisies sur la fiche du titre, prêtes à être envoyées : chaque personne recevra un lien pour confirmer la sienne.",
    editFirst: "Modifier avant l'envoi",
    prepare: "Préparer la répartition",
    resume: "Reprendre le brouillon",
    edit: "Modifier la répartition",
    propose: "Envoyer pour confirmation",
    proposing: "Envoi…",
    newLink: "Nouveau lien",
    disputed: (name: string, comment: string) =>
      `${name} conteste : « ${comment} »`,
    answeredOn: (date: string) => `le ${date}`,
    history: "Versions précédentes",
    columns: {
      person: "Personne",
      role: "Rôle",
      share: "Part",
      state: "Confirmation",
    },
    note: (text: string) => `Raison : ${text}`,
  },
  editor: {
    title: (title: string) => `Répartition de « ${title} »`,
    description:
      "Les parts sont gardées exactes, à 4 décimales, et doivent faire 100 % tout juste ; l'affichage les arrondit.",
    name: "Personne",
    role: "Rôle",
    share: "Part",
    add: "Ajouter une personne",
    remove: (name: string) => `Retirer ${name || "cette ligne"}`,
    equal: "Parts égales",
    note: "Raison du changement",
    save: "Enregistrer le brouillon",
    saving: "Enregistrement…",
    totalOk: "Total : 100 %",
    totalOff: (value: string) => `Total : ${value}, il faut 100 % tout juste`,
    invalid: "Vérifiez les noms et les parts (un nombre, 4 décimales au plus).",
    personMissing:
      "Choisissez la personne dans le Réseau, ou gardez seulement son nom.",
    shareInvalid: "Indiquez sa part : un nombre, 4 décimales au plus.",
    missingCount: (n: number) =>
      n === 1 ? "1 ligne à compléter" : `${n} lignes à compléter`,
    notInNetwork: "pas encore dans le Réseau",
  },
  links: {
    title: (title: string) => `Liens de confirmation · ${title}`,
    body: "Envoyez à chaque personne son lien (WhatsApp, e-mail…). Il n'est affiché qu'une fois : en cas de perte, créez-en un nouveau, l'ancien ne marchera plus. Il expire dans 30 jours.",
    copy: "Copier le lien",
    copied: "Lien copié",
    close: "Fermer",
    email: "Envoyer par e-mail",
    emailSubject: (title: string) => `Répartition à confirmer · ${title}`,
    emailBody: (name: string, title: string, url: string) =>
      `Bonjour ${name},\n\nVoici la répartition des droits de « ${title} » à relire et confirmer (ou contester), sans compte :\n${url}\n\nMerci !`,
  },
  errors: {
    total: "La répartition doit faire exactement 100 % pour être envoyée.",
    closed: "Cette version n'est plus active.",
    contactInvalid:
      "Une personne n'est plus dans le Réseau : choisissez-la de nouveau.",
    failed: "L'action n'a pas pu être faite. Réessayez.",
  },
  public: {
    title: "Confirmation de répartition",
    intro: (person: string, title: string, project: string) =>
      `Bonjour ${person}. Voici la répartition de l'édition proposée pour « ${title} » (projet « ${project} »). Votre réponse vaut pour cette version exacte.`,
    you: "vous",
    confirm: "Je confirme",
    dispute: "Je conteste",
    disputeLabel: "Ce qui ne vous convient pas",
    sendDispute: "Envoyer ma contestation",
    sending: "Envoi…",
    cancel: "Annuler",
    done: {
      confirmed: "Merci, votre confirmation est enregistrée.",
      disputed:
        "Merci, votre contestation est enregistrée : l'équipe va revenir vers vous.",
    },
    states: {
      confirmed: "Vous avez déjà confirmé cette répartition. Merci !",
      disputed: "Vous avez déjà contesté cette répartition.",
      expired: "Ce lien a expiré : demandez-en un nouveau à l'équipe.",
      revoked:
        "Cette proposition a été remplacée : demandez le nouveau lien à l'équipe.",
    },
    changed:
      "La proposition a changé depuis l'ouverture de la page : rechargez-la avant de répondre.",
    commentRequired: "Dites ce qui ne vous convient pas.",
    failed: "Votre réponse n'a pas pu être envoyée. Réessayez dans un instant.",
    notice:
      "Confirmer n'est pas signer un contrat : c'est votre accord sur ces parts, pour cette version.",
  },
} as const;
