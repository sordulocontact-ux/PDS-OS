// Marketing › Activations as the proto « Projet complet » shows them (18/10):
// the list with its frieze, the open activation, « Maintenant », the levers
// to prepare (docs/projet-complet/activations.md). Words of the proto.

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const activationJourney = {
  crumb: "Activations",
  listTitle: "Activations",
  phases: ["Préparer", "Réaliser", "Prouver", "Mesurer", "Clôturer"] as const,
  phaseClosed: "Clôturée",
  phaseCancelled: "Annulée",
  phaseSuspended: " · suspendue",
  phaseAria: (label: string) => `Étape : ${label}`,
  filters: {
    label: "Filtrer",
    mine: "À moi",
    open: "En cours",
    measure: "À mesurer",
    done: "Terminées",
  },
  noneHere: "Aucune activation ici.",
  ownerToAppoint: "responsable à désigner",
  // « À vous · récupérer les statistiques · et 2 autres »
  sentence: {
    mine: "À vous",
    more: (n: number) => `et ${n} ${plural(n, "autre", "autres")}`,
    cancelled: (why: string) => `Annulée : ${why}`,
    closed: "Clôturée",
    suspended: (why: string) => `Suspendue : ${why}`,
    waits: (what: string) => `Attend : ${what}`,
    nothing: "Rien à faire pour l'instant",
  },
  why: {
    content: "Un contenu publié au bon moment, avec sa preuve et ses chiffres.",
    influence:
      "Les créateurs publient ; chaque publication a sa preuve, ses vues et ses droits.",
    press:
      "Le dossier de presse part aux médias ; les retombées sont des preuves, vérifiées à part.",
    event:
      "Un moment avec le public : il a sa date, sa preuve et sa fréquentation.",
    other:
      "Une action du dispositif, suivie comme les autres : responsable, échéance, preuve, statistiques.",
  },
  units: {
    content: "vues",
    influence: "vues",
    press: "retombées",
    event: "personnes",
    other: "vues",
  },
  // The trunk, one gesture at a time (proto actNext).
  todo: {
    resume: "Reprendre l'activation",
    designate: "Désigner un responsable",
    due: "Fixer l'échéance",
    launch: "Lancer l'activation",
    declareDone: "Déclarer l'activation réalisée",
    proof: "Fournir la preuve",
    otherProof: "Fournir une autre preuve",
    verifyProof: "Vérifier la preuve",
    stats: "Récupérer les statistiques",
    close: "Clôturer l'activation",
  },
  // The module's gestures, with whom they wait for (proto collabNext, agNext,
  // rpNext).
  collab: {
    concept: "Écrire le concept personnalisé",
    conceptDecision: "Valider le concept",
    brief: "Envoyer le brief et la proposition",
    briefValidate: "Valider le brief",
    briefSend: "Marquer le brief comme envoyé",
    counter: "Répondre à la contre-proposition",
    terms: "Accepter les conditions ou attendre la réponse",
    prepareLink: "Préparer le lien d'accord",
    agree: "Donner son accord",
    content: "Déposer le contenu",
    contentDecision: "Valider le contenu",
    publish: "Déclarer la publication",
    verifyPublication: "Vérifier la publication",
    askInvoice: "Demander la facture",
    invoice: "Déposer la facture",
    approvePayment: "Valider le bon à payer",
    declarePayment: "Déclarer le paiement",
    verifyPayment: "Vérifier le paiement",
    closeCollab: "Clôturer la collaboration",
    of: (todo: string, name: string) => `${todo} · ${name}`,
  },
  agency: {
    link: "Relier le tableau de l'agence",
    mapping: "Confirmer la correspondance des colonnes",
    preview: "Vérifier l'actualisation avant de l'importer",
    decide: (n: number, press: boolean) =>
      `Décider sur ${n} ${press ? plural(n, "média", "médias") : plural(n, "profil", "profils")}`,
    recap: (agency: string) => `Envoyer le récapitulatif à ${agency}`,
    recapAgency: "l'agence",
    report: "Décider du bilan de l'agence",
    transmit: "Transmettre le dossier à l'agence",
  },
  press: {
    framing: "Soumettre le cadrage RP",
    framingDecision: "Valider le cadrage RP",
    kit: "Compléter le dossier de presse",
    kitDecision: "Valider le dossier de presse",
    template: "Préparer le modèle commun",
    templateSubmit: "Soumettre le modèle commun",
    templateDecision: "Valider le modèle commun",
    drafts: "Préparer un brouillon par média",
    submit: (media: string) => `Soumettre le message · ${media}`,
    validate: (media: string) => `Valider le message · ${media}`,
    send: (media: string) => `Déclarer l'envoi · ${media}`,
    availability: (media: string) => `Noter une disponibilité · ${media}`,
    slot: (media: string) => `Confirmer le créneau · ${media}`,
    done: (media: string) => `Marquer l'interview réalisée · ${media}`,
    broadcast: (media: string) => `Déclarer la diffusion · ${media}`,
    coverage: (n: number) =>
      `Vérifier ${n} ${plural(n, "retombée", "retombées")}`,
  },
  direction: "La direction",
  // The proof of a campaign, computed (proto syncActProof).
  derived: {
    title: "Preuves",
    influence: (verified: number, engaged: number) =>
      `${verified} ${plural(verified, "publication vérifiée", "publications vérifiées")} sur ${engaged} ${plural(engaged, "créateur engagé", "créateurs engagés")}`,
    press: (verified: number, declared: number) =>
      `${verified} ${plural(verified, "retombée vérifiée", "retombées vérifiées")} sur ${declared} ${plural(declared, "déclarée", "déclarées")}`,
    missingPublication: (name: string) => `${name} : pas encore publiée`,
    toVerifyPublication: (name: string) => `${name} : publication à vérifier`,
    toVerifyCoverage: (media: string) => `${media} : retombée à vérifier`,
    footInfluence:
      "Chaque publication se vérifie dans la fiche de son créateur, plus bas.",
    footPress: "Chaque retombée se vérifie dans « Retombées », plus bas.",
    footEnd:
      "La preuve de l'activation en découle : aucun lien unique pour toute la campagne.",
  },
} as const;
