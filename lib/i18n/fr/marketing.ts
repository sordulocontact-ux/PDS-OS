/** Marketing › Activations: the activations followed and their evidence
 * (ticket « Suivi & bilan », lot 1). */
export const marketing = {
  activations: {
    title: "Suivi des activations",
    description:
      "Ce que le Marketing mène vraiment, et ce que chaque activation a produit : publications, retombées, statistiques.",
    add: "Ajouter une activation",
    addTitle: "Nouvelle activation",
    addBody:
      "Une activation suivie : un contenu, une campagne, une action presse… Ses preuves s'ajoutent ensuite.",
    editTitle: "Modifier l'activation",
    editBody: "Le changement est gardé dans l'historique.",
    emptyTitle: "Aucune activation suivie",
    emptyBody:
      "Ajoutez les activations menées pour suivre leurs publications, retombées et statistiques.",
    emptyReadOnly:
      "Le responsable du projet n'a encore ajouté aucune activation.",
    archived: (n: number) =>
      n === 1 ? "1 activation archivée" : `${n} activations archivées`,
    showArchived: "Voir les archivées",
    hideArchived: "Masquer les archivées",
    archivedBadge: "Archivée",
    columns: {
      title: "Activation",
      kind: "Type",
      status: "Statut",
      owner: "Responsable",
      evidence: "Preuves",
    },
    fields: {
      title: "Intitulé",
      titlePlaceholder: "Session acoustique, campagne TikTok…",
      kind: "Type",
      status: "Statut opérationnel",
      owner: "Responsable",
      noOwner: "Personne pour l'instant",
      source: "Issue de la Stratégie",
      noSource: "Aucun lien",
      deliverable: (title: string) => `Livrable · ${title}`,
      lever: (label: string) => `Levier · ${label}`,
      startsOn: "Début",
      endsOn: "Fin",
      note: "Note",
    },
    kinds: {
      content: "Contenu",
      influence: "Influence",
      press: "Relations presse",
      social: "Réseaux sociaux",
      event: "Événement",
      other: "Autre",
    },
    statuses: {
      planned: "Prévue",
      in_progress: "En cours",
      done: "Réalisée",
      cancelled: "Annulée",
    },
    evidenceSummary: (n: number, verified: number) =>
      n === 0
        ? "Aucune"
        : `${n} · ${verified === 0 ? "aucune vérifiée" : `${verified} vérifiée${verified > 1 ? "s" : ""}`}`,
    rowMenu: (title: string) => `Actions pour « ${title} »`,
    edit: "Modifier",
    archive: "Archiver",
    restore: "Restaurer",
    archiveTitle: "Archiver cette activation ?",
    archiveBody:
      "Elle disparaît du tableau de bord mais reste dans l'historique et dans les rapports déjà générés. Vous pourrez la restaurer.",
    archiveConfirm: "Archiver",
    archiving: "Archivage…",
    archivedDone: "Activation archivée.",
    restoredDone: "Activation restaurée.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    saved: "Activation enregistrée.",
    cancel: "Annuler",
    back: "Activations",
    facts: {
      kind: "Type",
      status: "Statut",
      owner: "Responsable",
      source: "Issue de la Stratégie",
      period: "Période",
      note: "Note",
      none: "Non renseigné",
      periodRange: (from: string | null, to: string | null) =>
        from && to
          ? `Du ${from} au ${to}`
          : from
            ? `Depuis le ${from}`
            : `Jusqu'au ${to}`,
    },
    history: "Historique",
    historyEmpty: "Rien n'a encore changé.",
  },
  evidence: {
    sections: {
      publication: "Publications",
      coverage: "Retombées",
      statistic: "Statistiques",
    },
    sectionHints: {
      publication: "Ce qui a été mis en ligne, avec son lien.",
      coverage: "Ce que la presse, les médias ou les créateurs ont repris.",
      statistic:
        "Les chiffres relevés, avec leur période et leur source. Un chiffre indisponible n'est jamais un zéro.",
    },
    empty: {
      publication: "Aucune publication déclarée.",
      coverage: "Aucune retombée déclarée.",
      statistic: "Aucune statistique relevée.",
    },
    add: {
      publication: "Déclarer une publication",
      coverage: "Déclarer une retombée",
      statistic: "Relever une statistique",
    },
    addBody:
      "Déclarée ne veut pas dire vérifiée : la vérification est une action à part, tracée.",
    editTitle: "Modifier la preuve",
    fields: {
      label: "Intitulé",
      labelPlaceholder: {
        publication: "Post Instagram, vidéo YouTube…",
        coverage: "Article, chronique radio, story d'un créateur…",
        statistic: "Vues YouTube, écoutes, abonnés gagnés…",
      },
      url: "Lien",
      urlHint: "Commence par https://",
      platform: "Plateforme ou média",
      metric: "Ce qui est compté",
      metricPlaceholder: "Vues, écoutes, likes…",
      value: "Valeur",
      periodStart: "Période du",
      periodEnd: "au",
      availability: "Disponibilité du chiffre",
      reportedBy: "Déclaré par",
      reportedByPlaceholder: "Auteur, agence, plateforme…",
      observedOn: "Observé le",
      verification: "Niveau",
    },
    verifications: {
      declared: "Déclarée",
      to_verify: "À vérifier",
      verified: "Vérifiée",
    },
    availabilities: {
      available: "Disponible",
      partial: "Partielle",
      unavailable: "Indisponible",
    },
    unavailableValue: "Indisponible",
    noLink: "Lien manquant",
    linkUnreachable: "Lien inaccessible",
    linkUnreachableSince: (date: string) =>
      `Lien signalé inaccessible le ${date}`,
    provenance: {
      reportedBy: (who: string) => `Déclaré par ${who}`,
      observedOn: (date: string) => `observé le ${date}`,
      importedOn: (date: string) => `saisi le ${date}`,
      verified: (who: string | null, date: string) =>
        who ? `Vérifié par ${who} le ${date}` : `Vérifié le ${date}`,
    },
    period: (from: string | null, to: string | null) =>
      from && to
        ? `${from} → ${to}`
        : from
          ? `depuis le ${from}`
          : to
            ? `jusqu'au ${to}`
            : null,
    menu: (label: string) => `Actions pour « ${label} »`,
    verify: "Marquer vérifiée",
    toVerify: "Marquer à vérifier",
    unverify: "Repasser en déclarée",
    reportUnreachable: "Signaler le lien inaccessible",
    linkBack: "Le lien fonctionne à nouveau",
    archive: "Archiver",
    verifyTitle: "Marquer cette preuve vérifiée ?",
    verifyBody:
      "Vous confirmez l'avoir contrôlée vous-même (lien ouvert, chiffre relu à la source). Votre nom et la date sont enregistrés.",
    verifyConfirm: "Je l'ai vérifiée",
    archiveTitle: "Archiver cette preuve ?",
    archiveBody:
      "Elle sort du tableau de bord ; les rapports déjà générés la gardent telle qu'elle était.",
    working: "Enregistrement…",
    saved: "Preuve enregistrée.",
    updated: "Preuve mise à jour.",
    archivedDone: "Preuve archivée.",
  },
  events: {
    labels: {
      "activation.created": "Activation ajoutée",
      "activation.updated": "Activation modifiée",
      "activation.archived": "Activation archivée",
      "activation.restored": "Activation restaurée",
      "evidence.created": "Preuve déclarée",
      "evidence.updated": "Preuve modifiée",
      "evidence.verified": "Preuve vérifiée",
      "evidence.unverified": "Preuve à vérifier de nouveau",
      "evidence.link_unreachable": "Lien signalé inaccessible",
      "evidence.link_restored": "Lien de nouveau accessible",
      "evidence.archived": "Preuve archivée",
    } as Record<string, string>,
    other: "Modification",
    by: (who: string) => `par ${who}`,
    changed: (fields: string) => `Modifié : ${fields}`,
    reason: (text: string) => `Motif : ${text}`,
    // The audited columns, as the history names them.
    fields: {
      title: "intitulé",
      kind: "type",
      status: "statut",
      owner_person_id: "responsable",
      deliverable_id: "livrable",
      lever_id: "levier",
      starts_on: "début",
      ends_on: "fin",
      note: "note",
      label: "intitulé",
      url: "lien",
      platform: "plateforme",
      metric: "ce qui est compté",
      value: "valeur",
      period_start: "début de période",
      period_end: "fin de période",
      availability: "disponibilité",
      reported_by: "déclarant",
      observed_on: "date d'observation",
      verification: "niveau",
      link_unreachable_at: "lien",
      archived_at: "archivage",
    } as Record<string, string>,
  },
  errors: {
    forbidden:
      "Seuls le responsable du projet et son équipe créative suivent les activations.",
    invalid: "Saisie invalide : vérifiez les champs.",
    linkRequired: "Une publication vérifiée a toujours un lien.",
    unavailableValue:
      "Un chiffre indisponible n'a pas de valeur : laissez-la vide.",
    valueRequired: "Indiquez la valeur, ou choisissez « Indisponible ».",
    notFound: "Élément introuvable : la page n'est plus à jour.",
    closed:
      "Le Marketing est clôturé : ces données ne se modifient plus sans réouverture.",
    generic: "L'enregistrement a échoué. Réessayez.",
  },
} as const;
