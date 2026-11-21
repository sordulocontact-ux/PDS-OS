// The démarches of the Juridique as steps of its journey (proto « Projet
// complet », juridique-v2.html): their titles, why, what is expected now,
// what a done one gave, and « Prêt pour la sortie ». Words of the proto.

import { contracts } from "@/lib/i18n/fr/contracts";

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
    // A collective (Ibé, 18/11/2026): what is the whole project's, then one
    // group per title (« Néons · Jay »), the abandoned ones last.
    project: "Projet",
    titleWith: (title: string, artists: string) => `${title} · ${artists}`,
    abandoned: (label: string) => `${label} (abandonné)`,
  },
  // In a title's group of a collective, the title is not said again.
  inTitle: {
    split: "Répartition de l'édition",
    sacem: "Déclaration SACEM",
  },
  // A collective's title not in the Catalogue yet (§ 3.6 of Ibé's 18/11).
  attach: {
    title: "Rattacher le titre au Catalogue",
    inCatalogue: "Déjà au Catalogue",
    audio: "Pas encore au Catalogue",
    onlyOwner: (name: string) =>
      `${name}, responsable du projet, peut rattacher ce titre.`,
  },
  // The contracts a collective's title needs (Ibé, 18/11/2026, § 3.4): one
  // step in the title's group, a reminder in the Plan d'action.
  titleContracts: {
    title: "Contrats du titre",
    recapTitle: "Contrats des titres",
    // Production and Beatmaker have no contract type of their own.
    kinds: {
      production: "Production",
      image_rights: contracts.types.image_rights,
      publishing: contracts.types.publishing,
      beatmaker: "Beatmaker",
    },
    groupLabel: "Contrats nécessaires",
    confirm: "Confirmer les contrats nécessaires",
    confirming: "Confirmation…",
    edit: "Modifier",
    cancel: "Annuler",
    toConfirm: "À confirmer",
    none: "Aucun contrat nécessaire",
    done: "Contrats du titre confirmés",
    errors: {
      abandoned: "Ce titre est abandonné.",
      invalid: "Choisissez parmi les contrats proposés.",
      failed: "La confirmation n'a pas pu être faite. Réessayez.",
    },
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
    clearance: "Une œuvre existante non autorisée bloque la sortie.",
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
  // What is expected now, by whom (the journey's « À vous · … »). A gesture
  // of the démarche's responsible or of the direction names its object and
  // who it is for (« Préparer le contrat de Sami Kader »): it reads alone in
  // Travail and on the home (retour d'Akili du 01/11/2026, Sacha 10/11). The
  // gestures of someone outside stay short: their name comes before them
  // (« Sami Kader · remplir sa fiche »).
  todo: {
    prepareFiche: (name: string) => `Créer le lien de la fiche ${de(name)}`,
    markSent: (name: string) => `Envoyer à ${name} le lien de sa fiche`,
    fillFiche: "Remplir sa fiche de renseignements",
    review: (name: string) => `Vérifier la fiche ${de(name)}`,
    completeFiche: "Compléter sa fiche",
    link: (name: string) => `Relier ${name} au Réseau`,
    addToNetwork: (name: string) => `Ajouter ${name} au Réseau`,
    mapping: (name: string) =>
      `Confirmer les contrats nécessaires pour ${name}`,
    missing: (name: string) => `Compléter ce qui manque au contrat ${de(name)}`,
    prepareContract: (name: string) => `Préparer le contrat ${de(name)}`,
    generate: (name: string) => `Générer le contrat ${de(name)}`,
    submit: (name: string) => `Soumettre le contrat ${de(name)} à la direction`,
    validateDocument: (name: string) => `Valider le contrat ${de(name)}`,
    send: (name: string) => `Envoyer le contrat à ${name}`,
    signContract: "Signer et renvoyer le contrat",
    deposit: (name: string) => `Marquer le contrat ${de(name)} comme signé`,
    countersign: (name: string) => `Signer le contrat ${de(name)} pour PDS`,
    checkSigned: (name: string) =>
      `Vérifier la signature ${de(name)} et marquer le contrat signé`,
    decideContract: (name: string) =>
      `Décider de la suite du contrat ${de(name)}`,
    decide: (work: string) => `Décider de la suite pour « ${work} »`,
    ask: (work: string) => `Demander l'autorisation d'utiliser « ${work} »`,
    answer: "Répondre à la demande",
    reply: (work: string) =>
      `Coller la réponse des ayants droit de « ${work} »`,
    validateTerms: (work: string) =>
      `Valider les conditions d'utilisation de « ${work} »`,
    sendLicence: (work: string) => `Envoyer la licence de « ${work} »`,
    signLicence: "Signer la licence",
    secure: (work: string) => `Marquer « ${work} » comme sécurisé`,
    proposeSplit: (title: string) => `Proposer la répartition de « ${title} »`,
    sendSplit: (title: string) =>
      `Envoyer la répartition de « ${title} » pour confirmation`,
    confirmSplit: "Confirmer la répartition",
    confirmSplitOwn: (title: string) =>
      `Confirmer la répartition de « ${title} »`,
    disputed: (title: string) =>
      `Proposer une nouvelle répartition de « ${title} »`,
    bulletin: (title: string) => `Préparer le bulletin SACEM de « ${title} »`,
    signatures: (title: string) =>
      `Recueillir les signatures du bulletin de « ${title} »`,
    file: (title: string) => `Enregistrer le dépôt SACEM de « ${title} »`,
    sacemAnswer: "Répondre à la déclaration",
    correct: (title: string) => `Corriger la déclaration SACEM de « ${title} »`,
    // Last resort, a step the code does not know: still says which one.
    open: (subject: string) => `Faire avancer la démarche ${de(subject)}`,
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
