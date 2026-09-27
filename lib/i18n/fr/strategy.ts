/** Launch strategy stage page and the Strategy deliverable. */
export const strategy = {
  title: "Stratégie de lancement",
  notStarted:
    "La stratégie n'a pas commencé. Le chef de projet la démarre une fois le Brief validé.",
  locked: "Stratégie soumise ou validée : elle n'est plus modifiable.",
  needsFraming: {
    title: "La stratégie suit le cadrage",
    body: "Faites valider le Brief du Cadrage : la stratégie s'ouvrira ensuite.",
    bodyReadOnly:
      "La stratégie s'ouvrira dès que le Brief du Cadrage aura été validé.",
    toFraming: "Aller au cadrage",
  },
  fields: {
    positioning: "Positionnement",
    audiences: "Publics",
    narrative: "Narratif",
  },
  choices: {
    questions: {
      positioning: "Qu'est-ce qu'on privilégie avec cette sortie ?",
      audiences: "À qui s'adresse la sortie ?",
      narrative: "Quel angle pour raconter la sortie ?",
    },
    options: {
      positioning: {
        retain_fans: "Fidéliser la fanbase actuelle",
        win_new_audience: "Conquérir un nouveau public",
        reach_professionals:
          "Installer l'artiste auprès des pros (médias, playlists, programmateurs)",
        artistic_credibility: "Asseoir l'image et la crédibilité artistique",
        maximize_streaming: "Maximiser l'écoute et le streaming",
        prepare_next: "Préparer la suite (album, tournée)",
      },
      audiences: {
        current_fans: "Public actuel de l'artiste",
        new_audience: "Nouveau public",
        professionals:
          "Professionnels (médias, playlisteurs, programmateurs, bookers)",
        brands_partners: "Marques et partenaires",
        local_scene: "Communauté locale / scène",
      },
      narrative: {
        personal_story: "L'histoire personnelle derrière le titre",
        new_sound: "Une rupture / un nouveau son",
        universe_continuity: "La continuité de l'univers de l'artiste",
        collaboration: "Une collaboration (featuring, producteur)",
        moment_place: "Un moment ou un lieu (saison, ville)",
      },
    },
    // Fragments used to write the answer from the checked choices (code, not AI).
    phrases: {
      positioning: {
        retain_fans: "fidéliser la fanbase actuelle",
        win_new_audience: "conquérir un nouveau public",
        reach_professionals:
          "installer l'artiste auprès des pros (médias, playlists, programmateurs)",
        artistic_credibility: "asseoir l'image et la crédibilité artistique",
        maximize_streaming: "maximiser l'écoute et le streaming",
        prepare_next: "préparer la suite (album, tournée)",
      },
      audiences: {
        current_fans: "le public actuel de l'artiste",
        new_audience: "un nouveau public",
        professionals:
          "les professionnels (médias, playlisteurs, programmateurs, bookers)",
        brands_partners: "les marques et partenaires",
        local_scene: "la communauté locale et la scène",
      },
      narrative: {
        personal_story: "l'histoire personnelle derrière le titre",
        new_sound: "une rupture, un nouveau son",
        universe_continuity: "la continuité de l'univers de l'artiste",
        collaboration: "une collaboration (featuring, producteur)",
        moment_place: "un moment ou un lieu (saison, ville)",
      },
    },
    sentences: {
      positioning: (list: string) => `Avec cette sortie, on veut ${list}.`,
      audiences: (list: string) => `La sortie vise ${list}.`,
      narrative: (list: string) => `On raconte la sortie à travers ${list}.`,
    },
    and: "et",
    answer: "Réponse",
    recompose: "Recomposer depuis les choix",
    other: "Autre, préciser",
    otherPlaceholder: "Précisez",
    save: "Enregistrer la réponse",
    saving: "Enregistrement…",
    none: "Aucun choix pour l'instant.",
    suggested: "Proposé",
    accept: "Accepter",
    dismiss: "Écarter",
    acceptAll: "Tout accepter",
    from: (source: string) => `D'après ${source}`,
    propose: "Proposer des réponses",
    proposing: "Analyse du Brief et des calls…",
    proposeHint:
      "PO pré-coche les réponses qui s'appuient sur le Brief validé et les comptes rendus de calls. Rien n'est retenu sans vous.",
    proposedCount: (n: number) =>
      n === 0
        ? "Aucune réponse ne s'appuie clairement sur le Brief ou les calls."
        : n === 1
          ? "1 réponse proposée, à confirmer."
          : `${n} réponses proposées, à confirmer.`,
    noSources:
      "Rien à analyser : validez le Brief ou importez un compte rendu de call d'abord.",
    failed: "Impossible de proposer des réponses pour l'instant. Réessayez.",
    briefSource: (field: string) => `le Brief (${field})`,
    callSource: (call: string) => `le call « ${call} »`,
  },
  brief: {
    title: "Rappel du Brief",
    validated: "Validé",
    notValidated: "Pas encore validé",
    empty: "Brief vide.",
    open: "Ouvrir le cadrage",
  },
  levers: {
    title: "Dispositif",
    empty: "Aucun levier pour l'instant.",
    familyEmpty: "Aucun levier.",
    label: "Levier",
    family: "Famille",
    state: "État",
    states: {
      to_decide: "À arbitrer",
      selected: "Retenu",
      rejected: "Non retenu",
    },
    fromNeed: (need: string) => `Répond au besoin « ${need} »`,
    needsTitle: "Besoins du Brief sans levier",
    fromNeedAction: "En faire un levier",
  },
  deliverables: {
    title: "Livrables engagés",
    empty: "Aucun livrable engagé.",
    noLever: "Retenez d'abord un levier pour y rattacher des livrables.",
    name: "Livrable",
    lever: "Levier",
    assignee: "Responsable",
    noAssignee: "Sans responsable",
    dueDate: "Échéance",
    noDueDate: "sans échéance",
    remove: "Retirer",
    removeLabel: (title: string) => `Retirer le livrable « ${title} »`,
  },
  calendar: {
    title: "Calendrier",
    empty: "Aucun temps fort.",
    reference: (date: string) => `Date de sortie de référence : ${date}`,
    noReference:
      "Aucune date de sortie connue (onglet Sortie ou échéance du projet) : pas de décompte.",
    name: "Temps fort",
    date: "Date",
    kind: "Type",
    deliverable: "Livrable lié",
    noDeliverable: "Aucun",
    remove: "Retirer",
    removeLabel: (title: string) => `Retirer le temps fort « ${title} »`,
    kinds: {
      release: "Sortie",
      announcement: "Annonce",
      teaser: "Teaser",
      content: "Contenu",
      live: "Live",
      press: "Presse",
      other: "Autre",
    },
    dayOffset: (days: number) =>
      days === 0 ? "Jour J" : days < 0 ? `J${days}` : `J+${days}`,
  },
  dictation: {
    kinds: {
      field: (field: string, isEdit: boolean) =>
        `${field} · ${isEdit ? "modification" : "à renseigner"}`,
      lever: (family: string) => `Nouveau levier · ${family}`,
    },
  },
  import: {
    title: "Importer depuis un call",
  },
  validation: {
    title: "Validation de la Stratégie",
    start: "Commencer la stratégie",
    briefFirst: "Le Brief doit être validé avant de commencer la stratégie.",
  },
} as const;
