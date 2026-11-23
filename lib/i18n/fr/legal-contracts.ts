// Contrats générés depuis des modèles (ticket Juridique 03): the template
// library, the mapping of a project's agreements, the filled copy.
export const legalContracts = {
  fields: {
    "personne.nom_civil": "Nom civil",
    "personne.nom_artiste": "Nom d'artiste",
    "personne.email": "E-mail",
    "personne.telephone": "Téléphone",
    "personne.adresse": "Adresse postale",
    "personne.statut": "Personne ou société",
    "personne.societe": "Raison sociale",
    "personne.siret": "SIREN / SIRET",
    "personne.ipi": "Numéro IPI / COAD",
    "personne.roles": "Rôles crédités",
    "projet.titre": "Titre du projet",
    "projet.artiste": "Artiste du projet",
    "projet.titres": "Titres concernés",
    remuneration: "Rémunération",
    "organisation.nom": "Nom de la structure",
    // The terms of a deal (its validated deal memo).
    "deal.songwriting_split": "Splits auteur-compositeur",
    "deal.master_split": "Part du master",
    "deal.royalties": "Royalties",
    "deal.advance": "Avance ou cachet",
    "deal.credits": "Crédits",
    "deal.territories": "Territoires",
    "deal.duration": "Durée",
    "deal.exclusivity": "Exclusivité",
    "deal.promo": "Promo",
    "deal.deal_nature": "Nature de l'accord",
    "deal.scope": "Périmètre",
    "deal.minimum_guarantee": "Minimum garanti",
    "deal.options": "Options",
    "deal.commitments": "Engagements",
    "deal.conditions": "Conditions et résiliation",
    "deal.campaign": "Campagne",
    "deal.deliverables": "Livrables",
    "deal.schedule": "Calendrier et validation",
    "deal.fee": "Fee",
    "deal.usage_rights": "Droits d'usage",
    "deal.paid_media": "Paid media et whitelisting",
    "deal.obligations": "Annulation et reporting",
  } as Record<string, string>,
  sources: {
    fiche: "Fiche de renseignements",
    network: "Réseau",
    project: "Projet",
    credits: "Crédits des titres",
    mapping: "Contrats à prévoir",
    organization: "Structure",
    deal: "Deal memo validé",
  } as Record<string, string>,
  // JUR-16: a value that does not apply to the person, as the contract says it.
  notApplicable: "Sans objet",
  // The language of a template, and of the contracts made from it (Ibé,
  // 18/11/2026).
  languages: { fr: "Français", en: "Anglais" },
  // What the code writes itself in an English contract (never a clause):
  // a value that does not apply, the person's status, the credited roles.
  inEnglish: {
    notApplicable: "N/A",
    entityType: { person: "Individual", company: "Company" } as Record<
      string,
      string
    >,
    roles: {
      composer: "Composer",
      lyricist: "Lyricist",
      arranger: "Arranger",
      producer: "Producer",
      co_producer: "Co-producer",
      recording_engineer: "Recording engineer",
      mix_engineer: "Mixing engineer",
      mastering_engineer: "Mastering engineer",
      musician: "Musician",
      other: "Other",
    } as Record<string, string>,
  },
  checklist: {
    status: {
      filled: "Rempli",
      unconfirmed: "À vérifier",
      not_applicable: "Sans objet",
      waiting: "En attente de la fiche",
      invalid: "Invalide",
      missing: "Manquant",
    },
    statusHint: {
      unconfirmed:
        "Repris du Réseau : la fiche de la personne ne l'a pas confirmé. Ne bloque pas.",
      not_applicable: "Ne s'applique pas à cette personne d'après sa fiche.",
      waiting: "Sa fiche est envoyée : la valeur arrivera avec sa réponse.",
      invalid: "Le format ne convient pas : à corriger à sa source.",
    } as Record<string, string>,
    required: "Obligatoire",
    optional: "Facultatif ici",
    provider: {
      person: (name: string) => `Fournie par ${name}, dans sa fiche`,
      owner: "Fournie par le chef de projet",
      direction: "Fournie par la direction",
    },
    fix: "Compléter",
    // The gesture beside a value to fix (lib/legal/contracts/fix.ts).
    fixAt: {
      fiche: "Voir sa fiche",
      network: "Compléter dans le Réseau",
      credits: "Compléter dans l'État des lieux",
    },
    feeSaved: "Rémunération enregistrée",
  },
  // Where a missing value is filled.
  fillIn: {
    fiche: "à demander dans la fiche de renseignements",
    network: "à compléter dans le Réseau",
    project: "à compléter dans le projet",
    credits: "à compléter dans les crédits des titres",
    mapping: "à saisir dans les contrats à prévoir",
    organization: "à compléter dans l'administration",
  } as Record<string, string>,
  templates: {
    title: "Modèles de contrat",
    description:
      "Les modèles validés servent à générer les contrats. Un modèle validé ne change jamais : une correction est une nouvelle version, à valider à son tour.",
    back: "Tous les contrats",
    open: "Modèles",
    create: "Nouveau modèle",
    newVersion: "Nouvelle version",
    view: "Voir le modèle",
    validate: "Valider",
    retire: "Retirer",
    // The Modèles tab of the Contrats page: search and filters.
    search: {
      label: "Rechercher un modèle",
      placeholder: "Nom, usage…",
      noResult: (q: string) => `Aucun modèle ne correspond à « ${q} ».`,
    },
    filters: {
      stateLabel: "État",
      stateAll: "Tous les états",
      typeLabel: "Type",
      typeAll: "Tous les types",
    },
    filtersEmpty: "Aucun modèle ne correspond à ces filtres.",
    empty: "Aucun modèle pour l'instant.",
    emptyBody:
      "Collez le texte d'un modèle déjà relu par votre juriste. PO n'écrit ni modèle ni clause.",
    columns: {
      name: "Modèle",
      type: "Type",
      roles: "Pour",
      status: "État",
    },
    states: { draft: "À valider", validated: "Validé", retired: "Retiré" },
    // Who decides on a draft (JUR-19), said to whoever cannot.
    // A draft refused by the director, with its reason (JUR-19).
    refuse: "Refuser",
    refuseTitle: "Refuser ce modèle ?",
    refuseBody:
      "Il ne sera proposé pour aucun contrat. La raison reste visible avec cette version ; une correction se fait par une nouvelle version.",
    refuseReason: "Pourquoi le refuser",
    refused: "Modèle refusé.",
    retireReason: "Pourquoi le retirer",
    retired: "Modèle retiré.",
    retiredBecause: (reason: string) => `Retiré ou refusé : ${reason}`,
    whoValidates:
      "À valider par le business manager : tant qu'il n'est pas validé, ce modèle n'est proposé pour aucun contrat.",
    backToLibrary: "Tous les modèles",
    validateTitle: "Valider ce modèle ?",
    validateBody:
      "Une fois validé, il pourra être proposé pour générer des contrats. Il ne se modifie plus : une correction se fait par une nouvelle version.",
    validating: "Validation…",
    version: (n: number) => `v${n}`,
    form: {
      title: "Nouveau modèle",
      versionTitle: (name: string) => `Nouvelle version de « ${name} »`,
      name: "Nom",
      type: "Type de contrat",
      roles: "Rôles concernés",
      language: "Langue du contrat",
      usage: "Usage",
      body: "Texte du modèle",
      submit: "Enregistrer le modèle",
      submitting: "Enregistrement…",
      proposed:
        "Nom, type, rôles et usage proposés par PO d'après le contrat : corrigez-les si besoin.",
      unknown: (ids: string) => `Champs inconnus : ${ids}.`,
      invalid: "Vérifiez le nom, le type, les rôles et le texte.",
    },
    editor: {
      label: "Texte du modèle",
      insert: "Insérer une valeur",
      insertHint:
        "Placez le curseur dans le texte, puis cliquez sur la valeur à insérer. Elle sera remplie pour chaque contrat.",
      // The marks the contract prints (document-pdf.ts, Sacha 22/11/2026).
      marksHint:
        "**texte** en gras (⌘B), __texte__ souligné (⌘U) ; un texte collé depuis Word garde son gras et son souligné.",
      groups: {
        person: "La personne",
        project: "Le projet",
        agreement: "L'accord",
        deal: "Les termes du deal",
      },
      placeholder:
        "Collez ici le texte du contrat, déjà relu par votre juriste.",
    },
    source: {
      title: "Fichier source",
      description:
        "Word, PDF ou texte, 10 Mo au plus. PO lit le contrat et repère ses valeurs ; le fichier est gardé avec le modèle.",
      import: "Importer un fichier",
      replace: "Remplacer",
      remove: "Retirer",
      reading: "Lecture du fichier…",
      current: (name: string) => `Fichier source : ${name}`,
      drop: "Déposez le fichier ici",
      imported: (name: string) => `Contrat importé de « ${name} »`,
      folded:
        "Le texte du contrat est repris tel quel, chaque valeur repérée remplacée par sa pastille.",
      showText: "Afficher le texte",
      undo: "Annuler",
      pdfNote: "Lu dans un PDF : la mise en page n'est pas gardée.",
      open: "Télécharger le fichier source",
      unsupported:
        "Format non lu : importez un fichier Word (.docx), PDF ou texte. Un ancien .doc s'enregistre en .docx depuis Word.",
      tooLarge: "Fichier trop lourd : 10 Mo au plus.",
      tooLong: "Texte trop long pour un modèle (200 000 caractères au plus).",
      unreadable: "Aucun texte n'a pu être lu dans ce fichier.",
      failed: "Le fichier n'a pas pu être importé. Réessayez.",
    },
    values: {
      title: "Vous partez d'un contrat déjà rempli ?",
      description:
        "Collez-le tel quel. PO repère les noms, l'adresse, les titres et la somme, le code les e-mails, téléphones et numéros : vous choisissez ce qui devient une valeur à remplir.",
      fromFile: (name: string) => `Ce que PO a repéré dans « ${name} »`,
      fromFileDescription:
        "Déjà remplacé dans le modèle. Changez le champ si PO s'est trompé, ou « Annuler » pour garder le texte d'origine.",
      find: "Repérer les valeurs",
      finding: "PO lit le contrat…",
      findAgain: "Repérer à nouveau",
      empty: "Collez d'abord le texte du contrat.",
      none: "Aucune valeur repérée : insérez-les avec les boutons au-dessus du texte.",
      partial:
        "PO n'a pas pu lire le contrat : seuls les e-mails, téléphones et numéros sont proposés.",
      times: (n: number) => (n === 1 ? "1 fois" : `${n} fois`),
      gone: "Plus dans le texte",
      fieldLabel: (excerpt: string) => `Valeur pour « ${excerpt} »`,
      replace: "Remplacer",
      ignore: "Ignorer",
      undo: "Annuler",
      replaced: (n: number) =>
        n === 1 ? "Remplacé 1 fois" : `Remplacé ${n} fois`,
      replaceAll: (n: number) => `Tout remplacer (${n})`,
      failed: "La lecture du contrat a échoué. Réessayez.",
    },
    versions: "Versions",
    validatedBy: (name: string, date: string) =>
      `Validé par ${name} le ${date}`,
    // The template as a document (Ibé, 18/11/2026: « recevoir le modèle en
    // PDF, pas un truc avec les écritures »): its values as blanks to fill,
    // « Modifier » opening the source document, where it is changed.
    document: {
      name: (name: string, version: string) => `${name} · ${version}`,
      pdf: "Voir le PDF",
      edit: "Modifier",
      editLabel: (name: string) => `Modifier le document source : ${name}`,
      frameTitle: (name: string) => `Aperçu du modèle « ${name} »`,
    },
    confirmRetireTitle: "Retirer ce modèle ?",
    confirmRetireBody:
      "Il ne sera plus proposé. Les contrats déjà générés depuis lui ne changent pas.",
    cancel: "Annuler",
    close: "Fermer",
    failed: "L'action n'a pas pu être faite. Réessayez.",
    forbidden: "Seuls le business manager et la direction valident un modèle.",
  },
  agreements: {
    title: "Contrats",
    description:
      "Chaque personne créditée, l'accord qu'il lui faut et le modèle proposé. Confirmez les contrats nécessaires : chaque contrat est ensuite préparé automatiquement dès que ses informations sont là, puis relu et validé avant l'envoi.",
    back: "Retour au suivi",
    templates: "Modèles de contrat",
    noTemplate:
      "Aucun modèle validé : ajoutez-en un dans la bibliothèque des modèles.",
    empty: "Aucune personne créditée sur les titres du projet.",
    mappingTitle: "Contrats des intervenants",
    mappingDescription:
      "Proposés d'après les rôles et les modèles validés. Corrigez si besoin, puis confirmez en une fois quels contrats sont nécessaires : ce n'est ni valider leur contenu, ni les générer. Étape suivante : chaque contrat se prépare seul dès que ses informations sont là.",
    mappingApproved: (name: string, date: string) =>
      `Contrats nécessaires confirmés par ${name} le ${date}.`,
    editMapping: "Modifier les contrats à prévoir",
    // JUR-09: the need is confirmed, not the content nor the generation.
    approveMapping: "Confirmer les contrats nécessaires",
    approving: "Confirmation…",
    cancelEdit: "Annuler",
    columns: {
      person: "Personne",
      agreement: "Accord",
      template: "Modèle",
      fee: "Rémunération",
      state: "État",
    },
    needed: "Accord nécessaire",
    noAgreement: "Pas d'accord",
    noCompatible: "Aucun modèle validé pour ces rôles",
    feeLabel: (name: string) => `Rémunération de ${name}`,
    feeFromFiche: "d'après la fiche",
    existing: (title: string) => `Contrat existant : ${title}`,
    noContact: "Fiche à préparer d'abord",
    // The proto's « Contrats à prévoir », before the launch (lot 9 J3).
    plan: {
      editOf: (name: string) => `Modifier le contrat de ${name}`,
      close: "Fermer",
      contract: "Contrat",
      choose: "Choisir un contrat",
      noDeal: "Pas d'accord nécessaire",
      noDealWhy: "Pourquoi aucun accord n'est nécessaire",
      // « Déjà payé » ne suffit pas (JUR-12).
      noDealHint:
        "Dites quel accord couvre déjà ses droits, ou pourquoi sa contribution n'en ouvre pas. « Déjà payé » ne suffit pas : un paiement ne cède aucun droit.",
      onlyPaid:
        "« Déjà payé » ne suffit pas : un paiement ne cède aucun droit. Dites quel accord couvre ses droits, ou pourquoi sa contribution n'en ouvre pas.",
      noDealReason: (reason: string) =>
        `Pas d'accord nécessaire · justification : « ${reason} »`,
      noValidated: "Aucun modèle validé pour ce rôle",
      proposedFrom: (role: string) =>
        `Proposé d'après son rôle (${role}) · bibliothèque, validé par la direction`,
      noTemplateSource:
        "Aucun modèle de la bibliothèque ne correspond à son rôle : sans modèle validé, pas de contrat",
      newTemplate: "Nouveau modèle de contrat",
      newTemplateBody:
        "Il entre dans la bibliothèque une fois validé par la direction, et sera proposé pour ces rôles sur tous les projets.",
      choiceMissing: (name: string) =>
        `Choisissez un contrat pour ${name}, créez un modèle, ou « Pas d'accord nécessaire ».`,
      remaining: "Il reste des contrats à régler avant de confirmer.",
      launchFirst: "Confirmez d'abord les contrats à prévoir.",
      done: "Contrats nécessaires confirmés",
    },
    // Where each person's agreement stands (JUR-12, proto Juridique v3).
    states: {
      unmapped: "Contrat nécessaire",
      not_needed: "Non nécessaire · justifié",
      needs_info: "Contrat nécessaire",
      ready_to_generate: "En préparation",
      draft: "En préparation",
      review_required: "En préparation · chez la direction",
      ready_for_signature: "Validé · à envoyer",
      signature_pending: "En signature",
      signed: "Signé",
      ended: "Terminé",
    },
    // Before the mapping is confirmed, a person's pill (JUR-12).
    choiceStates: {
      needed: "Contrat nécessaire",
      notNeeded: "Non nécessaire",
      missingTemplate: "Modèle manquant",
      pendingTemplate: "Modèle en validation",
      existing: "Contrat existant",
    },
    // Ibé, 18/11/2026, § 3.5: no contract before the accord of a guest
    // artist. The titles concerned follow, when they are said.
    awaiting: "En attente de l'accord",
    awaitingOf: (names: string) => `En attente de l'accord · ${names}`,
    generate: "Générer le contrat",
    generating: "Génération…",
    open: "Ouvrir le contrat",
    fieldsTitle: (name: string) => `Contrat de ${name}`,
    fieldsDescription: (template: string) =>
      `Modèle « ${template} ». Chaque valeur vient d'une source ; une valeur manquante se complète à sa source.`,
    filled: "Rempli automatiquement",
    missing: "Manquant",
    missingCount: (n: number) =>
      n === 1 ? "1 information manquante" : `${n} informations manquantes`,
    waitingInvoice: (amount: string) => `${amount} en attente de facture`,
    errors: {
      missing:
        "Des informations manquent encore : complétez-les à leur source.",
      template: "Le modèle n'est plus validé : choisissez-en un autre.",
      incompatible: "Ce modèle n'est pas prévu pour ces rôles.",
      already: "Ce contrat a déjà été généré.",
      notValidated: (titles: string | null) =>
        titles
          ? `En attente de l'accord · ${titles}`
          : "En attente de l'accord",
      fee: "Vérifiez les rémunérations (un montant en euros).",
      reason: "Dites pourquoi aucun accord n'est nécessaire.",
      failed: "L'action n'a pas pu être faite. Réessayez.",
    },
  },
  document: {
    title: "Document",
    description: (template: string, version: number) =>
      `Généré depuis le modèle « ${template} » v${version}. Le modèle n'est pas modifié.`,
    fields: "Valeurs injectées",
    text: "Texte",
    version: (n: number) => `Version ${n}`,
    versions: "Versions et journal",
    revise: "Modifier une clause",
    reviseTitle: "Modifier une clause",
    reviseBody:
      "Chaque modification crée une nouvelle version, gardée avec sa raison. Un contrat approuvé repasse en brouillon et doit être validé à nouveau ; une signature de PDS sur l'ancienne version est annulée.",
    reviseText: "Texte du contrat",
    reviseComment: "Raison de la modification",
    reviseSubmit: "Enregistrer la version",
    unchanged: "Le texte n'a pas changé.",
    export: "Exporter en PDF",
    financialNeed: "Besoin financier",
    signatureNote:
      "La signature se fait hors de PDS OS : envoyez le document exporté, puis déposez ici le contrat signé et sa preuve.",
    proofMissing:
      "Avant de marquer le contrat signé, ajoutez dans ses fichiers le contrat signé et la preuve de signature.",
    sendLabel: "Comment l'avez-vous envoyé ?",
    sendHint: "Canal, destinataire, date : c'est la preuve d'envoi.",
  },
} as const;
