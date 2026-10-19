// The Distribution as a journey of seven steps (proto « Projet complet »,
// docs/protos/distribution.html, lib/distribution/journey.ts): titles, why,
// what each one gave, who acts and the module's frame. The proto's words.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const distributionJourney = {
  module: "Distribution",
  distributor: "The Orchard",
  groups: {
    dossier: "Dossier",
    deposit: "Dépôt",
    online: "En ligne",
    closure: "Clôture",
  },
  steps: {
    prep: {
      title: "Préparation",
      why: "Ce que le dépôt réutilise, lu dans le module qui en est propriétaire. On corrige à la source : rien n'est recopié ici.",
    },
    params: {
      title: "Paramètres de distribution",
      why: "Ce qui appartient à la distribution elle-même. Tout le reste se corrige dans son module source.",
    },
    dossier: {
      title: "Dossier de livraison",
      why: "Ce que vous saisirez dans The Orchard, section par section, contrôlé par une personne puis validé avant le dépôt.",
    },
    deposit: {
      title: "Dépôt dans The Orchard",
      why: "Vous saisissez le dossier validé dans The Orchard, puis vous déclarez le dépôt ici.",
    },
    orchard: {
      title: "Réponse de The Orchard",
      why: "Réception, acceptation, puis livraison aux plateformes : chacune se déclare à part, aucune n'est déduite d'une autre.",
    },
    platforms: {
      title: "Plateformes",
      why: "Le lien officiel de chaque plateforme, puis ce qu'une personne a constaté en l'ouvrant. PDS OS ne vérifie rien tout seul.",
    },
    closure: {
      title: "Clôture",
      why: "Fermer le suivi : normalement si tout est déclaré et vérifié, sinon avec des réserves arbitrées. Une réserve ne devient jamais une vérification.",
    },
  },
  prep: {
    verdict: (ready: number, total: number) =>
      `${ready} élément${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""} sur ${total} · chacun se corrige dans son module.`,
    readyTitle: "Prêt pour contrôle.",
    readyBody:
      "Toutes les sources sont prêtes : le dossier de livraison peut être établi. Ce n'est pas une validation : les contrôles viennent ensuite.",
    footer:
      "Cette liste se relit seule à chaque ouverture : rien ne s'y coche à la main.",
    correctIn: (module: string) => `Corriger dans ${module}`,
    badges: {
      to_prepare: "À préparer",
      partial: "Incomplet",
      ready: "Prêt pour contrôle",
    },
  },
  params: {
    labels: {
      territories: "Territoires",
      preorder: "Précommande",
      prelisten: "Écoute en avant-première",
      priceTier: "Catégorie tarifaire",
      cover: "Pochette",
      validator: "Validateur Distribution",
      notes: "Notes pour la saisie",
    },
    sources: {
      territories:
        "Par défaut · le contrôle « Droits et territoires » le confirme",
      notes: "Ce qu'il faut savoir au moment de remplir The Orchard",
      coverGuessed: "Trouvée par son titre en Conception : confirmez-la",
      coverChosen: "Conception · désignée dans les paramètres",
      validatorProposed:
        "Proposé : la direction valide les dossiers. Jamais le responsable lui-même.",
      validatorChosen: "Désigné dans les paramètres",
      saved: "Distribution · paramètres",
    },
    preorderSource: (title: string) => `Stratégie › Temps forts · « ${title} »`,
    toFill: "À renseigner",
    none: "Aucune",
    noCover: "Aucune Fiche Livrable de pochette",
    noValidator: "Personne ne peut valider : à désigner",
    edit: "Modifier",
    fill: "Renseigner",
    change: "Changer",
    save: "Enregistrer",
    cancel: "Annuler",
    proposed: (value: string, source: string) =>
      `Proposé : ${value}${source ? ` · ${source}` : ""}`,
    yes: "Oui",
    no: "Non",
    yesOn: (day: string) => `Oui, à partir du ${day}`,
    country: "Pays",
    preorderOn: "Ouverture de la précommande",
    prelistenOn: "Début de l'écoute en avant-première",
    beforeRelease: (day: string) =>
      `La sortie est le ${day} : la date doit la précéder.`,
    coverHint:
      "La pochette reste validée dans sa Fiche Livrable ; seul le lien est gardé ici.",
    validatorHint:
      "Parmi les personnes qui ont le droit de valider, jamais vous-même.",
    notesPlaceholder: "Ce qu'il faut savoir au moment de remplir The Orchard.",
    sheetLine: (status: string) => `Fiche Livrable · ${status}`,
    required: {
      preorder: "Dites s'il y a une précommande.",
      prelisten: "Dites s'il y a une écoute en avant-première.",
      priceTier: "Choisissez une catégorie tarifaire : The Orchard la demande.",
      validator: "Désignez le validateur Distribution.",
    },
    errors: {
      countries: "Choisissez au moins un pays.",
      yesNo: "Choisissez oui ou non.",
      date: "Indiquez la date.",
      tier: "Choisissez une catégorie.",
      preorderLate: (day: string) =>
        `La précommande doit commencer avant la sortie, le ${day}.`,
      prelistenLate: (day: string) =>
        `L'avant-première doit commencer avant la sortie, le ${day}.`,
      afterRelease: "Une date doit précéder la sortie.",
      frozen:
        "Une version attend une décision ou est validée : les paramètres sont figés.",
      generic: "L'enregistrement a échoué. Réessayez.",
    },
    missing: (n: number) =>
      n > 1
        ? `${n} informations manquent : elles sont en rouge.`
        : "1 information manque : elle est en rouge.",
    confirm: "Confirmer les paramètres",
    confirmed: "Paramètres de distribution confirmés",
    done: {
      territories: "Territoires modifiés",
      preorder: "Précommande modifiée",
      prelisten: "Écoute en avant-première renseignée",
      priceTier: "Catégorie tarifaire choisie",
      cover: "Pochette changée",
      validator: "Validateur Distribution changé",
      notes: "Notes pour la saisie modifiées",
    },
  },
  dossier: {
    document: (n: number) => `Dossier de livraison · V${n}`,
    preparing: "En préparation · paramètres modifiables jusqu'à la soumission",
    submittedLine: (at: string, by: string | null, to: string | null) =>
      `Soumise le ${at}${by ? ` par ${by}` : ""}${to ? `, à ${to}` : ""} · paramètres figés`,
    approvedLine: (at: string, by: string | null) =>
      `Validée le ${at}${by ? ` par ${by}` : ""}`,
    pills: {
      preparing: "En préparation",
      pending: "En attente de validation",
      approved: "Validée",
    },
    pdf: "Exporter en PDF",
    pdfPending: "Préparation du PDF…",
    pdfFailed: "Le PDF n'a pas pu être créé. Réessayez.",
    pdfFileName: (title: string, n: number) =>
      `Dossier de livraison ${title} V${n}.pdf`,
    sources: {
      format: "Projet · Lancement",
      upcLater: "Attribué par The Orchard au dépôt",
      notBlocking: "Ne bloque pas",
      audio: (n: number) =>
        `Master final V${n}, validé dans le workflow Master`,
      audioBefore: "Master final du Catalogue, antérieur au workflow",
    },
    missing: "Manquant",
    copy: "Copier",
    copied: (value: string) => `Copié : ${value}`,
    driftApproved: (n: number, lines: string) =>
      `Changé à la source depuis la V${n} validée : ${lines}. Le dossier ne correspond plus à la source.`,
    driftSince: (n: number, lines: string) =>
      `Changé à la source depuis la V${n} : ${lines}`,
    nothingSince: (n: number) =>
      `Rien n'a changé à la source depuis la V${n} : la correction demandée par The Orchard n'est pas encore faite.`,
    driftLine: (label: string, before: string | null, now: string | null) =>
      `${label} : ${before ?? "vide"} → ${now ?? "vide"}`,
    blockers: (n: number) =>
      `${n} élément${n > 1 ? "s" : ""} de la Préparation bloque${n > 1 ? "nt" : ""} la soumission.`,
    blockersBody:
      "Vous pouvez déjà régler les paramètres et faire les contrôles.",
    blockerButton: (label: string, module: string) =>
      `${label} · corriger dans ${module}`,
    nonCompliant: (n: number) =>
      `${n} contrôle${n > 1 ? "s" : ""} non conforme${n > 1 ? "s" : ""} : corrigez à la source, puis enregistrez le contrôle à nouveau.`,
    unchecked: (n: number, who: string) =>
      `${n} contrôle${n > 1 ? "s" : ""} sur 6 non vérifié${n > 1 ? "s" : ""} : ${who} le verra.`,
    submitNote: (who: string) =>
      `${who} recevra le dossier tel qu'il est maintenant. Les paramètres seront figés jusqu'à sa décision.`,
    submit: (n: number, who: string) => `Soumettre la V${n} à ${who}`,
    submitted: (n: number, who: string) => `V${n} soumise à ${who}`,
    notReady:
      "La Préparation n'est pas prête : corrigez d'abord à la source ce qui bloque.",
    waiting: (who: string, n: number) =>
      `En attente de ${who} : valider la V${n}.`,
    unknown: "l'UPC et l'identifiant The Orchard, attribués au dépôt.",
    unknownLabel: "Pas encore connu :",
    approveNote: (who: string) =>
      `En validant, ${who} pourra faire le dépôt dans The Orchard et le déclarer.`,
    approve: (n: number) => `Valider la V${n}`,
    approved: (n: number) => `V${n} validée`,
    refuse: "Refuser",
    refused: (n: number, who: string) => `V${n} refusée : renvoyée à ${who}`,
    reason: "Motif",
    reasonHint: (who: string) =>
      `Dites pourquoi : c'est ce que ${who} lira en tête de l'étape.`,
    returnedOutcome: "refuser",
    distributorReturn: (by: string) =>
      `corrections demandées, déclarées par ${by}`,
    correctIn: "À corriger dans :",
    prepareTitle: (n: number) => `Préparer la V${n}`,
    prepareBody: (n: number) =>
      `Après une correction faite dans son module source. La V${n} et son cycle de dépôt restent dans l'historique ; paramètres et contrôles redeviennent modifiables et les six contrôles repartent à « non vérifié ».`,
    prepareNote: "Ce qui a été corrigé, et où",
    prepareNoteRequired: "Dites ce qui a été corrigé, et où.",
    prepare: (n: number) => `Préparer la V${n}`,
    prepared: (n: number) => `V${n} en préparation`,
    openAnomalies: (n: number) =>
      `${n} anomalie${n > 1 ? "s" : ""} ouverte${n > 1 ? "s" : ""}`,
    versions: "Versions précédentes du dossier",
    versionStatus: {
      pending: "En attente de validation",
      approved: "Validée",
      rejected: "Refusée",
      superseded: "Remplacée",
    },
    versionLine: (n: number, status: string, at: string) =>
      `V${n} · ${status} · soumise le ${at}`,
    versionDecided: (
      verb: string,
      at: string,
      by: string | null,
      note: string | null,
    ) =>
      ` · ${verb} le ${at}${by ? ` par ${by}` : ""}${note ? ` : « ${note} »` : ""}`,
    verbs: {
      rejected: "refusée",
      superseded: "remplacée",
      approved: "validée",
    },
  },
  checks: {
    title: "Contrôles de cohérence",
    count: (n: number) =>
      `${n} contrôle${n > 1 ? "s" : ""} sur 6 enregistré${n > 1 ? "s" : ""}`,
    body: "Chacun est enregistré par une personne. Le calcul de PDS OS aide, il ne vaut jamais contrôle.",
    computed: (status: string, text: string) =>
      `Calcul de PDS OS : ${status} · ${text}`,
    by: (who: string, at: string) => `Contrôlé par ${who} le ${at}`,
    nobody: "Personne n'a encore enregistré ce contrôle.",
    note: "Ce qui ne correspond pas",
    notePlaceholder: "Ex. la pochette publiée n'est pas la version validée.",
    noteRequired: "Dites ce qui ne correspond pas.",
    save: "Enregistrer le contrôle",
    cancel: "Annuler",
    change: "Changer",
    recorded: "Contrôle enregistré",
  },
  deposit: {
    manual:
      "Le dépôt se fait à la main dans The Orchard. PDS OS ne transmet rien au distributeur : il prépare, contrôle et garde la trace de ce que vous déclarez.",
    drift: (lines: string, n: number) =>
      `Le dossier validé ne correspond plus à la source (${lines}). Préparez la V${n} avant de déposer.`,
    copyTitle: "Ce que vous saisissez dans The Orchard",
    copyMeta: "Chaque valeur se copie",
    title: "Dépôt manuel effectué dans The Orchard",
    body: "Vous avez fait le dépôt vous-même dans The Orchard. Date, identifiant et preuve sont facultatifs : leur absence restera visible.",
    date: "Date",
    orchardId: "Identifiant The Orchard",
    orchardIdPlaceholder: "Ex. 10458823",
    proof: "Preuve",
    proofDrop: "Ajouter une capture, un PDF ou un courriel exporté",
    proofHint:
      "50 Mo au plus · sans preuve, la déclaration reste « sans preuve »",
    removeProof: "Retirer la preuve",
    declare: "Déclarer le dépôt",
    doneFact: "Dépôt",
    doneValue: (n: number) => `Dépôt manuel déclaré · dossier V${n}`,
    doneSource: (
      at: string,
      by: string | null,
      on: string | null,
      id: string | null,
    ) =>
      `Déclaré le ${at}${by ? ` par ${by}` : ""} · ${on ? `date indiquée : ${on}` : "date non renseignée"} · ${id ? `identifiant The Orchard : ${id}` : "identifiant The Orchard non renseigné"}`,
    seeProof: "Voir la preuve",
  },
  orchard: {
    nodes: {
      deposit: "Déposé",
      received: "Reçu",
      accepted: "Accepté",
      platforms_delivered: "Livré aux plateformes",
    },
    frieze: (n: number) => `Suivi chez The Orchard, dossier V${n}`,
    proven: "preuve jointe",
    unproven: "sans preuve",
    noDate: "date non renseignée",
    waiting: "En attente de The Orchard",
    notYet: "Pas encore",
    addProof: "Ajouter une preuve",
    proofAdded: "Preuve ajoutée : la déclaration passe « preuve jointe »",
    proofExists: "Cette déclaration a déjà sa preuve.",
    tellTitle: "Ce que The Orchard vous a dit",
    tellBody:
      "Cochez ce que vous avez appris, par e-mail ou sur leur site, puis enregistrez. Chaque état a sa date et, si vous l'avez, sa preuve.",
    tell: {
      received: [
        "Il a reçu le dossier",
        "Cela ne vaut ni acceptation ni livraison.",
      ],
      accepted: [
        "Il a accepté la sortie",
        "Cela ne vaut pas livraison aux plateformes.",
      ],
      platforms_delivered: [
        "Il a livré les plateformes",
        "Cela ne vaut pas disponibilité : elle se vérifie plateforme par plateforme.",
      ],
    },
    dateOf: (what: string) => `Date : ${what.toLowerCase()}`,
    attach: "Joindre une preuve",
    sameAs: (node: string) => `Même e-mail que « ${node} »`,
    change: "Changer",
    save: "Enregistrer",
    nothingTicked: "Cochez ce que The Orchard vous a fait savoir.",
    answersSaved: (n: number) => `${n} réponses de The Orchard enregistrées`,
    answerSaved: {
      received: "Réception par The Orchard déclarée",
      accepted: "Sortie acceptée par The Orchard",
      platforms_delivered: "Livraison aux plateformes déclarée",
    },
    depositProven: "Dépôt manuel déclaré effectué · preuve jointe",
    depositDeclared: "Dépôt manuel déclaré effectué · sans preuve",
    corrections: "The Orchard demande des corrections",
    correctionsNote: "Ce que The Orchard demande",
    correctionsPlaceholder:
      "Ex. Le compositeur doit figurer sous son nom civil.",
    correctionsRequired: "Dites ce que The Orchard demande.",
    kind: "Type d'anomalie",
    module: "À corriger dans",
    severity: "Gravité",
    correctionsHint:
      "Une anomalie s'ouvre. La correction se fait dans ce module, puis une nouvelle version du dossier est validée et déposée.",
    declareCorrections: "Déclarer les corrections demandées",
    correctionsDone: (n: number) => `Corrections demandées : V${n} à préparer`,
    uploadFailed: "L'envoi du fichier a échoué. Réessayez.",
    tooLarge: "Le fichier dépasse 50 Mo.",
  },
  platforms: {
    availability: "Disponibilité publique",
    summary: (n: number, declared: string | null) =>
      `${n} plateforme${n > 1 ? "s" : ""} de référence vérifiée${n > 1 ? "s" : ""} sur 5 · ${declared ?? "pas encore déclarée"}`,
    declaredBy: (at: string, by: string | null, proof: boolean) =>
      `déclarée le ${at}${by ? ` par ${by}` : ""}, ${proof ? "preuve jointe" : "sans preuve"}`,
    count: (n: number) => `${n} sur 5`,
    declare: "Déclarer la disponibilité publique",
    declared:
      "Disponibilité déclarée : elle reste à vérifier plateforme par plateforme",
    waitingDetection: (day: string | null) =>
      `En attente de la détection automatique : trouver les liens, ${day ? `à partir du ${day}` : "à partir de la sortie"}. Vous pouvez aussi renseigner un lien vous-même.`,
    checkNow: "Lancer la détection maintenant",
    detected: (n: number) =>
      `Détection faite : ${n} lien${n > 1 ? "s" : ""} trouvé${n > 1 ? "s" : ""}`,
    detectionFailed: "La détection n'a pas abouti. Réessayez plus tard.",
    noIsrc: "Pas d'ISRC au Catalogue : la détection ne peut rien chercher.",
    list: "Plateformes",
    add: "Ajouter une plateforme",
    addName: "Nom de la plateforme",
    addNamePlaceholder: "Ex. Tidal",
    addNameRequired: "Donnez le nom de la plateforme.",
    addUrl: "Lien officiel",
    added: "Plateforme ajoutée",
    extra: "hors des cinq de référence",
    fromDetection: (day: string) =>
      `Trouvé par la détection automatique le ${day}`,
    noLink: (detected: boolean) =>
      detected
        ? "Lien non renseigné · la détection ne l'a pas trouvé"
        : "Lien non renseigné",
    verifiedBy: (who: string | null, at: string, note: string | null) =>
      `Vérifiée par ${who ?? "—"} le ${at}${note ? ` : « ${note} »` : ""}`,
    open: "Ouvrir",
    allGood: "Tout est bon",
    problem: "Il y a un problème",
    recheck: "Revérifier",
    cancel: "Annuler",
    fillLink: "Renseigner le lien",
    linkLabel: "Lien officiel",
    linkHint:
      "Commence par https://. Changer le lien remet sa vérification à faire.",
    linkInvalid: "Collez le lien officiel : il commence par https://.",
    linkSaved: "Lien enregistré : il reste à le vérifier",
    save: "Enregistrer",
    problemBody:
      "Ce que vous avez constaté en ouvrant le lien. Une anomalie s'ouvre, à corriger dans son module.",
    problemLegend: "Le problème",
    problemRequired: "Dites ce que vous avez constaté.",
    problems: {
      unavailable: [
        "La sortie n'y est pas",
        "Page introuvable, titre indisponible dans votre pays…",
      ],
      non_compliant: [
        "Elle y est, mais quelque chose diffère du dossier validé",
        "Titre, artiste, pochette ou version.",
      ],
    },
    seen: "Ce que vous avez vu",
    differs: "Ce qui diffère",
    module: "À corriger dans",
    saveProblem: "Enregistrer le problème",
    problemSaved: (name: string) =>
      `${name} : problème enregistré, anomalie ouverte`,
    verified: (name: string, n: number) => `${name} vérifiée : ${n} sur 5`,
    allVerified: "Cinq plateformes vérifiées",
    anomalies: "Anomalies des plateformes",
    allAnomalies: "Toutes les anomalies",
    done: "Les cinq plateformes de référence sont vérifiées, disponibles et conformes.",
    doneBody: "Une clôture normale est possible.",
  },
  closure: {
    conditions: "Conditions d'une clôture normale",
    met: "Remplie",
    unmet: "Non remplie",
    noReserve: (who: string) =>
      `Aucune réserve : une clôture normale est possible. ${who} la validera ; les conditions seront revérifiées au moment de sa décision.`,
    proposeNormal: "Proposer une clôture normale",
    reserves: "Réserves",
    reservesBody:
      "Elles resteront non vérifiées : la distribution sera « clôturée avec réserves », jamais « distribuée » ni « conforme ».",
    reserve: "Réserve",
    arbitration: "Arbitrage : pourquoi clôturer malgré ces réserves",
    arbitrationRequired: (who: string) =>
      `L'arbitrage est obligatoire : c'est ce que lira ${who}.`,
    acknowledge:
      "Je confirme que ces réserves restent non vérifiées après la clôture.",
    acknowledgeRequired: "Confirmez que les réserves restent non vérifiées.",
    proposeReserves: "Proposer une clôture avec réserves",
    proposedNormal: "Clôture normale proposée",
    proposedReserves: (n: number) => `Clôture avec réserves proposée (${n})`,
    later: (who: string) =>
      `${who} proposera la clôture une fois les plateformes vérifiées, ou avant, avec des réserves.`,
    proposal: "Proposition",
    proposedBy: (at: string, by: string | null) =>
      `Proposée le ${at}${by ? ` par ${by}` : ""}`,
    reservesKept: "Réserves qui resteront non vérifiées",
    waiting: (who: string) => `En attente de ${who} : valider la clôture.`,
    decideNote:
      "Le suivi de la distribution sera fermé. Une réouverture reste possible et sera tracée.",
    approve: "Valider la clôture",
    approved: "Clôture validée",
    refuse: "Refuser",
    refused: (who: string) => `Clôture refusée : renvoyée à ${who}`,
    reason: "Motif",
    reasonHint: (who: string) =>
      `Dites pourquoi : c'est ce que ${who} lira en tête de l'étape.`,
    closed: (label: string, at: string, by: string | null) =>
      `${label} le ${at}${by ? ` par ${by}` : ""}`,
    arbitrationLine: (text: string) => `Arbitrage : « ${text} »`,
    notVerified: "Non vérifiée",
    reopen: "Rouvrir le suivi",
    reopenNote: "Motif",
    reopenHint:
      "La décision de clôture reste dans l'historique ; la réouverture y est ajoutée avec votre motif.",
    reopenRequired: "Dites pourquoi.",
    reopenButton: "Rouvrir",
    reopened: "Suivi rouvert",
  },
  anomaliesView: {
    body: "Ce qui ne va pas, et le module où le corriger. Rien ne se corrige ici : une fois la source corrigée, une nouvelle version du dossier est préparée depuis l'étape Dossier.",
    line: (
      at: string,
      by: string | null,
      from: boolean,
      version: number | null,
      module: string,
    ) =>
      `Signalée le ${at}${by ? ` par ${by}` : ""}${from ? " (déclarée de The Orchard)" : ""}${version ? ` · dossier V${version}` : ""} · à corriger dans : ${module}`,
  },
  // The 4-column grid.
  computed: { name: "Calculé par le code", role: "à chaque ouverture" },
  ownerRole: "Cheffe ou chef de projet",
  validatorRole: "Validateur Distribution",
  toAppoint: "À désigner",
  rootPrereq: "Projet lancé",
  nextOf: {
    prep: "Soumission du dossier",
    platforms: "Clôture normale",
    closure: "Clôture du projet",
  },
  // The sources the Préparation waits for, in the grid.
  external: {
    master: "Master final",
    cover: "Pochette",
    clearance: (work: string) => `Emprunt « ${work} »`,
    masterModule: "Master",
    coverModule: "Conception",
    legalModule: "Juridique",
  },
  todo: {
    confirmParams: "Confirmer les paramètres",
    controlDossier: (n: number) => `Contrôler le dossier V${n}`,
    submit: (n: number) => `Soumettre la V${n} à validation`,
    validate: (n: number) => `Valider la V${n}`,
    prepareNext: (n: number) => `Préparer la V${n}`,
    deposit: "Déclarer le dépôt",
    receive: "recevoir le dossier",
    accept: "accepter la sortie",
    deliver: "livrer les plateformes",
    verify: (n: number) => `Vérifier les plateformes (${n} sur 5)`,
    reverify: "Revérifier les plateformes",
    followAnomaly: "Suivre l'anomalie ouverte",
    detection: "la détection automatique",
    detectionTodo: (day: string) => `trouver les liens, à partir du ${day}`,
    detectionTodoUndated: "trouver les liens, à partir de la sortie",
    proposeClosure: "Proposer la clôture",
    validateClosure: "Valider la clôture",
  },
  summary: {
    prepReady: (ready: number, total: number) =>
      `Prêt pour contrôle · ${ready} éléments sur ${total}`,
    prepBlocking: (n: number) =>
      `${plural(n, "élément bloque", "éléments bloquent")} le dossier`,
    paramsConfirmed: (by: string | null) =>
      by ? `Confirmés par ${by}` : "Confirmés",
    dossierApproved: (n: number) => `V${n} validée`,
    depositProven: "Déclaré, preuve jointe",
    depositDeclared: "Déclaré, sans preuve",
    orchardDone: "Acceptée et livrée, déclarées",
    platformsDone: "5 plateformes vérifiées sur 5",
    closurePossible: "Possible avec réserves dès maintenant",
    closedNormal: "Clôturée normalement",
    closedReserves: (n: number) => `Clôturée avec réserves (${n})`,
  },
  // A locked step: what it will ask, and who.
  coming: "Ce qui viendra",
  acts: {
    params: ["Confirmer les paramètres"],
    dossier: ["Soumettre à validation", "Valider le dossier"],
    deposit: ["Déclarer le dépôt"],
    orchard: [
      "Déclarer la réception",
      "Déclarer l'acceptation",
      "Déclarer la livraison aux plateformes",
    ],
    platforms: ["Vérifier les plateformes"],
    closure: ["Proposer la clôture", "Valider la clôture"],
  },
  // « Maintenant » of the module.
  now: {
    waitingTitle: "La Distribution avance sans vous pour l'instant",
    finished: "La distribution est clôturée",
  },
  footer: {
    anomalies: "Anomalies",
    anomaliesOpen: (n: number) =>
      `Anomalies (${plural(n, "ouverte", "ouvertes")})`,
    history: "Historique de la distribution",
  },
  back: "← Parcours",
  // The workflow's status next to the title (wfStatus of the proto).
  status: {
    not_started: "Non démarré",
    in_progress: "En cours",
    waiting: "En attente",
    blocked: "Bloqué",
    done: "Terminé",
  },
  facts: {
    masterFinal: "Master final",
    release: "Sortie",
    distributor: "Distributeur",
  },
  views: {
    anomalies: "Anomalies",
    history: "Historique de la distribution",
    historyBody:
      "Chaque geste, qui l'a fait et quand, avec ou sans preuve. Une déclaration retirée ou une version remplacée reste ici.",
    historyEmpty: "Rien pour l'instant.",
  },
} as const;
