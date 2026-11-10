// The Master as a journey of five steps (docs/VISION-UX.md § 4, proto
// `master-v2.html`): title, why, what each person does now and what a done
// step gave, then « Déjà fait » and the « Historique du master ». Written
// here, never in the components.

const titles = (n: number) => (n > 1 ? `${n} titres` : "1 titre");
const lowerFirst = (text: string) =>
  text ? text.charAt(0).toLowerCase() + text.slice(1) : text;

export const masterJourney = {
  module: "Master",
  facts: { masterFinal: "Master final attendu le" },
  roles: {
    owner: "Responsable du Master",
    ownerWhat: "Confirme la source, remplit le Brief, envoie les dossiers",
    mix: "Ingénieur du mix",
    mixWhat: "Prend en charge le dossier et dépose les versions du mix",
    mastering: "Ingénieur du mastering",
    masteringWhat: "Dépose les versions du master et les livrables",
    validator: "Validation des versions",
    validatorWhat: "Écoute, valide ou demande une modification",
  },
  owner: "Cheffe ou chef de projet",
  validatorRole: {
    brief: "Valide les versions · désignée au Brief",
    framing: "Valide les versions · désignée au Cadrage",
    owner: "Valide les versions · responsable du projet",
  },
  // Several prerequisites arrive joined by « et ».
  blocked: (prereqs: string) =>
    prereqs.includes(" et ")
      ? `Se débloque quand ${prereqs} sont faits.`
      : `Se débloque quand ${prereqs} est fait.`,
  steps: {
    source: {
      title: "Source",
      why: "La version de départ du mix, confirmée. Jamais un master final.",
    },
    brief: {
      title: "Brief",
      why: "Ce que l'ingénieur du mix puis celui du mastering doivent savoir : direction, livrables, formats, dates. C'est le dossier qu'ils recevront.",
    },
    mix: {
      title: "Mixage",
      why: "Le dossier part au mixeur, les versions reviennent, la validatrice décide. Un mix validé ne change plus.",
    },
    mastering: {
      title: "Mastering",
      why: "S'ouvre quand le mix final est validé : même mécanisme, sur le mix final.",
    },
    final: {
      title: "Master final",
      why: "Le master validé devient le master final du titre au Catalogue ; la Distribution et le Juridique le lisent directement. Restent les autres livrables et la facture.",
    },
    history: { title: "Historique" },
  },
  prereq: {
    plan: "Plan du projet lancé",
    planSource: (day: string | null) =>
      day ? `Plan du projet · fait ${day}` : "Plan du projet",
    sourceConfirmed: "Source confirmée",
    team: "Équipe et temporalité",
    teamSource: (day: string | null) =>
      day ? `Brief de cadrage · validé ${day}` : "Brief de cadrage",
    vocals: "Arrivée des voix définitives",
    mixOrExisting: "Mixage",
  },
  next: {
    distribution: "Distribution",
    distributionWhy: (day: string | null) =>
      day ? `attend le master final avant le ${day}` : "attend le master final",
    legal: "Juridique",
    legalWhy: "durée du bulletin SACEM",
  },
  todo: {
    addTitle: "Ajouter le titre au projet",
    confirmSource: (n: number) =>
      n > 1
        ? `Confirmer la source de ${titles(n)}`
        : "Confirmer la source du master",
    importSource: (n: number) =>
      n > 1
        ? `Importer la version de départ de ${titles(n)}`
        : "Importer la version de départ du mix",
    replaceSource: "Remplacer la source du master",
    recordVocals: (pending: string | null) =>
      pending
        ? `Enregistrer les voix définitives (${pending})`
        : "Enregistrer les voix définitives",
    startBrief: "Démarrer le Brief du master",
    answerQuestion: "Répondre à la question du Brief du master",
    applyAnswer: "Ajouter la réponse au Brief du master",
    callHeld: (day: string) => `Tenir l'échange prévu ${day}`,
    reviewCall: "Relire ce que PO a compris du call",
    completeBrief: "Compléter le Brief du master",
    recordBrief: "Enregistrer le Brief du master",
    chooseEngineer: (stage: "mix" | "mastering") =>
      stage === "mix"
        ? "Choisir l'ingénieur du mix"
        : "Choisir l'ingénieur du mastering",
    transmit: (stage: "mix" | "mastering") =>
      stage === "mix" ? "Transmettre au mixeur" : "Transmettre au mastering",
    renewLink: "Renouveler le lien de l'ingénieur",
    takeCharge: "Prendre en charge le dossier",
    deposit: (label: string, n: number, title: string | null) =>
      `Déposer le ${label} V${n}${title ? ` de « ${title} »` : ""}`,
    validate: (label: string, n: number, title: string | null) =>
      `Valider le ${label} V${n}${title ? ` de « ${title} »` : ""}`,
    answerEngineer: (first: string, n: number) =>
      n > 1 ? `Répondre à ${first} (${n} messages)` : `Répondre à ${first}`,
    arbitrateDelay: (first: string) => `Arbitrer le retard de ${first}`,
    acceptRate: (first: string) => `Accepter le tarif de ${first}`,
    depositDeliverables: (n: number) =>
      n > 1 ? `Déposer ${n} livrables` : "Déposer le livrable",
    noteDeliverables: (n: number) =>
      n > 1 ? `Noter les ${n} livrables reçus` : "Noter le livrable reçu",
  },
  // What a done step gave (journey's subtitle).
  summary: {
    noTitle: "Aucun titre dans le projet",
    allFinal: "Chaque titre avait déjà son master final",
    source: (fileName: string, replaced: boolean) =>
      replaced ? `${fileName} · voix définitives` : fileName,
    sources: (n: number) => `Source confirmée pour ${titles(n)}`,
    existingMix: (fileName: string) => `Mix déjà terminé : ${fileName}`,
    brief: "Prêt à transmettre",
    briefDirty: "Modifications à enregistrer",
    mixFinal: (n: number) => `Mix final : V${n}`,
    mixFinals: (n: number) => `Mix final pour ${titles(n)}`,
    mixNotNeeded: "Non nécessaire : mix déjà terminé",
    masterFinal: (n: number) => `Master final : V${n}`,
    masterFinals: (n: number) => `Master final pour ${titles(n)}`,
    final: "Au Catalogue · livrables reçus",
  },
  // Status pill of a done Mixage whose mix existed (proto « Non nécessaire »).
  notNeeded: "Non nécessaire",
  versionLabel: { mix: "Mix", mastering: "Master" },
  // « Maintenant » of the module.
  now: {
    waitingTitle: "Le Master avance sans vous pour l'instant",
    finished: "Le master final est au Catalogue",
  },
  lowerFirst,
  // « Déjà fait » and the Historique du master (lib/master-workflow/history.ts).
  history: {
    link: "Historique du master",
    title: "Historique du master",
    description:
      "Chaque geste, qui l'a fait, quand, et ce qui l'a déclenché. Une version validée ne se remplace jamais en silence.",
    everyone: "Tout le monde",
    filterLabel: "Filtrer par personne",
    csv: "Exporter en CSV",
    csvHead: ["Date", "Qui", "Geste", "Suite à"],
    csvName: "historique-master.csv",
    back: "← Parcours",
    empty: "Rien n'a encore été fait sur le Master.",
    pdsName: "PDS OS",
    viaLink: (name: string) => `${name} (lien privé)`,
    of: (title: string) => `« ${title} »`,
    sourceConfirmed: (file: string, title: string | null) =>
      `Source confirmée : ${file}${title ? ` (« ${title} »)` : ""}`,
    sourceChosen: (choice: string) => `Choix · ${choice}`,
    existingMix: (file: string) => `Mix déclaré mix final : ${file}`,
    briefSaved: "Brief enregistré",
    questionAsked: (to: string) => `Question de PO posée à ${to}`,
    questionAnswered: "Réponse à la question du Brief",
    questionApplied: "Réponse ajoutée au Brief",
    exchangeCreated: (title: string) => `Échange prévu : ${title}`,
    sent: (who: string, stage: "mix" | "mastering") =>
      stage === "mix"
        ? `Dossier envoyé à ${who}`
        : `Dossier du mastering envoyé à ${who}`,
    linkSent: "Lien marqué comme envoyé",
    opened: "Lien ouvert",
    acknowledged: "Dossier pris en charge",
    revoked: (reason: string) => `Lien révoqué : « ${reason} »`,
    deposited: (label: string, n: number, title: string | null) =>
      `${label} V${n} déposé${title ? ` (« ${title} »)` : ""}`,
    feedbackSent: (label: string, n: number) =>
      `Retours transmis sur le ${label} V${n}`,
    approved: (label: string, n: number) => `${label} V${n} validé`,
    changes: (label: string, n: number) =>
      `Modification demandée sur le ${label} V${n}`,
    reopened: (label: string, reason: string) =>
      `${label} rouvert : « ${reason} »`,
    catalogued: (n: number) =>
      `Master V${n} rattaché au titre du Catalogue : master final`,
    deliverable: (label: string) => `${label} reçu`,
    message: (kind: string) => `Message de l'ingénieur : ${kind}`,
    after: {
      approved: (label: string, n: number) => `${label} V${n} validé`,
      sent: "Dossier envoyé",
    },
  },
} as const;
