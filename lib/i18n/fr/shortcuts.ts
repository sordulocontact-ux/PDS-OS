import type { ShortcutAction } from "@/lib/shortcuts/definitions";

// Paramètres › Raccourcis clavier (27/11/2026), and the names of the keys
// wherever a shortcut is shown (components/shell/shortcuts/).
export const shortcuts = {
  title: "Raccourcis clavier",
  // The line of Réglages leading to the page.
  settings: {
    description:
      "Les touches qui ouvrent la recherche, le « + », PO et la capture d'un retour.",
    open: "Modifier les raccourcis",
  },
  back: "Paramètres",
  actions: {
    search: "Rechercher",
    create: "Créer (le « + »)",
    assistant: "Ouvrir PO",
    capture: "Capturer une zone pour un retour",
  } satisfies Record<ShortcutAction, string>,
  keys: {
    mod: "⌘",
    space: "Espace",
  },
  change: "Modifier",
  changeOf: (action: string) => `Modifier le raccourci « ${action} »`,
  reset: "Rétablir",
  resetOf: (action: string) =>
    `Rétablir le raccourci par défaut de « ${action} »`,
  listening: "Appuyez sur la nouvelle touche…",
  listeningHint:
    "Une lettre ou un chiffre, avec ou sans ⌘ ; Espace se presse deux fois. Échap pour annuler.",
  cancel: "Annuler",
  saved: "Raccourci enregistré",
  restored: "Raccourci par défaut rétabli",
  errors: {
    unsupported:
      "Cette touche ne peut pas servir de raccourci : une lettre ou un chiffre, avec ou sans ⌘.",
    taken: (keys: string) => `${keys} est déjà pris par le navigateur.`,
    owner: (keys: string, action: string) =>
      `${keys} sert déjà à « ${action} ».`,
    // The same, said by the server (the keys are not written there).
    ownerOf: (action: string) => `Ce raccourci sert déjà à « ${action} ».`,
    failed: "Le raccourci n'a pas pu être enregistré. Réessayez.",
  },
} as const;
