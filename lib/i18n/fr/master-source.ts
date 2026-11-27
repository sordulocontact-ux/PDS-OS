// The Source step of the Master (proto `master-v2.html`, ticket « Workflow
// Master » § 1 and § 2): the version a mix starts from, what PDS OS checked,
// the final vocals awaited or anticipated.

export const masterSource = {
  titles: "Titres du projet",
  noTitle: "Aucun titre dans le projet : le Master commence avec un titre.",
  detected: "Dernière version détectée",
  // Another version picked instead of the newest (Sacha, 09/11/2026).
  chosen: "Version choisie",
  otherVersion: "Partir d'une autre version",
  versionOption: (version: number, state: string, fileName: string) =>
    `v${version} · ${state.toLowerCase()} · ${fileName}`,
  versionMeta: (
    version: number,
    state: string,
    by: string | null,
    day: string,
    latest: boolean,
  ) =>
    [
      `v${version}`,
      state.toLowerCase(),
      by ? `ajoutée par ${by} ${day}` : `ajoutée ${day}`,
      latest ? "la plus récente" : null,
    ]
      .filter(Boolean)
      .join(" · "),
  listen: (name: string) => `Écouter ${name}`,
  catalogNote:
    "Les versions audio du titre au Catalogue. Un master final ne peut pas être une source.",
  notListed: "Une version manque ?",
  importVersion: "Importer une version",
  // The step's gesture when the title has no audio (Akili, 02/11/2026): the
  // button says it, no paragraph before it (Sacha, 27/11/2026).
  importFirst: "Importer la maquette ou la mise à plat",
  checked: "Ce que PDS OS a vérifié",
  mix: {
    label: "Où en est le mix",
    source: "Lu au Catalogue",
    value: {
      todo: "Mix à faire · aucun mix au Catalogue",
      found: (file: string) => `Mix trouvé au Catalogue · ${file}`,
      running: "Mix en cours · des versions sont arrivées",
      done: "Mix final validé",
    },
    state: { todo: "À faire", running: "En cours", done: "Fait" },
  },
  stems: {
    label: "Pistes séparées",
    value: (n: number, latest: string | null) =>
      n === 0
        ? "Aucune piste séparée au Catalogue"
        : `${n > 1 ? `${n} fichiers` : "1 fichier"}${latest ? ` · ${latest}` : ""}`,
    source: "Lu par le code · fichiers du titre",
    ready: "Prêtes",
    missing: "À faire",
  },
  vocals: {
    label: "Voix définitives",
    yes: "Oui",
    no: (pending: string | null) => (pending ? `Non · ${pending}` : "Non"),
    source: (by: string | null, day: string) =>
      by ? `Déclaré par ${by} ${day}` : `Déclaré ${day}`,
    ready: "Prêtes",
    notYet: "Pas encore",
    question: "Les voix de cette version sont-elles définitives ?",
    yesChoice: "Oui, les voix sont définitives",
    yesHint: "Le mix pourra devenir le mix final sur cette version.",
    noChoice: "Non, pas encore",
    noHint: "Il reste des voix à enregistrer sur ce titre.",
    pending: "Ce qui reste à enregistrer",
    pendingHint: "Par exemple : le 2e couplet, session du 13/11.",
  },
  plan: {
    legend: "Les voix ne sont pas définitives : que fait-on ?",
    note: "Deux façons de faire, chacune avec sa conséquence. Vous décidez.",
    wait: "Attendre les voix définitives",
    waitHint: (artist: string, due: string | null) =>
      `Le mix attend. ${artist} enregistre les voix définitives ; PDS OS surveille leur arrivée au Catalogue, vous confirmez la nouvelle source, puis le dossier part.${due ? ` Mix V1 attendu le ${due}.` : ""}`,
    anticipate: "Anticiper avec une version de travail",
    anticipateHint: (file: string) =>
      `Le mixeur commence sur ${file}. À l'arrivée des voix définitives, PDS OS propose de remplacer la source, vous confirmez, il est prévenu. Aucun mix ne peut être validé avant.`,
    chosen: "Choix",
    decidedBy: (by: string | null) => (by ? `Décidé par ${by}` : "Décidé"),
  },
  errors: {
    version: "Choisissez la version de départ du mix.",
    vocals: "Dites si les voix de cette version sont définitives.",
    plan: "Choisissez : attendre les voix définitives, ou anticiper avec une version de travail.",
    reason:
      "Dites pourquoi ce mix est le bon : c'est ce que l'historique gardera.",
    choice: "Choisissez : utiliser ce mix, ou refaire un mixage.",
    failed: "La source n'a pas pu être enregistrée. Réessayez.",
    forbidden: "Seul le responsable du projet confirme la source.",
    notASource: "Cette version ne peut pas être la source du mix.",
    linkFailed:
      "La source est remplacée, mais le lien de l'ingénieur n'a pas pu être mis à jour : renvoyez le dossier depuis le Mixage.",
  },
  submit: "Utiliser cette version",
  submitting: "Enregistrement…",
  done: "Source confirmée",
  current: {
    label: "Source du mix",
    source: (by: string | null, day: string, working: boolean) =>
      [
        by ? `Confirmée par ${by} ${day}` : `Confirmée ${day}`,
        working ? "version de travail" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    change: "Changer la source",
    cancel: "Annuler",
  },
  waiting: (artist: string, pending: string | null) =>
    `En attente de ${artist} : enregistrer les voix définitives${pending ? ` (${pending})` : ""}.`,
  watching:
    "PDS OS surveille le Catalogue : à l'arrivée des voix, il propose de remplacer la source.",
  newer: {
    title: "Nouvelle version reçue au Catalogue :",
    proposed: "Nouvelle source proposée",
    engineer: (name: string) =>
      `${name} la trouvera sur son lien, avec ses pistes : ses prochaines versions partiront de là.`,
    replace: (name: string | null) =>
      name
        ? `Remplacer la source et prévenir ${name.split(" ")[0]}`
        : "Remplacer la source",
    done: "Source remplacée",
  },
  existing: {
    found: "Mix trouvé",
    meta: (by: string | null, day: string) =>
      by ? `Mix · ajouté par ${by} ${day}` : `Mix · ajouté ${day}`,
    legend: "Un mix existe déjà au Catalogue : que fait-on ?",
    use: "Utiliser ce mix comme mix final",
    useHint:
      "Le titre passe directement au Mastering : pas de mixage, pas de pistes à envoyer.",
    redo: "Refaire un mixage",
    redoHint:
      "Le mix part au mixeur depuis la version de départ choisie plus bas.",
    reason: "Pourquoi ce mix est le bon",
    submit: "Utiliser ce mix comme mix final",
    done: "Mix déjà terminé : le titre passe au Mastering",
    declared: (
      file: string,
      by: string | null,
      day: string,
      reason: string | null,
    ) =>
      `Non nécessaire : le mix existe déjà. ${file}, utilisé comme mix final${by ? ` par ${by}` : ""} ${day}${reason ? ` : « ${reason} »` : ""}.`,
  },
} as const;
