/** Closing the Conception and passing to Production (MKT-C2-13). */
export const conceptionClosure = {
  title: "Conception validée",
  validatedOn: (date: string, name: string | null) =>
    name ? `Validée le ${date} par ${name}` : `Validée le ${date}`,
  brief: (n: number) => `Dossier de référence : Brief créatif V${n}`,
  openBrief: "Ouvrir le brief",
  comment: (text: string) => `Commentaire de validation : ${text}`,
  reserves: (n: number) =>
    n === 1
      ? "1 réserve d'approbation suivra en Production, en tâche."
      : `${n} réserves d'approbation suivront en Production, en tâches.`,
  handedSummary: (handed: number, total: number) =>
    `${handed} livrable${handed > 1 ? "s" : ""} sur ${total} en Production.`,
  pass: "Passer en Production",
  update: "Mettre à jour le transfert",
  openProduction: "Ouvrir la Production",
  ownerOnly: "Le chef de projet passe la Conception en Production.",
  // The plan, previewed before anything is created.
  planTitle: "Passer en Production",
  planIntro:
    "Voici ce que la Production recevra. Rien n'est créé avant votre confirmation, et relancer le transfert ne crée rien deux fois.",
  include: (title: string) => `Transférer « ${title} »`,
  reasonLabel: (title: string) => `Pourquoi « ${title} » attend`,
  reasonPlaceholder: "Budget pas arbitré, tournage décalé…",
  reasonMissing: "Dites pourquoi ce livrable reste en Conception.",
  missing: (n: number) =>
    n === 1 ? "1 motif manque." : `${n} motifs manquent.`,
  version: (n: number) => `Fiche V${n}`,
  responsible: (name: string) => `responsable : ${name}`,
  delivery: (date: string) => `livraison : ${date}`,
  dependencies: (text: string) => `Dépendances : ${text}`,
  reserveLine: (text: string) => `Réserve : ${text}`,
  groups: {
    ready: "À transférer",
    handed: "Déjà en Production",
    not_ready: "Reste en Conception",
    excluded: "Exclu pour l'instant",
  },
  notReady: (status: string) => `Fiche : ${status}`,
  noSheet: "Pas de fiche livrable",
  excludedBecause: (reason: string) => `Motif : ${reason}`,
  consequences:
    "Chaque livrable transféré part avec sa fiche validée et le brief créatif validé. Les réserves deviennent des tâches (le responsable de la fiche, à sa date de livraison). L'étape Production démarre si elle n'a pas commencé.",
  confirm: "Confirmer et passer en Production",
  pending: "Transfert…",
  cancel: "Annuler",
  done: "Conception transmise à la Production",
  nothingToHand:
    "Aucune fiche validée à transférer : les livrables restent en Conception.",
  // Reopening (the direction).
  reopen: "Rouvrir la Conception",
  reopenTitle: "Rouvrir la Conception",
  reopenIntro:
    "La Conception repasse en cours et devra être validée de nouveau. Le brief validé, les décisions et ce qui est déjà en Production restent tels quels.",
  reopenImpact: "Déjà en Production",
  impactLine: (title: string, n: number, delivered: boolean) =>
    `${title} · fiche V${n}${delivered ? " · déjà livré" : ""}`,
  reopenReason: "Motif de la réouverture",
  reopenSubmit: "Rouvrir",
  reopened: "Conception rouverte",
  // Errors of pass_to_production / reopen_design.
  errors: {
    notValidated:
      "La Conception doit être validée avant de passer en Production.",
    briefRequired: "Créez le brief créatif : la clôture le référence.",
    productionClosed: "La Production est déjà close.",
    reasonRequired: "Chaque livrable exclu demande son motif.",
    directionOnly: "Seule la direction rouvre une Conception validée.",
    invalidTransition: "La Conception n'est pas validée : rien à rouvrir.",
  },
  // Production side: where each deliverable comes from.
  production: {
    handed: (sheet: number, brief: number | null) =>
      brief ? `Fiche V${sheet} · Brief créatif V${brief}` : `Fiche V${sheet}`,
    excluded: (reason: string) => `Resté en Conception : ${reason}`,
    waiting: "Pas encore transféré depuis la Conception",
    startBlocked:
      "La Production d'un livrable s'ouvre quand sa Fiche Livrable est transférée depuis la Conception.",
  },
};
