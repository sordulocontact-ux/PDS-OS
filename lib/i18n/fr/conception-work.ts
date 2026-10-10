/** Conception, travail direct (ticket « Conception », Chemin B). */
export const conceptionWork = {
  title: "Travail direct",
  intro:
    "PO part de ce que la Stratégie et le Cadrage disent déjà, et ne pose que les questions qui manquent.",
  readOnly:
    "Lecture seule : le chef de projet et l'équipe créative écrivent ici pendant la conception.",

  targets: {
    label: "Ce que vous travaillez",
    direction: "Direction créative",
    answered: (n: number, total: number) => `${n} sur ${total} posées`,
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
      "Ce besoin reste à qualifier : il n'est ni validé ni planifié. Vous pouvez déjà poser ses intentions.",
  },

  questions: {
    deliverable: {
      story: (title: string) => `Que doit raconter « ${title} » ?`,
      look: (title: string) => `À quoi « ${title} » doit-il ressembler ?`,
      tone: (title: string) => `Quel ton, quelle émotion pour « ${title} » ?`,
      musts: (title: string) =>
        `Qu'est-ce qui doit absolument être dans « ${title} », ou en être absent ?`,
    },
    direction: {
      story: "Quelle histoire porte l'ensemble de la campagne ?",
      look: "Quel univers visuel tous les livrables partagent-ils ?",
      tone: "Quel ton, quelle émotion pour l'ensemble ?",
      musts:
        "Qu'est-ce qui doit se retrouver partout, ou n'apparaître nulle part ?",
    },
    remaining: (n: number) =>
      n === 1
        ? "Encore 1 question après celle-ci."
        : `Encore ${n} questions après celle-ci.`,
    allDone:
      "Les intentions sont posées. Vous pouvez les modifier à tout moment.",
    allDoneDirection:
      "La direction créative est posée. Vous pouvez la modifier à tout moment.",
    skipped:
      "Questions laissées pour plus tard. Elles reviendront à votre prochain passage.",
    restart: "Reprendre les questions",
  },

  composer: {
    label: "Votre réponse",
    placeholder: "Écrivez ou dictez l'intention.",
    send: "Envoyer",
    sending: "Envoi…",
    later: "Plus tard",
    edit: "Modifier",
    cancel: "Annuler",
    save: "Enregistrer",
    you: "Vous",
    po: "PO",
    saved: "Intention enregistrée",
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
