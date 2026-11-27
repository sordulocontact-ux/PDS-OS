/** Conception, travail direct (ticket « Conception », Chemin B). */
export const conceptionWork = {
  title: "Travail direct",
  intro:
    "PO reprend ce que la Stratégie et le Cadrage disent déjà. Pour chaque question, cochez des choix : la réponse s'écrit, retouchez-la puis enregistrez.",
  readOnly:
    "Lecture seule : le chef de projet et l'équipe créative écrivent ici pendant la conception.",

  targets: {
    label: "Ce que vous travaillez",
    direction: "Direction de la sortie",
    deliverablesLabel: "Conception par livrable",
    answered: (n: number, total: number) => `${n} sur ${total} posées`,
    count: (n: number, total: number) => `${n}/${total}`,
    proposals: (n: number) => (n === 1 ? "1 proposition" : `${n} propositions`),
    toQualify: "À qualifier",
  },

  known: {
    title: "Ce que je sais déjà",
    titleDirection: "Ce que je sais déjà du projet",
    role: "Rôle",
    timing: "Timing",
    audiences: "Public",
    narrative: "Narratif",
    constraints: "Contraintes",
    dependencies: "Dépendances",
    deliverables: "Livrables",
    notDefined: "Pas encore défini",
    roleDirection: "Ce que tous les livrables partagent",
    deliverableCount: (n: number) =>
      n === 1 ? "1 livrable à concevoir" : `${n} livrables à concevoir`,
    lever: (lever: string, family: string | null) =>
      family ? `${lever} · ${family}` : lever,
    due: (date: string) => `Échéance : ${date}`,
    milestone: (title: string, date: string) =>
      `Sort sur « ${title} » le ${date}`,
    release: (date: string) => `Sortie : ${date}`,
    upstream: {
      conception: (date: string) => `Conception à finir le ${date}`,
      production: (date: string) => `Production à finir le ${date}`,
      validation: (date: string) => `Validation le ${date}`,
    },
    late: "dépassé",
    toQualify:
      "Ce besoin reste à qualifier : il passe en Production quand la Stratégie l'ajoute à ses livrables sous le même nom. Vous pouvez déjà poser ses intentions.",
  },

  questions: {
    deliverable: {
      story: (title: string) => `Que doit raconter « ${title} » ?`,
      look: (title: string) => `À quoi « ${title} » doit-il ressembler ?`,
      tone: (title: string) => `Quel ton, quelle émotion pour « ${title} » ?`,
      musts: (title: string) =>
        `Qu'est-ce qui doit absolument être dans « ${title} », ou en être absent ?`,
    },
    // MKT-C2-06: the questions follow the deliverable's format.
    formats: {
      clip: {
        story: (title: string) => `Quel scénario pour « ${title} » ?`,
        look: (title: string) =>
          `Quelle mise en scène, quels lieux, quelle image pour « ${title} » ?`,
        tone: (title: string) =>
          `Quel rythme, quelle émotion à l'écran pour « ${title} » ?`,
        musts: (title: string) =>
          `Qui et quoi doit apparaître à l'image dans « ${title} », ou en être absent ?`,
      },
      cover: {
        story: (title: string) => `Quelle idée porte « ${title} » ?`,
        look: (title: string) =>
          `Quelle composition : photo, illustration, typographie pour « ${title} » ?`,
        tone: (title: string) =>
          `Quelle impression au premier regard pour « ${title} » ?`,
        musts: (title: string) =>
          `Quelles mentions, quel logo, quels interdits sur « ${title} » ?`,
      },
      short: {
        story: (title: string) =>
          `Quelle accroche pour « ${title} » : tendance, défi, extrait du son ?`,
        look: (title: string) =>
          `Quel cadrage vertical, quel décor pour « ${title} » ?`,
        tone: (title: string) => `Quelle énergie pour « ${title} » ?`,
        musts: (title: string) =>
          `Durée, sous-titres, son, mentions : que doit respecter « ${title} » ?`,
      },
      campaign: {
        story: (title: string) => `Quel message porte « ${title} » ?`,
        look: (title: string) =>
          `Quels visuels, quelles déclinaisons pour « ${title} » ?`,
        tone: (title: string) => `Quel ton pour « ${title} » ?`,
        musts: (title: string) =>
          `Mentions légales, partenaires, logos : que doit contenir « ${title} » ?`,
      },
    },
    direction: {
      story: "Quel concept central et quel message portent toute la sortie ?",
      look: "Quels codes communs (visuels, sonores, typographiques) tous les livrables partagent-ils ?",
      tone: "Quel ton pour toute la sortie ?",
      musts:
        "Quelles contraintes et quelles lignes rouges valent pour tous les livrables ?",
    },
  },

  // A deliverable inherits the release's direction (MKT-C2-06).
  inheritance: {
    state: "Hérité",
    stateOwn: "Propre au livrable",
    summary: (value: string) => `Hérité de la direction : ${value}`,
    note: (value: string) =>
      `Hérité de la direction de la sortie : « ${value} ». Répondez seulement si ce livrable s'en écarte ou le précise ; dites pourquoi.`,
    deviates: "Écart ou précision sur la direction",
  },

  // The four questions, numbered and unfolded in place like the Stratégie's
  // dimensions (lib/design/intention-choices.ts).
  topicsLabel: "Questions de la conception",
  topicStates: {
    to_complete: "À faire",
    complete: "Complété",
  },
  // One sentence atop an unfolded question: what it decides.
  topicPurposes: {
    story: "Le propos : ce que l'on met en scène.",
    look: "L'image : esthétique, lumière, couleurs.",
    tone: "L'émotion que l'on veut faire ressentir.",
    musts: "Ce qui doit absolument y être, et ce qui ne doit pas y apparaître.",
  },
  // What a question of the release's direction decides (MKT-C2-06).
  directionPurposes: {
    story:
      "L'idée qui relie tous les livrables, et ce que la sortie veut dire.",
    look: "Ce que tous les livrables partagent : couleurs, matières, typographies, sons.",
    tone: "La voix commune de la sortie.",
    musts:
      "Ce qui s'impose à tous les livrables, et ce qu'aucun ne doit faire.",
  },
  notDefined: "Pas encore défini",

  choices: {
    options: {
      story: {
        artist_story: "L'histoire derrière le titre",
        lyrics: "Les paroles mises en images",
        portrait: "Un portrait de l'artiste",
        performance: "L'artiste en performance",
        concept: "Un concept, une métaphore visuelle",
        universe: "La suite de l'univers de l'artiste",
      },
      look: {
        minimal: "Épuré, minimaliste",
        cinematic: "Cinématographique",
        raw: "Brut, documentaire",
        colorful: "Coloré, pop",
        dark: "Sombre, contrasté",
        retro: "Rétro, grain vintage",
      },
      tone: {
        intimate: "Intime",
        energetic: "Énergique",
        melancholic: "Mélancolique",
        bright: "Solaire, joyeux",
        offbeat: "Décalé, drôle",
        committed: "Engagé",
      },
      musts: {
        artist_on_screen: "L'artiste à l'écran",
        lyrics_on_screen: "Les paroles à l'écran",
        visual_identity: "L'identité visuelle de l'artiste (logo, couleurs)",
        vertical_format: "Une déclinaison verticale pour les réseaux",
        no_brands: "Aucune marque visible",
        no_explicit: "Rien d'explicite",
      },
    },
    // Fragments used to write the answer from the checked choices (code, not AI).
    phrases: {
      story: {
        artist_story: "l'histoire personnelle derrière le titre",
        lyrics: "les paroles du titre, mises en images",
        portrait: "un portrait de l'artiste",
        performance: "l'artiste en performance",
        concept: "un concept, une métaphore visuelle",
        universe: "la suite de l'univers de l'artiste",
      },
      look: {
        minimal: "épurée et minimaliste",
        cinematic: "cinématographique",
        raw: "brute, façon documentaire",
        colorful: "colorée et pop",
        dark: "sombre et contrastée",
        retro: "rétro, avec un grain vintage",
      },
      tone: {
        intimate: "intime",
        energetic: "énergique",
        melancholic: "mélancolique",
        bright: "solaire et joyeux",
        offbeat: "décalé et drôle",
        committed: "engagé",
      },
      musts: {
        artist_on_screen: "l'artiste à l'écran",
        lyrics_on_screen: "les paroles à l'écran",
        visual_identity: "l'identité visuelle de l'artiste (logo, couleurs)",
        vertical_format: "une déclinaison verticale pour les réseaux",
        no_brands: "toute marque visible",
        no_explicit: "tout contenu explicite",
      },
    },
    sentences: {
      story: (list: string) => `On raconte ${list}.`,
      look: (list: string) => `L'image est ${list}.`,
      tone: (list: string) => `Le ton est ${list}.`,
      musts: (list: string) => `Doit y figurer : ${list}.`,
      avoid: (list: string) => `À éviter : ${list}.`,
    },
    and: "et",
    answer: "Réponse",
    recompose: "Recomposer depuis les choix",
    other: "Autre, préciser",
    otherPlaceholder: "Précisez",
    save: "Enregistrer la réponse",
    saving: "Enregistrement…",
    none: "Pas encore de réponse.",
    saved: "Intention enregistrée",
    // Folds the question back when there is nothing left to save.
    done: "Terminé",
  },

  // Rewording one of PO's proposals before confirming it.
  composer: {
    label: "Votre réponse",
    placeholder: "Écrivez ou dictez l'intention.",
    sending: "Envoi…",
  },

  proposals: {
    title: "Propositions de PO",
    hint: "Relevées dans une source. Rien n'est retenu sans votre confirmation.",
    topic: (topic: string) => `Sujet : ${topic}`,
    fromCall: (title: string) => `Call « ${title} »`,
    fromImport: (title: string) => `Brief importé « ${title} »`,
    unknownSource: "Source inconnue",
    openCall: "Ouvrir le call",
    alsoFor: (targets: string) => `Concerne aussi : ${targets}`,
    differs: "Diffère de la réponse déjà posée : la confirmer la remplace.",
    confirm: "Confirmer",
    edit: "Modifier",
    reject: "Écarter",
    confirmEdited: "Confirmer ainsi",
    cancel: "Annuler",
    valueLabel: "Intention",
    confirmed: "Intention confirmée",
    rejected: "Proposition écartée",
  },

  unassigned: {
    title: "À rattacher",
    hint: "PO n'a pas su dire à quoi ces intentions se rattachent : choisissez la cible avant de confirmer.",
    targetLabel: "Rattacher à",
    targetPlaceholder: "Choisir une cible",
    targetRequired: "Choisissez à quoi rattacher cette intention.",
  },

  references: {
    title: "Références",
    empty: "Aucune référence pour l'instant.",
    add: "Ajouter une référence",
    dialogTitle: "Ajouter une référence",
    dialogDescription:
      "Un lien vers une inspiration : vidéo, image, playlist, moodboard en ligne.",
    urlLabel: "Lien",
    urlPlaceholder: "https://…",
    urlInvalid: "Le lien doit commencer par https://.",
    noteLabel: "Ce qu'on en retient",
    notePlaceholder: "Ex. la lumière, le rythme du montage.",
    submit: "Ajouter",
    submitting: "Ajout…",
    cancel: "Annuler",
    open: "Ouvrir dans un nouvel onglet",
    remove: "Retirer",
    removeLabel: (url: string) => `Retirer la référence ${url}`,
    added: "Référence ajoutée",
    removed: "Référence retirée",
  },

  import: {
    open: "Importer un brief existant",
    dialogTitle: "Importer un brief existant",
    dialogDescription:
      "Collez le texte d'un brief déjà écrit ailleurs. PO y relève les intentions et les rattache aux livrables ; vous confirmez chacune.",
    titleLabel: "Titre",
    titlePlaceholder: "Ex. Brief clip de l'agence",
    bodyLabel: "Texte du brief",
    bodyPlaceholder: "Collez le texte ici.",
    fileLabel: "Ou choisir un fichier texte (.txt, .md)",
    fileUnreadable: "Ce fichier ne peut pas être lu comme du texte.",
    tooLong: (max: number) =>
      `Le texte dépasse ${max.toLocaleString("fr-FR")} caractères : raccourcissez-le.`,
    count: (n: number, max: number) =>
      `${n.toLocaleString("fr-FR")} / ${max.toLocaleString("fr-FR")} caractères`,
    submit: "Importer",
    submitting: "PO lit le brief…",
    cancel: "Annuler",
    done: (n: number) =>
      n === 0
        ? "Brief importé. PO n'y a relevé aucune intention claire."
        : n === 1
          ? "Brief importé. PO propose 1 intention à confirmer."
          : `Brief importé. PO propose ${n} intentions à confirmer.`,
    providerFailed:
      "Brief importé, mais PO n'a pas pu le lire pour l'instant. Le texte est gardé comme source.",
  },

  versions: {
    title: "Versions",
    hint: "Les versions déposées, relues par le chef de projet. La Production part d'une version approuvée.",
    directionTarget: "Direction créative",
  },

  errors: {
    invalid: "Vérifiez ce qui a été saisi.",
  },
};
