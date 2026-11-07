// The démarches of the Juridique as steps of its journey (proto « Projet
// complet », juridique-v2.html): their titles, why, what is expected now,
// what a done one gave, and « Prêt pour la sortie ». Words of the proto.

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
// « de » elides before a vowel: « Fiche d'Owen Delacroix ».
const de = (name: string) =>
  /^[aeiouyàâéèêëîïôûüh]/i.test(name) ? `d'${name}` : `de ${name}`;

export const legalDemarches = {
  // The plan once launched (JUR-05): each démarche, immediate or dependent.
  launched: {
    nature: { immediate: "immédiate", dependent: "dépendante" },
    responsible: (name: string) => `Responsable : ${name}`,
    due: (day: string) => `avant le ${day}`,
    prereq: (labels: string) => `Prérequis : ${labels}`,
    edit: "Modifier",
    state: {
      done: "Faite",
      blocked: "Attend son prérequis",
      overdue: "Échéance dépassée",
      waiting: "En attente d'un retour",
      current: "En cours",
      obsolete: "Obsolète",
    },
  },
  // From a contract's value to the person's fiche, and back (JUR-10).
  backToContract: "Retour au contrat",
  groups: {
    dossier: "Dossier",
    tracking: "Suivi",
    proposed: "Suivi · démarches proposées",
    release: "Sortie",
  },
  titles: {
    person: (name: string) => `${name} · fiche et contrat`,
    clearance: (work: string) => `Autorisation d'utilisation « ${work} »`,
    split: (title: string) => `Répartition de l'édition « ${title} »`,
    sacem: (title: string) => `Déclaration SACEM « ${title} »`,
    ready: "Prêt pour la sortie",
  },
  why: {
    person:
      "Sa fiche donne au contrat ce qui lui manque. La direction valide le document avant l'envoi en signature.",
    // In plain words (Sacha, 07/11/2026: « je comprends rien sur la page »).
    clearance:
      "Le titre reprend un morceau d'une chanson qui existe déjà. Pour pouvoir le sortir, il faut l'accord écrit de ceux qui en ont les droits, en trois temps : leur demander, s'accorder sur les conditions, leur faire signer une licence.",
    split:
      "Les parts de l'œuvre, saisies par une personne et confirmées par chaque ayant droit par son lien. Confirmer n'est pas signer un contrat.",
    sacem:
      "Le bulletin 725, rempli depuis le dossier et le master final, vérifié avant d'être généré, signé par les créateurs et l'éditeur, puis déposé.",
    ready:
      "Calculé à chaque lecture depuis toutes les sources : le Master, les droits, les métadonnées, les visuels et la Distribution. Seule la direction valide la sortie avant The Orchard.",
  },
  // Who validates a démarche (grid of the open step).
  validator: "La direction",
  validatorRole: "La direction · contrats et conditions",
  readyRole: "Valide la sortie avant The Orchard",
  direction: "La direction",
  holders: "les ayants droit",
  sacemOrg: "La SACEM",
  // Prerequisites said in the grid and « Après : … ».
  prereq: {
    fiche: (name: string) => `Fiche ${de(name)}`,
  },
  // What is expected now, by whom (the journey's « À vous · … »).
  todo: {
    prepareFiche: "Créer le lien de la fiche",
    markSent: "Envoyer le lien",
    fillFiche: "Remplir sa fiche de renseignements",
    review: "Vérifier la fiche",
    completeFiche: "Compléter sa fiche",
    link: "Relier au Réseau",
    addToNetwork: "Ajouter au Réseau",
    mapping: "Confirmer les contrats nécessaires",
    missing: "Compléter ce qui manque au contrat",
    generate: "Générer le contrat",
    submit: "Soumettre à la direction",
    validateDocument: "Valider le document",
    send: "Envoyer le contrat",
    signContract: "Signer et renvoyer le contrat",
    deposit: "Marquer comme signé",
    countersign: "Signer le contrat pour PDS",
    checkSigned: "Vérifier la signature et marquer signé",
    decide: "Décider de la suite",
    ask: "Demander l'autorisation",
    answer: "Répondre à la demande",
    reply: "Coller leur réponse",
    validateTerms: "Valider les conditions",
    sendLicence: "Envoyer la licence",
    signLicence: "Signer la licence",
    secure: "Marquer comme sécurisé",
    proposeSplit: "Proposer la répartition",
    sendSplit: "Envoyer pour confirmation",
    confirmSplit: "Confirmer la répartition",
    disputed: "Proposer une nouvelle version",
    bulletin: "Préparer le bulletin",
    signatures: "Recueillir les signatures",
    file: "Enregistrer le dépôt",
    sacemAnswer: "Répondre à la déclaration",
    correct: "Corriger la déclaration",
    open: "Faire avancer la démarche",
  },
  summary: {
    person: "Contrat signé",
    ficheOnly: "Fiche validée",
    noDeal: "Pas d'accord nécessaire",
    clearance: "Autorisation obtenue",
    split: "Confirmée par tous",
    sacem: "Enregistrée par la SACEM",
  },
  obsolete: (reason: string) => `Obsolète · ${lower(reason)}`,
  // A démarche proposed while the plan is not launched.
  proposed: {
    note: "Proposée par le code d'après le dossier. Elle démarre quand le plan d'action est lancé.",
    comes: "Ce qui viendra",
    owner: "Le responsable",
    person: (name: string) => name,
    gestures: {
      person: [
        ["owner", "Envoyer la fiche"],
        ["them", "Remplir sa fiche de renseignements"],
        ["owner", "Vérifier les réponses"],
        ["owner", "Soumettre à la direction"],
        ["dg", "Valider le document"],
        ["owner", "Envoyer le contrat"],
        ["owner", "Marquer comme signé"],
      ],
      clearance: [
        ["owner", "Demander l'autorisation"],
        ["holders", "Répondre à la demande"],
        ["dg", "Valider les conditions"],
        ["owner", "Envoyer la licence"],
        ["owner", "Marquer comme sécurisé"],
      ],
      split: [
        ["owner", "Proposer la répartition"],
        ["owner", "Envoyer pour confirmation"],
        ["holders", "Confirmer la répartition"],
      ],
      sacem: [
        ["owner", "Préparer le bulletin"],
        ["owner", "Recueillir les signatures"],
        ["owner", "Enregistrer le dépôt"],
        ["sacem", "Enregistrer la réponse de la SACEM"],
      ],
    } as Record<string, ReadonlyArray<readonly [string, string]>>,
    who: {
      owner: "Le responsable",
      dg: "La direction",
      holders: "Les ayants droit, par leur lien",
      sacem: "La SACEM",
    } as Record<string, string>,
  },
  // « Responsable · Changer » on an open démarche.
  responsible: "Responsable et échéance",
  // « Maintenant » when nothing waits for the viewer (proto).
  nowWaiting: "Le Juridique avance sans vous pour l'instant",
  // The démarche's steps inside its card (a person: fiche then contract).
  partsLabel: "Les temps de la démarche",
  ready: {
    verdict: {
      no: "Non prête",
      risk: "Prête à être validée",
      ok: "Prête à être validée",
    },
    summary: {
      no: (n: number) =>
        n === 1
          ? "Non prête · 1 point à résoudre"
          : `Non prête · ${n} points à résoudre`,
      // JUR-07: ready to be validated ≠ validated ≠ delivered.
      risk: "Prête à être validée · des points à suivre",
      ok: "Prête à être validée",
      validated: (name: string) => `Sortie validée par ${name}`,
      delivered: "Livrée au distributeur",
    },
    todo: "Valider la sortie avant The Orchard",
  },
} as const;
