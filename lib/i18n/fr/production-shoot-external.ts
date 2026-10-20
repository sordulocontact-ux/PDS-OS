// The shoot and the rushes of an external production (proto BODY.shoot,
// BODY.rushes; Artefact § 14; production.md § 2.14, 2.15).
export const productionShootExternal = {
  planned: (day: string | null, place: string | null) =>
    `Prévu${day ? ` le ${day}` : ""}${place ? ` à ${place}` : ""}.`,
  confirm: "Confirmer que le tournage a eu lieu",
  done: "Tournage terminé — fichiers attendus.",
  rushesLink: "Lien des rushes",
  awaited: (company: string) => `Attendu de ${company}`,
  sentBy: (company: string, at: string) =>
    ` · transmis par ${company} le ${at}`,
  // The production's two declarations on the rushes (proto BODY.rushes).
  received: "Rushes reçus",
  receivedHint:
    "Le lien fonctionne et les fichiers sont complets. Sinon : signalez un blocage.",
  receivedDone: "Rushes reçus",
  backup: "Sauvegarde vérifiée",
  backupHint:
    "Les rushes sont copiés à deux endroits au moins, et les copies s'ouvrent.",
  backupDone: "Sauvegarde vérifiée",
  receivedRow: "Rushes reçus",
  backupRow: "Sauvegarde vérifiée",
  yesBy: (who: string, at: string) => `Oui, accès vérifié · ${who}, ${at}`,
  doneBy: (who: string, at: string) => `Oui · ${who}, ${at}`,
  notYet: "Pas encore",
  sameEditor: (company: string) =>
    `${company} monte aussi : pas de transfert, le montage peut commencer.`,
} as const;
