// Fiches de renseignements (ticket Juridique 02): the public page an outside
// person fills, and the project's page that prepares and follows them.
export const legalForms = {
  public: {
    title: "Fiche de renseignements",
    intro: (person: string, project: string, organization: string | null) =>
      `Bonjour ${person}. ${organization ?? "L'équipe"} prépare le projet « ${project} » et a besoin de quelques informations vous concernant. Remplissez seulement ce qui vous concerne : vous n'avez pas besoin de compte.`,
    // Who asks and whom to write to (UX test of 09/10/2026).
    requester: {
      title: "Une question ?",
      body: (contact: string) => `Écrivez à ${contact}, responsable du projet.`,
      bodyNoEmail: (contact: string) =>
        `${contact} est responsable du projet : contactez cette personne par le moyen habituel.`,
      team: "Contactez l'équipe qui vous a envoyé ce lien.",
    },
    dataUse: {
      title: "À quoi servent vos données",
      purposes:
        "À vos crédits sur les titres du projet, à vos contrats et aux déclarations auprès des organismes de gestion des droits (SACEM, SCPP…).",
      access: (organization: string | null) =>
        `Seule l'équipe ${organization ? `de ${organization} ` : ""}qui suit le projet y a accès.`,
      retention:
        "Elles sont gardées tant que les titres du projet sont exploités, puis le temps que la loi impose au label.",
      rights:
        "Vous pouvez les consulter, les corriger ou demander leur suppression en écrivant au responsable du projet (RGPD, articles 15 à 17).",
    },
    afterSubmit: {
      title: "Et ensuite ?",
      review: "L'équipe relit votre fiche.",
      follow:
        "Si votre rôle demande un contrat ou une répartition des droits, l'équipe vous les enverra à relire avant toute signature.",
    },
    rolesTitle: "Quel est votre rôle sur ce projet ?",
    rolesHint: "Plusieurs choix possibles.",
    otherRole: "Précisez votre rôle",
    next: "Continuer",
    back: "Modifier mes rôles",
    known: "Déjà connu : vérifiez et corrigez si besoin.",
    submit: "Envoyer ma fiche",
    // Vérifier, consentir, envoyer, then a dated receipt (JUR-14).
    review: {
      next: "Vérifier ma fiche",
      title: "Vérifiez votre fiche",
      roles: "Vos rôles",
      edit: "Modifier mes réponses",
      consentTitle: "Votre accord",
      consent: (organization: string | null) =>
        `J'accepte que ${organization ?? "l'équipe"} utilise ces informations pour mes crédits, mes contrats et mes déclarations auprès des organismes de gestion des droits.`,
      consentMissing: "Cochez la case pour envoyer votre fiche.",
      receipt: (date: string) => `Fiche envoyée le ${date}.`,
    },
    // A complement asked by the team (JUR-06): only what is missing.
    complement: {
      title: "Il manque une information à votre fiche",
      intro: (person: string) =>
        `Bonjour ${person}. Votre fiche est bien arrivée, il n'y manque que ceci. Le reste est gardé tel quel.`,
      send: "Compléter ma fiche",
      sending: "Envoi…",
      done: "Merci, votre fiche est complétée : l'équipe la vérifie.",
      missing: "Complétez chaque champ demandé.",
    },
    submitting: "Envoi…",
    required: "Obligatoire",
    missing: "Complétez les champs obligatoires.",
    invalid: "Vérifiez les champs signalés.",
    failed: "Votre fiche n'a pas pu être envoyée. Réessayez dans un instant.",
    closed: "Ce lien n'est plus valable : demandez-en un nouveau à l'équipe.",
    done: {
      title: "Merci, votre fiche est enregistrée.",
      differs:
        "Certaines informations différaient de ce que l'équipe avait : elle va les vérifier.",
    },
    states: {
      submitted: "Cette fiche a déjà été envoyée. Merci !",
      expired: "Ce lien a expiré : demandez-en un nouveau à l'équipe.",
      revoked: "Ce lien a été remplacé : demandez le nouveau à l'équipe.",
    },
    notice:
      "Ces informations servent à vos crédits, à vos contrats et à vos déclarations. Elles ne valent ni contrat, ni accord sur une répartition.",
  },
  // The same words as the credits and the Réseau (UX test of 09/10/2026:
  // three lists of roles).
  roles: {
    author: "Auteur·rice (paroles)",
    composer: "Compositeur·rice",
    arranger: "Arrangeur·se",
    performer: "Artiste interprète",
    musician: "Musicien·ne",
    backing_vocalist: "Choriste",
    producer: "Réalisateur·rice",
    label: "Label",
    provider: "Prestataire (mix, mastering…)",
    studio: "Studio",
    lawyer: "Avocat·e",
    publisher: "Éditeur",
    other: "Autre",
  },
  blocks: {
    common: "Vous",
    creator: "Auteur, compositeur, arrangeur",
    artist: "Interprétation",
    producer: "Production",
    provider: "Prestation",
    publisher: "Édition",
  },
  // A field's own help, under its label (the public fiche).
  fieldHints: {
    proposed_split:
      "En pourcentage, par exemple 50 %. C'est indicatif et n'engage personne : la répartition officielle vous sera proposée à part, par un lien de confirmation.",
  } as Record<string, string>,
  fields: {
    legal_first_name: "Prénom (état civil)",
    legal_last_name: "Nom (état civil)",
    pseudonym: "Nom d'artiste",
    email: "E-mail",
    phone: "Téléphone",
    address: "Adresse postale",
    entity_type: "Vous intervenez en tant que",
    company_name: "Raison sociale",
    siret: "SIREN / SIRET",
    billing: "Informations de facturation",
    management_org: "Société de gestion",
    ipi_coad: "Numéro IPI / COAD",
    declared_pseudonym: "Pseudonyme déclaré",
    publisher: "Votre éditeur",
    contribution: "Votre contribution au morceau",
    // JUR-13: which share, in what unit, and that it binds nobody.
    proposed_split: "Votre part d'auteur ou de compositeur, à votre avis",
    credit_name: "Nom à créditer",
    performance: "Nature de l'interprétation",
    category: "Catégorie",
    label_management: "Label ou management",
    existing_contract: "Contrat existant (label, édition…)",
    structure: "Structure",
    master_ownership: "Propriété de l'enregistrement",
    financing: "Financement",
    deal_type: "Type d'accord",
    distributor: "Distributeur",
    neighbouring_rights_org: "Société de droits voisins",
    isrc_root: "Racine ISRC",
    function: "Votre fonction",
    agreed_fee: "Rémunération convenue",
    deliverable: "Ce que vous livrez",
    wished_credit: "Crédit souhaité",
    represented_creator: "Créateur représenté",
    publisher_org: "Société de gestion de l'éditeur",
    publisher_ipi: "IPI de l'éditeur",
    publisher_share: "Part d'édition",
    territory: "Territoire",
  } as Record<string, string>,
  options: {
    entity_type: { person: "Personne", company: "Société" },
    management_org: {
      sacem: "SACEM",
      other: "Une autre société",
      none: "Aucune",
    },
    category: {
      main: "Artiste principal",
      featuring: "Featuring",
      secondary: "Artiste secondaire",
      musician: "Musicien",
      backing: "Choriste",
    },
    deal_type: {
      coproduction: "Coproduction",
      license: "Licence",
      assignment: "Cession",
    },
  } as Record<string, Record<string, string>>,
  page: {
    title: "Fiches de renseignements",
    description:
      "Les personnes créditées remplissent leur fiche par un lien, sans compte. Préparez le lien, envoyez-le (par WhatsApp, e-mail…), puis suivez les retours.",
    empty: "Aucune personne créditée sur les titres du projet.",
    back: "Retour au suivi",
    columns: { person: "Personne", state: "État" },
    states: {
      none: "Pas encore préparée",
      link_generated: "Lien prêt",
      sent: "Envoyée, en attente",
      action_required: "Reçue, à vérifier",
      complete: "Complète",
      expired: "Lien expiré",
      revoked: "Lien révoqué",
    },
    prepare: "Préparer la fiche",
    preparing: "Préparation…",
    namesake:
      "Quelqu'un de ce nom est déjà dans le Réseau : reliez d'abord son crédit sur l'État des lieux.",
    linkFirst: "Relier sur l'État des lieux",
    // A featured artist without a contact linked to their artist page.
    notInNetwork: (name: string) =>
      `${name} est en featuring : ajoutez cette personne au Réseau, reliée à sa fiche artiste, avant de lui envoyer une fiche.`,
    newLink: "Nouveau lien",
    linkTitle: (name: string) => `Lien de la fiche de ${name}`,
    linkBody:
      "Copiez ce lien et envoyez-le à la personne. Il ne sera plus affiché : en cas de perte, créez-en un nouveau (l'ancien ne marchera plus). Il expire dans 30 jours.",
    copy: "Copier le lien",
    copied: "Lien copié",
    // A ready e-mail to the person (their Réseau address), sent by the user.
    email: "Envoyer par e-mail",
    emailSubject: (project: string) => `Fiche de renseignements · ${project}`,
    emailBody: (name: string, project: string, url: string) =>
      `Bonjour ${name},\n\nPour le projet « ${project} », pouvez-vous remplir votre fiche de renseignements ? Cela prend quelques minutes, sans compte :\n${url}\n\nMerci !`,
    markSent: "Marquer comme envoyée",
    // The e-mail PDS OS sends itself when it can (lib/email/contact-email.ts).
    emailed: {
      sent: (name: string) => `Fiche envoyée par e-mail à ${name}`,
      sentHere: "Fiche envoyée par e-mail",
      failed:
        "La fiche est prête, mais l'e-mail n'est pas parti : copiez le lien et envoyez-le vous-même.",
      subject: (project: string) =>
        `« ${project} » : votre fiche de renseignements`,
      body: "Pour ce projet, nous avons besoin de quelques informations vous concernant. Cela prend quelques minutes, sans compte.",
      open: "Remplir votre fiche :",
      complementSent: "Complément demandé, e-mail envoyé",
      complementFailed:
        "Le complément est demandé, mais l'e-mail n'est pas parti : prévenez la personne avec « Relancer ».",
      complementSubject: (project: string) =>
        `« ${project} » : il manque quelques informations à votre fiche`,
      complementBody: (note: string) =>
        `${note}\n\nVotre fiche est sur votre page, au même endroit qu'avant.`,
    },
    revoke: "Révoquer",
    // The private link kept visible (lot 9 J4, rule 19).
    revokeAccess: "Révoquer l'accès",
    revokeWhy: "Pourquoi vous révoquez l'accès",
    revokeWhyMissing: "Dites pourquoi vous révoquez l'accès.",
    revokeBody:
      "Le lien cesse de fonctionner tout de suite ; ce que la personne a déjà envoyé est conservé.",
    revoked: "Accès révoqué",
    // A fiche's pill (JUR-06, lib/legal/forms/state.ts).
    status: {
      toCreate: "À créer",
      toSend: "À envoyer",
      sent: "Envoyée",
      opened: "En attente · ouverte, pas renvoyée",
      complement: "En attente · complément demandé",
      incomplete: "À vérifier · incomplète",
      corrections: "À vérifier · corrections",
      toValidate: "Complète · à valider",
      validated: "Validée",
      expired: "Lien expiré",
      revoked: "Lien révoqué",
    },
    // JUR-06: received is not complete; validated, or asked again.
    validated: "Fiche validée",
    incomplete:
      "La fiche n'est pas complète : redemandez ce qui manque avant de la valider.",
    complementAsked: "Complément demandé",
    validate: "Valider la fiche",
    validateCorrections: "Accepter les corrections et valider",
    keepOld: "Garder les anciennes valeurs et valider",
    receivedIncomplete: (fields: string) =>
      `Reçue, pas complète. Il manque à la fiche : ${fields}. Elle ne se valide qu'une fois complète.`,
    askMessage: "Message à la personne",
    askMessageDefault: (first: string, fields: string) =>
      `Bonjour ${first}, il manque à votre fiche : ${fields}. Complétez-la depuis votre lien privé, le même qu'avant.`,
    askHint:
      "Sur son lien privé, la personne ne verra que ce qui manque. Prévenez-la ensuite : « Relancer » prépare l'e-mail avec ce message.",
    // When PDS OS e-mails the message itself.
    askHintEmailed:
      "Sur son lien privé, la personne ne verra que ce qui manque. PDS OS lui envoie ce message par e-mail.",
    ask: "Redemander ce qui manque",
    complementWaiting: (at: string, fields: string) =>
      `Complément demandé le ${at} : ${fields}.`,
    revokedWhy: (reason: string) => `Accès révoqué : « ${reason} »`,
    remind: "Relancer",
    // The private link's card (Figma PDS OS, node 229:2257).
    linkOf: (name: string) => `Lien privé de ${name}`,
    linkState: {
      opened: "Ouvert",
      sent: "Envoyé",
      unsent: "Pas encore envoyé",
    },
    linkMeta: (parts: string[]) => `Lien privé · ${parts.join(" · ")}`,
    validUntil: (day: string) => `valable jusqu'au ${day}`,
    createdOn: (at: string) => `créé le ${at}`,
    sentBy: (who: string | null, at: string) =>
      who ? `Envoyé par ${who} le ${at}` : `Envoyé le ${at}`,
    openedOn: (at: string) => `Ouvert le ${at}`,
    waitingFor: (name: string) =>
      `En attente de ${name} (lien privé) : remplir sa fiche de renseignements.`,
    noLink:
      "Le lien n'est plus affichable : créez-en un nouveau pour le lui renvoyer.",
    answers: "Voir les réponses",
    answersTitle: (name: string) => `Fiche de ${name}`,
    roles: "Rôles",
    person: "Personne (gardé dans le Réseau)",
    contribution: "Sur ce projet",
    corrections: "Corrections à vérifier",
    correction: (before: string, after: string) =>
      `« ${before} » → « ${after} »`,
    accept: "Accepter les corrections",
    refuse: "Garder les anciennes valeurs",
    since: (date: string) => `le ${date}`,
    // The link was opened, not yet answered (JUR-11).
    opened: (date: string) => `lien ouvert le ${date}`,
    failed: "L'action n'a pas pu être faite. Réessayez.",
  },
} as const;
