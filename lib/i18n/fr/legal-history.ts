/** Historique du Juridique (JUR-29): every recorded event of the dossier. */
export const legalHistory = {
  title: "Historique du Juridique",
  link: "Historique du dossier",
  description:
    "Tout ce qui a été enregistré sur le dossier, du plus récent au plus ancien, avec l'heure (Paris), l'auteur et la preuve déclarée. Rien n'y est effacé : une correction s'ajoute à la suite.",
  filtersLabel: "Filtrer l'historique",
  branches: {
    all: "Tout",
    inventory: "État des lieux",
    plan: "Plan d'action",
    forms: "Fiches",
    contracts: "Contrats",
    splits: "Répartitions",
    clearances: "Emprunts",
    formalities: "SACEM",
  },
  empty: "Rien n'a encore été enregistré sur le dossier.",
  emptyBranch: "Rien d'enregistré pour cette partie du dossier.",
  error:
    "L'historique n'a pas pu être lu entièrement. Rechargez la page pour réessayer.",
  external: "par la personne, via son lien",
  system: "automatiquement",
  // A proof typed in a free field: said as such, never as verified.
  manual: (proof: string) => `Déclaration manuelle non vérifiée : « ${proof} »`,
  version: (n: number) => `v${n}`,
  intakeConfirmed: "Dossier confirmé",
  planConfirmed: "Plan d'action validé",
  planLaunched: "Plan d'action lancé",
  planEvents: {
    responsible_changed: (from: string, to: string) =>
      `Responsable changé : ${from} → ${to}`,
    due_changed: (from: string, to: string) =>
      `Échéance changée : ${from} → ${to}`,
  },
  nobody: "personne",
  noDate: "aucune",
  forms: {
    prepared: "Lien de la fiche préparé",
    sent: "Fiche marquée envoyée",
    submitted: "Fiche reçue",
    completed: "Fiche complète",
    revoked: "Lien de la fiche révoqué",
  },
  splits: {
    "split.version_created": "Version de la répartition créée",
    "split.proposed": "Répartition proposée",
    "split.confirmed": "Répartition confirmée",
    "split.disputed": "Répartition contestée",
    "split.confirmation_revoked": "Lien de confirmation révoqué",
  } as Record<string, string>,
  signature: (signer: string) => `Signature de ${signer} enregistrée`,
  sacem: (title: string) => `SACEM · ${title}`,
  // JUR-29: the causal chain, person and period filters.
  causes: {
    follows: (action: string, time: string) =>
      `Suite à « ${action} » (${time})`,
    signaturesVoided: (n: number, count: number) =>
      count === 1
        ? `Rend caduque la signature déjà reçue sur la v${n} : à refaire sur la nouvelle version.`
        : `Rend caduques les ${count} signatures déjà reçues sur la v${n} : à refaire sur la nouvelle version.`,
  },
  filters: {
    person: "Personne",
    everyone: "Tout le monde",
    period: "Période",
    anyPeriod: "Toute la période",
    count: (n: number, total: number) =>
      n === total ? `${total} évènements` : `${n} évènements sur ${total}`,
  },
  csv: {
    export: "Exporter en CSV",
    fileName: (part: string) =>
      `historique-juridique-${part.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
    columns: [
      "Identifiant",
      "Instant (UTC)",
      "Instant (Paris)",
      "Partie du dossier",
      "Action",
      "Objet",
      "Auteur",
      "Note",
      "Preuve déclarée",
      "Suite à (identifiant)",
      "Conséquence",
    ],
  },
} as const;
