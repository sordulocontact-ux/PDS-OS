/** The call sheet's public page, for the team (PROD-016). */
export const productionCallSheetPage = {
  pageTitle: "Feuille de service",
  title: (deliverable: string) => `Feuille de service — ${deliverable}`,
  manager: (name: string) => `production : ${name}`,
  version: (n: number, date: string) =>
    `Version ${n}, diffusée le ${date}. Cette page montre toujours la dernière version.`,
  notPublished: "La feuille de service n'a pas encore été diffusée.",
  notGiven: "Non précisé",
  essentials: "Le jour du tournage",
  date: "Date",
  callTime: "Convocation",
  place: "Lieu",
  access: "Accès",
  schedule: "Horaires",
  team: "Équipe",
  details: "Déroulé et consignes",
  sequences: "Séquences",
  instructions: "Consignes",
  contacts: "Contacts utiles",
  emergencies: "Urgences",
  documents: "Documents utiles",
  equipment: "Matériel",
} as const;
