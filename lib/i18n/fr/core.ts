export const core = {
  // Shared by every form (docs/DESIGN.md § 4, « Champs obligatoires »).
  forms: {
    required: "obligatoire",
  },
  // The generic dialogs (components/ui/dialog-button.tsx,
  // confirm-button.tsx, dialog-form-actions.tsx).
  dialogs: {
    cancel: "Annuler",
    close: "Fermer",
    saving: "Enregistrement…",
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
