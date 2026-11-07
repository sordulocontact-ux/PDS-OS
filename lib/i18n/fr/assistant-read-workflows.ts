/**
 * Facts of PO's read functions for the Master, the Distribution and the
 * Marketing (lib/assistant/read/): sentences written by code, in French,
 * relayed by the model. Text typed by people is always quoted, never
 * interpreted.
 */
export const assistantReadWorkflows = {
  quote: (text: string) => `« ${text} »`,
  step: {
    line: (place: string, state: string) => `Étape « ${place} » : ${state}.`,
    summary: (text: string) => `Ce qu'elle a donné : « ${text} ».`,
    actor: (name: string, todo: string, viewer: boolean) =>
      viewer
        ? `À faire par l'utilisateur lui-même : ${todo}.`
        : `À faire par ${name} : ${todo}.`,
    due: (day: string, late: string) => `Échéance : ${day} (${late}).`,
    reserve: "Elle est close avec des réserves.",
  },
  notOpen: (workflow: string) =>
    `Le workflow ${workflow} n'est pas ouvert pour ce projet : le projet n'est pas encore lancé, ou le Plan du projet ne l'a pas démarré.`,
  project: (title: string) => `Projet : ${title}.`,

  master: {
    workflow: "Master",
    round: {
      engineer: (stage: string, name: string, inHouse: boolean) =>
        inHouse
          ? `${stage} : l'ingénieur est ${name}, de l'équipe (pas de lien ni de facture).`
          : `${stage} : l'ingénieur est ${name}.`,
      noEngineer: (stage: string) => `${stage} : aucun ingénieur désigné.`,
      notSent: (stage: string) =>
        `${stage} : le dossier n'a pas encore été envoyé à l'ingénieur.`,
      sent: (stage: string, day: string) =>
        `${stage} : dossier envoyé à l'ingénieur le ${day}.`,
      linkNotSent: (stage: string) =>
        `${stage} : le lien a été créé mais n'a pas encore été envoyé.`,
      taken: (stage: string, day: string) =>
        `${stage} : l'ingénieur a pris le dossier en charge le ${day}.`,
      notTaken: (stage: string) =>
        `${stage} : l'ingénieur n'a pas encore pris le dossier en charge.`,
      delivered: (stage: string, day: string) =>
        `${stage} : l'ingénieur a livré le ${day}.`,
      revoked: (stage: string) => `${stage} : le lien a été révoqué.`,
      rate: (stage: string, amount: string, status: string, est: string) =>
        `${stage} : tarif ${amount}, ${status}${est}.`,
      rateEstimate: (amount: string) => ` (estimé au Brief : ${amount})`,
      rateStatus: {
        planned: "estimé, pas encore proposé",
        proposed: "proposé par l'ingénieur, pas encore accepté",
        committed: "accepté (engagé)",
        invoiced: "accepté, facturé",
        paid: "accepté, payé",
      },
      rateRefused: (
        stage: string,
        amount: string,
        reason: string,
        day: string,
      ) =>
        `${stage} : un tarif de ${amount} a été refusé le ${day}${reason ? `, motif : « ${reason} »` : ""}.`,
      noVersion: (stage: string, title: string) =>
        `${stage} · « ${title} » : aucune version reçue pour l'instant.`,
      current: (stage: string, title: string, n: number) =>
        `${stage} · « ${title} » : la version en cours est la V${n}.`,
      finalVersion: (n: number) =>
        `La V${n} a été validée : elle est définitive.`,
      received: (n: number) =>
        `La V${n} est reçue, aucune décision n'est encore prise dessus.`,
      feedbackSent: (n: number, day: string) =>
        `Un retour a été envoyé à l'ingénieur sur la V${n} le ${day}.`,
      changes: (n: number, day: string | null, by: string | null) =>
        `Dernière décision : modification demandée sur la V${n}${day ? ` le ${day}` : ""}${by ? ` par ${by}` : ""}.`,
      approved: (n: number, day: string | null, by: string | null) =>
        `Dernière décision : V${n} validée${day ? ` le ${day}` : ""}${by ? ` par ${by}` : ""}.`,
      decisionNote: (text: string) => `Texte de la décision : « ${text} ».`,
      feedback: (text: string) => `Retour envoyé à l'ingénieur : « ${text} ».`,
      comment: (author: string | null, at: string | null, text: string) =>
        `Commentaire${author ? ` de ${author}` : ""}${at ? ` à ${at}` : ""} : « ${text} ».`,
      decider: (name: string) => `C'est ${name} qui valide les versions.`,
      noDecider: "Personne n'est désigné pour valider les versions.",
      blocker: (stage: string, text: string) =>
        `${stage} : ce qui empêche d'envoyer le dossier : ${text}`,
      noBlocker: (stage: string) =>
        `${stage} : rien n'empêche d'envoyer le dossier.`,
    },
    stages: { mix: "Mixage", mastering: "Mastering" },
    final: {
      validated: (title: string, n: number, day: string, by: string | null) =>
        `Master final de « ${title} » : livré et validé (V${n}, le ${day}${by ? `, par ${by}` : ""}).`,
      before: (title: string) =>
        `« ${title} » avait déjà son master final dans le Catalogue : le workflow l'a laissé de côté.`,
      pending: (title: string) =>
        `Master final de « ${title} » : pas encore livré ni validé.`,
      noTitle: "Le projet n'a aucun titre : il n'y a pas de master final.",
    },
  },

  distribution: {
    workflow: "Distribution",
    release: (day: string, source: string) =>
      `Date de sortie prévue : ${day} (${source}).`,
    noRelease: "Aucune date de sortie n'est encore connue.",
    prep: {
      summary: (ready: number, total: number) =>
        `Préparation : ${ready} éléments prêts sur ${total} nécessaires au dépôt.`,
      allReady: "Préparation : tout ce qui bloque le dépôt est prêt.",
      missing: (label: string, subject: string | null, detail: string) =>
        `Manque à la Préparation : ${label}${subject ? ` (« ${subject} »)` : ""} : ${detail}`,
    },
    dossier: {
      none: "Dossier de livraison : aucune version n'a encore été soumise pour validation.",
      version: (n: number, status: string) =>
        `Dossier de livraison : la dernière version est la V${n}, ${status}.`,
      statuses: {
        pending: "en attente de validation",
        approved: "validée",
        changes_requested: "avec modifications demandées",
        rejected: "refusée",
        superseded: "remplacée par une version plus récente",
      } as Record<string, string>,
      validator: (name: string) => `Le validateur désigné est ${name}.`,
      noValidator: "Aucun validateur n'est encore désigné.",
      gate: (text: string) =>
        `Ce qui empêche de soumettre le dossier : ${text}`,
      gateOpen: "Rien n'empêche de soumettre le dossier.",
      note: (text: string) => `Texte de la décision : « ${text} ».`,
    },
    deposit: {
      none: "Dépôt dans The Orchard : aucun dépôt n'a été déclaré.",
      kinds: {
        deposit: "Dépôt déclaré",
        received: "Réception déclarée par The Orchard",
        corrections_requested: "Corrections demandées par The Orchard",
        accepted: "Dossier accepté par The Orchard",
        platforms_delivered: "Livraison aux plateformes déclarée",
        available: "Disponibilité publique déclarée",
      } as Record<string, string>,
      line: (
        kind: string,
        day: string | null,
        proof: string,
        orchard: string,
      ) => `${kind}${day ? ` le ${day}` : ""}${orchard} (${proof}).`,
      orchardId: (id: string) => ` · identifiant The Orchard « ${id} »`,
      proven: "justificatif joint",
      declared: "déclaré par une personne, sans justificatif",
      note: (text: string) => `Note jointe : « ${text} ».`,
      noReply: "The Orchard n'a pas encore répondu (aucune réponse déclarée).",
    },
    platforms: {
      availability: (state: string, verified: number, total: number) =>
        `Disponibilité publique : ${state} (${verified} plateformes de référence vérifiées sur ${total}).`,
      states: {
        not_declared: "non déclarée",
        declared: "déclarée, pas encore vérifiée",
        partially_verified: "vérifiée en partie",
        verified: "vérifiée",
      } as Record<string, string>,
      none: "Aucune plateforme n'est renseignée pour l'instant.",
      line: (name: string, state: string, link: string) =>
        `${name} : ${state}. ${link}`,
      verifications: {
        unchecked: "pas encore vérifiée",
        verified: "vérifiée disponible",
        unavailable: "vérifiée indisponible",
      } as Record<string, string>,
      link: (url: string) => `Lien : ${url}`,
      noLink: "Pas de lien officiel renseigné.",
    },
    anomalies: {
      none: "Aucune anomalie déclarée (cela ne vaut pas conformité).",
      line: (kind: string, severity: string, state: string, text: string) =>
        `Anomalie ${severity.toLowerCase()} (${kind}), ${state.toLowerCase()} : « ${text} ».`,
      owner: (name: string, due: string | null) =>
        `Responsable : ${name}${due ? `, pour le ${due}` : ""}.`,
    },
  },

  marketing: {
    workflow: "Marketing",
    parts: {
      strategy: "Stratégie",
      design: "Conception",
      production: "Production",
      activations: "Activations",
      review: "Suivi & bilan",
    },
    strategy: {
      dimension: (name: string, state: string, summary: string) =>
        `Dimension « ${name} » : ${state}. ${summary}`,
      brief: (validated: boolean) =>
        validated
          ? "Le Brief de sortie est validé."
          : "Le Brief de sortie n'est pas validé.",
      notStarted: "La Stratégie n'est pas commencée.",
    },
    design: {
      sheet: (title: string, status: string) =>
        `Fiche livrable « ${title} » : ${status}.`,
      none: "Aucune fiche livrable n'existe pour l'instant.",
      deliverables: (count: number) =>
        `La Conception compte ${count} livrable${count > 1 ? "s" : ""}.`,
    },
    activations: {
      none: "Aucune activation n'est créée pour l'instant.",
      line: (title: string, status: string, owner: string | null) =>
        `Activation « ${title} » : ${status}${owner ? `, responsable ${owner}` : ", sans responsable"}.`,
      due: (day: string, late: string) => `Échéance ${day} (${late}).`,
      noDue: "Pas d'échéance.",
      proof: (state: string) => `Preuve : ${state.toLowerCase()}.`,
      proofMissing: "Preuve attendue et pas encore fournie ou vérifiée.",
      blocked: "Elle est bloquée.",
      waitsFor: (text: string) => `Elle attend : ${text}.`,
    },
    summary: (part: string, total: number, done: number) =>
      `${part} : ${done} étape${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${total}.`,
    askPart:
      "Pour le détail d'une partie, relance l'outil avec le paramètre part (strategy, design, production, activations ou review).",
  },
};
