// The in-house engineer of the Master (proto `master:hugo`,
// docs/projet-complet/master.md § 3): a member of PDS with an account.

export const masterInHouse = {
  note: (name: string) =>
    `${name} a un compte PDS : il reçoit une tâche dans son Travail, avec ce dossier, et dépose ses versions dans PDS OS. Pas de lien, pas d'e-mail.`,
  assign: (name: string) => `Assigner à ${name}`,
  assigned: (name: string) => `Assigné à ${name}`,
  assignedLine: (name: string, day: string, by: string | null) =>
    `Assigné à ${name} le ${day}${by ? ` par ${by}` : ""} : il dépose ses versions dans PDS OS.`,
  noVersion: (name: string) =>
    `Aucune version pour l'instant : ${name.split(" ")[0] ?? name} dépose la première dans PDS OS.`,
  todo: { assign: (name: string) => `Assigner à ${name}` },
  deposit: (label: string, n: number) => `Déposer ma version · ${label} V${n}`,
  depositHint: "Rangée dans le titre, au Catalogue, comme nouvelle version.",
  budget: "Interne · pas de facture",
  inHouse: "Ingénieur maison",
  inHouseValue: "Pas de facture : interne",
  inHouseSource: "Budget du projet",
  errors: {
    vocals:
      "Les voix définitives sont attendues : le mix ne peut pas encore partir.",
    failed: "L'assignation n'a pas abouti. Réessayez.",
  },
} as const;
