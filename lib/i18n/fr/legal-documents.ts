// The Juridique's documents in their steps (proto « Projet complet »,
// juridique-v2.html, rule 18): a template asked of the direction in the Plan
// d'action, a contract's document in head of its card. Exact words of the
// proto.

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

export const legalDocuments = {
  template: {
    // The direction, in the Plan d'action.
    toValidate: "À vous · Valider un modèle de contrat",
    toValidateBody:
      "Un modèle validé entre dans la bibliothèque : il servira sur tous les projets, pour ces rôles.",
    todo: (name: string) => `Valider le modèle « ${name} »`,
    importedBy: (file: string | null, by: string, person: string) =>
      `${file ? `${file} · ` : ""}importé par ${by} pour ${person}`,
    view: "Voir le modèle",
    appliesTo: "S'applique à",
    appliesToSource: "Il sera proposé seul pour ces rôles",
    fieldSource: "Repéré par PO dans le modèle : rempli à chaque contrat",
    fieldValue: "Rempli à chaque contrat",
    validate: "Valider le modèle",
    validated: "Modèle validé",
    refuse: "Refuser le modèle",
    refused: "Modèle refusé",
    refuseVerb: "refuser le modèle",
    refuseWhy: "Ce qui ne va pas",
    refusePlaceholder: "La clause de durée doit être limitée à 10 ans.",
    refuseHint: (owner: string) =>
      `Revient signé à ${owner}, dans les contrats à prévoir.`,
    refuseMissing: "Dites ce qui ne va pas : c'est ce qui reviendra.",
    // The one who made it, in « Contrats à prévoir ».
    pending: (name: string, direction: string) =>
      `Modèle « ${name} » envoyé à ${direction} : en attente de sa validation`,
    waits: (person: string, direction: string) =>
      `Le modèle de ${person} attend la validation de ${direction}.`,
    // The modal (« Nouveau modèle de contrat »).
    modalBody:
      "Il entre dans la bibliothèque une fois validé par la direction, et sera proposé pour ces rôles sur tous les projets.",
    send: "Envoyer à la direction",
    sent: "Modèle envoyé à la direction",
    failed: "Le modèle n'a pas pu être envoyé à la direction.",
  },
  contract: {
    fileName: (person: string, project: string, version: number) =>
      `Contrat_${person}_${project}_v${version}.pdf`,
    generated: (blocking: number, total: number) =>
      `Généré depuis les valeurs ci-dessous · ${plural(blocking, "bloquante", "bloquantes")} sur ${total} · chaque valeur se corrige à sa source`,
    pdf: "Voir le PDF",
    pdfPending: "Préparation du PDF…",
    pdfFailed: "Le PDF n'a pas pu être préparé.",
    changedSince: "Changé depuis la v1",
    change: (clause: string, by: string, version: number, text: string) =>
      `clause « ${clause} » (${by}, v${version}) : « ${text} »`,
    clauses: {
      credit: "Crédit",
      duration: "Durée",
      territory: "Territoire",
      fee: "Rémunération",
      exclusivity: "Exclusivité",
      other: "Autre",
    } as Record<string, string>,
    decide:
      "Vous décidez sur ce document, tel qu'il partira. Une valeur fausse se corrige à sa source ; un texte à changer, c'est une clause.",
    returnVerb: "demander des modifications",
    changesLabel:
      "Ce qu'il faut changer (une clause, ou une valeur à corriger à sa source)",
    returnHint: (owner: string) =>
      `Revient signé en tête de l'étape de ${owner}.`,
    approved: "Document validé",
    changesSent: "Modifications demandées",
    resubmit: "Répondre et transmettre à nouveau",
    // « Modifier une clause » in the step.
    revise: "Modifier une clause",
    reviseHint: "Crée une nouvelle version du document",
    clause: "Clause",
    newText: "Nouvelle rédaction",
    newTextHint:
      "Le texte du document : changez la clause à sa place, le reste ne bouge pas.",
    why: "Pourquoi",
    whyPlaceholder: "Demande de la direction du 19/10.",
    create: "Créer la nouvelle version",
    created: "Nouvelle version créée",
    missingText: "Changez la clause dans le texte : sinon, rien ne change.",
    missingWhy: "Dites pourquoi : c'est gardé avec la version.",
  },
  bulletin: {
    fileName: (title: string, version: number) =>
      `Bulletin_725_${title}_v${version}.pdf`,
    draftName: (title: string) => `Bulletin_725_${title}_BROUILLON.pdf`,
    draftMark: "BROUILLON — informations manquantes",
    generatedOn: (day: string, signed: number, total: number) =>
      `Généré le ${day} · signatures : ${signed} sur ${total}`,
    download: "Télécharger",
    pdfPending: "Préparation du PDF…",
    pdfFailed: "Le PDF n'a pas pu être préparé.",
    values: "Les valeurs du bulletin",
    // « Avant de générer », in three columns (proto).
    before: "Avant de générer",
    blocking: "Bloquant",
    toConfirm: "À confirmer",
    optional: "Facultatif",
    nothing: "Rien.",
    required: "Obligatoire pour la SACEM : sans lui, pas de version à signer",
    proposed: (source: string) =>
      `Proposé depuis ${source} : à confirmer, jamais repris sans votre accord`,
    optionalNote: "Facultatif",
    confirm: "Confirmer",
    generate: "Générer la version à signer",
    draft: "Générer un brouillon",
    notYet: (blocking: number, toConfirm: number) =>
      `Pas encore : ${blocking} point${blocking > 1 ? "s" : ""} bloquant${blocking > 1 ? "s" : ""} et ${toConfirm} à confirmer. Un brouillon reste possible.`,
    draftDone: "Brouillon prêt",
  },
  split: {
    confirmations: "Confirmations · liens privés",
    confirmationsBody:
      "Un lien par personne, valable 30 jours : chacun confirme ou conteste. Une contestation revient ici, avec son motif.",
    markSent: "Marquer comme envoyé",
    sent: "Lien marqué comme envoyé",
    proposed: "Envoyée pour confirmation",
    renewed: "Nouveau lien créé",
    emailSubject: (title: string) => `Répartition à confirmer · ${title}`,
  },
} as const;
