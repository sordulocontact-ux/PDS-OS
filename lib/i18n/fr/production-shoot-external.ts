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
} as const;
