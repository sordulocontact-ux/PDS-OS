/** Marketing › Production: the shoot (state, rushes, backup, incidents, equipment return, report). */
export const productionShoot = {
  title: "Tournage",
  locked: "La Production n'est pas en cours : le tournage se lit seulement.",
  readOnly:
    "Lecture seule : seul le responsable du projet renseigne le tournage, pendant la Production.",
  cancel: "Annuler",
  close: "Fermer",
  saving: "Enregistrement…",
  save: "Enregistrer",
  edit: "Modifier",
  by: (name: string, at: string) => `${name}, ${at}`,
  at: (at: string) => `Le ${at}`,

  state: {
    title: "État du tournage",
    description:
      "Pendant et après le tournage : l'état, ce qui a été observé, ce qui manque et ce qui a changé.",
    labels: {
      planned: "Prévu",
      in_progress: "En cours",
      done: "Terminé",
      partial: "Partiel",
      postponed: "Reporté",
      interrupted: "Interrompu",
    },
    hints: {
      planned: "Le tournage n'a pas commencé.",
      in_progress: "Le tournage a démarré.",
      done: "Tout ce qui était prévu a été tourné.",
      partial: "Des séquences manquent : dites lesquelles.",
      postponed: "Le tournage est décalé à une autre date.",
      interrupted:
        "Le tournage s'est arrêté avant la fin : dites ce qui manque.",
    },
    notReadyHint: "Possible une fois la fiche « Prête pour tournage ».",
    notReady:
      "Le tournage ne peut pas démarrer : la fiche n'est pas encore « Prête pour tournage ». Les vérifications se confirment dans l'onglet Préproduction.",
    toPreproduction: "Ouvrir la Préproduction",
    shootDate: "Date de tournage",
    observations: "Observations",
    missingSequences: "Séquences manquantes",
    deviations: "Écarts de réalisation",
    notFilled: "Non renseigné",
    noShootDate: "Pas de date",
    retakeTitle: "Décision de reprise à prendre",
    retake:
      "Le tournage n'est pas complet. Décidez s'il faut une reprise pour les séquences manquantes et ce que cela change pour la livraison.",
    dialogTitle: "État du tournage",
    dialogDescription:
      "Ce que vous écrivez ici rejoint le compte rendu de tournage.",
    stateLegend: "État",
    observationsPlaceholder: "Ce qui s'est passé, ce qui a bien ou mal marché…",
    missingPlaceholder: "Plan large du refrain, deuxième prise du couplet…",
    deviationsPlaceholder:
      "Ce qui a été tourné autrement que prévu, et pourquoi.",
    missingRequired:
      "Un tournage partiel ou interrompu doit dire quelles séquences manquent.",
    done: "État du tournage enregistré",
  },

  files: {
    title: "Rushes, sources et sauvegarde",
    description:
      "Trois déclarations séparées, chacune avec qui et quand. Une déclaration est la parole d'une personne : aucun fichier n'est contrôlé.",
    declarations: {
      video_rushes: "Rushes vidéo récupérés",
      audio_sources: "Sources audio récupérées",
      backup_verified: "Sauvegarde vérifiée",
    },
    declared: "Déclaré",
    notDeclared: "Non déclaré",
    declaredBy: (name: string, at: string) => `Déclaré par ${name}, ${at}`,
    location: "Emplacement des fichiers",
    locationPlaceholder: "Drive « Clip X / Rushes », disque dur n° 2…",
    locationHint: "Une description : PDS OS n'ouvre pas cet emplacement.",
    notChecked: "Déclaré par une personne, non vérifié sur les fichiers.",
    dialogTitle: "Rushes, sources et sauvegarde",
    dialogDescription:
      "Cochez seulement ce qui a été fait. Votre nom et l'heure sont enregistrés avec chaque déclaration.",
    done: "Déclarations enregistrées",
    postBlockedTitle: "Postproduction en attente",
    postBlocked: "La préparation de la postproduction attend :",
    blockers: {
      video_rushes: "les rushes vidéo ne sont pas déclarés récupérés",
      audio_sources: "les sources audio ne sont pas déclarées récupérées",
      backup_verified: "la sauvegarde n'est pas déclarée vérifiée",
      incident: (title: string) =>
        `l'incident « ${title} » bloque la postproduction`,
    },
  },

  incidents: {
    title: "Incidents",
    description:
      "Ce qui s'est mal passé, son impact et qui le suit. Bloquer la clôture ou la postproduction est un choix, jamais automatique.",
    add: "Signaler un incident",
    empty: "Aucun incident signalé.",
    open: "Ouvert",
    resolved: "Résolu",
    blocksClosing: "Bloque la clôture",
    blocksPost: "Bloque la postproduction",
    noBlock: "Suivi sans blocage",
    impact: "Impact",
    holder: "Suivi par",
    followUp: "Suivi",
    resolution: "Résolution",
    resolvedBy: (name: string, at: string) => `Résolu par ${name}, ${at}`,
    menu: (title: string) => `Actions pour l'incident « ${title} »`,
    editAction: "Modifier",
    resolveAction: "Résoudre",
    reopenAction: "Rouvrir",
    deleteAction: "Supprimer",
    fields: {
      title: "Incident",
      titlePlaceholder: "Batterie de la caméra B hors service",
      impact: "Impact sur la livraison",
      impactPlaceholder: "Aucun plan perdu, une prise refaite…",
      holder: "Suivi par",
      holderPlaceholder: "Personne",
      noHolder: "Personne pour l'instant",
      members: "Membres",
      network: "Réseau",
      followUp: "Suivi prévu",
      followUpPlaceholder: "Appeler le loueur, refaire la prise…",
      blocks: "Ce que l'incident bloque",
      blocksClosing: "La clôture administrative",
      blocksClosingHint:
        "La production ne peut pas être close tant qu'il est ouvert.",
      blocksPost: "La postproduction",
      blocksPostHint:
        "La préparation de la postproduction attend sa résolution.",
      resolution: "Résolution",
      resolutionPlaceholder: "Ce qui a été fait pour le régler.",
    },
    missingTitle: "Nommez l'incident.",
    missingResolution: "Dites comment l'incident a été réglé.",
    addTitle: "Signaler un incident",
    addDescription:
      "Ce que vous écrivez rejoint le compte rendu de tournage. Rien ne se bloque sans que vous le cochiez.",
    editTitle: "Modifier l'incident",
    editDescription: "Les changements rejoignent le compte rendu de tournage.",
    resolveTitle: "Résoudre l'incident",
    resolveDescription:
      "Votre nom et l'heure sont enregistrés avec la résolution.",
    reopenTitle: "Rouvrir l'incident ?",
    reopenDescription:
      "La résolution est retirée ; ce que l'incident bloque redevient bloqué.",
    reopenConfirm: "Rouvrir",
    deleteTitle: "Supprimer l'incident ?",
    deleteDescription:
      "Il disparaît du compte rendu de tournage. Cette action est définitive.",
    deleteConfirm: "Supprimer",
    added: "Incident signalé",
    saved: "Incident enregistré",
    resolvedDone: "Incident résolu",
    reopened: "Incident rouvert",
    deleted: "Incident supprimé",
    fromEquipment: (label: string) => `Retour du matériel : ${label}`,
  },

  equipment: {
    title: "Retour du matériel",
    description:
      "Le matériel confirmé comme loué ou emprunté, avec qui le rend et quand. Rien n'est « Rendu » sans votre confirmation.",
    empty:
      "Aucun matériel confirmé. Le matériel se saisit dans l'onglet Préproduction.",
    returnState: {
      none: "Aucun matériel à rendre",
      to_return: "À rendre",
      partial: "Partiellement rendu",
      all_returned: "Tout rendu",
      incident: "Incident de retour",
    },
    statuses: {
      booked: "Réservé",
      picked_up: "Récupéré",
      to_return: "À rendre",
      returned: "Rendu",
      incident: "Incident de retour",
    },
    columns: {
      label: "Matériel",
      holder: "Rendu par",
      due: "Échéance",
      status: "État",
      actions: "Actions",
    },
    noHolder: "À désigner",
    noDue: "Sans échéance",
    overdue: "En retard",
    returnedBy: (name: string, at: string) =>
      `Rendu, confirmé par ${name}, ${at}`,
    quantity: (n: number) => `× ${n}`,
    menu: (label: string) => `Actions pour « ${label} »`,
    actions: {
      pickedUp: "Marquer récupéré",
      toReturn: "Marquer à rendre",
      returned: "Confirmer le retour",
      incident: "Signaler un incident de retour",
      holder: "Responsable et échéance",
      report: "Signaler en incident de tournage",
    },
    confirmReturnTitle: (label: string) => `« ${label} » a bien été rendu ?`,
    confirmReturnDescription:
      "Confirmez seulement si le matériel est rendu. Votre nom et l'heure sont enregistrés.",
    confirmReturn: "Oui, c'est rendu",
    incidentTitle: "Incident de retour",
    incidentDescription: "Dites ce qui ne va pas : perdu, abîmé, en retard…",
    incidentNote: "Ce qui s'est passé",
    incidentPlaceholder: "Un câble manque, le pied est abîmé…",
    incidentRequired: "Un incident de retour doit dire ce qui s'est passé.",
    holderTitle: "Responsable et échéance du retour",
    holderDescription: "Qui rapporte le matériel, et avant quand.",
    holderField: "Rendu par",
    dueField: "À rendre avant le",
    done: "Retour du matériel enregistré",
    closingTitle: "Avant la clôture",
    closingQuestions: {
      returned: "Tout le matériel a-t-il été rendu ?",
      problem: "Un problème doit-il être signalé ?",
    },
    closingAnswers: {
      none: "Aucun matériel à rendre.",
      allReturned: "Oui, tout est rendu.",
      notReturned: (n: number) =>
        n === 1
          ? "Non : 1 ligne n'est pas rendue."
          : `Non : ${n} lignes ne sont pas rendues.`,
      incidents: (n: number) =>
        n === 1
          ? "1 incident de retour : signalez-le en incident de tournage pour décider s'il bloque la clôture."
          : `${n} incidents de retour : signalez-les en incidents de tournage pour décider s'ils bloquent la clôture.`,
      noProblem: "Aucun incident de retour.",
    },
    closingBlocked: "La clôture administrative attend :",
    closingBlockers: {
      notReturned: (n: number) =>
        n === 1
          ? "1 ligne de matériel à rendre"
          : `${n} lignes de matériel à rendre`,
      incident: (title: string) => `l'incident « ${title} »`,
    },
    closingClear: "Rien ne bloque la clôture administrative.",
  },

  report: {
    title: "Compte rendu de tournage",
    description:
      "Consolidé par PO depuis ce qui a été renseigné. Vous le validez : il devient une source de la postproduction.",
    notInspected:
      "Ce compte rendu reprend des déclarations : aucun fichier n'a été inspecté.",
    validated: "Validé",
    toValidate: "À valider",
    notEnded:
      "Le compte rendu se valide une fois le tournage terminé, partiel ou interrompu.",
    validatedBy: (name: string, at: string) => `Validé par ${name}, ${at}`,
    reopenNote:
      "Toute modification du tournage après validation rouvre le compte rendu.",
    facts: {
      state: "État",
      shootDate: "Date de tournage",
      declarations: "Déclarations",
      location: "Emplacement des fichiers",
      incidents: "Incidents",
      equipment: "Matériel",
      deviations: "Écarts",
      missing: "Séquences manquantes",
      observations: "Observations",
    },
    declarationsCount: (done: number, total: number) =>
      `${done} sur ${total} déclarées`,
    incidentsCount: (open: number, resolved: number) =>
      open === 0 && resolved === 0
        ? "Aucun"
        : `${open} ouvert${open > 1 ? "s" : ""}, ${resolved} résolu${resolved > 1 ? "s" : ""}`,
    equipmentCount: (state: string, returned: number, total: number) =>
      total === 0 ? state : `${state} (${returned} sur ${total})`,
    note: "Note du compte rendu",
    notePlaceholder: "Ce que la postproduction doit savoir en plus.",
    validate: "Valider le compte rendu",
    validating: "Validation…",
    validatedDone: "Compte rendu de tournage validé",
    saveNote: "Enregistrer la note",
    noteSaved: "Note enregistrée",
  },

  followUps: {
    title: "Suivis proposés",
    description:
      "PO propose, rien n'est créé sans vous : vous choisissez la personne et la date.",
    empty: "Aucun suivi à proposer pour l'instant.",
    create: "Créer la tâche",
    proposals: {
      video_rushes: (d: string) => `Récupérer les rushes vidéo · ${d}`,
      audio_sources: (d: string) => `Récupérer les sources audio · ${d}`,
      backup_verified: (d: string) =>
        `Vérifier la sauvegarde des rushes · ${d}`,
      retake: (d: string) =>
        `Décider de la reprise des séquences manquantes · ${d}`,
      incident: (title: string) => `Suivre l'incident « ${title} »`,
      equipment: (label: string) => `Rendre le matériel « ${label} »`,
    },
    reasons: {
      video_rushes: "Les rushes vidéo ne sont pas déclarés récupérés.",
      audio_sources: "Les sources audio ne sont pas déclarées récupérées.",
      backup_verified: "La sauvegarde n'est pas déclarée vérifiée.",
      retake: "Le tournage n'est pas complet.",
      incident: "L'incident est encore ouvert.",
      equipmentOverdue: (due: string) =>
        `À rendre avant le ${due} : l'échéance est passée.`,
      equipmentDue: (due: string) => `À rendre avant le ${due}.`,
      equipmentNoDue: "Le tournage est fini et le matériel n'est pas rendu.",
    },
    dialogTitle: "Créer la tâche",
    dialogDescription:
      "La tâche rejoint le Travail du projet ; la personne choisie est prévenue.",
    taskTitle: "Tâche",
    assignee: "Personne",
    assigneePlaceholder: "Choisir",
    due: "Échéance",
    missingAssignee: "Choisissez qui s'en charge.",
    missingDue: "Choisissez une date.",
    missingTitle: "Nommez la tâche.",
    created: "Tâche créée",
  },

  errors: {
    notReady:
      "Le tournage ne peut pas démarrer : la fiche n'est pas « Prête pour tournage ».",
    missingSequences:
      "Un tournage partiel ou interrompu doit dire quelles séquences manquent.",
    notEnded:
      "Le compte rendu se valide une fois le tournage terminé, partiel ou interrompu.",
    holder: "Cette personne n'est plus disponible : choisissez-en une autre.",
    incidentNote: "Un incident de retour doit dire ce qui s'est passé.",
  },
} as const;
