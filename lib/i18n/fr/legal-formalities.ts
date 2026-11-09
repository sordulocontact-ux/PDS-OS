// Formalités (ticket Juridique 06): the SACEM 725 bulletin of a title, from
// the data PDS OS already holds to the proof of its registration.
export const legalFormalities = {
  definitions: {
    SACEM_725_EDITED_WORK: "Bulletin SACEM 725 · œuvre éditée",
  } as Record<string, string>,
  // The dossier step by step, then its recap (JUR-21).
  recap: {
    stepsLabel: "Étapes du dossier",
    step: (n: number, label: string) => `${n}. ${label}`,
    title: "Récapitulatif",
    body: "Chaque champ du bulletin : confirmé, proposé d'après une source et à vérifier, ou manquant. Validez quand tout est juste.",
    previous: "Précédent",
    next: "Suivant",
    toRecap: "Voir le récapitulatif",
    states: {
      confirmed: "Confirmé",
      proposed: "À vérifier",
      toVerify: "À vérifier (SACEM)",
      missing: "À faire",
      empty: "Non renseigné",
    },
  },
  // What an action changed, said once it succeeded (JUR-28).
  transitions: {
    generated: "Bulletin généré : à faire signer par chaque signataire.",
    signed: (signer: string) => `Signature de ${signer} enregistrée.`,
    partial:
      "Déclaration partielle enregistrée : le bulletin peut être déposé.",
    submit:
      "Dépôt enregistré : en attente de la réponse de la SACEM, à saisir avec « Enregistrer le résultat ».",
    processing: "Marquée en traitement par la SACEM.",
    correction:
      "Correction demandée : les champs concernés sont rouverts dans le dossier.",
    complete:
      "Enregistrée par la SACEM : la déclaration est terminée et reste dans l'Historique du dossier.",
    reject: "Rejet enregistré : préparez une nouvelle déclaration.",
    restart:
      "Nouvelle déclaration : le dossier est rouvert, l'historique reste.",
  },
  statuses: {
    none: "Pas encore ouverte",
    collecting_data: "Données à compléter",
    ready_to_generate: "Prête à générer",
    document_ready: "Bulletin généré",
    signatures_pending: "Signatures en cours",
    ready_to_submit: "Prête à déposer",
    submitted: "Déposée",
    processing: "En traitement",
    completed: "Enregistrée",
    action_required: "Correction demandée",
    rejected: "Rejetée",
  } as Record<string, string>,
  genrePlaceholder: "Choisir un genre",
  // JUR-02: the bulletin in five numbered sections.
  sections: {
    work: "1. Œuvre",
    creators: "2. Créateurs",
    publishers: "3. Éditeurs",
    sharing: "4. Répartition",
    exploitation: "5. Exploitation",
  } as Record<string, string>,
  fields: {
    title: "Titre",
    subtitle: "Sous-titre",
    genre: "Genre",
    duration: "Durée",
    group_name: "Nom du groupe",
    iswc: "ISWC",
    performers: "Interprètes",
    first_exploitation: "Date de la première exploitation",
    first_exploitation_place: "Lieu ou diffuseur / exploitant",
    territories: "Territoires cédés",
    arrangement: "Arrangement",
    creators: "Participants",
    publishers: "Éditeur musical",
    phono_split: "Parts Phono entre catégories",
    dep_dr: "Partage des DEP et DR",
    publishing_contract: "Contrat d'édition",
  } as Record<string, string>,
  notes: {
    duration:
      "Seulement la durée du master final, jamais celle d'un brouillon.",
    first_exploitation:
      "Proposée depuis la date de sortie prévue : confirmez-la, ou corrigez-la si l'œuvre a été exploitée avant.",
    iswc: "Seulement s'il est déjà connu : jamais inventé.",
    territories: "« Monde », ou les territoires exacts de la cession.",
    dep_dr:
      "DEP : droits d'exécution publique (radio, télé, concerts, lieux publics). DR : droits de reproduction (disques, streaming). Ils suivent les parts Phono, ou se partagent à égalité dans chaque catégorie (auteurs, compositeurs, éditeurs), comme le prévoit le Règlement général de la SACEM. Un choix explicite, jamais déduit.",
    creators:
      "Chaque personne qui a écrit, composé ou interprété le titre, choisie dans le Réseau : son identité et son IPI viennent de sa fiche. Dites ses rôles ; les parts se répartissent ensuite par catégorie, en « 4. Répartition ». Cinq créateurs au plus sur le bulletin.",
    phonoFromSplit:
      "Parts reprises de la répartition confirmée de ce titre : vérifiez-les en « 4. Répartition » avant d'enregistrer.",
    // Decision of 10/10/2026: the splits of the title's page are not
    // confirmed by the rightholders, so their shares are never taken.
    noConfirmedSplit:
      "Aucune répartition de l'édition confirmée pour ce titre : les parts sont à saisir. Les splits de la fiche du titre ne sont pas repris tant que les ayants droit ne les ont pas confirmés.",
  } as Record<string, string>,
  sources: {
    toVerify: "À vérifier",
  },
  // A participant's roles (retour d'Ibé du 02/11/2026).
  roles: {
    legend: "Rôle dans l'œuvre",
    author: "Auteur · paroles",
    composer: "Compositeur · musique",
    arranger: "Arrangeur",
    adapter: "Adaptateur",
    performer: "Interprète uniquement",
    hint: "Auteur et compositeur à la fois : cochez les deux. Un interprète seul ne reçoit pas de part SACEM : ses droits passent par un autre circuit.",
    performerNote:
      "Interprète uniquement : pas sur le bulletin, pas de part SACEM, ne signe pas.",
    mainArtist: "Artiste principal",
    mainArtistHint:
      "Ajouté d'office comme artiste du titre, jamais comme auteur : confirmez ce qu'il a fait.",
    confirm: "Confirmer son rôle",
    confirmed: "Rôle confirmé",
  },
  qualities: {
    author: "Auteur",
    composer: "Compositeur",
    arranger: "Arrangeur",
    adapter: "Adaptateur",
  },
  // Rubrique D of the bulletin.
  depDrChoices: {
    follow_phono: "Comme les parts Phono",
    statutory: "Partage égal du Règlement général de la SACEM",
  },
  // JUR-23: what the rubrique D does to the DEP and DR, computed by the code.
  // « 4. Répartition »: each category shared on its own.
  categories: {
    intro:
      "Chaque catégorie se partage à part et doit faire 100 % : les auteurs se partagent la part Auteur, les compositeurs la part Compositeur, les éditeurs la part Éditeur. Une personne auteur et compositrice a une part dans chacune.",
    names: {
      author: "Auteur",
      composer: "Compositeur",
      publisher: "Éditeur",
    },
    hints: {
      author: "Les paroles : auteurs et adaptateurs.",
      composer: "La musique : compositeurs et arrangeurs.",
      publisher: "Les éditeurs musicaux de l'œuvre.",
    },
    empty: {
      author: "Personne n'a écrit les paroles (œuvre instrumentale ?).",
      composer: "Aucun compositeur pour l'instant.",
      publisher: "",
    },
    total: (total: string) => `Total : ${total} sur 100 %`,
    sole: "100 % : seul dans la catégorie",
    equal: "Parts égales",
    shareLabel: (name: string, role: string) => `Part de ${name} (${role})`,
    parts: "Parts Phono entre catégories",
    partsUsual: (parts: string, edited: boolean) =>
      `${parts} : la règle usuelle des droits sur les enregistrements, œuvre ${edited ? "éditée" : "non éditée"}.`,
    partsCustom: "Répartition contractuelle",
    partsEdit: "Suivre un contrat",
    partsReset: "Revenir à la règle usuelle",
    partsHint:
      "La reproduction mécanique peut suivre une répartition prévue au contrat : chaque catégorie présente a une part, le total fait 100 %.",
    phonoTitle: "Parts Phono du bulletin",
    phonoNote:
      "Calculées par PDS OS : la part de la catégorie multipliée par la part de chacun dedans. Le total fait toujours 100 %.",
  },
  sharing: {
    // JUR-02: computed by the code, checked by a person.
    toCheck: "Calculées par le code depuis les parts de l'œuvre : à vérifier",
    check: "J'ai vérifié les parts DEP et DR",
    explain:
      "DEP, droits d'exécution publique : quand l'œuvre est diffusée (radio, télé, lieux publics, streaming). DR, droits de reproduction mécanique : quand elle est copiée (disques, téléchargements, streaming). Ils ne se partagent pas comme les parts de l'œuvre : le code les calcule selon la règle de la SACEM.",
    title: "Aperçu des DEP et DR",
    intro:
      "Phono, DEP et DR sont trois partages différents : ils ne s'additionnent jamais. Les DEP et DR sont d'abord répartis entre catégories par la règle, puis au sein de chaque catégorie.",
    columns: {
      name: "Ayant droit",
      category: "Catégorie",
      phono: "Phono",
      dep: "DEP",
      dr: "DR",
    },
    publisher: "Éditeur",
    notComputed: "Non calculé",
    effectTitle: "Effet de la rubrique D",
    effectNone:
      "Cocher ou non la rubrique D ne change rien ici : chaque catégorie n'a qu'un ayant droit, ou des parts Phono égales.",
    effect: (name: string, kind: string, before: string, after: string) =>
      `${name} : ${kind} ${before} → ${after}`,
    effectIntro:
      "Avec l'autre choix, seules les parts au sein des catégories changeraient :",
    rule: (source: string) => `Règle : ${source}.`,
    confirm:
      "Résultat calculé par PDS OS, à confirmer par la personne responsable avant le dépôt. Il ne prouve pas la conformité des contrats.",
    alerts: {
      phono_total: (total: string) =>
        `Total Phono à ${total} : une catégorie n'est pas encore répartie à 100 %.`,
      empty_category: (category: string) =>
        `Aucun ${category} : sa part des DEP et DR reste sans ayant droit.`,
      not_covered: (name: string, quality: string) =>
        `${name} (${quality}) : la règle V1 ne calcule pas cette catégorie, à confirmer avec le référent juridique.`,
      unknown_rule: "La règle enregistrée avec ce dossier n'est plus connue.",
    },
    categories: {
      author: "auteur",
      composer: "compositeur",
      publisher: "éditeur",
    },
  },
  arrangementScopes: {
    all: "Autorisé pour toutes les exploitations",
    specific: "Autorisé pour certaines exploitations déterminées",
  },
  creator: {
    person: "Participant",
    lastName: "Nom",
    firstName: "Prénom",
    pseudonym: "Pseudonyme",
    ipi: "IPI / COAD",
    signs: "Signe le bulletin",
    add: "Ajouter un participant",
    remove: "Retirer",
  },
  publisher: {
    // Retour d'Ibé du 02/11/2026: never the label by default.
    explain:
      "Un éditeur musical édite et administre l'œuvre. Ce n'est pas d'office le label, le producteur du master, le studio ou le distributeur : ceux-là ont des droits sur l'enregistrement, pas sur l'œuvre.",
    none: "Aucun éditeur musical",
    noneChosen:
      "Aucun éditeur musical : les droits de l'œuvre reviennent aux auteurs et compositeurs.",
    change: "Changer",
    addFirst: "Ajouter un éditeur musical",
    labelWarning:
      "Cette structure est au Réseau comme label, producteur, studio ou distributeur, pas comme éditeur : vérifiez qu'elle édite bien l'œuvre, ou ajoutez-lui le rôle Éditeur dans le Réseau.",
    person: "Éditeur",
    inSplit: "Éditeur de la répartition",
    name: "Dénomination",
    nameHint:
      "Le nom de la société d'édition, tel qu'il est inscrit à la SACEM.",
    ipi: "IPI / COAD",
    add: "Ajouter un éditeur",
    // JUR-22 / JUR-25: whom it publishes, under which contract.
    represents: "Éditeur de",
    noCreator: "Ajoutez d'abord les créateurs du bulletin.",
    creatorAt: (position: number) => `Créateur ${position}`,
    contract: "Contrat d'édition qui fonde ce lien",
    contractHint:
      "Un contrat d'édition ou de coédition du projet. Sans contrat, il est à obtenir : la rubrique G donne alors sa date.",
    toObtain: "À obtenir",
  },
  contract: {
    provided: "La copie du contrat d'édition est jointe",
    providedYes:
      "Copie jointe : chaque éditeur a son contrat d'édition rattaché.",
    providedNo:
      "Pas de copie jointe : rattachez le contrat de chaque éditeur, ou donnez la date de la rubrique G.",
    rubricG: "Date du contrat de cession et d'édition (rubrique G)",
    rubricGHint:
      "Le contrat conclu conjointement entre les créateurs et les éditeurs du bulletin.",
  },
  missing: {
    title: "Le titre",
    duration: "La durée du master final",
    creators: "Au moins un créateur",
    creators_max: "Cinq créateurs au plus sur le bulletin",
    publishers_max: "Trois éditeurs au plus",
    creator_name: (i: string) => `Le nom du créateur ${i}`,
    creator_role: (i: string) => `Le rôle du participant ${i}`,
    main_artist_role: (i: string) =>
      `La confirmation du rôle de l'artiste principal (participant ${i})`,
    creator_share: (i: string) => `Les parts du participant ${i}`,
    author_total: "Une part Auteur répartie à 100 %",
    composer_total: "Une part Compositeur répartie à 100 %",
    publisher_total: "Une part Éditeur répartie à 100 %",
    publishers_choice: "Un éditeur musical, ou « Aucun éditeur musical »",
    publisher_label: (i: string) =>
      `L'éditeur ${i} : un label ou un producteur n'est pas un éditeur musical`,
    phono_split: "Des parts Phono entre catégories qui font 100 %",
    genre: "Le genre de l'œuvre",
    creator_first: (i: string) => `Le prénom ou le pseudonyme du créateur ${i}`,
    publisher_name: (i: string) => `La dénomination de l'éditeur ${i}`,
    publisher_link: (i: string) => `Les créateurs que publie l'éditeur ${i}`,
    dep_dr: "Le partage des DEP et DR",
    dep_dr_check: "La vérification des parts DEP et DR",
    first_exploitation: "La date de la première exploitation",
    arrangement: "La portée de l'autorisation d'arrangement",
    publishing_contract: "Le contrat d'édition (seuls les éditeurs signent)",
    rubric_g: "La date du contrat d'édition (copie non jointe, rubrique G)",
    borrowing: (work: string) => `L'autorisation d'utilisation de « ${work} »`,
    to_verify: (field: string) => `À vérifier : ${field}`,
  },
  // Said under the field that misses, once « Valider le dossier » is tried.
  fieldErrors: {
    title: "Obligatoire sur le bulletin.",
    duration:
      "Obligatoire : la durée du master final, qui n'est pas encore reçu.",
    creators: "Le bulletin nomme au moins un auteur ou un compositeur.",
    creator_name: "Le nom civil est obligatoire pour la SACEM.",
    genre:
      "Obligatoire pour la SACEM : aucune source ne le donne, vous le choisissez.",
    first_exploitation:
      "Obligatoire : la date de la première exploitation, proposée depuis la date de sortie, à confirmer.",
    dep_dr_check:
      "Vérifiez les parts DEP et DR calculées par le code, puis cochez la case.",
    creator_first:
      "Donnez le prénom, ou le pseudonyme sous lequel la personne est déclarée.",
    publisher_name:
      "La dénomination de la société d'édition, telle qu'elle est déclarée à la SACEM.",
    publisher_link:
      "Cochez le ou les créateurs dont cet éditeur publie la part (coédition : plusieurs éditeurs pour un créateur).",
    creator_role:
      "Dites ce qu'il a fait : auteur, compositeur, arrangeur, adaptateur, ou interprète uniquement.",
    main_artist_role:
      "Confirmez le rôle de l'artiste principal : il n'est pas auteur d'office.",
    category_total:
      "Les parts de cette catégorie doivent faire exactement 100 %.",
    publishers_choice:
      "Ajoutez l'éditeur musical, ou dites qu'il n'y en a pas.",
    publisher_label:
      "Un label ou un producteur n'est pas un éditeur musical : choisissez l'éditeur de l'œuvre, ou ajoutez-lui le rôle Éditeur dans le Réseau.",
    phono_split:
      "Donnez une part à chaque catégorie présente, aucune aux autres, pour un total de 100 %.",
    dep_dr:
      "Dites si le partage des DEP et DR suit les parts Phono : jamais déduit de la répartition.",
    arrangement:
      "Un arrangeur est crédité : dites pour quelles exploitations l'arrangement est autorisé.",
    publishing_contract:
      "Seuls les éditeurs signent : la copie du contrat d'édition est obligatoire.",
    rubric_g:
      "Sans copie du contrat d'édition, donnez la date du contrat (rubrique G).",
    to_verify: "Valeur rouverte par la SACEM : vérifiez-la.",
  },
  page: {
    title: "SACEM",
    description:
      "Le bulletin SACEM 725 (œuvre éditée) de chaque titre : PDS OS remplit ce qu'il sait avec sa source, vous complétez et validez, puis signatures, dépôt et preuve. Déposé n'est pas enregistré.",
    empty: "Aucun titre dans ce projet.",
    open: "Ouvrir la formalité",
    validate: "Valider le dossier",
    validating: "Validation…",
    invalid: (n: number) =>
      n === 1
        ? "Dossier enregistré, mais une information manque : elle est en rouge."
        : `Dossier enregistré, mais ${n} informations manquent : elles sont en rouge.`,
    missingCount: (n: number) =>
      n === 1
        ? "Une information manque : elle est en rouge."
        : `${n} informations manquent : elles sont en rouge.`,
    openClearances: "Ouvrir l'autorisation",
    update: "Enregistrer les modifications",
    borrowings: "Œuvre préexistante",
    noBorrowing: "Aucune",
    generate: "Générer le bulletin",
    version: (n: number) => `Version ${n}`,
    export: "Exporter en PDF",
    signatures: "Signatures",
    // Before the bulletin exists: who will sign it (UX test of 09/10/2026).
    willSign: "Qui signera le bulletin",
    willSignHint:
      "Les auteurs et compositeurs cochés « Signe le bulletin » et les éditeurs, d'après le dossier enregistré : leur signature confirme la répartition avant le dépôt.",
    publisherRole: "Éditeur",
    // Who signs, and what the proof is (JUR-26).
    sign: (signer: string) => `Enregistrer la signature de ${signer}`,
    signProof: (signer: string) => `Comment ${signer} a signé`,
    signProofHint:
      "Par exemple « PDF signé reçu par e-mail le 11/10 » ou « signé en studio ». C'est la preuve gardée avec la signature.",
    signProofMissing: "Dites comment la personne a signé : c'est la preuve.",
    signedCount: (signed: number, total: number) =>
      `${signed} signée${signed > 1 ? "s" : ""} sur ${total}`,
    signed: (date: string) => `Signé le ${date}`,
    partial: "Déclaration partielle",
    partialReason: "Pourquoi certaines signatures manquent",
    partialDone: (reason: string) => `Déclaration partielle : ${reason}`,
    submit: "Enregistrer le dépôt",
    submitBody:
      "Déposez la version signée sur l'espace SACEM, puis gardez ici l'accusé de dépôt. Déposé ne veut pas dire enregistré : la SACEM répondra.",
    submitFile: "Accusé de dépôt (PDF)",
    submitProof: "Note (facultatif : date, référence)",
    proofHint: "Un PDF de 20 Mo au plus.",
    proofChosen: (name: string) => `Fichier choisi : ${name}`,
    proofMissing: "Joignez le PDF : c'est la preuve.",
    viewDeposit: "Voir l'accusé de dépôt",
    viewRegistration: "Voir la preuve de l'enregistrement",
    // JUR-03: the SACEM's answer, one of three, each with its proof.
    answer: "Enregistrer la réponse de la SACEM",
    answerBody:
      "Pas d'« enregistrée » sans la preuve de la SACEM : c'est elle qui fait foi.",
    outcome: "Réponse",
    outcomes: {
      registered: "Enregistrée",
      fix: "À corriger",
      rejected: "Rejetée",
    },
    completeFile:
      "Preuve de l'enregistrement (e-mail ou relevé de la SACEM, en PDF)",
    externalIdMissing: "L'identifiant SACEM de l'œuvre est obligatoire.",
    rejectReason: "Motif du rejet",
    rejected: (date: string, reason: string) =>
      `Rejetée par la SACEM le ${date} : « ${reason} »`,
    restart: "Préparer une nouvelle déclaration",
    editWarning: (n: number) =>
      n > 0
        ? `Modifier le bulletin : les ${n} signature${n > 1 ? "s" : ""} déjà recueillie${n > 1 ? "s" : ""} ne vaudront plus, une nouvelle version sera générée et chacun la signera à nouveau.`
        : "Modifier le bulletin : une nouvelle version sera générée, et chacun la signera.",
    processing: "Marquer en traitement",
    correction: "Correction demandée",
    correctionFields: "Champs à corriger",
    correctionNote: "Ce que demande la SACEM",
    reopened: (fields: string) => `Rouverts par la correction : ${fields}`,
    complete: "Enregistrer le résultat",
    completeProof: "Preuve de l'enregistrement",
    externalId: "Identifiant SACEM de l'œuvre",
    iswc: "ISWC reçu",
    completed: (date: string) => `Enregistrée le ${date}`,
    history: "Historique",
    confirm: "Enregistrer",
    cancel: "Annuler",
    submittedNote: (date: string) => `Déposée le ${date}`,
  },
  events: {
    "formality.values_validated": "Dossier validé",
    "formality.ready": "Prête à générer",
    "document.generated": "Bulletin généré",
    "signature.completed": "Signature reçue",
    "signatures.superseded":
      "Signatures annulées : le bulletin a changé, à signer sur la nouvelle version",
    "formality.partial": "Déclaration partielle",
    "formality.submitted": "Dépôt enregistré",
    "formality.processing": "En traitement",
    "formality.action_required": "Correction demandée",
    "formality.completed": "Enregistrement confirmé",
    "formality.rejected": "Rejetée par la SACEM",
    "formality.restarted": "Nouvelle déclaration préparée",
    "contract.signed": "Contrat d'édition signé",
  } as Record<string, string>,
  errors: {
    missing: (items: string) => `Il manque : ${items}.`,
    proof: "Joignez la preuve.",
    proofFile: "Joignez la preuve en PDF.",
    externalId: "L'identifiant SACEM de l'œuvre est obligatoire.",
    reason: "Dites pourquoi.",
    notReady: "Le dossier n'est pas prêt pour cette étape.",
    iswc: "L'ISWC s'écrit T suivi de 10 chiffres.",
    closed: "Cette formalité est close.",
    failed: "L'action n'a pas pu être faite. Réessayez.",
    pdf: "Le PDF n'a pas pu être préparé. Réessayez.",
  },
} as const;
