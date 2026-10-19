// Marketing › Activations as the proto « Projet complet » shows them (18/10):
// the list with its frieze, the open activation, « Maintenant », the levers
// to prepare (docs/projet-complet/activations.md). Words of the proto.

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const activationJourney = {
  crumb: "Activations",
  levers: {
    step: "Leviers à préparer",
    why: "Chaque levier retenu dans le Brief de sortie peut devenir une activation. Vous la créez quand vous êtes prêt, avec son mode pour l'influence et la presse.",
    todo: (n: number) =>
      `Créer ou reporter ${n} ${plural(n, "activation", "activations")}`,
    done: (n: number) =>
      `${n} ${plural(n, "activation créée", "activations créées")}`,
  },
  owner: "Responsable de l'activation",
  unitLabels: { press: "Retombées", event: "Personnes" },
  banner: {
    toTransform: (n: number) =>
      `${n} ${plural(n, "levier", "leviers")} du Brief de sortie à transformer en ${plural(n, "activation", "activations")}`,
    kept: (n: number) =>
      `${n} ${plural(n, "levier gardé", "leviers gardés")} pour plus tard`,
    sub: "Créez l'activation quand vous êtes prêt ; un levier peut attendre.",
    source: (kind: string, lever: string, version: number) =>
      `${kind} · levier ${lever} · Brief de sortie V${version} › Dispositif`,
    create: "Créer l'activation",
    createShort: "Créer",
    later: "Plus tard",
    created: "Créée",
    open: "Ouvrir",
    toPrepare: "À préparer",
    mode: "Mode",
    empty:
      "Les activations arrivent quand la Stratégie est validée : chaque levier retenu peut en devenir une.",
  },
  now: {
    title: "Maintenant",
    mineElsewhere: "À vous",
    below: "plus bas",
    nothing: "Rien à faire de votre côté pour l'instant.",
    nextOf: (name: string) => `Prochaine action · ${name} :`,
    task: "Créer une tâche",
    taskDone: "tâche créée dans Travail",
    notApplicable: "Sans objet",
    whyLabel: (todo: string) => `Pourquoi « ${todo} » est sans objet`,
    whyPlaceholder: "Ex. : contenu publié en story, sans lien durable",
    mark: "Marquer sans objet",
    cancel: "Annuler",
    viaLink: "lien privé",
  },
  gesture: {
    owner: "Responsable",
    designate: "Désigner",
    due: "Échéance",
    proposed: (from: string | null, day: string) =>
      from
        ? `Proposée : ${from} dans le calendrier de lancement, ${day}`
        : `Proposée : date de sortie, ${day}`,
    fixDue: "Fixer l'échéance",
    launch: "Lancer l'activation",
    doneNote:
      "Réalisée déclarée ne signifie ni publiée, ni vérifiée, ni mesurée.",
    noCreator:
      "Aucun créateur engagé pour l'instant : choisissez-les dans la campagne, plus bas.",
    noPublication: "Aucun créateur n'a encore publié.",
    noMessage: "Aucun message n'est encore parti aux médias.",
    declare: "Déclarer réalisée",
    proofLink: "Lien de la preuve",
    proofUnavailable:
      "Preuve indisponible (story expirée, publication retirée…)",
    proofWhy: "Motif si indisponible",
    saveProof: "Enregistrer la preuve",
    proofIs: (by: string, day: string) => `fournie par ${by} le ${day}`,
    proofLabel: "Preuve :",
    comment: "Commentaire",
    commentHint: "Obligatoire pour contester",
    verify: "Vérifier la preuve",
    contest: "Contester",
    resumeCallout: (by: string, day: string, why: string) =>
      `Suspendue par ${by} le ${day} : « ${why} »`,
    resume: "Reprendre l'activation",
    close: "Clôturer l'activation",
    closeReserves: (list: string) => `Clôturée avec réserves : ${list}.`,
  },
  snapshot: {
    title: "Nouveau relevé",
    platform: "Plateforme",
    platforms: [
      "TikTok",
      "Instagram",
      "YouTube",
      "Spotify",
      "Deezer",
      "Presse",
      "Autre",
    ],
    period: "Période",
    from: "Du",
    to: "Au",
    source: "Source",
    sources: {
      internal: "Déclaré en interne",
      creator: "Déclaré par le créateur",
      agency: "Déclaré par l'agence",
      platform: "Relevé sur la plateforme",
    },
    partial:
      "Relevé partiel (toutes les publications ne sont pas encore comptées)",
    partialNote: "Relevé partiel",
    unavailable: "Donnée indisponible : la plateforme ne la fournit pas",
    save: "Enregistrer le relevé",
    add: "Ajouter un relevé",
    cancel: "Annuler",
    listTitle: "Relevés de statistiques",
    noSum:
      "Les relevés ne s'additionnent pas : chacun garde sa période et sa source.",
  },
  detail: {
    gate: (what: string) => `Elle commence quand ${what}.`,
    gateBlocker: (what: string) => `Elle attend : ${what}.`,
    delivered: (title: string) => `« ${title} » est livré`,
    cancelled: (by: string, day: string, why: string) =>
      `Annulée par ${by} le ${day} : « ${why} ». Elle reste dans le bilan, avec ce motif.`,
    cancelledShort: (why: string) =>
      `Annulée : « ${why} ». Elle reste dans le bilan, avec ce motif.`,
    blocked: (why: string) => `Bloquée : « ${why} »`,
    toLaunchMissing: (what: string) => `Pour lancer : il manque ${what}.`,
    toLaunchReady:
      "Pour lancer : prête : responsable, échéance, rien de bloquant.",
    anOwner: "un responsable",
    aDue: "une échéance",
    and: " et ",
    pills: { suspended: "Suspendue", cancelled: "Annulée", blocked: "Bloquée" },
  },
  infos: {
    title: "Informations",
    type: "Type",
    lever: "Levier",
    leverSource: (version: number | null) =>
      version
        ? `Brief de sortie V${version} › Dispositif`
        : "Brief de sortie › Dispositif",
    manual: "Hors levier",
    owner: "Responsable",
    toAppoint: "À désigner",
    due: "Échéance",
    toFix: "À fixer",
    proof: "Preuve",
    stats: "Statistiques",
    lastSnapshot: "dernier relevé",
    notExpectedWhy: (why: string) => `Non attendue · « ${why} »`,
    unavailableWhy: (why: string) => `Indisponible · « ${why} »`,
  },
  life: {
    suspend: "Suspendre",
    cancel: "Annuler l'activation",
    suspendTitle: (title: string) => `Suspendre ${title}`,
    cancelTitle: (title: string) => `Annuler ${title}`,
    suspendEffect:
      "Elle s'arrête sans être perdue : elle reprend là où elle en était.",
    cancelEffect:
      "L'activation reste dans le tableau et dans le bilan, avec ce motif. Ses preuves et ses relevés sont gardés.",
    reason: "Motif",
    back: "Retour",
  },
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
  // Toasts, same verb as the button.
  done: {
    designated: "Responsable désigné",
    due: "Échéance fixée",
    launched: "Activation lancée",
    declared: "Activation déclarée réalisée",
    proof: "Preuve enregistrée",
    verified: "Preuve vérifiée",
    contested: "Preuve contestée",
    snapshot: "Relevé enregistré",
    closed: "Activation clôturée",
    suspended: "Activation suspendue",
    resumed: "Activation reprise",
    cancelled: "Activation annulée",
    notApplicable: "Marqué sans objet",
    task: "Tâche créée dans Travail",
    created: (title: string) => `${title} : activation créée`,
    later: "Reporté : vous pourrez la créer plus tard",
    transmitted: "Transmission déclarée",
  },
  errors: {
    noPublication:
      "Aucun créateur n'a encore publié : la campagne n'est pas réalisée.",
    noMessage:
      "Aucun message n'est encore parti aux médias : la campagne n'est pas réalisée.",
    framingNotValidated:
      "Le cadrage doit être validé avant d'être transmis à l'agence.",
    kitNotValidated:
      "Le dossier de presse doit être validé avant d'être transmis à l'agence.",
    proofLink: "Collez le lien de la preuve (https://…).",
    proofWhy: "Dites pourquoi la preuve est indisponible.",
    commentToContest: "Un commentaire est obligatoire pour contester.",
    value: "Saisissez le chiffre relevé.",
    period: "Indiquez la période du relevé.",
    why: "Dites pourquoi c'est sans objet.",
    owner: "Choisissez le responsable.",
    dueRequired: "Choisissez l'échéance.",
  },
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
