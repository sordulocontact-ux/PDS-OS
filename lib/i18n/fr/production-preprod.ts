/** Marketing › Production: preproduction (team briefs, technical call, plan, equipment, schedule, budget, call sheet, readiness). */
export const productionPreprod = {
  title: "Préproduction",
  loading: "Chargement de la préproduction…",
  locked: "La production n'est pas en cours : la préproduction est en lecture.",
  readOnly:
    "Seul le responsable du projet organise la préproduction. Vous la lisez.",
  cancel: "Annuler",
  close: "Fermer",
  saving: "Enregistrement…",
  save: "Enregistrer",
  edit: "Modifier",
  remove: "Supprimer",
  notFilled: "Non renseigné",
  menu: (what: string) => `Actions pour « ${what} »`,
  by: (who: string, date: string) => `${who}, le ${date}`,

  summary: {
    label: "Où en est la préproduction",
    briefs: "Briefs transmis",
    items: "Points du call",
    plan: "Plan",
    location: "Lieu",
    equipment: "Matériel",
    shoot: "Tournage",
    callSheet: "Feuille de service",
    readiness: "Contrôles",
    ratio: (a: number, b: number) => `${a} / ${b}`,
    days: (n: number) =>
      n === 0 ? "Aujourd'hui" : n > 0 ? `J-${n}` : `Passé (J+${-n})`,
    noDate: "Sans date",
  },

  briefs: {
    title: "Briefs d'équipe",
    description:
      "Chaque équipe reçoit l'extrait qui la concerne, lié à sa source et à sa version. Rien n'est envoyé hors de PDS OS.",
    teams: {
      director: "Réalisation",
      camera: "Image",
      sound: "Son",
      performers: "Musiciens / artistes",
      production: "Production et régie",
    },
    states: {
      draft: "Non transmis",
      transmitted: "Transmis",
      outdated: "À retransmettre",
    },
    recipients: (names: string) => `Destinataires : ${names}`,
    noRecipient: "Personne n'est encore affecté à cette équipe.",
    transmittedBy: (who: string, date: string) =>
      `Transmis par ${who} le ${date}`,
    versions: (fiche: number | null, source: number | null) =>
      [
        fiche !== null ? `Fiche Livrable v${fiche}` : null,
        source !== null ? `version source v${source}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Sans version source",
    outdatedHint:
      "La source ou les champs ont changé depuis la transmission : retransmettez pour que l'équipe lise la même chose.",
    own: "Propre à l'équipe",
    lines: {
      concept: "Concept",
      intention: "Intention",
      formats: "Formats et durée",
      items: "Éléments",
      staging: "Intention de mise en scène",
      constraints: "Contraintes",
      leftToProduction: "Laissé à la Production",
      coverage: "Découpage",
      camera: "Dispositif caméra",
      runOfShow: "Déroulé",
      references: "Références visuelles",
      location: "Lieu et accès",
      capture: "Captation attendue",
      shootDate: "Date de tournage",
    },
    fields: {
      notes: "Consignes",
      sources: "Sources à capter",
      audioDelivery: "Livraison audio",
      arrangement: "Arrangement",
      rehearsals: "Répétitions",
      constraints: "Contraintes de jeu",
    },
    editAction: "Compléter",
    editTitle: (team: string) => `Brief ${team}`,
    editDescription:
      "Ce qui est propre à cette équipe. L'extrait de la Fiche et du brief se met à jour tout seul.",
    saved: "Brief enregistré.",
    transmit: "Transmettre",
    retransmit: "Retransmettre",
    transmitTitle: (team: string) => `Transmettre le brief ${team} ?`,
    transmitBody:
      "PDS OS garde la version transmise et la version source sur laquelle elle repose. Rien n'est envoyé par e-mail.",
    transmitting: "Transmission…",
    transmitted: "Brief transmis.",
  },

  call: {
    title: "Call technique",
    description:
      "Les sujets du call et ce qu'il a produit, point par point. Une proposition de PO ne compte qu'une fois confirmée.",
    prepare: "Préparer le call technique",
    sheetTitle: "Préparer le call technique",
    sheetBody:
      "PO a préparé l'objectif, les participants par fonction et l'ordre du jour à partir de ce qui reste ouvert. Ajustez, puis vérifiez avant de le créer.",
    defaultTitle: (deliverable: string) => `Call technique · ${deliverable}`,
    purposeLabel: "Objectif du call",
    purpose: (deliverable: string) =>
      `Arrêter la réalisation, la captation, le lieu, l'équipe, le matériel, le planning et le budget du tournage de « ${deliverable} »`,
    topicsLabel: "Ordre du jour",
    noTopics: "Ajoutez les sujets que vous voulez aborder.",
    noParticipants: "Ajoutez au moins une personne.",
    documentsLabel: "Documents à avoir sous la main",
    noDocuments: "Aucun document pour l'instant.",
    failed: "Le call n'a pas pu être créé. Réessayez.",
    ownerRole: "Chef de projet",
    directorRole: "Réalisation",
    person: (name: string, role: string) => `${name} · ${role}`,
    topics: {
      direction: "Réalisation et découpage",
      sound: "Captation sonore",
      location: "Lieu et lumière",
      team: "Équipe et responsabilités",
      equipment: "Besoins matériels",
      schedule_budget: "Planning et budget",
    },
    otherTopic: "Autres",
    questions: {
      director: "Qui réalise ?",
      coverage: "Plan-séquence, découpage ou mixte : quel découpage ?",
      runOfShow: "Quel déroulé pour la journée de tournage ?",
      sound: "Playback, captation live ou mixte : quelle captation ?",
      locationFind: "Où tourner ?",
      locationVerify: "Le lieu pressenti est-il confirmé ?",
      access: "Quels accès, horaires et contraintes sur le lieu ?",
      light: "Quels besoins en lumière ?",
      noTeam: "Quels postes faut-il pour ce tournage ?",
      staffing: (n: number) =>
        n === 1
          ? "1 place reste à pourvoir : qui ?"
          : `${n} places restent à pourvoir : qui ?`,
      availability: (n: number) =>
        n === 1
          ? "1 disponibilité reste à confirmer."
          : `${n} disponibilités restent à confirmer.`,
      multiRole: (name: string, roles: string) =>
        `${name} tient plusieurs fonctions (${roles}) : est-ce tenable ?`,
      noEquipment: "Quel matériel faut-il (image, lumière, son) ?",
      toVerify: (n: number) =>
        n === 1
          ? "1 ligne de devis reste à vérifier."
          : `${n} lignes de devis restent à vérifier.`,
      needsQuotes: "Quels loueurs consulter pour le matériel sans devis ?",
      shootDate: "Quelle date de tournage ?",
      deliveryDate: "Quelle date de livraison ?",
      shootDiverges:
        "La date de tournage diffère de la Fiche Livrable : laquelle retenir ?",
      envelope: "Quelle enveloppe pour ce tournage ?",
      toEstimate: (n: number) =>
        n === 1 ? "1 poste reste à estimer." : `${n} postes restent à estimer.`,
      toDecide: (body: string) => `À arbitrer : ${body}`,
      hypothesis: (body: string) => `Hypothèse à confirmer : ${body}`,
    },
    documents: {
      fiche: (n: number) => `Fiche Livrable v${n}`,
      directorBrief: "Brief réalisateur",
      teamBrief: (team: string) => `Brief ${team}`,
      quotes: (n: number) => (n === 1 ? "1 devis" : `${n} devis`),
    },
    calls: "Calls de production",
    afterCall:
      "Le compte rendu est arrivé dans la Préproduction : confirmez ou rejetez les propositions de PO.",
    noCalls: "Aucun call de production pour ce livrable.",
    planAction: {
      plan: "Planifier",
      confirmAndPlan: "Confirmer et planifier",
      title: "Planifier cette action",
      description:
        "Qui la fait et pour quand. Elle entre au plan de préproduction, validée ; confiée à un membre, elle devient aussi une tâche de son Travail.",
      holder: "Qui s'en charge",
      holderNone: "Choisir",
      holderHint:
        "Un membre de PDS (tâche dans son Travail) ou un contact du Réseau.",
      due: "Pour quand",
      submit: "Planifier",
      done: "Action planifiée.",
      missingHolder: "Choisissez qui s'en charge.",
      missingDue: "Indiquez une échéance.",
      planned: (who: string, date: string) =>
        `Planifiée : ${who}, pour le ${date}`,
      withTask: "tâche créée dans le Travail",
    },
    kinds: {
      decision: "Décision",
      hypothesis: "Hypothèse",
      action: "Action proposée",
      to_decide: "Point à arbitrer",
    },
    kindsPlural: {
      decision: "Décisions",
      hypothesis: "Hypothèses",
      action: "Actions proposées",
      to_decide: "Points à arbitrer",
    },
    statuses: {
      proposed: "Proposé par PO",
      confirmed: "Confirmé",
      rejected: "Rejeté",
    },
    noItems:
      "Aucun point pour l'instant. Le compte rendu d'un call de production propose les siens ; vous pouvez aussi en noter un.",
    proposalsTitle: (n: number) =>
      n === 1
        ? "1 proposition de PO à confirmer"
        : `${n} propositions de PO à confirmer`,
    quote: (q: string) => `« ${q} »`,
    fromCall: "Depuis le compte rendu",
    manual: "Saisi",
    confirm: "Confirmer",
    reject: "Rejeter",
    restore: "Rétablir",
    restored: "Proposition rétablie.",
    confirmed: "Point confirmé.",
    rejected: "Proposition rejetée.",
    rejectedCount: (n: number) =>
      n === 1 ? "1 proposition rejetée" : `${n} propositions rejetées`,
    add: "Noter un point",
    addTitle: "Noter un point du call",
    editTitle: "Modifier le point",
    formDescription:
      "Une décision, une hypothèse, une action proposée ou un point à arbitrer, rangé dans son sujet.",
    topicField: "Sujet",
    kindField: "Nature",
    bodyField: "Le point",
    kindHints: {
      decision: "Arrêté pendant le call.",
      hypothesis: "Pressenti, reste à confirmer (lieu, date incertaine…).",
      action: "Quelque chose à faire, qui pourra entrer dans le plan.",
      to_decide: "Personne n'a tranché : à arbitrer.",
    },
    added: "Point noté.",
    updated: "Point modifié.",
    deleteTitle: "Supprimer ce point ?",
    deleteBody: "Le point disparaît du compte rendu structuré.",
    deleted: "Point supprimé.",
    deleting: "Suppression…",
  },

  plan: {
    template: {
      propose: "Proposer un plan",
      proposeHint:
        "PO propose les étapes habituelles d'un tournage, adaptées au brief du réalisateur, avec leurs échéances tirées du rétroplanning et leurs dépendances. Tout arrive en brouillon : ajustez, puis approuvez.",
      proposeMore: (n: number) =>
        n === 1
          ? "Proposer 1 étape manquante"
          : `Proposer ${n} étapes manquantes`,
      proposed: (n: number) =>
        n === 1
          ? "1 action proposée en brouillon."
          : `${n} actions proposées en brouillon.`,
      pastNote: (date: string) =>
        `Le rétroplanning la plaçait au ${date}, déjà passé : fixez une échéance.`,
      reschedule: (n: number) =>
        n === 1 ? "Recalculer 1 échéance" : `Recalculer ${n} échéances`,
      rescheduleTitle: "Recalculer les échéances du plan",
      rescheduleDescription:
        "Les dates de tournage ou de livraison ont changé : voici les échéances du plan proposé qui bougent. Rien ne change avant votre confirmation ; une tâche déjà créée dans le Travail garde sa date.",
      rescheduleConfirm: "Appliquer ces échéances",
      rescheduled: "Échéances recalculées.",
      none: "—",
      titles: {
        director_brief: "Valider le brief du réalisateur",
        technical_call: "Tenir le call technique",
        location: "Trouver et confirmer le lieu",
        permits: "Obtenir les autorisations de tournage",
        team: "Confirmer l'équipe et ses disponibilités",
        live_sound: "Prévoir la prise de son directe",
        quotes: "Demander et comparer les devis",
        rental: "Réserver le matériel",
        call_sheet: "Envoyer la feuille de service",
        readiness: "Faire le contrôle avant tournage",
        backup: "Sauvegarder et vérifier les rushes",
      },
    },
    title: "Plan de préproduction",
    description:
      "Les actions, qui est pressenti, l'échéance et ce dont elles dépendent. Une action n'entre dans Travail qu'après votre confirmation.",
    states: {
      empty: "Vide",
      draft: "Brouillon",
      to_review: "À examiner",
      approved: "Approuvé",
      in_progress: "En exécution",
      done: "Terminé",
      blocked: "Bloqué",
      removed: "Retirée",
    },
    actionStates: {
      draft: "Brouillon",
      to_review: "À examiner",
      approved: "Approuvée",
      in_progress: "En exécution",
      done: "Terminée",
      blocked: "Bloquée",
      removed: "Retirée",
    },
    columns: {
      action: "Action",
      holder: "Pressenti",
      due: "Échéance",
      state: "État",
      actions: "Actions",
    },
    empty:
      "Aucune action. Reprenez les actions confirmées du call ou ajoutez-en une.",
    fromCall: (n: number) =>
      n === 1
        ? "Reprendre 1 action confirmée du call"
        : `Reprendre ${n} actions confirmées du call`,
    fromCallDone: "Actions reprises en brouillon.",
    add: "Ajouter une action",
    addTitle: "Ajouter une action",
    editTitle: "Modifier l'action",
    formDescription:
      "Qui est pressenti et l'échéance restent des propositions tant que l'action n'est pas approuvée.",
    fields: {
      title: "Action",
      holder: "Pressenti",
      due: "Échéance",
      dependsOn: "Attend",
      blocking: "Point bloquant pour le tournage",
      note: "Note",
    },
    noHolder: "À désigner",
    fromNetwork: (name: string) => `${name} · Réseau`,
    blocking: "Bloquant",
    waitsFor: (titles: string) => `Attend : ${titles}`,
    select: (title: string) => `Sélectionner « ${title} »`,
    approve: "Approuver",
    approveSelection: (n: number) => `Approuver la sélection (${n})`,
    approved: "Actions approuvées.",
    toDraft: "Remettre en brouillon",
    removeAction: "Retirer",
    restore: "Rétablir",
    statusDone: "Action mise à jour.",
    removedCount: (n: number) =>
      n === 1 ? "1 action retirée" : `${n} actions retirées`,
    deleteTitle: "Supprimer cette action ?",
    deleteBody: "L'action disparaît du plan.",
    task: "Créer dans Travail",
    taskTitle: "Créer la tâche dans Travail ?",
    taskDescription:
      "La tâche est créée une seule fois, pour un membre de PDS et à une date. Rien d'autre n'est envoyé.",
    taskAssignee: "Assignée à",
    taskDue: "Échéance",
    taskConfirm: "Créer la tâche",
    taskCreated: "Tâche créée dans Travail.",
    inWork: "Dans Travail",
    added: "Action ajoutée.",
    updated: "Action modifiée.",
    deleted: "Action supprimée.",
  },

  location: {
    title: "Lieu",
    description:
      "Le lieu pressenti reste une hypothèse tant qu'il n'est pas confirmé.",
    statuses: {
      to_find: "À trouver",
      to_verify: "À vérifier",
      confirmed: "Confirmé",
    },
    statusHints: {
      to_find: "Aucun lieu pressenti.",
      to_verify: "Un lieu est pressenti, rien n'est encore confirmé.",
      confirmed: "Le lieu est confirmé pour le tournage.",
    },
    fields: {
      status: "État du lieu",
      name: "Lieu",
      address: "Adresse",
      access: "Accès et horaires",
      notes: "Notes",
    },
    edit: "Modifier le lieu",
    editTitle: "Lieu du tournage",
    saved: "Lieu enregistré.",
  },

  equipment: {
    title: "Matériel et devis",
    description:
      "Liste manuelle et devis déposés. Un article sur devis n'est ni réservé ni loué ; une ligne lue sur un devis reste à vérifier.",
    categories: {
      image: "Image",
      light: "Lumière",
      sound: "Son",
      other: "Autre",
    },
    statuses: {
      need: "Besoin",
      quoted: "Devis reçu",
      to_verify: "À vérifier",
      retained: "Retenu",
      booked: "Réservé confirmé",
      picked_up: "Récupéré",
      to_return: "À rendre",
      returned: "Rendu",
      incident: "Incident de retour",
    },
    columns: {
      item: "Article",
      supplier: "Loueur",
      price: "Prix",
      status: "État",
      actions: "Actions",
    },
    empty: "Aucun article pour l'instant.",
    briefNeeds: (text: string) => `Besoins du brief : ${text}`,
    add: "Ajouter un article",
    addTitle: "Ajouter un article",
    fromQuote: "Saisir depuis ce devis",
    fromQuoteTitle: (file: string) => `Article lu sur « ${file} »`,
    fromQuoteNote:
      "La ligne démarre « À vérifier » : relisez-la contre le devis avant de la confirmer.",
    editTitle: (label: string) => `Modifier « ${label} »`,
    formDescription: "Ce que dit le devis ou ce qu'il faut trouver.",
    fields: {
      category: "Catégorie",
      label: "Article",
      quantity: "Quantité",
      supplier: "Loueur",
      supplierName: "Loueur (nom)",
      price: "Prix",
      periodStart: "Location du",
      periodEnd: "au",
      deposit: "Caution",
      returnTerms: "Conditions de retour",
      status: "État",
      returnHolder: "Qui le rend",
      returnDue: "À rendre le",
      incident: "Incident",
      note: "Note",
    },
    supplierNone: "Aucun (saisir le nom)",
    sourceQuote: (file: string) => `Lu sur ${file}`,
    verifiedBy: (who: string, date: string) => `Vérifié par ${who} le ${date}`,
    verify: "Marquer vérifiée",
    verified: "Ligne vérifiée.",
    returnLate: "Retour en retard",
    returnInfo: (date: string) => `À rendre le ${date}`,
    added: "Article ajouté.",
    updated: "Article modifié.",
    deleteTitle: "Supprimer cet article ?",
    deleteBody: (label: string) => `« ${label} » disparaît de la liste.`,
    deleted: "Article supprimé.",
    duplicates: "Doublons possibles",
    duplicate: (a: string, b: string) =>
      `« ${a} » et « ${b} » semblent être le même article.`,
    merge: "Rapprocher",
    mergeTitle: "Rapprocher ces deux lignes ?",
    mergeBody: (keep: string, other: string) =>
      `« ${keep} » est gardée, les quantités s'additionnent et « ${other} » est supprimée. Vérifiez qu'il s'agit bien du même article.`,
    merged: "Lignes rapprochées.",
    quotes: "Devis et captures",
    noQuotes: "Aucun devis déposé.",
    dropLabel: "Déposer un devis ou une capture",
    dropHint: "PDF ou image. Le document est gardé comme source.",
    uploading: "Envoi…",
    uploaded: "Document déposé.",
    quoteKinds: { quote: "Devis", capture: "Capture" },
    download: (file: string) => `Télécharger ${file}`,
    deleteFileTitle: "Supprimer ce document ?",
    deleteFileBody: (file: string) =>
      `« ${file} » est supprimé. Les lignes saisies depuis ce document restent, sans lien.`,
    fileDeleted: "Document supprimé.",
    linesFrom: (n: number) =>
      n === 1 ? "1 ligne saisie" : `${n} lignes saisies`,
  },

  schedule: {
    title: "Rétroplanning et budget",
    description:
      "Calculé depuis la date de tournage et la livraison. Les dates de la Production priment ; un écart avec la Fiche est signalé.",
    steps: {
      brief: "Validation du brief",
      location: "Confirmation du lieu",
      team: "Équipe confirmée",
      estimates: "Estimations",
      rental: "Location du matériel",
      call_sheet: "Feuille de service",
      shoot: "Tournage",
      backup: "Sauvegarde des rushes",
      post: "Postproduction",
      validation: "Validation",
      exports: "Exports",
      delivery: "Livraison",
    },
    columns: { step: "Étape", date: "Date", state: "État" },
    states: {
      done: "Fait",
      late: "En retard",
      planned: "Prévu",
      untracked: "—",
    },
    period: (from: string, to: string) => `du ${from} au ${to}`,
    after: (steps: string) => `Après : ${steps}`,
    warnings: {
      no_shoot:
        "Sans date de tournage, le rétroplanning ne peut pas être calculé.",
      no_delivery: "Sans date de livraison, la fin du planning reste ouverte.",
      delivery_before_shoot: "La livraison est prévue avant le tournage.",
      post_after_delivery: "La postproduction finit après la livraison.",
      post_before_shoot: "La postproduction commence avant le tournage.",
    },
    fromFiche: "Proposée par la Fiche Livrable, à confirmer",
    fromProduction: "Confirmée en Production",
    toFill: "À renseigner",
    owner: (name: string) =>
      `La Fiche Livrable propose ; ${name} (chef de projet) confirme ou corrige.`,
    ownerUnnamed:
      "La Fiche Livrable propose ; le chef de projet confirme ou corrige.",
    impact:
      "La fiche est prête pour tournage : changer une date décale le rétroplanning, et la feuille de service sera à revoir avant de la renvoyer.",
    diverges: (fiche: string) => `Différent de la Fiche Livrable (${fiche})`,
    editDates: "Modifier les dates",
    datesTitle: "Dates et enveloppe",
    datesDescription:
      "Les valeurs de la Fiche Livrable sont reprises : enregistrer les confirme. Un changement reste visible face à la Fiche et dans l'Historique.",
    fields: {
      shootDate: "Date de tournage",
      postStart: "Début de postproduction",
      postEnd: "Fin de postproduction",
      deliveryDate: "Date de livraison",
      envelope: "Enveloppe",
    },
    ficheValue: (value: string) => `Fiche Livrable : ${value}`,
    saved: "Dates enregistrées.",
  },

  budget: {
    title: "Budget",
    statuses: {
      planned: "Prévu",
      to_estimate: "À estimer",
      estimated: "Estimé",
      to_decide: "À arbitrer",
      validated: "Validé",
      committed: "Engagé",
    },
    categories: {
      direction: "Réalisation",
      camera: "Image",
      sound: "Son",
      performers: "Musiciens / artistes",
      production: "Production et régie",
      equipment: "Matériel",
      location: "Lieu",
      post: "Postproduction",
      other: "Autre",
    },
    tiles: {
      envelope: "Enveloppe",
      estimated: "Estimé",
      remaining: "Reste",
      toEstimate: "Postes à estimer",
    },
    noEnvelope: "Sans enveloppe",
    over: (amount: string) =>
      `Budget estimé supérieur à l'enveloppe de ${amount} : demandez un arbitrage. Rien n'est bloqué.`,
    columns: {
      line: "Poste",
      category: "Catégorie",
      amount: "Montant",
      status: "État",
      actions: "Actions",
    },
    empty: "Aucun poste estimé.",
    add: "Ajouter un poste",
    addTitle: "Ajouter un poste",
    editTitle: (label: string) => `Modifier « ${label} »`,
    formDescription:
      "Une estimation par poste. Seul « À estimer » se passe de montant.",
    fields: {
      label: "Poste",
      category: "Catégorie",
      amount: "Montant",
      status: "État",
      equipment: "Article lié",
      note: "Note",
    },
    noEquipment: "Aucun",
    amountRequired: "Un montant est attendu, sauf pour « À estimer ».",
    added: "Poste ajouté.",
    updated: "Poste modifié.",
    deleteTitle: "Supprimer ce poste ?",
    deleteBody: (label: string) => `« ${label} » disparaît du budget.`,
    deleted: "Poste supprimé.",
  },

  callSheet: {
    title: "Feuille de service",
    description:
      "L'équipe et le matériel sont lus depuis leurs listes, jamais recopiés.",
    fields: {
      callTime: "Heure de convocation",
      schedule: "Horaires",
      contactsNote: "Contacts utiles",
      sequences: "Séquences",
      instructions: "Consignes",
      emergencies: "Urgences",
      documentsNote: "Documents utiles",
    },
    shoot: "Tournage",
    location: "Lieu",
    access: "Accès",
    team: "Équipe",
    noTeam: "Personne n'est encore affecté.",
    equipment: "Matériel confirmé",
    noEquipment: "Aucun article réservé.",
    edit: "Compléter la feuille",
    editTitle: "Feuille de service",
    editDescription:
      "Horaires, séquences, consignes et urgences. L'équipe, le lieu et le matériel viennent de leurs sections.",
    updatedBy: (who: string, date: string) =>
      `Mise à jour par ${who} le ${date}`,
    saved: "Feuille de service enregistrée.",
    filled: (a: number, b: number) => `${a} / ${b} rubriques`,
  },

  readiness: {
    title: "Contrôle avant tournage",
    description:
      "Chaque prérequis est confirmé par une personne. Une liste approuvée ne vaut pas preuve que tout est prêt.",
    checks: {
      location: "Lieu",
      team: "Équipe",
      equipment: "Matériel",
      schedule: "Planning",
      budget: "Budget ou arbitrage",
      call_sheet: "Feuille de service",
      permits: "Autorisations",
      backup: "Sauvegarde prévue",
    },
    states: {
      confirmed: "Confirmé",
      open: "À confirmer",
      not_required: "Non requis",
    },
    evidence: {
      location: {
        to_find: "Aucun lieu pressenti.",
        to_verify: "Lieu pressenti, à vérifier.",
        confirmed: "Lieu confirmé dans la section Lieu.",
      },
      team: (filled: number, positions: number, toConfirm: number) =>
        `${filled} / ${positions} places tenues${toConfirm ? ` · ${toConfirm} disponibilité${toConfirm > 1 ? "s" : ""} à confirmer` : ""}`,
      multiRole: (n: number) =>
        n === 1
          ? "1 personne tient plusieurs fonctions."
          : `${n} personnes tiennent plusieurs fonctions.`,
      equipment: (confirmed: number, toVerify: number) =>
        `${confirmed} article${confirmed > 1 ? "s" : ""} réservé${confirmed > 1 ? "s" : ""}${toVerify ? ` · ${toVerify} à vérifier` : ""}`,
      schedule: {
        none: "Pas de date de tournage.",
        late: (n: number) =>
          n === 1 ? "1 étape en retard." : `${n} étapes en retard.`,
        ok: "Aucune étape en retard.",
      },
      budget: {
        over: "Estimé au-dessus de l'enveloppe.",
        toDecide: (n: number) =>
          n === 1 ? "1 poste à arbitrer." : `${n} postes à arbitrer.`,
        ok: "Dans l'enveloppe.",
        noEnvelope: "Pas d'enveloppe.",
      },
      callSheet: (a: number, b: number) => `${a} / ${b} rubriques remplies`,
      permits:
        "Selon le lieu et le tournage : la preuve est écrite à la confirmation.",
      backup:
        "Où et comment les rushes seront copiés : écrit à la confirmation.",
    },
    proofLabel: "Preuve",
    proofHint: {
      permits:
        "L'autorisation obtenue (mairie, propriétaire, lieu) ou pourquoi aucune n'est nécessaire.",
      backup: "Où et comment les rushes seront copiés, et qui vérifie.",
    },
    proofMissing:
      "Écrivez la preuve : sans elle, le contrôle ne se confirme pas.",
    responsible: (who: string) => `Responsable : ${who}`,
    noResponsible: "Responsable : chef de projet",
    assign: "Attribuer",
    assignTitle: (check: string) => `Qui sécurise « ${check} » ?`,
    assignDescription:
      "La personne qui s'en occupe : un membre de PDS ou un contact du Réseau.",
    assignLabel: "Responsable",
    assignNone: "Chef de projet",
    assigned: "Responsable enregistré.",
    derogate: "Déroger",
    derogateTitle: (check: string) => `Déroger à « ${check} » ?`,
    derogateDescription:
      "Le contrôle compte comme confirmé sans sa preuve habituelle. Le motif, votre nom et la date restent visibles et dans l'Historique.",
    derogateReason: "Motif",
    derogateMissing: "Écrivez pourquoi.",
    derogated: "Dérogation enregistrée.",
    derogatedBy: (who: string, date: string, reason: string) =>
      `Dérogation de ${who} le ${date} : ${reason}`,
    confirm: "Confirmer",
    withdraw: "Retirer",
    require: "Rendre requis",
    unrequire: "Ne pas exiger",
    confirmedBy: (who: string, date: string) =>
      `Confirmé par ${who} le ${date}`,
    noteLabel: "Note",
    confirmTitle: (check: string) => `Confirmer « ${check} » ?`,
    confirmDescription:
      "Votre nom et la date sont gardés avec la confirmation. Ajoutez une note si besoin.",
    done: "Contrôle mis à jour.",
    markReady: "Marquer prête pour tournage",
    markReadyTitle: "Marquer prête pour tournage ?",
    markReadyBody:
      "Tous les prérequis requis sont confirmés. Retirer une confirmation plus tard retire aussi « Prête pour tournage ».",
    marking: "Enregistrement…",
    ready: "Prête pour tournage.",
    readyBy: (who: string, date: string) =>
      `Prête pour tournage, marquée par ${who} le ${date}`,
    openLeft: (n: number) =>
      n === 1
        ? "1 prérequis reste à confirmer avant de marquer prête."
        : `${n} prérequis restent à confirmer avant de marquer prête.`,
  },

  errors: {
    evidenceMissing:
      "Ce que ce contrôle vérifie n'est pas encore en place : complétez sa section, ou dérogez avec un motif.",
    proofRequired: "Écrivez la preuve pour confirmer ce contrôle.",
    reasonRequired: "Un motif est obligatoire pour déroger.",
    checksOpen: "Des prérequis requis ne sont pas encore confirmés.",
    actionNotApproved: "Approuvez l'action avant de créer sa tâche.",
    taskAlreadyCreated: "La tâche existe déjà dans Travail.",
    invalidTask: "Choisissez un membre de PDS et une date.",
    dependency: "Une action ne peut attendre qu'une autre action du plan.",
    callNotOfSheet: "Ce call n'appartient pas à ce livrable.",
    fileNotOfSheet: "Ce document n'appartient pas à ce livrable.",
    incident: "Décrivez l'incident de retour.",
    holder: "Cette personne n'est plus disponible dans la liste.",
  },
} as const;
