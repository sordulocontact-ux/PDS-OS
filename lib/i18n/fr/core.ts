export const core = {
  // The mark of a document's file on its tile (DocumentCard `flat`).
  documentCard: { pdf: "PDF" },
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
  // « Exporter en PDF » (components/ui/pdf-export-button.tsx): the
  // generation and the download fail separately (PROJ-BUG-05).
  pdf: {
    ready: "PDF téléchargé.",
    expired: "Votre session a expiré. Reconnectez-vous, puis réessayez.",
    notPdf:
      "Le serveur n'a pas renvoyé de PDF : rien n'a été téléchargé. Réessayez.",
    downloadFailed:
      "Le PDF est prêt, mais le téléchargement a échoué. Réessayez.",
  },
  // « Filtres » of a list page (components/ui/url-filters.tsx).
  urlFilters: {
    // The filter button of FilterBar: the filters beyond the first ones.
    more: "Plus de filtres",
    moreCount: (count: number) =>
      `Plus de filtres, ${count} actif${count > 1 ? "s" : ""}`,
    clear: "Effacer les filtres",
  },
  // components/ui/audio-file.tsx, components/ui/audio-player.tsx
  audioFile: {
    download: "Télécharger",
    // `label` names the file: « Écouter la V2 ».
    pause: (label: string) => `Pause · ${label}`,
    position: (label: string) => `Position · ${label}`,
    at: (time: string, total: string) => `${time} sur ${total}`,
    unavailable: "Lecture impossible",
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
