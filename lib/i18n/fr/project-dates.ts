// The project's dates every workflow says the same way, with their source
// (lib/projects/dates.ts, proto « Projet complet »).
export const projectDates = {
  release: "Projet · Lancement",
  releaseValidated: (by: string | null, on: string) =>
    `Projet · Lancement, validé${by ? ` par ${by}` : ""} ${on}`,
  masterFinalBrief: "Master › Brief Mix et Master",
  masterFinalFraming: "Cadrage › Échéances confirmées",
} as const;
