/** Distribution (ticket « Distribution », docs/ARCHITECTURE.md § 8 octies):
 * PDS OS prepares, checks and follows a manual deposit at The Orchard. */
export const distribution = {
  // What the distributor asks of the audio files, set in /app/settings and
  // read by the Master's Brief (lib/distribution/requirements.ts).
  requirements: {
    title: "Distribution",
    description:
      "Ce que The Orchard exige des fichiers audio. Le Brief Mix/Master le reprend pour les ingénieurs.",
    audioFormats: "Formats audio exigés par The Orchard",
    audioFormatsHint:
      "Par exemple : WAV 24 bits / 44,1 kHz, stéréo, sans limiteur.",
    save: "Enregistrer",
    saved: "Exigences de distribution enregistrées",
    failed: "Les exigences n'ont pas pu être enregistrées. Réessayez.",
  },
  // A required note left empty (components/distribution/note-form.tsx).
  noteRequired: "Dites pourquoi.",
  // Said wherever an action could be read as a sending (§ 12 of the ticket).
  manualNotice:
    "En V1, le dépôt se fait à la main dans The Orchard. PDS OS ne transmet rien au distributeur : il prépare, contrôle et garde la trace de ce que vous déclarez.",
  modules: {
    catalog: "Catalogue",
    master: "Master",
    legal: "Juridique",
    design: "Conception",
    project: "Projet",
  },
  readiness: {
    listen: (file: string) => `Écouter « ${file} »`,
    title: "Contrôle de préparation",
    description:
      "Ce que le dépôt réutilise, lu dans le module qui en est propriétaire. On corrige à la source : rien n'est recopié ici.",
    summary: (ready: number, total: number) =>
      `${ready} élément${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""} sur ${total}`,
    blockingCount: (count: number) =>
      count === 0
        ? "Rien ne bloque le dossier"
        : `${count} élément${count > 1 ? "s" : ""} bloque${count > 1 ? "nt" : ""} le dossier`,
    preparationStates: {
      to_prepare: "À préparer",
      partial: "Incomplet",
      ready: "Prêt pour contrôle",
    },
    next: "Prochaine action",
    nextNone:
      "Toutes les sources sont prêtes : le dossier de livraison peut être établi.",
    open: "Corriger",
    see: "Voir",
    updated: (date: string) => `Mis à jour le ${date}`,
    nonBlocking: "Ne bloque pas",
    // How each module validates what it holds, under its title.
    moduleNotes: {
      catalog:
        "Saisi au Catalogue, qui n'a pas d'étape de validation : la donnée fait foi telle que saisie.",
      master: "Le master final est validé dans le workflow Master.",
      legal:
        "Les droits restent gérés au Juridique ; Distribution ne les modifie pas.",
      design:
        "La pochette est validée dans sa Fiche Livrable, en Conception, puis livrée par la Production.",
      project: "Saisi au lancement du projet.",
    },
    states: {
      validated: "Validé à la source",
      available: "Disponible",
      unvalidated: "Non validé",
      missing: "À faire",
      restricted: "Accès restreint",
      later: "Ne bloque pas",
    },
    // One line per element the deposit needs.
    items: {
      identity: "Titre et artistes",
      isrc: "ISRC",
      credits: "Crédits auteurs et compositeurs",
      pLine: "Ligne ℗ (ayant droit et année)",
      finalMaster: "Master final",
      legalState: "Reste à suivre au Juridique",
      legalItem: "Action juridique ouverte",
      clearance: (work: string) => `Autorisation d'utilisation « ${work} »`,
      rightsConstraint: "Contrainte de droits du Cadrage",
      cover: "Pochette",
      release: "Sortie enregistrée",
      releaseDate: "Date de sortie prévue",
      upc: "UPC",
      // A collective's release (lot 15).
      platformCredits: "Crédits pour les plateformes",
      provisional: "Titre provisoire",
      trackInCatalogue: "Titre au Catalogue",
      contracts: "Contrats des participations",
      titleCover: "Pochette du titre",
    },
    // A collective's release (lot 15): its readiness' own words.
    collective: {
      delivered: (title: string, main: string, featuring: string[]) =>
        `« ${title} » · ${main}${featuring.length ? ` · featuring ${featuring.join(", ")}` : ""}`,
      rules:
        "Règles des plateformes : artiste principal en tête, invités en featuring et dans le titre.",
      cleaned:
        "« feat. » retiré du nom au Catalogue : la Distribution l'écrit selon les plateformes.",
      missingMain: (artist: string) =>
        `${artist} doit être l'artiste principal du titre au Catalogue.`,
      missingFeaturing: (names: string) =>
        `À créditer en featuring au Catalogue : ${names}.`,
      provisional: (label: string) =>
        `${label} : donnez-lui son nom dans « Titres et artistes » (un titre provisoire ne part pas).`,
      withoutMaster: (label: string) =>
        `${label} n'est pas encore au Catalogue : il manque à la compilation.`,
      contractsMissing: (names: string) =>
        `Contrat non signé de ${names}, sans dérogation de sortie.`,
      contractsOk: "Signés, ou couverts par une dérogation de sortie.",
      contractsSource: "Titres et artistes",
      contractsWhere: "Juridique › Participations et contrats",
      coverNone:
        "Pas de pochette : déposez-la dans les fichiers du titre, au Catalogue.",
      coverFile: (name: string) => `« ${name} », fichier « Pochette » du titre`,
      coverSource: "Catalogue",
      dateMissing: "Date à fixer dans « Sorties »",
      releaseSource: "Sorties",
    },
    // A borrowing's state, as the Juridique names it (legal_clearances).
    clearanceStatus: {
      to_investigate: "à instruire",
      rightsholders_identified: "ayants droit identifiés",
      contacted: "ayants droit contactés",
      waiting_external: "réponse attendue",
      negotiating: "en négociation",
      agreement_reached: "accord trouvé, licence à signer",
      document_pending: "licence envoyée, signature attendue",
      signed: "licence signée, à confirmer",
      refused: "refusé par les ayants droit",
      action_required: "action requise",
    },
    details: {
      noMainArtist: "Aucun artiste principal au Catalogue",
      noIsrc: "Pas d'ISRC au Catalogue",
      noCredits: "Aucun compositeur ni auteur au Catalogue",
      credits: (count: number) =>
        `${count} contributeur${count > 1 ? "s" : ""} crédité${count > 1 ? "s" : ""}`,
      noPLine: "Ayant droit ou année du ℗ manquant",
      pLine: (holder: string, year: number) => `℗ ${year} ${holder}`,
      titleSheet: "Fiche du titre",
      titleCredits: "Crédits du titre",
      titleRights: "Droits du titre",
      updatedOn: (where: string, date: string) =>
        `${where} · mis à jour le ${date}`,
      finalFile: (file: string, version: number) =>
        `${file} · version V${version}`,
      finalVersion: (version: number) => `Version V${version}`,
      finalValidated: (date: string, by: string | null) =>
        `Master › Master final · validé le ${date}${by ? ` par ${by}` : ""}`,
      finalBeforeShort: "Master final du Catalogue",
      finalBefore: (date: string) =>
        `Catalogue · master final déjà là le ${date}, avant le workflow`,
      finalWhere: "Master › Master final",
      noFinal: "Pas encore de master final validé",
      legalRestricted:
        "L'état des droits se lit avec l'accès au Juridique. Une personne qui l'a confirmera le contrôle « Droits et territoires ».",
      legalClear: "Aucune action juridique ouverte",
      legalBlocking: "Œuvre existante à faire autoriser avant le dépôt",
      legalOpen: "À suivre au Juridique, ne bloque pas le dépôt",
      legalWhere: "Juridique › Suivi",
      clearanceStatus: (status: string) =>
        `Juridique › Autorisations · ${status}`,
      constraint: "Confirmée au Cadrage : à respecter dans les territoires",
      coverNone:
        "Aucune Fiche Livrable de pochette en Conception (titre contenant « pochette », « cover » ou « artwork »)",
      coverStatus: (title: string, status: string) => `${title} · ${status}`,
      coverDelivered: (title: string, version: number | null) =>
        `${title}${version ? ` · v${version}` : ""} · livrée par la Production`,
      coverDeliveredOn: (date: string) =>
        `Production › Livraison · livrée le ${date}`,
      coverNotDelivered: "pas encore livrée par la Production",
      coverWaitDelivery:
        "Désignée dans les paramètres · la Production la livre",
      coverGuessed: "Trouvée par son titre en Conception : confirmez-la",
      releaseMissing: "La sortie n'est pas encore enregistrée",
      releaseSource: "Projet · Lancement",
      releaseTitle: (title: string) => `« ${title} »`,
      dateMissing: "Date de sortie à fixer au Lancement du projet",
      upcLater: "Souvent attribué par le distributeur : ne bloque pas",
    },
    // A Fiche Livrable's status, as the Conception names it.
    sheetStatus: {
      draft: "brouillon",
      to_complete: "à compléter",
      ready: "prête à soumettre",
      pending: "en attente de validation",
      ready_for_production: "validée",
      transferred: "validée et transférée",
      rejected: "refusée",
    },
    failed:
      "Une source n'a pas pu être lue. Rechargez la page ; si cela persiste, ouvrez le module concerné.",
  },
  dossier: {
    title: "Dossier de livraison",
    description:
      "Ce que vous saisirez dans The Orchard, section par section. Les valeurs viennent de leur module source ; seuls les paramètres de distribution se règlent ici.",
    origin: "Source",
    origins: {
      catalog: "Catalogue",
      master: "Master",
      legal: "Juridique",
      design: "Conception",
      project: "Projet",
      distribution: "Distribution",
    },
    missing: "À faire",
    toFill: "À faire",
    correct: "Corriger à la source",
    none: "Aucune",
    yes: "Oui",
    no: "Non",
    yesOn: (date: string) => `Oui, à partir du ${date}`,
    track: (n: number, title: string) => `Piste ${n} · ${title}`,
    clearanceToSecure: (work: string) =>
      `Autorisation d'utilisation « ${work} » à obtenir`,
    noClearanceToSecure: "Aucune autorisation à obtenir",
    audioFinal: (version: number) =>
      `Master final V${version}, validé dans le workflow Master`,
    audioBefore: "Master final du Catalogue, antérieur au workflow",
    sections: {
      release: "Sortie",
      tracks: "Pistes",
      artwork: "Visuel",
      territories: "Territoires et droits",
      pricing: "Prix et dates",
      notes: "Notes",
    },
    noFeaturing: "Aucun",
    fields: {
      releaseTitle: "Titre de la sortie",
      mainArtist: "Artiste principal",
      label: "Label",
      format: "Format",
      upc: "UPC",
      releaseDate: "Date de sortie",
      trackTitle: "Titre",
      trackArtists: "Artistes",
      featuring: "Featuring",
      isrc: "ISRC",
      pLine: "Ligne ℗",
      songwriters: "Auteurs et compositeurs",
      otherCredits: "Autres crédits",
      audio: "Audio",
      cover: "Pochette",
      territories: "Territoires",
      legal: "État des droits",
      constraint: "Contrainte du Cadrage",
      priceTier: "Catégorie tarifaire",
      preorder: "Précommande",
      prelisten: "Écoute en avant-première",
      notes: "Notes",
    },
    territoryModes: {
      world: "Monde entier",
      include: "Seulement certains pays",
      exclude: "Monde entier sauf certains pays",
    },
    territoryHints: {
      world:
        "Sous réserve des droits : le contrôle « Droits et territoires » le confirme.",
      include: "La sortie n'est livrée que dans les pays choisis.",
      exclude: "La sortie est livrée partout, sauf dans les pays choisis.",
    },
    territoriesOnly: (names: string) => `Seulement : ${names}`,
    territoriesExcept: (names: string) => `Monde entier sauf : ${names}`,
    priceTiers: {
      front: "Front (plein tarif)",
      mid: "Mid",
      budget: "Budget",
      to_confirm: "À confirmer",
    },
    params: {
      title: "Paramètres de distribution",
      description:
        "Ce qui appartient à la distribution elle-même. Tout le reste se corrige dans son module source.",
      edit: "Modifier",
      empty: "Paramètres pas encore renseignés.",
      missing: (fields: string) => `À renseigner : ${fields}`,
      saved: "Paramètres enregistrés",
      updated: (date: string) => `Mis à jour le ${date}`,
      coverGuessed:
        "Pochette trouvée par son titre : confirmez-la dans les paramètres.",
      coverChosen: "Pochette désignée dans les paramètres.",
    },
    form: {
      title: "Paramètres de distribution",
      description:
        "Territoires, précommande, avant-première, catégorie tarifaire, notes et pochette. Rien n'est envoyé au distributeur.",
      territoryMode: "Territoires",
      countries: "Pays",
      countriesPlaceholder: "Choisir des pays",
      countriesRequired: "Choisissez au moins un pays.",
      preorder: "Précommande",
      preorderOn: "Ouverture de la précommande",
      prelisten: "Écoute en avant-première",
      prelistenOn: "Début de l'écoute en avant-première",
      notSaid: "À renseigner",
      priceTier: "Catégorie tarifaire",
      priceTierPlaceholder: "À renseigner",
      notes: "Notes pour la saisie",
      notesHint: "Ce qu'il faut savoir au moment de remplir The Orchard.",
      cover: "Pochette (Fiche Livrable de la Conception)",
      coverPlaceholder: "Aucune fiche choisie",
      coverNone: "Aucune Fiche Livrable dans la Conception de ce projet.",
      coverHint:
        "La pochette reste validée dans sa Fiche Livrable ; seul le lien est gardé ici.",
      cancel: "Annuler",
      submit: "Enregistrer",
      submitting: "Enregistrement…",
      close: "Fermer",
    },
    errors: {
      forbidden:
        "Seul le responsable du projet règle les paramètres de distribution.",
      invalid: "Une valeur n'est pas valide : vérifiez le formulaire.",
      cover: "Cette Fiche Livrable n'appartient pas au projet.",
      generic: "L'enregistrement a échoué. Réessayez.",
    },
  },
  checks: {
    title: "Contrôles de cohérence",
    description:
      "Six contrôles, chacun enregistré par une personne. Le calcul de PDS OS aide, il ne vaut jamais contrôle.",
    summary: (done: number) =>
      `${done} contrôle${done > 1 ? "s" : ""} sur 6 enregistré${done > 1 ? "s" : ""}`,
    items: {
      audio: {
        label: "Audio",
        what: "Le master final référencé est bien la version validée.",
      },
      identity: {
        label: "Identité éditoriale",
        what: "Le titre et les artistes publiés correspondent au Catalogue.",
      },
      identifiers: {
        label: "Identifiants et crédits",
        what: "ISRC, crédits et métadonnées correspondent aux sources validées.",
      },
      rights: {
        label: "Droits et territoires",
        what: "Les territoires choisis sont compatibles avec les droits et contrats.",
      },
      visual: {
        label: "Visuel",
        what: "La pochette publiée correspond à la version validée en Conception.",
      },
      calendar: {
        label: "Calendrier et paramètres",
        what: "Date de sortie et paramètres de distribution cohérents avec le Projet et le dossier.",
      },
    },
    results: {
      unchecked: "Non vérifié",
      compliant: "Conforme",
      non_compliant: "Non conforme",
      not_applicable: "Non applicable",
    },
    resultHints: {
      unchecked: "Remet le contrôle à faire.",
      compliant: "Vous avez vérifié : la donnée correspond.",
      non_compliant:
        "Vous avez vérifié : elle ne correspond pas. Dites pourquoi.",
      not_applicable: "Ce contrôle ne concerne pas cette sortie.",
    },
    computedLabel: "Calcul de PDS OS",
    computedStatus: {
      coherent: "Cohérent",
      gap: "Écart",
      human: "À confirmer par une personne",
    },
    checkedBy: (who: string, date: string) => `Contrôlé par ${who} le ${date}`,
    notChecked: "Personne n'a encore enregistré ce contrôle.",
    record: "Enregistrer",
    form: {
      title: (label: string) => `Contrôle « ${label} »`,
      description:
        "Ce que vous avez vérifié vous-même. Le calcul de PDS OS n'est pas une preuve.",
      result: "Résultat",
      note: "Note",
      noteRequired: "Dites ce qui ne correspond pas.",
      cancel: "Annuler",
      submit: "Enregistrer le contrôle",
      submitting: "Enregistrement…",
      close: "Fermer",
      saved: "Contrôle enregistré",
    },
    computed: {
      noTitle: "Aucun titre rattaché au projet.",
      missing: (what: string) => `Manque à la source : ${what}.`,
      audio: "Chaque titre a un master final validé.",
      identity: "Titre et artistes présents au Catalogue, sortie enregistrée.",
      titleDiffers: (release: string, catalog: string) =>
        `Le titre de la sortie « ${release} » diffère du Catalogue « ${catalog} ».`,
      identifiers: "ISRC, crédits d'auteurs et ligne ℗ présents au Catalogue.",
      isrcDiffers: (release: string, catalog: string) =>
        `L'ISRC de la sortie (${release}) diffère du Catalogue (${catalog}).`,
      rightsRestricted:
        "Les droits se lisent avec l'accès au Juridique : une personne qui l'a doit confirmer.",
      rights:
        "Aucune action juridique ouverte. PDS OS ne sait pas comparer les territoires aux contrats : une personne confirme.",
      rightsConstraints: (count: number) =>
        `${count} contrainte${count > 1 ? "s" : ""} de droits du Cadrage à confronter aux territoires choisis.`,
      noCover: "Aucune pochette désignée.",
      // A title's release (lot 15).
      titleCover: (file: string) =>
        `Pochette du titre au Catalogue : « ${file} ».`,
      noTitleCover: "Pas de pochette dans les fichiers du titre, au Catalogue.",
      visual: (title: string) =>
        `« ${title} » est validée en Conception et livrée par la Production.`,
      coverNotValidated: (title: string) =>
        `« ${title} » n'est pas encore livrée par la Production.`,
      noDate: "Pas de date de sortie prévue.",
      preorderLate: "La précommande ouvre le jour de la sortie ou après.",
      prelistenLate: "L'avant-première commence le jour de la sortie ou après.",
      paramsMissing: "Des paramètres de distribution restent à renseigner.",
      calendar: (date: string) =>
        `Sortie prévue le ${date}, paramètres renseignés.`,
    },
  },
  validation: {
    title: "Validation interne",
    description:
      "Une personne autorisée valide le dossier avant le dépôt manuel dans The Orchard.",
    validator: "Validateur Distribution",
    noValidator:
      "Aucun validateur désigné : aucune validation ne peut être demandée ni affichée comme acquise.",
    designate: "Désigner",
    change: "Changer",
    noValidatorOption:
      "Aucune autre personne de l'organisation ne détient le droit de valider.",
    submit: (n: number) => `Soumettre la V${n} à validation`,
    submitTitle: (n: number) => `Soumettre la V${n} à validation`,
    submitBody: (who: string) =>
      `${who} recevra le dossier tel qu'il est maintenant. Les paramètres seront figés jusqu'à sa décision.`,
    submitConfirm: "Soumettre",
    submitted: "Dossier soumis à validation",
    cannotSubmit: "Pas encore soumissible",
    approve: "Valider",
    approveTitle: (n: number) => `Valider la V${n}`,
    approveBody:
      "Le responsable pourra déclarer le dépôt manuel dans The Orchard. PDS OS n'envoie rien.",
    reject: "Refuser",
    rejectTitle: (n: number) => `Refuser la V${n}`,
    rejectBody: "Le dossier revient au responsable avec votre motif.",
    rejectNote: "Motif",
    decided: "Décision enregistrée",
    versions: "Versions du dossier",
    noVersion: "Aucune version soumise.",
    version: (n: number) => `V${n}`,
    status: {
      pending: "En attente de validation",
      approved: "Validée",
      rejected: "Refusée",
      superseded: "Remplacée",
    },
    submittedLine: (
      who: string | null,
      date: string,
      validator: string | null,
    ) =>
      `Soumise le ${date}${who ? ` par ${who}` : ""}${validator ? `, à ${validator}` : ""}`,
    decidedLine: (who: string | null, date: string) =>
      `Décidée le ${date}${who ? ` par ${who}` : ""}`,
    waitingFor: (who: string | null) =>
      who ? `En attente de ${who}` : "En attente du validateur",
    drift: (n: number) => `Changé à la source depuis la V${n}`,
    driftLine: (label: string, before: string | null, now: string | null) =>
      `${label} : ${before ?? "vide"} → ${now ?? "vide"}`,
    gate: {
      // A collective's release (lot 15).
      provisional: (names: string) =>
        `Dépôt impossible : titre provisoire (${names}). Donnez-lui son nom dans « Titres et artistes ».`,
      readOnly: {
        archived:
          "Sortie archivée par le changement du mode de sortie : son dépôt se lit, il ne se soumet plus.",
        abandoned:
          "Titre abandonné : sa sortie se lit, elle ne se soumet plus.",
      },
      pending: (n: number) => `La V${n} attend la décision du validateur.`,
      approved: (n: number) => `La V${n} est validée.`,
      blockers: () =>
        "La Préparation n'est pas prête : corrigez d'abord à la source ce qui bloque.",
      notConfirmed: "Confirmez d'abord les paramètres de distribution.",
      params: (fields: string) => `Paramètres à renseigner : ${fields}.`,
      noValidator: "Aucun validateur désigné.",
      nonCompliant: (count: number) =>
        `${count} contrôle${count > 1 ? "s" : ""} non conforme${count > 1 ? "s" : ""}.`,
      unchecked: (count: number) =>
        `${count} contrôle${count > 1 ? "s" : ""} sur 6 non vérifié${count > 1 ? "s" : ""} : le validateur le verra.`,
      unrecorded: (count: number) =>
        `${count} contrôle${count > 1 ? "s" : ""} sur 6 à enregistrer avant de soumettre (« Non applicable » compte).`,
      refusalUnresolved: (n: number, modules: string) =>
        `La cause du refus de la V${n} n'a pas changé : ${modules}.`,
      anomaliesUnresolved: (modules: string) =>
        `Une anomalie n'est pas corrigée à la source : ${modules}.`,
    },
    cancel: "Annuler",
    close: "Fermer",
    errors: {
      forbidden: "Vous n'avez pas le droit de faire cette action.",
      invalid: "Une valeur n'est pas valide.",
      // A collective (lot 15): a deposit is a release's.
      releaseRequired:
        "Choisissez la sortie dans « Sorties » : la Distribution d'un projet collectif se fait sortie par sortie.",
      validatorInvalid:
        "Cette personne ne peut pas valider : elle doit détenir le droit de valider et ne pas être le responsable.",
      versionOpen:
        "Une version attend une décision ou est validée : le dossier est figé.",
      noValidator: "Désignez d'abord un validateur.",
      paramsNotConfirmed: "Confirmez d'abord les paramètres de distribution.",
      legalBlockers:
        "Une autorisation d'utilisation reste à obtenir au Juridique : la Préparation n'est pas prête.",
      nonCompliant:
        "Un contrôle est non conforme : corrigez à la source d'abord.",
      notValidator: "Seul le validateur désigné décide de cette version.",
      alreadyDecided: "Cette version a déjà été décidée.",
      reasonRequired: "Un refus dit pourquoi.",
      noteRequired: "Un contrôle non conforme dit pourquoi.",
      checksUnrecorded:
        "Les six contrôles ne sont pas tous enregistrés : enregistrez-les (« Non applicable » compte), ou demandez une dérogation à la direction.",
      refusalUnresolved:
        "La cause du refus n'a pas changé à la source : corrigez-la, ou demandez une dérogation à la direction.",
      anomaliesUnresolved:
        "Une anomalie n'est pas corrigée dans son module : corrigez-la, ou demandez une dérogation à la direction.",
      modulesRequired: "Un refus dit ce qui est à corriger, et où.",
      scopeRequired: "Dites ce que la dérogation laisse passer.",
      dueInvalid: "L'échéance est à venir.",
      noDerogation: "Aucune dérogation en attente.",
      generic: "L'action a échoué. Réessayez.",
    },
  },
  tracking: {
    sources: {
      orchard_portal: "Portail The Orchard",
      orchard_email: "E-mail de The Orchard",
      email: "Autre e-mail",
      call: "Appel",
      other: "Autre",
    },
    source: "Source",
    title: "Suivi du dépôt",
    description:
      "Le dépôt se fait à la main dans The Orchard. Ici, vous déclarez ce qui s'est passé : chaque état est distinct et aucun n'est déduit d'un autre.",
    notValidatedTitle: "Dossier pas encore validé",
    notValidatedBody:
      "Le dépôt manuel ne peut être déclaré qu'après la validation interne du dossier.",
    toDossier: "Aller au Dossier",
    cycle: (n: number) => `Cycle de dépôt · dossier V${n}`,
    cycleHint:
      "Une correction demandée se fait dans le module source, puis une nouvelle version du dossier est validée et déposée.",
    states: {
      deposit: "Dépôt",
      received: "Réception par le distributeur",
      outcome: "Traitement par le distributeur",
      delivered: "Livraison aux plateformes",
    },
    values: {
      deposit: { none: "Non déposé", done: "Dépôt manuel déclaré effectué" },
      received: { none: "Inconnue", done: "Déclarée reçue" },
      outcome: {
        none: "Aucun retour déclaré",
        corrections_requested: "Corrections demandées",
        accepted: "Déclaré accepté",
      },
      delivered: { none: "Non déclarée", done: "Déclarée livrée" },
    },
    evidence: {
      declared: "Déclaré, sans preuve",
      proven: "Déclaré, preuve jointe",
    },
    by: (who: string | null, date: string) =>
      `Déclaré le ${date}${who ? ` par ${who}` : ""}`,
    on: (date: string) => `Date indiquée : ${date}`,
    noDate: "Date non renseignée",
    orchardId: (id: string) => `Identifiant The Orchard : ${id}`,
    noOrchardId: "Identifiant The Orchard non renseigné",
    noProof: "Aucune preuve jointe",
    proof: "Voir la preuve",
    proofLink: "Ouvrir le lien",
    kinds: {
      deposit: "Déclarer le dépôt",
      received: "Déclarer la réception",
      corrections_requested: "Corrections demandées",
      accepted: "Déclarer l'acceptation",
      platforms_delivered: "Déclarer la livraison aux plateformes",
      available: "Déclarer la disponibilité publique",
    },
    kindTitles: {
      deposit: "Dépôt manuel effectué dans The Orchard",
      received: "Le distributeur a reçu le dossier",
      corrections_requested: "Le distributeur demande des corrections",
      accepted: "Le distributeur a accepté la sortie",
      platforms_delivered: "Le distributeur a livré les plateformes",
      available: "La sortie est disponible publiquement",
    },
    kindBodies: {
      deposit:
        "Vous avez fait le dépôt vous-même dans The Orchard. Date, identifiant et preuve sont facultatifs : leur absence restera visible.",
      received:
        "Ce que vous savez de la réception. Cela ne vaut ni acceptation ni livraison.",
      corrections_requested:
        "Ce que The Orchard demande. La correction se fera dans le module source, puis une nouvelle version du dossier.",
      accepted:
        "Ce que vous savez de l'acceptation. Cela ne vaut pas livraison aux plateformes.",
      platforms_delivered:
        "Ce que vous savez de la livraison. Cela ne vaut pas disponibilité publique, qui se vérifie plateforme par plateforme.",
      available:
        "Ce que vous savez de la disponibilité. Elle restera « déclarée » tant que chaque plateforme n'aura pas été vérifiée par une personne.",
    },
    form: {
      declaredOn: "Date (facultatif)",
      orchardId: "Identifiant The Orchard (facultatif)",
      note: "Note",
      noteCorrections: "Corrections demandées",
      noteRequired: "Dites ce que The Orchard demande.",
      proofFile: "Preuve (facultatif)",
      proofHint: "Capture, PDF ou courriel exporté, 50 Mo au plus.",
      proofChosen: (name: string) => `Fichier choisi : ${name}`,
      proofUrl: "Ou lien vers la preuve (facultatif)",
      proofUrlHint: "Commence par https://",
      submit: "Déclarer",
      saved: "Déclaration enregistrée",
    },
    withdraw: "Retirer",
    withdrawTitle: "Retirer cette déclaration",
    withdrawBody:
      "Elle reste dans l'historique, marquée retirée, avec votre motif.",
    withdrawNote: "Motif",
    withdrawn: "Déclaration retirée",
    withdrawnLine: (who: string | null, date: string, note: string | null) =>
      `Retirée le ${date}${who ? ` par ${who}` : ""}${note ? ` : « ${note} »` : ""}`,
    history: "Chronologie",
    historyEmpty: "Aucune déclaration pour l'instant.",
    errors: {
      forbidden:
        "Seul le responsable du projet déclare le dépôt et ses suites.",
      invalid: "Une valeur n'est pas valide.",
      notValidated: "Le dossier doit être validé avant de déclarer le dépôt.",
      notDeposited: "Déclarez d'abord le dépôt de cette version.",
      alreadyDeclared: "C'est déjà déclaré pour cette version.",
      alreadyWithdrawn: "Cette déclaration est déjà retirée.",
      dateOrder:
        "Cette date ne suit pas l'ordre : le dépôt après la validation, puis la réception, l'acceptation, la livraison.",
      depositInUse:
        "D'autres déclarations reposent sur ce dépôt : retirez-les d'abord.",
      reasonRequired: "Dites pourquoi.",
      noteRequired: "Dites ce que The Orchard demande.",
      fileTooLarge: "Le fichier dépasse 50 Mo.",
      uploadFailed: "L'envoi du fichier a échoué. Réessayez.",
      generic: "L'action a échoué. Réessayez.",
    },
  },
  platforms: {
    title: "Plateformes",
    description:
      "Le lien officiel de chaque plateforme, sa disponibilité déclarée, puis ce qu'une personne a vérifié en ouvrant le lien.",
    availability: "Disponibilité publique",
    availabilityStates: {
      not_declared: "Non déclarée",
      declared: "Déclarée, non vérifiée",
      partially_verified: "Vérifiée partiellement",
      verified: "Vérifiée",
    },
    availabilitySummary: (verified: number, total: number) =>
      `${verified} plateforme${verified > 1 ? "s" : ""} de référence vérifiée${verified > 1 ? "s" : ""} sur ${total}`,
    withoutLink: (count: number) => `${count} sans lien officiel`,
    needsDeposit:
      "La disponibilité publique se déclare une fois le dépôt déclaré (étape Suivi).",
    names: {
      spotify: "Spotify",
      apple_music: "Apple Music",
      deezer: "Deezer",
      youtube_music: "YouTube Music",
      amazon_music: "Amazon Music",
    },
    noLink: "Lien non renseigné",
    openLink: "Ouvrir le lien",
    declared: (who: string | null, date: string) =>
      `Disponibilité déclarée le ${date}${who ? ` par ${who}` : ""}`,
    notDeclared: "Disponibilité non déclarée",
    openAnomaly: "Anomalie ouverte :",
    seeAnomaly: "Voir dans le Suivi",
    verification: "Vérification",
    compliance: "Conformité",
    verifications: {
      unchecked: "À vérifier",
      verified: "Vérifiée disponible",
      unavailable: "Indisponible",
    },
    verificationHints: {
      unchecked: "Remet la vérification à faire.",
      verified: "Vous avez ouvert le lien : la sortie y est disponible.",
      unavailable:
        "Vous avez ouvert le lien : la sortie n'y est pas. Dites ce que vous avez vu.",
    },
    compliances: {
      unchecked: "Conformité non vérifiée",
      compliant: "Conforme",
      non_compliant: "Non conforme",
    },
    complianceHints: {
      unchecked: "Pas encore comparé au dossier validé.",
      compliant:
        "Titre, artistes, pochette et version correspondent au dossier validé.",
      non_compliant: "Quelque chose diffère du dossier validé. Dites quoi.",
    },
    checkedBy: (who: string | null, date: string) =>
      `par ${who ?? "—"} le ${date}`,
    suggestion:
      "Lien trouvé par la détection automatique, à reprendre et vérifier :",
    useSuggestion: "Utiliser ce lien",
    edit: "Modifier",
    addLink: "Renseigner",
    verify: "Vérifier",
    add: "Ajouter une plateforme",
    form: {
      title: (name: string) => `${name}`,
      description:
        "Le lien officiel de la sortie sur cette plateforme. Changer le lien remet sa vérification à faire.",
      addTitle: "Ajouter une plateforme",
      addDescription: "Une plateforme hors des cinq de référence.",
      label: "Nom de la plateforme",
      url: "Lien officiel",
      urlHint: "Commence par https://",
      available: "Disponibilité déclarée",
      availableChoices: { no: "Pas déclarée", yes: "Déclarée disponible" },
      submit: "Enregistrer",
      saved: "Plateforme enregistrée",
      verifyTitle: (name: string) => `Vérifier ${name}`,
      verifyDescription:
        "Ce que vous avez constaté vous-même en ouvrant le lien. PDS OS ne vérifie rien automatiquement.",
      verificationNote: "Ce que vous avez vu",
      complianceNote: "Ce qui diffère",
      noteRequired: "Dites ce que vous avez constaté.",
      verifySubmit: "Enregistrer la vérification",
      verified: "Vérification enregistrée",
    },
    errors: {
      forbidden: "Vous n'avez pas le droit de faire cette action.",
      invalid: "Une valeur n'est pas valide.",
      // A collective (lot 15): a deposit is a release's.
      releaseRequired:
        "Choisissez la sortie dans « Sorties » : la Distribution d'un projet collectif se fait sortie par sortie.",
      noLink: "Renseignez d'abord le lien officiel.",
      generic: "L'action a échoué. Réessayez.",
    },
  },
  anomalies: {
    title: "Anomalies",
    description:
      "Ce qui ne va pas, et le module où le corriger. Rien ne se corrige ici : une fois la source corrigée, une nouvelle version du dossier est préparée depuis l'étape Dossier.",
    empty: "Aucune anomalie déclarée.",
    emptyChecks:
      "Aucune anomalie déclarée, mais des contrôles restent non vérifiés : l'absence d'anomalie ne vaut pas conformité.",
    report: "Signaler une anomalie",
    kinds: {
      wrong_audio: "Mauvais master audio",
      metadata: "Erreur de métadonnées",
      credit_isrc: "Crédit ou ISRC incorrect",
      cover: "Pochette incorrecte",
      platform_unavailable: "Titre indisponible sur une plateforme",
      territory_rights: "Problème de territoire ou de droits",
      date: "Date incorrecte",
      other: "Autre anomalie",
    },
    severities: { minor: "Mineure", major: "Majeure", blocking: "Bloquante" },
    states: {
      open: "Ouverte",
      in_correction: "En correction à la source",
      resolved: "Résolue",
      dismissed: "Écartée",
    },
    modules: {
      catalog: "Catalogue",
      master: "Master",
      legal: "Juridique",
      design: "Conception",
      project: "Projet",
      distribution: "Paramètres de distribution",
      distributor: "Côté distributeur",
    },
    correctIn: (module: string) => `À corriger dans : ${module}`,
    open: "Ouvrir",
    reported: (who: string | null, date: string, version: number | null) =>
      `Signalée le ${date}${who ? ` par ${who}` : ""}${version ? ` · dossier V${version}` : ""}`,
    stateLine: (state: string, who: string | null, date: string) =>
      `${state} le ${date}${who ? ` par ${who}` : ""}`,
    platform: (name: string) => `Plateforme : ${name}`,
    change: "Changer l'état",
    form: {
      title: "Signaler une anomalie",
      description:
        "Décrivez ce qui ne va pas et le module propriétaire de la correction. Distribution ne modifie aucune source.",
      kind: "Type",
      description_: "Description",
      platform: "Plateforme concernée (facultatif)",
      platformNone: "Aucune",
      severity: "Gravité",
      module: "Module où corriger",
      submit: "Signaler",
      saved: "Anomalie signalée",
      stateTitle: "État de l'anomalie",
      stateDescription:
        "Une anomalie résolue ou écartée dit pourquoi ; elle reste dans l'historique.",
      state: "État",
      note: "Pourquoi",
      noteRequired: "Dites pourquoi.",
      stateSubmit: "Enregistrer",
      stateSaved: "État enregistré",
    },
    newVersion: (n: number) => `Préparer la V${n}`,
    newVersionTitle: (n: number) => `Préparer la V${n} du dossier`,
    newVersionBody: (current: number) =>
      `Après une correction faite dans son module source. La V${current} et son cycle de dépôt restent dans l'historique ; paramètres et contrôles redeviennent modifiables et les six contrôles repartent à « non vérifié ».`,
    newVersionNote: "Ce qui a été corrigé, et où",
    newVersionSubmit: "Préparer la nouvelle version",
    newVersionDone: "Nouvelle version en préparation",
    correctionsCallout:
      "Le distributeur demande des corrections. Corrigez dans le module source, puis préparez une nouvelle version du dossier depuis l'étape Dossier.",
    errors: {
      forbidden: "Vous n'avez pas le droit de faire cette action.",
      invalid: "Une valeur n'est pas valide.",
      // A collective (lot 15): a deposit is a release's.
      releaseRequired:
        "Choisissez la sortie dans « Sorties » : la Distribution d'un projet collectif se fait sortie par sortie.",
      reasonRequired: "Dites pourquoi.",
      validationPending: "Une version attend sa validation.",
      nothingToSupersede: "Aucune version validée à remplacer.",
      generic: "L'action a échoué. Réessayez.",
    },
  },
  closure: {
    title: "Clôture",
    description:
      "Fermer le suivi de la distribution : normalement si tout est déclaré et vérifié, sinon avec des réserves arbitrées. Une réserve n'est jamais transformée en vérification.",
    conditionsTitle: "Conditions d'une clôture normale",
    conditions: {
      distributor:
        "Réception, acceptation et livraison aux plateformes déclarées",
      availability: "Les cinq plateformes de référence vérifiées disponibles",
      compliance: "Leur conformité vérifiée",
      checks: "Les six contrôles enregistrés, aucun non conforme",
      anomalies: "Aucune anomalie ouverte",
    },
    met: "Remplie",
    unmet: "Non remplie",
    reservesTitle: "Réserves",
    reservesDescription:
      "Ce qui reste non vérifié, incomplet ou non conforme, regroupé par cause. Le détail reste consultable.",
    noReserve: "Aucune réserve : une clôture normale est possible.",
    causes: {
      distributor: (n: number) => `Retours du distributeur non déclarés (${n})`,
      availability: (n: number) =>
        `Disponibilité non vérifiée sur ${n} plateforme${n > 1 ? "s" : ""}`,
      compliance: (n: number) =>
        `Conformité non vérifiée sur ${n} plateforme${n > 1 ? "s" : ""}`,
      checks: (n: number) =>
        `${n} contrôle${n > 1 ? "s" : ""} non effectué${n > 1 ? "s" : ""} ou non conforme${n > 1 ? "s" : ""}`,
      anomalies: (n: number) =>
        `${n} anomalie${n > 1 ? "s" : ""} encore ouverte${n > 1 ? "s" : ""}`,
    },
    details: {
      received: "Réception non déclarée",
      accepted: "Acceptation non déclarée",
      corrections: "Corrections demandées, pas d'acceptation déclarée depuis",
      delivered: "Livraison aux plateformes non déclarée",
    },
    seeDetail: "Voir le détail",
    needsDeposit:
      "Une clôture se propose une fois le dossier validé et le dépôt déclaré.",
    needsValidator:
      "Aucun validateur Distribution désigné : la clôture ne peut pas être validée. Désignez-le à l'étape Dossier.",
    proposeNormal: "Proposer une clôture normale",
    proposeNormalBody: (who: string) =>
      `${who} validera la clôture. Les conditions seront revérifiées au moment de sa décision.`,
    proposeReserves: "Proposer une clôture avec réserves",
    reservesFormTitle: "Clôture avec réserves",
    reservesFormDescription:
      "Les réserves ci-dessous resteront non vérifiées : le dossier sera marqué « clôturé avec réserves », jamais « distribué » ni « conforme ».",
    arbitration: "Arbitrage : pourquoi clôturer malgré ces réserves",
    arbitrationRequired: "L'arbitrage est obligatoire.",
    acknowledge:
      "Je confirme que ces réserves restent non vérifiées après la clôture.",
    acknowledgeRequired: "Confirmez que les réserves restent non vérifiées.",
    proposeSubmit: "Proposer la clôture",
    proposed: "Clôture proposée",
    pending: (kind: string, who: string | null) =>
      `${kind} proposée, en attente de ${who ?? "la validation"}`,
    kinds: {
      normal: "Clôture normale",
      reserves: "Clôture avec réserves",
      cancelled: "Distribution annulée",
      abandoned: "Distribution abandonnée",
    },
    reasonKinds: {
      release_cancelled: "Sortie annulée",
      artist_withdrawal: "Retrait de l'artiste",
      rights_issue: "Problème de droits",
      distributor_refusal: "Refus du distributeur",
      direction_decision: "Décision exceptionnelle de la direction",
      other: "Autre",
    },
    criticalities: {
      minor: "Mineure",
      major: "Majeure",
      critical: "Critique",
    },
    // What proof lifts a reserve of each cause (proposed, changed).
    expectedProofs: {
      distributor: "L'e-mail ou la capture du portail de The Orchard",
      availability: "La capture de chaque plateforme, avec son lien",
      compliance: "La capture de la page conforme sur chaque plateforme",
      checks: "Le contrôle enregistré par une personne",
      anomalies: "L'anomalie résolue dans son module",
    },
    approve: "Valider la clôture",
    approveTitle: "Valider la clôture",
    approveBody:
      "Le suivi de la distribution sera fermé. Une réouverture reste possible et sera tracée.",
    reject: "Refuser",
    rejectTitle: "Refuser la clôture",
    rejectBody: "La proposition revient au responsable avec votre motif.",
    rejectNote: "Motif",
    decided: "Décision enregistrée",
    closedNormal: (date: string, who: string | null) =>
      `Clôturée normalement le ${date}${who ? ` par ${who}` : ""}`,
    closedReserves: (date: string, who: string | null, n: number) =>
      `Clôturée avec réserves le ${date}${who ? ` par ${who}` : ""} · ${n} réserve${n > 1 ? "s" : ""} non vérifiée${n > 1 ? "s" : ""}`,
    arbitrationLine: (text: string) => `Arbitrage : « ${text} »`,
    reopen: "Rouvrir",
    reopenTitle: "Rouvrir le suivi",
    reopenBody:
      "La décision de clôture reste dans l'historique ; la réouverture y est ajoutée avec votre motif.",
    reopenNote: "Motif",
    reopened: "Suivi rouvert",
    historyTitle: "Clôtures",
    historyLine: (kind: string, status: string, date: string) =>
      `${kind} · ${status} · proposée le ${date}`,
    statuses: {
      pending: "en attente",
      closed: "clôturée",
      rejected: "refusée",
      reopened: "rouverte",
    },
    reopenedLine: (date: string, who: string | null, note: string | null) =>
      `Rouverte le ${date}${who ? ` par ${who}` : ""}${note ? ` : « ${note} »` : ""}`,
    errors: {
      forbidden: "Vous n'avez pas le droit de faire cette action.",
      invalid: "Une valeur n'est pas valide.",
      // A collective (lot 15): a deposit is a release's.
      releaseRequired:
        "Choisissez la sortie dans « Sorties » : la Distribution d'un projet collectif se fait sortie par sortie.",
      noValidator: "Désignez d'abord un validateur Distribution.",
      notDeposited: "Le dépôt de la version validée n'est pas déclaré.",
      closureOpen: "Une clôture est déjà proposée ou en cours.",
      conditionsNotMet:
        "Toutes les conditions d'une clôture normale ne sont pas remplies : proposez une clôture avec réserves.",
      notValidator: "Seul le validateur désigné décide de la clôture.",
      alreadyDecided: "Cette clôture a déjà été décidée.",
      reasonRequired: "Dites pourquoi.",
      notClosed: "Le suivi n'est pas clôturé.",
      notAccepted:
        "The Orchard n'a pas encore accepté : seule la direction peut clôturer avant, pour une raison qu'elle dit.",
      reasonKindRequired: "Choisissez la raison.",
      reservesInvalid:
        "Chaque réserve a un responsable, une échéance à venir et la preuve attendue.",
      notDirection: "Seule la direction décide d'une clôture anticipée.",
      notOpen: "Cette réserve n'est plus ouverte.",
      notRequested: "Aucune levée n'est demandée pour cette réserve.",
      samePerson:
        "La levée est confirmée par une autre personne que celle qui l'a demandée.",
      proofRequired: "Joignez la preuve : un fichier ou un lien.",
      generic: "L'action a échoué. Réessayez.",
    },
  },
  history: {
    title: "Historique",
    description:
      "Qui a déclaré, validé, corrigé, vérifié ou clôturé, quand et avec quelle preuve. Rien n'en est effacé.",
    empty: "Rien n'a encore été fait sur la distribution.",
    events: {
      parameters: (fields: string) =>
        `Paramètres de distribution enregistrés (${fields})`,
      parametersConfirmed: "Paramètres de distribution confirmés",
      validatorSet: "Validateur Distribution désigné",
      validatorCleared: "Validateur Distribution retiré",
      check: (label: string, result: string) =>
        `Contrôle « ${label} » : ${result}`,
      submitted: (n: number) => `V${n} du dossier soumise à validation`,
      approved: (n: number) => `V${n} du dossier validée`,
      rejected: (n: number) => `V${n} du dossier refusée`,
      superseded: (n: number) => `Nouvelle version préparée après la V${n}`,
      declaration: (what: string, proof: boolean) =>
        `${what} (${proof ? "preuve jointe" : "sans preuve"})`,
      withdrawn: (what: string) => `Déclaration retirée : ${what}`,
      proofAdded: (what: string) =>
        what ? `Preuve ajoutée : ${what}` : "Preuve ajoutée",
      platformSaved: (name: string) => `Plateforme ${name} renseignée`,
      platformVerified: (name: string, seen: string, match: string) =>
        `${name} vérifiée : ${seen}, ${match}`,
      anomaly: (kind: string) => `Anomalie signalée : ${kind}`,
      anomalyState: (state: string) => `Anomalie passée à : ${state}`,
      closureProposed: (kind: string) => `${kind} proposée`,
      closureClosed: (kind: string) => `${kind} validée`,
      closureRejected: (kind: string) => `${kind} refusée`,
      closureReopened: "Suivi rouvert après clôture",
      rejectedModules: (n: number, modules: string) =>
        `V${n} du dossier refusée · à corriger dans : ${modules}`,
      checksReset: (labels: string, reason: string) =>
        `Contrôles à refaire (${reason}) : ${labels}`,
      derogationGranted: (scope: string, due: string) =>
        `Dérogation de la direction : ${scope}, à régler avant le ${due}`,
      derogationRevoked: "Dérogation retirée",
      submittedDerogated: (n: number) =>
        `V${n} du dossier soumise à validation avec une dérogation de la direction`,
      reserveLiftRequested: (label: string) => `Levée demandée : ${label}`,
      reserveLifted: (label: string) => `Réserve levée : ${label}`,
      reserveLiftRefused: (label: string) => `Levée refusée : ${label}`,
      other: (kind: string) => kind,
    },
    note: (text: string) => `« ${text} »`,
  },
};
