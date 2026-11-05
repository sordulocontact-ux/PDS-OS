// Répartitions confirmées (ticket Juridique 04): the project's page that
// prepares a title's split and follows the answers, and the public page a
// contributor answers from.
export const legalSplits = {
  roles: {
    author: "Auteur·rice (paroles)",
    composer: "Compositeur·rice",
    author_composer: "Auteur·rice et compositeur·rice",
    arranger: "Arrangeur·se",
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
  // JUR-29: the version comparator.
  changes: {
    title: (n: number) => `Changé depuis la v${n}`,
    none: "Mêmes personnes, mêmes rôles, mêmes parts.",
    added: (name: string, role: string, share: string) =>
      `${name} ajouté·e (${role}, ${share})`,
    removed: (name: string, share: string) => `${name} retiré·e (${share})`,
    role: (name: string, from: string, to: string) =>
      `${name} : ${from} → ${to}`,
    share: (name: string, from: string, to: string) =>
      `${name} : ${from} → ${to}`,
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
  // JUR-01: who created what, who publishes each creator's share, then the
  // parts, typed by a person.
  editor: {
    title: (title: string) => `Répartition de « ${title} »`,
    intro:
      "Trois choses distinctes, dans cet ordre : qui a créé quoi, qui édite la part de chacun, puis les parts de l'œuvre. La répartition SACEM (DEP / DR) est calculée plus tard à partir de ces parts.",
    creators: "Qui a créé quoi",
    creatorsBody:
      "Une contribution ne donne pas de part par elle-même : les parts se saisissent plus bas. L'interprétation passe par les contrats, pas par cette répartition.",
    publishing: "Qui édite la part de chaque créateur",
    parts: "Parts de l'œuvre",
    partsBody: "Saisies par une personne : PO ne propose jamais de part.",
    name: "Personne",
    role: "Rôle",
    share: "Part",
    sharePlaceholder: "0",
    add: "Ajouter un créateur",
    remove: (name: string) => `Retirer ${name || "cette ligne"}`,
    house: "PDS Éditions",
    modePlaceholder: "À choisir",
    modeLabel: (name: string) => `Éditeur de ${name || "ce créateur"}`,
    modes: {
      house: "PDS Éditions",
      other: "Un autre éditeur, choisi dans le Réseau",
      none: "Aucun éditeur : il garde toute sa part",
    },
    modeBadges: {
      house: "PDS Éditions",
      other: "Son éditeur",
      coedition: "Coédition",
      none: "Sans éditeur",
    },
    proposed: (source: string) => `Proposé : ${source}`,
    publisher: "Son éditeur",
    coedition: (publisher: string | null) =>
      `PDS Éditions coédite sa part avec ${publisher ?? "son éditeur"}`,
    hint: {
      fiche: (name: string) => `Sa fiche de renseignements : « ${name} »`,
      ficheCoedition: (name: string) =>
        `Sa fiche : « ${name} » · contrat d'édition prévu au plan d'action`,
      planned: "Plan d'action · contrat d'édition prévu avec PDS",
      none: (reason: string) => `Plan d'action · « ${reason} »`,
    },
    represents: (names: string[]) =>
      `Éditeur · représente ${names.join(" et ")}`,
    note: "Raison du changement",
    notePlaceholder: (version: number) =>
      `Ce qui change par rapport à la version ${version}`,
    save: "Enregistrer la répartition",
    saveNew: "Proposer la nouvelle version",
    saving: "Enregistrement…",
    totalOk: "Total : 100 %",
    total: (value: string) => `Total : ${value}`,
    totalOff: (value: string) =>
      `Le total fait ${value} : il faut 100 % tout juste.`,
    invalid: "Vérifiez les noms et les parts (un nombre, 4 décimales au plus).",
    personMissing:
      "Choisissez la personne dans le Réseau, ou gardez seulement son nom.",
    roleMissing: "Indiquez ce qu'il ou elle a créé.",
    modeMissing: "Dites qui édite sa part : PDS OS ne le devine pas.",
    publisherMissing:
      "Choisissez son éditeur dans le Réseau : PDS OS ne le choisit pas à votre place.",
    shareMissing: (name: string, publisher: boolean) =>
      `Indiquez la part ${name.match(/^[AEÉIOUY]/i) ? "d'" : "de "}${name} : chaque ${publisher ? "éditeur" : "créateur"} en a une.`,
    thisCreator: "ce créateur",
    noteMissing: "Dites ce qui change par rapport à la version précédente.",
    missingCount: (n: number) =>
      n === 1
        ? "1 point à corriger avant d'enregistrer."
        : `${n} points à corriger avant d'enregistrer.`,
    notInNetwork: "pas encore dans le Réseau",
  },
  links: {
    // JUR-27: the person keeps the link already sent.
    kept: "Même lien qu'avant : il ouvre maintenant cette version, rien à renvoyer.",
    title: (title: string) => `Liens de confirmation · ${title}`,
    body: "Envoyez à chaque personne son lien (WhatsApp, e-mail…). Il n'est affiché qu'une fois : en cas de perte, créez-en un nouveau, l'ancien ne marchera plus. Il expire dans 30 jours.",
    copy: "Copier le lien",
    copied: "Lien copié",
    close: "Fermer",
    email: "Envoyer par e-mail",
    emailSubject: (title: string) => `Répartition à confirmer · ${title}`,
    // The e-mail PDS OS sends itself (lib/email/contact-email.ts).
    emailed: {
      subject: (title: string) => `« ${title} » : votre part à confirmer`,
      body: (title: string) =>
        `La répartition des droits de « ${title} » est prête : nous vous demandons de la relire, puis de la confirmer ou de la contester.`,
      open: "Voir la répartition :",
      sent: (names: string[]) =>
        names.length === 1
          ? `Confirmation envoyée par e-mail à ${names[0]}`
          : `Confirmation envoyée par e-mail à ${names.join(", ")}`,
      failed: (names: string[]) =>
        `L'e-mail n'est pas parti pour ${names.join(", ")} : envoyez-leur le lien vous-même.`,
    },
    emailBody: (name: string, title: string, url: string) =>
      `Bonjour ${name},\n\nVoici la répartition des droits de « ${title} » à relire et confirmer (ou contester), sans compte :\n${url}\n\nMerci !`,
  },
  errors: {
    total: "La répartition doit faire exactement 100 % pour être envoyée.",
    closed: "Cette version n'est plus active.",
    contactInvalid:
      "Une personne n'est plus dans le Réseau : choisissez-la de nouveau.",
    publisherUnlinked:
      "Dites quels créateurs chaque éditeur représente, dans la répartition.",
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
    disputeTitle: "Contester la répartition",
    disputeBody:
      "L'équipe lira votre motif ; une nouvelle version vous sera proposée, par ce même lien.",
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
