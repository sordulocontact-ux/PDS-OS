/**
 * PO's drafts beyond the catalogue and projects (docs/ASSISTANT.md § 3 bis):
 * contract templates, contracts, network contacts, tasks, meetings, budget
 * lines. Card titles, panel descriptions and the facts given to the model.
 */
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export const assistantRecords = {
  titles: {
    createTemplate: (name: string) =>
      name
        ? `Nouveau modèle de contrat : ${name}`
        : "Nouveau modèle de contrat",
    templateVersion: (name: string, version: number) =>
      `Nouvelle version de « ${name} » (v${version})`,
    createContract: (title: string) =>
      title ? `Nouveau contrat : ${title}` : "Nouveau contrat",
    updateContract: (title: string) => `Modifier le contrat ${title}`,
    createContact: (name: string) =>
      name
        ? `Nouveau contact du Réseau : ${name}`
        : "Nouveau contact du Réseau",
    updateContact: (name: string) => `Modifier le contact ${name}`,
    createTask: (title: string) => `Nouvelle tâche : ${title}`,
    createMeeting: (title: string) => `Nouvelle réunion : ${title}`,
    createBudgetLine: (label: string) => `Nouvelle dépense : ${label}`,
    titleItem: (what: string, title: string) => `${what} · ${title}`,
  },
  // What a title item draft adds, in its card title.
  titleItems: {
    contributor: "Nouveau contributeur",
    session: "Nouvelle session",
    track: "Nouvelle piste",
    split: (kind: string) => `Nouvelle part ${kind.toLowerCase()}`,
    rights: "Droits",
    declaration: (organism: string) => `Déclaration ${organism}`,
  },
  sheet: {
    contractTemplate:
      "Relisez le modèle, collez ou corrigez son texte, puis enregistrez. Le directeur général le validera.",
    contract: "Relisez le contrat, corrigez si besoin, puis enregistrez.",
    networkContact: "Relisez le contact, corrigez si besoin, puis enregistrez.",
    task: "Choisissez la personne et l'échéance, puis créez la tâche.",
    meeting: "Vérifiez la date et les participants, puis créez la réunion.",
    budgetLine: "Relisez la dépense, corrigez si besoin, puis enregistrez.",
    titleItem:
      "Relisez, corrigez si besoin, puis enregistrez sur la fiche du titre.",
  },
  labels: { project: "Projet" },
  what: {
    project: "Projet",
    template: "Modèle de contrat",
    contract: "Contrat",
    contact: "Contact du Réseau",
  },
  // Links under a saved draft.
  templatesLink: "Modèles de contrat",
  // Facts for the model and the "Données utilisées" list.
  forbiddenLegal:
    "L'utilisateur n'a pas le droit de gérer les modèles de contrat (réservé au directeur général et aux chefs de projet).",
  forbiddenContracts: "L'utilisateur n'a pas le droit de gérer les contrats.",
  forbiddenNetwork: "L'utilisateur n'a pas le droit de modifier le Réseau.",
  whichProject:
    "Aucun projet nommé et PO n'a pas été ouvert depuis la page d'un projet : demandez de quel projet il s'agit.",
  notLaunched: (title: string) =>
    `Le projet ${title} n'est pas encore lancé : ses tâches et son budget n'existent qu'après l'acceptation du chef de projet.`,
  notOwner: (title: string) =>
    `Seul le chef de projet responsable de ${title} peut y créer des tâches ou des dépenses.`,
  contractLocked: (title: string) =>
    `Le contrat ${title} ne se modifie plus (en relecture, signé ou résilié) ou l'utilisateur n'en a pas le droit.`,
  unknownMember: (name: string) =>
    `« ${name} » n'est pas un membre de l'équipe trouvé : choisissez la personne dans le formulaire.`,
  unknownProject: (name: string) =>
    `Projet « ${name} » introuvable : choisissez-le dans le formulaire.`,
  unknownOrganization: (name: string) =>
    `Structure « ${name} » introuvable dans le Réseau : ajoutez-la d'abord, ou choisissez-la dans le formulaire.`,
  whichTitle:
    "Aucun titre nommé et PO n'a pas été ouvert depuis la fiche d'un titre : demandez de quel titre il s'agit.",
  whichOrganism:
    "Organisme de la déclaration à préciser : SACEM, SCPP, SPPF, ADAMI ou SPEDIDAM.",
  // A role of the other kind (a « Label » for a person): left out.
  rolesOtherKind: (roles: string, kind: string) =>
    `Rôles écartés, ils ne conviennent pas à une ${kind.toLowerCase()} : ${roles}.`,
  dueDateToChoose: "Échéance à choisir dans le formulaire.",
  dateTimeToChoose: "Date et heure à choisir dans le formulaire.",
  timeToChoose: (day: string) =>
    `Réunion le ${day} : l'heure n'a pas été dite, choisissez-la dans le formulaire.`,
  templateBodyNotPasted:
    "Texte du modèle non repris : PO n'écrit aucune clause, seul un texte collé par vous est gardé tel quel.",
  templateBodyToPaste: "Collez le texte du modèle dans le formulaire.",
  templateUnknownFields: (ids: string) =>
    `Champs inconnus dans le texte : ${ids}. Corrigez-les avant d'enregistrer.`,
  pastedText: (length: number) => `Texte collé (${length} caractères)`,
  // "2026-10-12T15:30" → "12 octobre 2026 à 15:30", written by code.
  dateTime: (local: string) => {
    const [date, time] = local.split("T");
    const [year, month, day] = date.split("-").map(Number);
    return `${day} ${MONTHS[month - 1]} ${year} à ${time}`;
  },
} as const;
