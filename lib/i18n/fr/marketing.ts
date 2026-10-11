/** Marketing › Suivi & bilan: the activations and their evidence as the
 * review reads them (ticket « Suivi & bilan », lot 1; written on the
 * Activations' pages, lib/i18n/fr/activations.ts). */
export const marketing = {
  activations: {
    emptyTitle: "Aucune activation suivie",
    columns: {
      title: "Activation",
      kind: "Type",
      status: "Statut",
      owner: "Responsable",
    },
    fields: { noOwner: "Personne pour l'instant" },
    kinds: {
      content: "Contenu",
      influence: "Influence",
      press: "Relations presse",
      event: "Événement",
      other: "Autre",
    },
    statuses: {
      planned: "Prévue",
      in_progress: "En cours",
      done: "Réalisée",
      cancelled: "Annulée",
    },
  },
  evidence: {
    sections: {
      publication: "Publications",
      coverage: "Retombées",
      statistic: "Statistiques",
    },
    verifications: {
      declared: "Déclarée",
      to_verify: "À vérifier",
      verified: "Vérifiée",
    },
    unavailableValue: "Indisponible",
    noLink: "Lien manquant",
    linkUnreachable: "Lien inaccessible",
    provenance: {
      reportedBy: (who: string) => `Déclaré par ${who}`,
      observedOn: (date: string) => `observé le ${date}`,
      importedOn: (date: string) => `saisi le ${date}`,
      verified: (who: string | null, date: string) =>
        who ? `Vérifié par ${who} le ${date}` : `Vérifié le ${date}`,
    },
  },
  events: {
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
    notFound: "Élément introuvable : la page n'est plus à jour.",
    closed:
      "Le Marketing est clôturé : ces données ne se modifient plus sans réouverture.",
    generic: "L'enregistrement a échoué. Réessayez.",
  },
} as const;
