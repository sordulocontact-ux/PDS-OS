export const core = {
  // Shared by every form (docs/DESIGN.md § 4, « Champs obligatoires »).
  forms: {
    required: "obligatoire",
  },
  app: {
    name: "PDS OS",
    description: "Gestion du cycle de vie des sorties musicales.",
  },
  home: {
    version: "Version",
    configTitle: "Configuration",
    configValid:
      "Configuration chargée : toutes les variables attendues sont présentes.",
    configInvalid:
      "Configuration incomplète. Variables manquantes ou invalides :",
    issueReason: { missing: "manquante", invalid: "invalide" },
    configHint:
      "Renseignez-les dans .env.local (modèle : .env.example), puis relancez le serveur.",
  },
} as const;
