import type { DesignTopic } from "@/lib/design/intentions";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** Conception: the artistic direction (§ 7) and the Brief créatif (§ 8). */
export const conceptionDirection = {
  title: "Direction artistique",
  intro:
    "Les intentions retenues et les références de chaque livrable, soumises aux validateurs section par section ou d'un bloc.",
  readOnly:
    "La direction artistique est préparée par son responsable et décidée par les validateurs nommés.",
  locked: "Conception soumise ou validée : la direction n'est plus modifiable.",

  people: {
    title: "Responsable et validation",
    description:
      "Désignés par le chef de projet. Une suggestion de PO ne vaut jamais désignation.",
    modeLegend: "Validation",
    modeSaved: "Mode de validation enregistré",
    modeReadOnly: (mode: string) => `Validation ${mode.toLowerCase()}`,
  },

  summary: {
    title: "Synthèse avant envoi",
    description:
      "Ce qui partira aux validateurs, section par section. Cochez les sections à soumettre.",
    direction: "Direction créative",
    intentions: "Intentions retenues",
    references: "Références",
    note: "Note",
    noIntention: "Aucune intention retenue.",
    noReference: "Aucune référence liée.",
    select: (title: string) => `Soumettre « ${title} »`,
    missingTitle: "À compléter",
    missing: {
      topics: (topics: string[]) => `Sans réponse : ${topics.join(", ")}`,
      proposals: (n: number) =>
        `${plural(n, "proposition", "propositions")} de PO en attente`,
      not_confirmed: "Intentions pas encore confirmées par le chef de projet",
      no_reference: "Aucune référence",
      to_qualify: "Besoin à qualifier : ni validé ni planifié",
    },
    globalMissing: {
      responsible: "Aucun responsable de la direction artistique désigné.",
      validators: "Aucun validateur nommé : la soumission est bloquée.",
    },
    pending: "Une version attend une décision : la suivante partira après.",
    submit: "Soumettre",
    submitting: "Envoi…",
    submitted: "Direction artistique soumise",
    confirmTitle: "Soumettre la direction artistique ?",
    confirmBody: (sections: number, validators: string, mode: string) =>
      `${plural(sections, "section part", "sections partent")} chez ${validators || "les validateurs"}, validation ${mode.toLowerCase()}. La version est figée telle quelle ; la précédente reste dans l'historique.`,
    cancel: "Annuler",
    close: "Fermer",
  },

  versions: {
    title: "Versions soumises",
    description:
      "Chaque version garde son contenu, ses décisions et leurs commentaires.",
    empty: "Aucune version soumise pour l'instant.",
    label: (n: number) => `V${n}`,
    submitted: (name: string, date: string) =>
      name ? `Soumise par ${name} · ${date}` : `Soumise · ${date}`,
    whole: "Toute la version",
    awaiting: "En attente de décision",
    decidedBy: (name: string, date: string) =>
      name ? `${name} · ${date}` : date,
    decide: "Votre décision",
    commentLabel: "Commentaire",
    commentHint: "Obligatoire pour demander des modifications ou refuser.",
    decidedToast: "Décision enregistrée",
    showContent: "Voir le contenu de la version",
  },

  topics: {
    story: "Ce qu'il raconte",
    look: "À quoi il ressemble",
    tone: "Ton et émotion",
    musts: "Incontournables et interdits",
  } satisfies Record<DesignTopic, string>,

  errors: {
    noSection: "Cochez au moins une section à soumettre.",
  },

  brief: {
    title: "Brief créatif global",
    intro:
      "Le cadre commun de tous les livrables, construit à partir de ce que le projet sait. Il ne remplace pas les Fiches Livrables : chaque fiche précise ce qui doit être livré.",
    readOnly:
      "Le Brief créatif est établi par le responsable de la direction artistique ou le chef de projet.",
    create: "Créer une nouvelle version",
    createFirst: "Créer la V1",
    creating: "Création…",
    created: (n: number) => `Brief créatif V${n} créé`,
    noVersion:
      "Aucune version enregistrée : voici l'aperçu de ce que contiendrait la V1.",
    live: "Aperçu en direct",
    liveLink: "Voir l'aperçu en direct",
    changed: (n: number) =>
      `Le projet a évolué depuis la V${n} : l'aperçu en direct diffère de la version enregistrée.`,
    upToDate: (n: number) => `La V${n} est à jour avec le projet.`,
    versions: "Versions",
    version: (n: number) => `V${n}`,
    versionOf: (n: number, name: string, date: string) =>
      name ? `V${n} · ${name} · ${date}` : `V${n} · ${date}`,
    viewing: (n: number) => `Version V${n}`,
    backToLatest: "Revenir à la dernière version",
    // MKT-C2-04: the artist's identity the release used.
    identity: {
      title: "Identité de l'artiste",
      version: (n: number, date: string | null) =>
        date
          ? `V${n} du référentiel, approuvée le ${date}`
          : `V${n} du référentiel`,
      deviation: "Dérogation de cette sortie",
      noDeviation: "Aucune : la sortie suit l'identité habituelle.",
    },
    sections: {
      context: "Contexte de la sortie",
      objectives: "Objectifs créatifs",
      audiences: "Publics et usages",
      narrative: "Narratif utile",
      principles: "Principes de direction artistique",
      tone: "Tonalité",
      showAvoid: "À montrer ou à éviter",
      coherence: "Cohérence entre livrables",
      deliverables: "Livrables",
      references: "Références validées",
      constraints: "Contraintes communes",
      decisions: "Décisions",
      sources: "Sources",
      openPoints: "Points encore ouverts",
    },
    facts: {
      project: "Projet",
      artist: "Artiste",
      release: "Sortie",
      noRelease: "Date non fixée",
      strategic: "Objectif stratégique",
      audiences: "Publics",
      channels: "Canaux des temps forts",
      angle: "Angle",
    },
    toDefine: "À préciser",
    none: "Rien pour l'instant.",
    sharedBy: (titles: string[]) => `Partagé par ${titles.join(", ")}`,
    deliverableStatus: {
      confirmed: "Confirmé",
      to_qualify: "À qualifier",
    },
    decision: (version: number, section: string, decision: string) =>
      `V${version} · ${section} : ${decision}`,
    sourceKinds: {
      strategy: "Stratégie validée",
      call: "Call",
      import: "Brief importé",
    },
    open: {
      topics: (title: string, topics: string[]) =>
        `${title} : sans réponse sur ${topics.join(", ").toLowerCase()}`,
      notConfirmed: (title: string) =>
        `${title} : intentions pas encore confirmées`,
      toQualify: (title: string) => `${title} : besoin à qualifier`,
      proposals: (n: number) =>
        `${plural(n, "proposition", "propositions")} de PO à confirmer ou écarter`,
      unattached: (n: number) =>
        `${plural(n, "référence", "références")} à rattacher à un livrable`,
      directionNotValidated: "Direction artistique pas encore validée",
      noObjective: "Objectif stratégique à confirmer dans la Stratégie",
    },
  },
};
