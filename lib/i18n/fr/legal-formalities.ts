// Formalités (ticket Juridique 06): the SACEM 725 bulletin of a title, from
// the data PDS OS already holds to the proof of its registration.
export const legalFormalities = {
  definitions: {
    SACEM_725_EDITED_WORK: "Bulletin SACEM 725 · œuvre éditée",
  } as Record<string, string>,
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
  arrangementScopes: {
    all: "Autorisé pour toutes les exploitations",
    specific: "Autorisé pour certaines exploitations déterminées",
  },
  creator: {
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
  },
  contract: {
    provided: "La copie du contrat d'édition est jointe",
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
    sign: "Marquer signé",
    signProof: "Preuve de la signature",
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
