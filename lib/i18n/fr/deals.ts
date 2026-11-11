/** The Business module's deals (BIZ 2 to 4): stages, gestures, errors. */
export const deals = {
  kinds: {
    music: "Musique",
    brand_partnership: "Partenariat de marque",
    label: "Label",
  },
  stages: {
    to_contact: "À contacter",
    call_planned: "Call prévu",
    negotiation: "Négociation",
    agreement: "Accord de principe",
    contracting: "Contractualisation",
    signed: "Signé",
    abandoned: "Abandonné",
  },
  agreement: {
    pending: "Accord de principe à valider",
    validated: "Accord de principe validé",
  },
  done: {
    created: "Deal créé",
    assigned: "Deal affecté",
    unassigned: "Deal repris",
    stage: (stage: string) => `Deal passé à l'étape « ${stage} »`,
    agreementValidated: "Accord de principe validé",
    agreementRefused: "Accord de principe renvoyé en négociation",
    abandoned: "Deal abandonné",
    nextAction: "Prochaine action enregistrée",
    term: "Terme enregistré",
  },
  errors: {
    generic: "L'enregistrement a échoué. Réessayez.",
    invalid: "Vérifiez les champs du formulaire.",
    forbidden: "Vous n'avez pas le droit de faire ce geste sur ce deal.",
    notFound: "Ce deal est introuvable.",
    closed: "Ce deal est clos : signé ou abandonné, il ne change plus.",
    kindUnavailable: "Seuls les deals musicaux se créent pour l'instant.",
    subjectRequired: "Choisissez un artiste, un projet ou une participation.",
    participationNotFound: "Cette participation est introuvable.",
    participationOtherProject:
      "Cette participation appartient à un autre projet.",
    participationOtherArtist:
      "Cette participation est celle d'un autre artiste.",
    projectNotFound: "Ce projet est introuvable.",
    artistNotFound: "Cet artiste est introuvable.",
    exists: "Un deal est déjà ouvert pour cette participation.",
    assigneeCannotNegotiate:
      "Un deal se confie à un membre qui négocie (business manager, business).",
    assigneeUnchanged: "Ce deal est déjà confié à cette personne.",
    stageUnchanged: "Le deal est déjà à cette étape.",
    agreementNotValidated:
      "La contractualisation attend un accord de principe validé par la direction.",
    notContracting: "Un deal est signé après la contractualisation.",
    noAgreementPending: "Aucun accord de principe n'attend de décision.",
    reasonRequired: "Dites pourquoi.",
    nextActionUnchanged: "Rien n'a changé.",
    termUnchanged: "Ce terme n'a pas changé.",
    termValueRequired: "Donnez une valeur, ou choisissez « À définir ».",
    termUnknown: "Ce terme n'existe pas pour ce type de deal.",
    textTooLong: "Le texte est trop long.",
  },
} as const;
