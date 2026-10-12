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
      proposed: "Proposé, à vérifier",
      toVerify: "À vérifier (SACEM)",
      missing: "Manquant",
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
      "Résultat enregistré : la déclaration est terminée et reste dans l'Historique du dossier.",
  },
  // The declaration's frise, from the dossier to the registration (JUR-26).
  timeline: {
    label: "Avancement de la déclaration",
    done: "fait",
    dossier: "Dossier complet",
    correction: "Correction demandée par la SACEM",
    generated: "Bulletin généré",
    signed: (signed: number, total: number) =>
      signed === total
        ? `Signé par les ${total} signataires`
        : `Signatures : ${signed} sur ${total}`,
    partial: (signed: number, total: number) =>
      `Déclaration partielle : ${signed} signature${signed > 1 ? "s" : ""} sur ${total}`,
    signedNone: "Signatures",
    submitted: "Déposé à la SACEM",
    completed: "Enregistré par la SACEM",
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
  } as Record<string, string>,
  sections: {
    work: "L'œuvre",
    exploitation: "Exploitation",
    people: "Créateurs et éditeurs",
    agreements: "Contrats et emprunts",
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
    creators: "Créateurs (1 à 5)",
    publishers: "Éditeurs (1 à 3)",
    dep_dr: "Partage des DEP et DR",
    publishing_contract: "Contrat d'édition",
  } as Record<string, string>,
  notes: {
    duration:
      "Seulement la durée du master final, jamais celle d'un brouillon.",
    first_exploitation:
      "Ce qui a réellement eu lieu, pas la date de sortie prévue. Jamais déduite.",
    iswc: "Seulement s'il est déjà connu : jamais inventé.",
    territories: "« Monde », ou les territoires exacts de la cession.",
    dep_dr:
      "DEP : droits d'exécution publique (radio, télé, concerts, lieux publics). DR : droits de reproduction (disques, streaming). Ils suivent les parts Phono, ou se partagent à égalité dans chaque catégorie (auteurs, compositeurs, éditeurs), comme le prévoit le Règlement général de la SACEM. Un choix explicite, jamais déduit.",
    creators:
      "Choisissez chaque personne dans le Réseau : son identité et son IPI viennent de sa fiche. Le total des parts Phono (créateurs et éditeurs) doit faire 100 %.",
    phonoFromSplit:
      "Parts Phono reprises de la répartition confirmée de ce titre : vérifiez-les avant d'enregistrer.",
    // Decision of 10/10/2026: the splits of the title's page are not
    // confirmed by the rightholders, so their shares are never taken.
    noConfirmedSplit:
      "Aucune répartition de l'édition confirmée pour ce titre : les parts Phono sont à saisir. Les splits de la fiche du titre ne sont pas repris tant que les ayants droit ne les ont pas confirmés.",
  } as Record<string, string>,
  sources: {
    toVerify: "À vérifier",
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
  sharing: {
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
        `Total Phono à ${total} : il doit faire exactement 100 %, créateurs et éditeurs réunis.`,
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
    totals: (creators: string, publishers: string) =>
      `Créateurs : ${creators} · Éditeurs : ${publishers}`,
    person: "Créateur",
    lastName: "Nom",
    firstName: "Prénom",
    pseudonym: "Pseudonyme",
    ipi: "IPI / COAD",
    quality: "Qualité",
    qualityHint:
      "Son rôle dans l'œuvre : auteur (paroles), compositeur (musique), arrangeur, adaptateur (paroles traduites ou adaptées).",
    phono: "Part Phono",
    phonoHint: "Sa part des droits de reproduction (disques, streaming), en %.",
    signs: "Signe le bulletin",
    add: "Ajouter un créateur",
    remove: "Retirer",
  },
  publisher: {
    person: "Éditeur",
    inSplit: "Éditeur de la répartition",
    name: "Dénomination",
    nameHint:
      "Le nom de la société d'édition, tel qu'il est inscrit à la SACEM.",
    ipi: "IPI / COAD",
    phono: "Part Phono",
    phonoHint: "La part de l'éditeur dans les droits de reproduction, en %.",
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
    creators_max: "Cinq créateurs au plus",
    publishers_max: "Trois éditeurs au plus",
    creator_name: (i: string) => `Le nom du créateur ${i}`,
    creator_quality: (i: string) => `La qualité du créateur ${i}`,
    genre: "Le genre de l'œuvre",
    creator_first: (i: string) => `Le prénom ou le pseudonyme du créateur ${i}`,
    publisher_name: (i: string) => `La dénomination de l'éditeur ${i}`,
    publisher_link: (i: string) => `Les créateurs que publie l'éditeur ${i}`,
    phono_total: "Des parts Phono qui font exactement 100 %",
    dep_dr: "Le partage des DEP et DR",
    arrangement: "La portée de l'autorisation d'arrangement",
    publishing_contract: "Le contrat d'édition (seuls les éditeurs signent)",
    rubric_g: "La date du contrat d'édition (copie non jointe, rubrique G)",
    borrowing: (work: string) =>
      `L'accord pour « ${work} » (emprunt non sécurisé)`,
    to_verify: (field: string) => `À vérifier : ${field}`,
  },
  // Said under the field that misses, once « Valider le dossier » is tried.
  fieldErrors: {
    title: "Obligatoire sur le bulletin.",
    duration:
      "Obligatoire : la durée du master final, qui n'est pas encore reçu.",
    creators: "Le bulletin nomme au moins un créateur.",
    creator_name: "Le nom civil est obligatoire pour la SACEM.",
    genre: "Obligatoire sur le bulletin : chanson, rap, musique électronique…",
    creator_first:
      "Donnez le prénom, ou le pseudonyme sous lequel la personne est déclarée.",
    publisher_name:
      "La dénomination de la société d'édition, telle qu'elle est déclarée à la SACEM.",
    publisher_link:
      "Cochez le ou les créateurs dont cet éditeur publie la part (coédition : plusieurs éditeurs pour un créateur).",
    creator_quality:
      "Choisissez la qualité : auteur, compositeur, arrangeur ou adaptateur.",
    phono_total:
      "Les parts Phono des créateurs et des éditeurs doivent faire exactement 100 %.",
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
    needs: "Avant de générer le bulletin :",
    // Every field of the dossier answered: only what is done elsewhere is left.
    validatedNeeds: "Dossier validé. Avant de générer le bulletin, il reste :",
    openClearances: "Ouvrir les emprunts",
    update: "Enregistrer les modifications",
    borrowings: "Emprunts",
    noBorrowing: "Aucun emprunt à une œuvre existante.",
    generate: "Générer le bulletin",
    version: (n: number) => `Version ${n}`,
    export: "Exporter en PDF",
    signatures: "Signatures",
    // Before the bulletin exists: who will sign it (UX test of 09/10/2026).
    willSign: "Qui signera le bulletin",
    willSignHint:
      "Les créateurs cochés « Signe le bulletin » et les éditeurs, d'après le dossier enregistré.",
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
    submitProof: "Preuve du dépôt (envoi, date, référence)",
    processing: "Marquer en traitement",
    correction: "Correction demandée",
    correctionFields: "Champs à corriger",
    correctionNote: "Ce que demande la SACEM",
    reopened: (fields: string) => `Rouverts par la correction : ${fields}`,
    complete: "Enregistrer le résultat",
    completeProof: "Preuve de l'enregistrement",
    externalId: "Identifiant SACEM",
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
    "formality.partial": "Déclaration partielle",
    "formality.submitted": "Dépôt enregistré",
    "formality.processing": "En traitement",
    "formality.action_required": "Correction demandée",
    "formality.completed": "Enregistrement confirmé",
    "contract.signed": "Contrat d'édition signé",
  } as Record<string, string>,
  errors: {
    missing: (items: string) => `Il manque : ${items}.`,
    proof: "Joignez la preuve.",
    reason: "Dites pourquoi.",
    notReady: "Le dossier n'est pas prêt pour cette étape.",
    iswc: "L'ISWC s'écrit T suivi de 10 chiffres.",
    closed: "Cette formalité est close.",
    failed: "L'action n'a pas pu être faite. Réessayez.",
    pdf: "Le PDF n'a pas pu être préparé. Réessayez.",
  },
} as const;
