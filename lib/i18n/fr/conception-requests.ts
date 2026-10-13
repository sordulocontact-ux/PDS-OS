/** Validation requests of the Conception (MKT-C2-11). */
export const conceptionRequests = {
  title: (object: string) => `Demander la validation · ${object}`,
  body: "Voici exactement ce qui part, et chez qui. Rien n'est envoyé avant votre confirmation.",
  object: "Objet",
  version: "Version",
  versionValue: (n: number) => `V${n}`,
  scope: "Ce qui est inclus",
  who: "Qui décide",
  message: "Message aux valideurs",
  messagePlaceholder: "Ce qui a changé, ce qu'il faut regarder.",
  due: "Décision attendue pour le",
  duePast: "Choisissez une date à venir.",
  consequences:
    "La version est figée telle quelle. Chaque valideur reçoit une notification qui ouvre la demande et décide : valider (avec des réserves si besoin), demander des modifications ou refuser. Si le contenu envoyé change avant la décision, la demande devra être retirée et renvoyée.",
  send: (validators: string) =>
    validators ? `Envoyer à ${validators}` : "Envoyer",
  cancel: "Annuler",
  // The submit buttons say what leaves and for whom.
  submitTo: (validators: string) =>
    validators ? `Soumettre à ${validators}` : "Soumettre",
  // The decision page.
  pageTitle: (object: string, n: number) => `${object} · V${n}`,
  pageIntro:
    "La demande telle qu'elle a été envoyée, figée : ce que vous décidez porte sur ce contenu-là.",
  requestedBy: (name: string, date: string) =>
    name ? `Demandée par ${name} le ${date}` : `Demandée le ${date}`,
  messageLabel: "Message",
  dueLabel: (date: string) => `Décision attendue pour le ${date}`,
  validatorsLabel: (names: string) => `Valideurs : ${names}`,
  statuses: {
    pending: "En attente de décision",
    approved: "Validée",
    changes_requested: "Modifications demandées",
    rejected: "Refusée",
    withdrawn: "Retirée",
  },
  withdraw: "Retirer la demande",
  withdrawTitle: "Retirer la demande ?",
  withdrawBody:
    "Elle reste dans l'historique, retirée. Vous pourrez en envoyer une nouvelle version.",
  withdrawn: "Demande retirée.",
  outdated:
    "Le contenu a changé depuis l'envoi : cette demande ne peut plus être décidée. Retirez-la et envoyez une nouvelle version.",
  backToObject: "Ouvrir l'objet",
  // Global validation and local decisions (accueil).
  localTitle: "Décisions déjà prises",
  localDirection: (state: string) => `Direction de la sortie : ${state}`,
  localSheets: (validated: number, total: number) =>
    `Fiches livrables validées : ${validated}/${total}`,
  localHint:
    "La validation du dossier s'ajoute à ces décisions, elle ne les remplace pas.",
  // The decisions waiting for the person (Travail).
  myDecisions: "Mes décisions de conception",
  myDecisionsEmpty: "Aucune demande en attente de votre décision.",
  decisionItem: (object: string, n: number) => `Décider · ${object} · V${n}`,
  directionObject: "Direction de la sortie",
  sheetObject: (title: string) => `Fiche « ${title} »`,
};
