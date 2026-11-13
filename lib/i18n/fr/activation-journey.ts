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
  // The card of the levers still to turn into activations, above the table
  // (Sacha 10/11/2026: a frame with its title, like the other tables).
  banner: {
    title: "Leviers du Brief de sortie",
    toTransform: (n: number, version: number) =>
      `${n} ${plural(n, "levier", "leviers")} à transformer en ${plural(n, "activation", "activations")} · Brief de sortie V${version} › Dispositif`,
    kept: (n: number, version: number) =>
      `${n} ${plural(n, "levier gardé", "leviers gardés")} pour plus tard · Brief de sortie V${version} › Dispositif`,
    columns: { lever: "Levier", kind: "Type" },
    create: "Créer l'activation",
    createShort: "Créer",
    later: "Plus tard",
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
    // An agency campaign not settled (recette of 23/10, MKT-ACT-001).
    agencyPending: (list: string) =>
      `Pas encore réalisée : ${list}. Réglez-le dans le tableau de l'agence, ou déclarez-la réalisée avec une réserve.`,
    withReserve: "Déclarer réalisée avec une réserve",
    reserveReason: "Ce qui reste et pourquoi on déclare quand même",
    reserveReasonPlaceholder:
      "Radio Lumen reste à confirmer par l'agence ; la diffusion est passée.",
    reserveWho: "Qui suit la réserve",
    reserveWhen: "À lever avant le",
    reserveNote: "La réserve est reprise au bilan, où elle sera arbitrée.",
    reserveReasonRequired: "Dites ce qui reste et pourquoi.",
    reserveWhoRequired: "Choisissez qui suit la réserve.",
    reserveWhenRequired: "Donnez la date à laquelle la lever.",
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
    closeReserves: (list: string) => `Clôture avec réserves : ${list}.`,
  },
  snapshot: {
    title: "Nouveau relevé",
    platform: "Plateforme",
    // Where a figure is read, by lever (recette of 23/10, MKT-ACT-002 and
    // ACT-001): never a social network by default outside the networks.
    measure: "Mesure",
    platformSets: {
      social: ["TikTok", "Instagram", "YouTube", "Autre"],
      music: [
        "Spotify",
        "Apple Music",
        "Deezer",
        "YouTube Music",
        "Amazon Music",
        "Autre",
      ],
      event: ["Billetterie", "Comptage à l'entrée", "Liste d'invités", "Autre"],
      press: ["Presse", "Radio", "Télévision", "Web", "Autre"],
      other: [
        "Autre",
        "TikTok",
        "Instagram",
        "YouTube",
        "Spotify",
        "Deezer",
        "Presse",
      ],
    },
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
    // « Clip officiel livré » (list), « le Clip officiel est livré » (callout).
    deliveredShort: (title: string) => `${title} livré`,
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
  collabAll: "Toute la collaboration",
  mediaAll: "Tout le suivi du média",
  influence: {
    title: "Campagne d'influence · gestion interne",
    concept: "Concept de campagne",
    conceptSource: (version: number | null) =>
      version
        ? `Brief de sortie V${version} › Narratif`
        : "Brief de sortie › Narratif",
    conceptMissing: "Pas encore écrit dans le Brief de sortie",
    creators: "Créateurs",
    creatorsCount: (n: number, verified: number, out: number) =>
      `${n} · ${verified} ${plural(verified, "publié et vérifié", "publiés et vérifiés")} · ${out} ${plural(out, "sorti", "sortis")}`,
    none: "Aucun pour l'instant",
  },
  pressBlock: {
    internal: "Relations presse · gestion interne",
    agency: "Relations presse · agence externe",
    agencyInfluence: "Campagne d'influence · agence externe",
    framing: "Cadrage RP",
    framingNone: "Brouillon",
    common: "Commun aux deux modes",
    kit: "Dossier de presse",
    kitMeta: "Validé ≠ envoyé",
    media: (n: number) => `Médias ciblés · ${n}`,
    template: "Modèle commun",
    coverage: "Retombées",
    report: "Bilan RP",
    tiles: {
      targets: "Médias ciblés",
      sent: "Messages envoyés",
      positive: "Réponses positives",
      interviews: "Interviews réalisées",
      broadcasts: "Diffusions déclarées",
      coverage: "Retombées vérifiées",
      missing: "Preuves manquantes",
    },
    coverageValue: (verified: number, all: number) => `${verified} sur ${all}`,
    transmission: (agency: string) => `Transmission à ${agency}`,
    transmissionAgency: "l'agence",
    transmissionHint:
      "L'agence n'a pas de compte : envoyez-lui le cadrage et le dossier hors PDS OS, puis déclarez-le.",
    transmit: "Marquer comme transmis",
    transmitted: (who: string, at: string) =>
      `Cadrage et dossier transmis à l'agence (déclaré par ${who}) le ${at}. L'agence n'a pas de compte et ne voit rien d'autre.`,
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
    statsUnavailable: "Donnée indisponible",
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
  // A collective's list filtered on a title (lot 10).
  noneForTitle: "Aucune activation pour ce titre dans cette vue.",
  // The table of the activations (Sacha 10/11/2026), sober columns: never
  // the 9 columns removed on 18/10.
  table: {
    activation: "Activation",
    kind: "Type",
    owner: "Responsable",
    due: "Échéance",
    phase: "Avancement",
    ownerToAppoint: "À désigner",
  },
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
    sendLink: "Envoyer l'accord",
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
    statsUnavailable: "Statistiques indisponibles",
    task: "Tâche créée dans Travail",
    created: (title: string) => `${title} : activation créée`,
    later: "Reporté : vous pourrez la créer plus tard",
    transmitted: "Transmission déclarée",
  },
  errors: {
    // The recette of 23/10 (20261026400101): what the database refuses.
    frozen: {
      not_launched:
        "Lancez d'abord l'activation (un responsable, une échéance, « Lancer l'activation ») : rien ne se fait avec un créateur avant.",
      closed:
        "L'activation est clôturée ou annulée : ses collaborations sont figées.",
      suspended:
        "L'activation est suspendue : reprenez-la pour avancer avec les créateurs.",
    },
    creatorsOpen: (names: string) =>
      `Chaque créateur engagé doit d'abord avoir son issue (clôturée, refusée, abandonnée…) : ${names}.`,
    agencyGaps: {
      agency_review: "un média est encore « À examiner »",
      agency_errors: "une ligne du tableau de l'agence est en erreur",
      no_coverage: "aucune retombée n'est déclarée",
    },
    agencyNotDone: (list: string) =>
      `La campagne n'est pas réalisée : ${list}. Si c'est voulu, déclarez-la réalisée avec une réserve.`,
    dueInPast: "L'échéance ne peut pas être dans le passé.",
    dueAfterCampaign: (day: string) =>
      `L'échéance tombe au plus tard le ${day} : la fin de la campagne (sortie + 28 jours).`,
    followUpIncomplete: "Choisissez qui suit la réserve et pour quand.",
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
