/** Marketing › Suivi & bilan: the dashboard, the reports, the provisional
 * approval and the Marketing closing (ticket « Suivi & bilan »). */
export const marketingReview = {
  title: "Suivi & bilan",
  tabsLabel: "Sections du suivi & bilan",
  tabs: {
    dashboard: "Tableau de bord",
    reports: "Rapports",
    closure: "Clôture",
  },
  dashboard: {
    description:
      "Vue vivante, recalculée à chaque ouverture depuis les activations et leurs preuves. Une valeur absente n'est jamais comptée comme zéro.",
    computedAt: (date: string, time: string, version: number) =>
      `Calculé le ${date} à ${time} · règles de calcul v${version}`,
    empty:
      "Aucune activation suivie : ajoutez-les sur la page Activations pour que le tableau de bord se remplisse.",
    emptyAction: "Aller aux activations",
    filteredEmpty: "Aucune activation ne correspond à ces filtres.",
    excluded: (n: number) =>
      n === 1
        ? "1 activation du projet est hors de ces filtres."
        : `${n} activations du projet sont hors de ces filtres.`,
    groups: {
      activations: "Activations",
      publications: "Publications",
      coverage: "Retombées",
      statistics: "Statistiques",
      budget: "Budget",
      reserves: "Réserves",
    },
    groupHints: {
      activations: "Statut opérationnel de chaque activation du périmètre.",
      publications:
        "Déclarées, à vérifier et vérifiées sont comptées séparément.",
      coverage: "Déclarées, à vérifier et vérifiées sont comptées séparément.",
      statistics:
        "Un relevé indisponible n'est jamais un zéro ; une valeur partielle est signalée.",
      budget: "Toutes les lignes du budget du projet, lues avec vos droits.",
      reserves: "Les réserves du bilan et de la clôture du Marketing.",
    },
    budgetRestricted:
      "Le budget est réservé au responsable du projet et à la direction.",
    unavailable: "Indisponible",
    figures: {
      activations: "Activations dans le périmètre",
      status_planned: "Prévues",
      status_in_progress: "En cours",
      status_done: "Réalisées",
      status_cancelled: "Annulées",
      publications_declared: "Déclarées",
      publications_to_verify: "À vérifier",
      publications_verified: "Vérifiées",
      publications_missing_link: "Liens manquants",
      coverage_declared: "Déclarées",
      coverage_to_verify: "À vérifier",
      coverage_verified: "Vérifiées",
      statistics_declared: "Déclarées",
      statistics_verified: "Vérifiées",
      statistics_partial: "Partielles",
      statistics_unavailable: "Indisponibles",
      budget_planned: "Estimé",
      budget_committed: "Engagé",
      budget_paid: "Payé",
      reserves_open: "Ouvertes",
      reserves_arbitrated: "Arbitrées",
      reserves_lifted: "Levées",
      reserves_followed: "Suivies après clôture",
    },
    // Règles de calcul v1 (lib/marketing/dashboard.ts).
    rules: {
      activations:
        "Activations non archivées du projet qui passent les filtres. Sans date, une activation est hors d'une période choisie.",
      status_planned: "Activations du périmètre au statut « Prévue ».",
      status_in_progress: "Activations du périmètre au statut « En cours ».",
      status_done: "Activations du périmètre au statut « Réalisée ».",
      status_cancelled: "Activations du périmètre au statut « Annulée ».",
      publications_declared:
        "Publications non archivées au niveau « Déclarée » : quelqu'un l'affirme, personne ne l'a contrôlée.",
      publications_to_verify:
        "Publications non archivées au niveau « À vérifier » : un contrôle est attendu.",
      publications_verified:
        "Publications contrôlées par une personne (nom et date enregistrés), toujours avec un lien.",
      publications_missing_link:
        "Publications déclarées sans lien, quel que soit leur niveau (une publication vérifiée a toujours un lien).",
      coverage_declared: "Retombées au niveau « Déclarée ».",
      coverage_to_verify: "Retombées au niveau « À vérifier ».",
      coverage_verified:
        "Retombées contrôlées par une personne (nom et date enregistrés).",
      statistics_declared:
        "Relevés disponibles non vérifiés (« Déclarée » ou « À vérifier »).",
      statistics_verified:
        "Relevés disponibles contrôlés à leur source par une personne.",
      statistics_partial:
        "Relevés dont le chiffre n'est que partiel (période ou plateforme incomplète).",
      statistics_unavailable:
        "Relevés dont le chiffre n'existe pas ou n'est pas accessible : sans valeur, jamais comptés comme zéro.",
      budget_planned:
        "Somme des lignes « Estimé » du budget du projet. Indisponible sans droit de lecture.",
      budget_committed:
        "Somme des lignes « Engagé » et « Payé » : ce que le projet s'est engagé à dépenser.",
      budget_paid:
        "Somme des lignes « Payé » (paiement administratif déclaré, jamais réglé par PDS OS).",
      reserves_open: "Réserves pas encore arbitrées.",
      reserves_arbitrated:
        "Réserves arbitrées (à lever, à suivre, limite acceptée…) pas encore levées.",
      reserves_lifted:
        "Réserves levées ou fermées : elles restent dans l'historique.",
      reserves_followed:
        "Réserves suivies après la clôture du Marketing (responsable et échéance).",
    },
    metrics: {
      title: "Chiffres relevés par mesure",
      description:
        "Le dernier relevé de chaque mesure, additionné entre activations, déclaré et vérifié à part ; un taux ne s'additionne jamais.",
      metric: "Mesure",
      declared: "Déclaré",
      verified: "Vérifié",
      gaps: "Manques",
      notAddable: "Taux non additionnables",
      gapsText: (partial: number, unavailable: number) =>
        [
          partial > 0 && `${partial} partiel${partial > 1 ? "s" : ""}`,
          unavailable > 0 &&
            `${unavailable} indisponible${unavailable > 1 ? "s" : ""}`,
        ]
          .filter(Boolean)
          .join(" · ") || "—",
    },
    detail: {
      title: (label: string) => `Détail : ${label}`,
      rule: "Règle de calcul",
      close: "Fermer le détail",
      none: "Rien n'est compté dans ce chiffre pour l'instant.",
      budgetHint: "Le détail des lignes est sur la page Budget.",
      budgetLink: "Ouvrir le budget",
      reservesHint: "Le détail des réserves est sur la page Clôture.",
      activation: "Activation",
      evidence: "Preuve",
      level: "Niveau",
      provenance: "Provenance",
    },
    filters: {
      title: "Filtres",
      from: "Du",
      to: "Au",
      kind: "Type",
      owner: "Responsable",
      status: "Statut",
      source: "Déclaré par",
      level: "Vérification",
      reserve: "Réserve",
      any: "Tous",
      reserveOpen: "Avec réserve ouverte",
      reserveNone: "Sans réserve ouverte",
      apply: "Appliquer",
      clear: "Effacer les filtres",
    },
  },
  reports: {
    description:
      "Un rapport est une photographie figée : contenu, périmètre, sources, règles de calcul, auteur, date et réserves sont gardés tels quels, version après version.",
    prepare: "Préparer un rapport",
    emptyTitle: "Aucun rapport généré",
    emptyBody:
      "Préparez un rapport pour figer l'état du suivi : il pourra ensuite être validé comme bilan provisoire.",
    emptyReadOnly: "Aucun rapport n'a encore été généré.",
    columns: {
      version: "Version",
      generated: "Générée",
      author: "Auteur",
      state: "État",
      fingerprint: "Empreinte",
    },
    versionLabel: (n: number) => `Rapport — V${n}`,
    versionShort: (n: number) => `V${n}`,
    states: {
      generated: "Généré",
      to_validate: "À valider",
      approved_provisional: "Bilan provisoire approuvé",
      changes_requested: "Corrections demandées",
      postponed: "Validation reportée",
      superseded: "Remplacé par une version plus récente",
      finalized: "Finalisé (clôture)",
    },
    meta: {
      generatedBy: (who: string, date: string, time: string) =>
        `Générée par ${who} le ${date} à ${time}`,
      generatedOn: (date: string, time: string) =>
        `Générée le ${date} à ${time}`,
      period: (from: string | null, to: string | null) =>
        from && to
          ? `Période du ${from} au ${to}`
          : from
            ? `Période depuis le ${from}`
            : to
              ? `Période jusqu'au ${to}`
              : "Toute la durée du projet",
      scope: (n: number) => (n === 1 ? "1 activation" : `${n} activations`),
      rules: (v: number) => `Règles de calcul v${v}`,
      fingerprint: "Empreinte SHA-256",
      fingerprintHint:
        "Calculée par la base sur le contenu figé : deux exports de la même version ont la même empreinte.",
      versionId: (id: string) => `Identifiant de version : ${id}`,
    },
    frozenNote:
      "Version figée : les données ajoutées depuis mettent à jour le tableau de bord, jamais ce rapport.",
    exportPdf: "Exporter en PDF",
    exporting: "Export en cours…",
    exportFailed: "L'export a échoué. Réessayez.",
    pdfFileName: (project: string, version: number) =>
      `Bilan Marketing — ${project} — V${version}.pdf`,
    back: "Rapports",
    sections: {
      summary: "Résumé exécutif et périmètre",
      objectives: "Objectifs et stratégie source",
      activations: "Récapitulatif des activations",
      results: "Résultats déclarés et vérifiés",
      statistics: "Statistiques",
      budget: "Budget",
      reserves: "Blocages, écarts, réserves et recommandations",
      annexes: "Annexes : preuves et liens",
    },
    view: {
      noSummary: "Pas de résumé écrit.",
      strategic: "Objectif stratégique",
      noStrategic: "Aucun objectif stratégique confirmé dans la Stratégie.",
      kpis: "Indicateurs attendus",
      noKpis: "Aucun indicateur défini dans la Stratégie.",
      target: (value: string) => `Cible : ${value}`,
      noTarget: "Sans cible chiffrée",
      qualitative: "Signal qualitatif",
      excluded: (n: number) =>
        n === 1
          ? "1 activation du projet est hors du périmètre de ce rapport."
          : `${n} activations du projet sont hors du périmètre de ce rapport.`,
      declaredApart:
        "Déclaré, à vérifier et vérifié sont présentés séparément ; rien de déclaré n'est présenté comme vérifié.",
      budgetMissing:
        "Budget non inclus : section non choisie, ou réservé au responsable du projet et à la direction.",
      noReserves: "Aucune réserve à la génération.",
      recommendations: "Recommandations",
      noRecommendations: "Pas de recommandation écrite.",
      noEvidence: "Aucune preuve dans le périmètre.",
    },
    compare: {
      title: (from: number, to: number) => `Comparaison V${from} → V${to}`,
      choose: "Comparer avec la version précédente",
      hide: "Masquer la comparaison",
      identical: "Aucun chiffre ne change entre ces deux versions.",
      figures: "Chiffres qui changent",
      before: "Avant",
      after: "Après",
      activationsAdded: "Activations ajoutées au périmètre",
      activationsRemoved: "Activations retirées du périmètre",
      evidence: (added: number, removed: number, changed: number) =>
        [
          added > 0 && `${added} preuve${added > 1 ? "s" : ""} en plus`,
          removed > 0 && `${removed} en moins`,
          changed > 0 && `${changed} dont le niveau ou la valeur a changé`,
        ]
          .filter(Boolean)
          .join(" · ") || "Mêmes preuves.",
      reservesAdded: "Réserves nouvelles",
      reservesRemoved: "Réserves qui ne figurent plus",
    },
    preparation: {
      title: (n: number) => `Préparer la version ${n}`,
      description:
        "Choisissez le périmètre, la période et les sections. Avant de générer, PO montre ce qui manque, ce qui ne colle pas et les réserves à garder.",
      scope: "Périmètre",
      scopeHint: "Les activations prises dans ce rapport.",
      selectAll: "Tout cocher",
      selectNone: "Tout décocher",
      period: "Période (facultative)",
      from: "Du",
      to: "Au",
      sections: "Sections",
      summary: "Résumé exécutif",
      summaryHint: "Écrit par vous, tel quel dans le rapport.",
      recommendations: "Recommandations",
      checks: "Avant de générer",
      missing: "Données manquantes",
      inconsistencies: "Incohérences",
      excluded: "Activations exclues",
      nothing: "Rien à signaler.",
      reserves: "Réserves proposées",
      reservesHint:
        "Cochées, elles sont créées avec le rapport et figées dans sa version. Elles seront arbitrées avant la clôture.",
      carried: "Déjà ouvertes : reprises telles quelles dans la version",
      addReserve: "Ajouter une réserve",
      reserveCategory: "Catégorie",
      reserveDescription: "Réserve",
      removeReserve: "Retirer",
      generate: (n: number) => `Générer la version ${n}`,
      generating: "Génération…",
      generated: (n: number) => `Version ${n} générée.`,
      cancel: "Annuler",
      checkLabels: {
        no_evidence: (title: string) => `« ${title} » n'a aucune preuve.`,
        done_without_publication: (title: string) =>
          `« ${title} » est réalisée mais n'a aucune publication.`,
        statistic_without_period: (title: string) =>
          `Une statistique de « ${title} » n'a pas de période.`,
        published_not_done: (title: string) =>
          `« ${title} » a une publication mais n'est pas marquée réalisée.`,
        unreachable_link: (title: string) =>
          `Un lien de « ${title} » est signalé inaccessible.`,
        not_finished: (title: string) => `« ${title} » n'est pas terminée.`,
      },
      proposed: {
        links: (n: number) =>
          `Vérifier les liens de publication (${n} non vérifié${n > 1 ? "s" : ""} ou inaccessible${n > 1 ? "s" : ""})`,
        statistics: (n: number) =>
          `Récupérer les statistiques (${n} manquante${n > 1 ? "s" : ""}, partielle${n > 1 ? "s" : ""} ou non vérifiée${n > 1 ? "s" : ""})`,
        coverage: (n: number) =>
          `Vérifier les retombées (${n} non vérifiée${n > 1 ? "s" : ""})`,
        activations: (n: number) => `Activations non terminées (${n})`,
      },
    },
    reserveCategories: {
      links: "Liens de publication",
      statistics: "Statistiques",
      coverage: "Retombées",
      activations: "Activations",
      payments: "Paiements",
      rights: "Droits",
      evidence: "Preuves",
      other: "Autre",
    },
    errors: {
      scope: "Choisissez au moins une activation active du projet.",
      period: "La fin de la période est avant son début.",
    },
  },
  approval: {
    title: "Validation du bilan provisoire",
    superseded: (n: number) =>
      `Une version plus récente existe (V${n}) : seule la version courante peut être soumise ou validée.`,
    openCurrent: "Ouvrir la version courante",
    submit: "Soumettre à validation",
    submitTitle: "Soumettre cette version à validation ?",
    submitBody:
      "La direction décidera sur cette version précise, telle qu'elle est figée. Pour changer quoi que ce soit ensuite, il faudra générer une nouvelle version.",
    submitting: "Envoi…",
    submitted: "Version soumise à validation.",
    generatedHint:
      "Version générée, pas encore soumise. Le responsable du projet la soumet à la direction.",
    waiting: (who: string | null) =>
      who
        ? `Soumise par ${who} : en attente de la décision de la direction.`
        : "En attente de la décision de la direction.",
    selfApproval:
      "Vous avez préparé ou soumis cette version : une autre personne habilitée doit décider.",
    approved: (who: string, date: string) =>
      `Bilan provisoire approuvé par ${who} le ${date}.`,
    approvedNote:
      "Ce n'est ni une validation définitive des résultats, ni la levée des réserves, ni la clôture du Marketing. Le tableau de bord continue d'évoluer.",
    changesRequested: (who: string, date: string) =>
      `Corrections demandées par ${who} le ${date}.`,
    postponed: (who: string, date: string) =>
      `Validation reportée par ${who} le ${date}.`,
    newVersion: "Préparer une nouvelle version",
    resubmitHint:
      "Une fois le report levé, le responsable peut soumettre de nouveau cette même version.",
    review: {
      intro:
        "Vous décidez sur cette version précise. Approuver ne vérifie aucune donnée et ne clôt rien.",
      reserves: "Réserves de la version",
      noReserves: "Aucune réserve dans cette version.",
      unverified: "Données non vérifiées",
      unverifiedLine: (
        declared: number,
        toVerify: number,
        unavailable: number,
      ) =>
        [
          `${declared} déclarée${declared > 1 ? "s" : ""}`,
          `${toVerify} à vérifier`,
          `${unavailable} statistique${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}`,
        ].join(" · "),
      decision: "Décision",
      decisions: {
        approved_provisional: "Approuver provisoirement",
        changes_requested: "Demander des corrections",
        postponed: "Reporter la validation",
      },
      hints: {
        approved_provisional:
          "La version devient le bilan provisoire approuvé, ses réserves sont gardées avec la décision.",
        changes_requested:
          "Le responsable génère une nouvelle version ; celle-ci reste consultable.",
        postponed:
          "Rien ne change ; la même version pourra être soumise de nouveau.",
      },
      comment: "Commentaire",
      commentRequired: "Obligatoire pour demander des corrections ou reporter.",
      commentOptional: "Facultatif : les réserves sont déjà listées.",
      approveWithReserves: "Approuver le bilan provisoire avec réserves",
      approve: "Approuver le bilan provisoire",
      requestChanges: "Demander des corrections",
      postpone: "Reporter la validation",
      deciding: "Enregistrement…",
      decided: "Décision enregistrée.",
    },
    history: "Décisions sur cette version",
    decisionLine: (decision: string, who: string, date: string) =>
      `${decision} · ${who} · ${date}`,
    reservesKept: (n: number) =>
      n === 0
        ? "Aucune réserve"
        : n === 1
          ? "1 réserve gardée avec la décision"
          : `${n} réserves gardées avec la décision`,
    errors: {
      superseded:
        "Cette version n'est plus la version à valider : ouvrez la version courante.",
      selfApproval:
        "Vous avez préparé ou soumis cette version : une autre personne doit décider.",
      commentRequired:
        "Écrivez un commentaire pour demander des corrections ou reporter.",
      noValidator:
        "Aucun validateur n'est configuré dans l'organisation : la version peut être préparée, pas soumise.",
      multipleValidators:
        "Plusieurs validateurs sont configurés : la direction doit n'en garder qu'un.",
      transition:
        "Cette action n'est pas possible dans l'état actuel de la version.",
      forbidden: "Seule la direction décide sur un bilan provisoire.",
      submitForbidden: "Seul le responsable du projet soumet une version.",
    },
  },
  closure: {
    description:
      "Clôture administrative du volet Marketing : chaque réserve est arbitrée, puis la direction décide. Elle ne clôt jamais le projet entier.",
    reference: "Rapport de référence",
    referenceLine: (version: number, who: string, date: string) =>
      `V${version} · bilan provisoire approuvé par ${who} le ${date}`,
    noReference:
      "Aucun bilan provisoire approuvé : générez un rapport et faites-le approuver avant de clôturer.",
    openReference: "Ouvrir le rapport",
    readiness: {
      title: "Avant la clôture",
      blockers: "Ce qui bloque",
      warnings: "À savoir avant de décider",
      none: "Rien ne bloque la clôture.",
      noWarning: "Rien à signaler.",
    },
    blockerLabels: {
      no_reference_report: "Aucun bilan provisoire approuvé.",
      reserve_unarbitrated: (text: string) => `Réserve à arbitrer : ${text}`,
      reserve_blocking: (text: string) =>
        `Réserve à lever avant clôture : ${text}`,
    },
    warningLabels: {
      activation_open: (title: string) => `« ${title} » n'est pas terminée.`,
      unpaid: (amount: string) =>
        `${amount} engagés ne sont pas encore payés (paiement administratif, hors PDS OS).`,
    },
    sections: {
      reserves: "Réserves",
      reservesHint:
        "Chaque réserve est arbitrée avant la clôture. Une réserve levée ou fermée reste dans l'historique.",
      activations: "Activations non terminées",
      payments: "Paiements administratifs",
      rights: "Droits et Juridique",
      evidence: "Preuves et statistiques",
    },
    reserves: {
      add: "Proposer une réserve",
      addBody:
        "Une limite du bilan : un lien à vérifier, une statistique à récupérer, une retombée à confirmer…",
      empty: "Aucune réserve.",
      category: "Catégorie",
      description: "Réserve",
      activation: "Activation concernée",
      noActivation: "Tout le volet",
      added: "Réserve ajoutée.",
      states: {
        open: "À arbitrer",
        blocking: "À lever avant clôture",
        follow_up: "Suivi après clôture",
        accepted_limit: "Limite acceptée",
        lifted: "Levée",
        closed: "Fermée",
      },
      decisions: {
        blocking: "À lever avant clôture",
        follow_up: "À suivre après clôture",
        accepted_limit: "Acceptée comme limite définitive",
        not_applicable: "Non applicable",
        duplicate: "Doublon",
      },
      decisionHints: {
        blocking: "La clôture reste bloquée tant qu'elle n'est pas levée.",
        follow_up:
          "La clôture peut se faire ; une personne la suit ensuite, avec une échéance et un canal.",
        accepted_limit:
          "Une limite que le bilan garde pour de bon. Motif obligatoire ; décidée par la direction.",
        not_applicable: "Elle ne s'applique pas. Justification obligatoire.",
        duplicate:
          "Elle reprend une autre réserve : rattachée à celle qu'on garde, sans perdre son historique.",
      },
      arbitrate: "Arbitrer",
      rearbitrate: "Changer l'arbitrage",
      arbitrateTitle: "Arbitrer la réserve",
      arbitrateBody:
        "Afficher un suivi ne crée aucune tâche : vous pourrez ensuite en rattacher une ou en créer une dans Travail.",
      decision: "Arbitrage",
      reason: "Motif",
      reasonRequired:
        "Obligatoire pour une limite acceptée ou une réserve non applicable.",
      followUpPerson: "Qui la suit",
      followUpDue: "Échéance",
      followUpChannel: "Canal de suivi",
      channelPlaceholder: "Point hebdo, Travail, mail à l'agence…",
      duplicateOf: "Réserve gardée",
      choosePerson: "Choisir une personne",
      chooseReserve: "Choisir la réserve gardée",
      saved: "Arbitrage enregistré.",
      lift: "Lever la réserve",
      liftTitle: "Lever cette réserve ?",
      liftBody:
        "Ce qui était à lever ou à suivre est fait. La réserve reste visible dans l'historique.",
      liftNote: "Ce qui a été fait",
      lifted: "Réserve levée.",
      note: "Noter le suivi",
      noteTitle: "Où en est le suivi",
      noteSaved: "Suivi noté.",
      createTask: "Créer la tâche dans Travail",
      createTaskTitle: "Créer une tâche pour ce suivi ?",
      createTaskBody:
        "Une tâche est créée dans Travail pour la personne qui suit la réserve, à son échéance.",
      creating: "Création…",
      taskCreated: "Tâche créée dans Travail.",
      linkTask: "Rattacher une tâche existante",
      linkTaskTitle: "Rattacher une tâche du projet",
      task: "Tâche",
      noTask: "Aucune tâche",
      taskLinked: "Tâche rattachée.",
      taskLine: (title: string, done: boolean) =>
        `Tâche : ${title}${done ? " (faite)" : ""}`,
      arbitratedBy: (who: string | null, date: string) =>
        who ? `Arbitrée par ${who} le ${date}` : `Arbitrée le ${date}`,
      liftedBy: (who: string | null, date: string) =>
        who ? `Levée par ${who} le ${date}` : `Levée le ${date}`,
      followUpLine: (
        who: string | null,
        date: string | null,
        channel: string | null,
      ) =>
        [
          who && `Suivie par ${who}`,
          date && `échéance le ${date}`,
          channel && `via ${channel}`,
        ]
          .filter(Boolean)
          .join(" · "),
      reasonLine: (text: string) => `Motif : ${text}`,
      duplicateLine: (text: string) => `Doublon de : ${text}`,
      noteLine: (text: string) => `Suivi : ${text}`,
      menu: (text: string) => `Actions pour la réserve « ${text} »`,
      afterClosure: "Après la clôture",
    },
    payments: {
      committed: "Engagé",
      paid: "Payé",
      unpaid: "Engagé non payé",
      restricted: "Réservé au responsable du projet et à la direction.",
    },
    rights: {
      restricted: "Le Juridique est réservé aux personnes qui le gèrent.",
      open: "Ouvrir le Juridique",
    },
    evidenceLine: (
      declared: number,
      toVerify: number,
      verified: number,
      unavailable: number,
    ) =>
      `${declared} déclarée${declared > 1 ? "s" : ""} · ${toVerify} à vérifier · ${verified} vérifiée${verified > 1 ? "s" : ""} · ${unavailable} statistique${unavailable > 1 ? "s" : ""} indisponible${unavailable > 1 ? "s" : ""}`,
    errors: {
      forbidden: "Seul le responsable du projet arbitre les réserves.",
      limitNeedsDirection: "Seule la direction accepte une limite définitive.",
      reasonRequired: "Écrivez le motif.",
      followUpIncomplete:
        "Un suivi après clôture dit qui le suit (un membre), à quelle échéance et par quel canal.",
      invalidDuplicate: "Choisissez la réserve gardée, dans ce projet.",
      taskAlreadyCreated: "Une tâche est déjà rattachée à ce suivi.",
      invalidTask: "Cette tâche n'est pas dans le projet.",
      transition: "Cette réserve ne peut plus changer ainsi.",
    },
  },
  status: {
    label: "Volet Marketing",
    values: {
      not_started: "Non démarré",
      in_progress: "En cours",
      review_preparing: "Bilan en préparation",
      provisional_approved: "Bilan provisoire approuvé",
      closure_preparing: "Clôture en préparation",
      closed_with_reserves: "Clôturé avec réserves",
      closed_clean: "Clôturé sans réserve",
      reopened: "Réouvert",
    },
    // Always beside the status: the project is another process.
    projectApart: "La clôture du projet entier est une décision à part.",
  },
  decision: {
    title: "Décision de clôture",
    requestTitle: "Demander la clôture du Marketing",
    requestBody:
      "Le rapport de référence, les réserves arbitrées et les suivis résiduels sont transmis à la direction, qui décide.",
    requestNote: "Note pour la direction",
    request: "Demander la clôture",
    requesting: "Envoi…",
    requested: "Clôture demandée à la direction.",
    requestBlocked: "La clôture se demande une fois que rien ne la bloque.",
    pending: (who: string | null, date: string) =>
      who
        ? `Clôture demandée par ${who} le ${date} : en attente de la décision de la direction.`
        : `Clôture demandée le ${date} : en attente de la décision de la direction.`,
    selfApproval:
      "Vous avez demandé cette clôture : une autre personne habilitée décide.",
    scope: "Périmètre exact",
    scopeLine: (version: number, activations: number) =>
      `Rapport V${version} · ${activations} activation${activations > 1 ? "s" : ""}`,
    remaining: "Réserves qui restent après la clôture",
    noRemaining: "Aucune : tout est levé ou fermé.",
    consequences: "Conséquences",
    consequenceItems: [
      "Le rapport de référence et cette décision restent figés.",
      "Le volet passe en lecture contrôlée : plus d'activation ni de réserve nouvelle, arbitrages figés.",
      "Les suivis résiduels continuent : notes, levée, tâches ; preuves et statistiques complémentaires acceptées.",
      "Le tableau de bord continue d'évoluer ; une nouvelle version de rapport reste possible.",
      "Le projet entier n'est pas clôturé : sa clôture se décide à part, depuis la Vue d'ensemble.",
    ],
    decisions: {
      closed_clean: "Clôturer sans réserve",
      closed_with_reserves: "Clôturer avec réserves",
      changes_requested: "Demander des corrections",
      postponed: "Reporter",
    },
    hints: {
      closed_clean:
        "Possible seulement si toutes les réserves sont levées ou fermées.",
      closed_with_reserves:
        "Les suivis et limites arbitrés restent visibles et suivis après la clôture.",
      changes_requested:
        "Le responsable reprend la préparation ; motif obligatoire.",
      postponed: "Rien ne change pour l'instant ; motif obligatoire.",
    },
    comment: "Commentaire",
    commentRequired: "Obligatoire pour demander des corrections ou reporter.",
    deciding: "Enregistrement…",
    decided: "Décision enregistrée.",
    closed: (state: string, who: string | null, date: string) =>
      who ? `${state} par ${who} le ${date}.` : `${state} le ${date}.`,
    followUpsLeft: (n: number) =>
      n === 0
        ? "Aucun suivi résiduel ouvert."
        : n === 1
          ? "1 suivi résiduel reste ouvert."
          : `${n} suivis résiduels restent ouverts.`,
    sentBack: (state: string, who: string | null, date: string) =>
      who ? `${state} par ${who} le ${date}.` : `${state} le ${date}.`,
    reopen: "Rouvrir le Marketing",
    reopenTitle: "Rouvrir le Marketing ?",
    reopenBody:
      "Le volet redevient modifiable. La décision de clôture passée reste dans l'historique, telle qu'elle a été prise.",
    reopenReason: "Motif",
    reopening: "Réouverture…",
    reopened: "Marketing rouvert.",
    reopenedLine: (who: string | null, date: string, reason: string) =>
      who
        ? `Rouvert par ${who} le ${date} · Motif : ${reason}`
        : `Rouvert le ${date} · Motif : ${reason}`,
    history: "Historique du suivi & bilan",
    historyEmpty: "Aucune décision pour l'instant.",
    errors: {
      alreadyClosed:
        "Le Marketing est déjà clôturé : consultez la décision ou demandez une réouverture.",
      pending: "Une clôture est déjà demandée.",
      notReference:
        "La clôture repose sur le dernier bilan provisoire approuvé.",
      unarbitrated: "Une réserve n'est pas arbitrée : arbitrez-la d'abord.",
      blocking: "Une réserve est à lever avant la clôture.",
      remaining:
        "Des réserves restent suivies ou acceptées : clôturez avec réserves.",
      noReserves: "Aucune réserve ne reste : clôturez sans réserve.",
      selfApproval:
        "Vous avez demandé cette clôture : une autre personne décide.",
      commentRequired:
        "Écrivez un commentaire pour demander des corrections ou reporter.",
      reasonRequired: "Écrivez le motif de la réouverture.",
      transition: "Cette décision n'est pas possible dans l'état actuel.",
      forbidden: "Seule la direction décide de la clôture du Marketing.",
    },
  },
  projectLink: {
    title: "Volet Marketing",
    closedWithFollowUps: (n: number) =>
      `${n} suivi${n > 1 ? "s" : ""} Marketing reste${n > 1 ? "nt" : ""} ouvert${n > 1 ? "s" : ""} : la clôture du projet ne les supprime pas.`,
    notClosed:
      "Le Marketing n'est pas clôturé : la clôture du projet peut se décider quand même, l'écart reste visible.",
    open: "Ouvrir la clôture du Marketing",
    projectClosedGap: (n: number) =>
      `Le projet est clos alors que ${n} suivi${n > 1 ? "s" : ""} Marketing reste${n > 1 ? "nt" : ""} ouvert${n > 1 ? "s" : ""} : ils restent suivis.`,
  },
  events: {
    "reserve.created": "Réserve proposée",
    "reserve.updated": "Réserve modifiée",
    "reserve.arbitrated": "Réserve arbitrée",
    "reserve.lifted": "Réserve levée",
    "reserve.task_linked": "Tâche rattachée à une réserve",
    "reserve.follow_up_noted": "Suivi de réserve noté",
    "report.generated": "Rapport généré",
    "report.to_validate": "Rapport soumis à validation",
    "report.superseded": "Rapport remplacé par une nouvelle version",
    "report.finalized": "Rapport finalisé par la clôture",
    "approval.approved_provisional": "Bilan provisoire approuvé",
    "approval.changes_requested": "Corrections demandées sur le bilan",
    "approval.postponed": "Validation du bilan reportée",
    "closure.requested": "Clôture du Marketing demandée",
    "closure.closed_clean": "Marketing clôturé sans réserve",
    "closure.closed_with_reserves": "Marketing clôturé avec réserves",
    "closure.changes_requested": "Corrections demandées avant clôture",
    "closure.postponed": "Clôture reportée",
    "closure.reopened": "Marketing rouvert",
  } as Record<string, string>,
} as const;
