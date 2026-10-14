/** Production › one deliverable: the one next action (PROD-001, PROD-007). */
export const productionNext = {
  label: {
    act: "Prochaine action",
    decision: "Décision attendue",
    wait: "En attente",
    done: "Terminé",
  },
  doneLabel: "Dernière étape franchie",
  missingTitle: "Il manque encore",
  due: (date: string) => `Échéance : ${date}`,
  late: (date: string) => `En retard : prévu le ${date}`,
  why: "Pourquoi",
  opens: (place: string) => `Ouvre : ${place}`,
  you: "C'est à vous.",
  expected: (who: string) => `Attendu : ${who}.`,
  roles: {
    owner: "chef de projet",
    director: "réalisateur",
    reviewer: "chef de projet ou directeur créatif",
    provider: "intervenant de postproduction",
  },
  withRole: (name: string, role: string) => `${name} (${role})`,
  unnamed: (role: string) => `le ou la ${role}`,
  places: {
    organisation: "Préparation › Organisation",
    brief: "Préparation › Brief réalisateur",
    needs: "Préparation › Besoins humains",
    technicalCall: "Préproduction › Call technique",
    plan: "Préproduction › Plan de préproduction",
    location: "Préproduction › Lieu",
    equipment: "Préproduction › Matériel",
    schedule: "Préproduction › Planning",
    budget: "Préproduction › Budget",
    callSheet: "Préproduction › Feuille de service",
    readiness: "Préproduction › Contrôle avant tournage",
    shootState: "Tournage › État du tournage",
    shootFiles: "Tournage › Rushes, sources et sauvegarde",
    incidents: "Tournage › Incidents",
    steps: "Postproduction › Étapes",
    versions: "Postproduction › Versions",
    decision: "Postproduction › Décision sur la version",
    exports: "Livraison › Fichiers attendus",
    decisions: "Livraison › Décisions",
    handoff: "Livraison › Transmission aux Activations",
    closure: "Livraison › Clôture",
    activations: "Marketing › Activations",
    conception: "Marketing › Conception",
  },
  steps: {
    noSource: {
      title: "Attendre la fiche validée par la Conception",
      why: "La Production part toujours d'une Fiche Livrable validée et transférée par la Conception.",
      link: "Ouvrir la Conception",
    },
    open: {
      title: "Ouvrir la préparation de ce livrable",
      why: "Choisir comment préparer : directement, à partir d'un call de production, ou en important une organisation déjà écrite.",
      link: "Choisir l'organisation",
    },
    locked: {
      title: "La Production n'est plus modifiable",
      why: "L'étape a été soumise à validation ou validée : tout reste consultable.",
    },
    brief: {
      title: "Écrire le brief du réalisateur",
      why: "Mise en scène, découpage, caméra et son : c'est la base des besoins techniques, du planning et du call technique.",
      link: "Ouvrir le brief",
    },
    technicalCall: {
      title: "Préparer le call technique",
      why: "Réalisateur, chef opérateur, production et techniciens disent ce qu'il faut concrètement pour tourner : matériel, techniciens, installation, contraintes du lieu.",
      link: "Préparer le call",
    },
    proposePlan: {
      title: "Proposer le plan de préproduction",
      why: "PO propose les étapes habituelles du tournage, avec leurs échéances tirées du rétroplanning : vous ajustez, puis vous approuvez.",
      link: "Ouvrir le plan",
    },
    approvePlan: {
      title: (n: number) =>
        n === 1
          ? "Approuver l'action en brouillon du plan"
          : `Approuver les ${n} actions en brouillon du plan`,
      why: "Une action approuvée a un responsable et une échéance ; elle peut devenir une tâche du Travail.",
      link: "Ouvrir le plan",
    },
    callProposals: {
      title: (n: number) =>
        n === 1
          ? "Relire la proposition tirée du call technique"
          : `Relire les ${n} propositions tirées du call technique`,
      why: "PO a lu le compte rendu : chaque décision, action ou question ouverte attend votre confirmation avant de compter.",
      link: "Ouvrir le compte rendu",
    },
    callActions: {
      title: (n: number) =>
        n === 1
          ? "Planifier l'action décidée au call"
          : `Planifier les ${n} actions décidées au call`,
      why: "Chaque action reçoit qui la fait et pour quand ; confiée à un membre, elle devient une tâche de son Travail.",
      link: "Planifier",
    },
    work: {
      location: {
        title: "Trouver et confirmer le lieu",
        why: "Le lieu conditionne le planning, l'équipe technique et la feuille de service.",
        link: "Ouvrir le lieu",
      },
      team: {
        title: "Constituer l'équipe",
        why: "Chaque poste nécessaire, la personne qui le tient et sa disponibilité confirmée.",
        link: "Ouvrir les besoins humains",
      },
      equipment: {
        title: "Réserver le matériel",
        why: "Chaque besoin exprimé au call technique est chiffré, retenu puis réservé auprès d'un loueur.",
        link: "Ouvrir le matériel",
      },
      schedule: {
        title: "Fixer les dates et le planning",
        why: "Les dates de tournage et de livraison fixent le rétroplanning de toute la préparation.",
        link: "Ouvrir le planning",
      },
      budget: {
        title: "Arbitrer le budget",
        why: "Les estimations doivent tenir dans l'enveloppe, ou le dépassement doit être arbitré.",
        link: "Ouvrir le budget",
      },
      call_sheet: {
        title: "Préparer la feuille de service",
        why: "Le document envoyé à l'équipe avant le tournage : convocations, horaires, lieu, contacts, déroulé.",
        link: "Ouvrir la feuille de service",
      },
      backup: {
        title: "Prévoir la sauvegarde des rushes",
        why: "Où et comment les rushes seront copiés le jour même, et qui le vérifie : une perte de rushes ne se rattrape pas.",
        link: "Ouvrir le contrôle avant tournage",
      },
      permits: {
        title: "Obtenir les autorisations de tournage",
        why: "Autorisation du lieu, de la mairie ou du propriétaire, selon le tournage.",
        link: "Ouvrir le contrôle avant tournage",
      },
    },
    confirmCheck: {
      title: (check: string) => `Confirmer le contrôle « ${check} »`,
      why: "Une personne confirme que ce prérequis est réellement sécurisé : rien n'est coché à sa place.",
      link: "Ouvrir le contrôle avant tournage",
    },
    markReady: {
      title: "Déclarer la fiche prête pour tournage",
      why: "Tous les contrôles requis sont confirmés. Le tournage pourra ensuite être lancé.",
      link: "Ouvrir le contrôle avant tournage",
    },
    launch: {
      title: "Lancer le tournage",
      titlePostponed: "Relancer le tournage reporté",
      why: "Le suivi du jour s'ouvre : état du tournage, incidents, rushes et matériel.",
      link: "Ouvrir le tournage",
    },
    endShoot: {
      title: "Déclarer la fin du tournage",
      why: "Terminé, partiel ou interrompu : la suite en dépend (reprises, postproduction).",
      link: "Ouvrir le tournage",
    },
    declarations: {
      title: "Sécuriser les rushes",
      why: "La postproduction attend les rushes vidéo, les sources audio et une sauvegarde vérifiée.",
      link: "Ouvrir les rushes",
    },
    incident: {
      title: (name: string) => `Résoudre l'incident « ${name} »`,
      why: "Il a été marqué comme bloquant la postproduction.",
      link: "Ouvrir les incidents",
    },
    organizePost: {
      title: "Organiser la postproduction",
      why: "Montage, étalonnage, son, sous-titres : chaque étape confiée à un intervenant, avec son échéance.",
      link: "Ouvrir les étapes",
    },
    assignStep: {
      title: (step: string) => `Confier l'étape « ${step} »`,
      why: "Chaque étape a un intervenant identifié, qui reçoit sa mission et son échéance.",
      link: "Ouvrir les étapes",
    },
    sendLink: {
      title: (who: string) => `Envoyer à ${who} son lien de prestataire`,
      why: "Sans compte, il retrouve sur ce lien sa mission, les références et les corrections, et dépose lui-même ses versions.",
      link: "Ouvrir les étapes",
    },
    awaitVersion: {
      title: (n: number, who: string | null) =>
        who ? `Recevoir la V${n} de ${who}` : `Recevoir la V${n}`,
      why: (n: number) =>
        n === 1
          ? "Le monteur prépare sa première version à partir des rushes et du brief."
          : `Les corrections de la V${n - 1} lui ont été transmises : il prépare la version suivante.`,
      link: "Déposer une version",
    },
    submitDraft: {
      title: (n: number) => `Soumettre la V${n} aux retours`,
      why: "Une version en brouillon n'est vue par personne : la soumettre ouvre la revue.",
      link: "Ouvrir les versions",
    },
    review: {
      title: (n: number) => `Relire la V${n} et décider`,
      why: "Commenter, puis une seule décision : valider, demander des corrections ou refuser.",
      link: "Ouvrir la décision",
    },
    sendCorrections: {
      title: (n: number) =>
        `Transmettre la demande de corrections sur la V${n}`,
      why: "La demande est prête mais pas encore transmise : le prestataire ne sait pas qu'il doit reprendre la version.",
      link: "Ouvrir la demande",
    },
    refused: {
      title: "Relancer une nouvelle version",
      why: (n: number) =>
        `La V${n} a été refusée : une nouvelle version est attendue.`,
      link: "Ouvrir les versions",
    },
    checklist: {
      title: "Préparer la liste des fichiers attendus",
      why: "Formats, ratios et sous-titres demandés par la Fiche Livrable, contrôlés fichier par fichier.",
      link: "Ouvrir les fichiers attendus",
    },
    toCheck: {
      title: (n: number) =>
        n === 1 ? "Contrôler 1 export" : `Contrôler ${n} exports`,
      why: "Chaque fichier livré est comparé à ce qui est attendu avant la livraison.",
      link: "Ouvrir les fichiers attendus",
    },
    notOk: {
      title: (n: number) =>
        n === 1
          ? "Faire corriger 1 export non conforme"
          : `Faire corriger ${n} exports non conformes`,
      why: "Un export non conforme bloque la livraison jusqu'à sa correction.",
      link: "Ouvrir les fichiers attendus",
    },
    stale: {
      title: (n: number) =>
        n === 1 ? "Revérifier 1 export" : `Revérifier ${n} exports`,
      why: "La version ou le fichier final a changé depuis le contrôle.",
      link: "Ouvrir les fichiers attendus",
    },
    confirmChecked: {
      title: "Confirmer les exports contrôlés",
      why: "Tous les fichiers attendus sont conformes : le contrôle technique peut être confirmé.",
      link: "Ouvrir les décisions",
    },
    deliver: {
      title: "Marquer le livrable comme livré",
      why: "Version validée et exports contrôlés : il reste à déclarer la livraison effective.",
      link: "Ouvrir les décisions",
    },
    handoff: {
      title: "Transmettre aux Activations",
      titleAgain: "Retransmettre aux Activations",
      why: "L'équipe Activations reçoit la version livrée, ses formats et ses contraintes pour la diffuser.",
      whyAgain:
        "La livraison a changé depuis la dernière transmission : les Activations pointent vers une version dépassée.",
      link: "Ouvrir la transmission",
    },
    close: {
      title: "Clôturer la production",
      why: "Le livrable est transmis : vérifiez le récapitulatif, ce qui reste ouvert (matériel, incidents), puis clôturez.",
      link: "Ouvrir la clôture",
    },
    finished: {
      title: "Production terminée",
      why: "La production est clôturée et la version livrée transmise aux Activations. Tout reste consultable ici.",
      link: "Ouvrir les Activations",
    },
  },
  missing: {
    positions: (n: number) =>
      n === 1 ? "1 poste sans personne" : `${n} postes sans personne`,
    availability: (n: number) =>
      n === 1
        ? "1 disponibilité à confirmer"
        : `${n} disponibilités à confirmer`,
    noNeeds: "Aucun poste défini",
    check: (label: string) => `Contrôle « ${label} » à confirmer`,
    corrections: (n: number) =>
      n === 1
        ? "1 correction encore ouverte"
        : `${n} corrections encore ouvertes`,
  },
  done: {
    ready: "Fiche prête pour tournage",
    shoot: {
      done: "Tournage terminé",
      partial: "Tournage partiel",
      interrupted: "Tournage interrompu",
    },
    secured: "Rushes et sauvegarde déclarés",
    changes: (n: number) => `Corrections de la V${n} demandées`,
    approved: (n: number) => `V${n} validée`,
    checked: "Exports contrôlés",
    delivered: "Livrable livré",
    handedOff: "Transmis aux Activations",
  },
} as const;
