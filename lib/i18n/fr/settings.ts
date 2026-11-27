import type { SettingsPage } from "@/lib/ui/settings-sections";

// Paramètres (27/11/2026, d'après Accordee): one page per subject, listed
// in the section's own column (components/settings/settings-sidebar.tsx).
export const settings = {
  title: "Paramètres",
  navLabel: "Pages des paramètres",
  groups: { mine: "Mes paramètres", admin: "Administration" },
  pages: {
    usage: "Utilisation de PO",
    appearance: "Apparence",
    notifications: "Notifications",
    shortcuts: "Raccourcis clavier",
    connections: "Connexions",
    billing: "Coordonnées de PDS",
    distribution: "Distribution",
  } satisfies Record<SettingsPage, string>,
  appearance: {
    theme: "Thème",
  },
  notifications: {
    browser: "Notifications du navigateur",
    browserDescription: "Sur cet ordinateur, même quand PDS OS est fermé.",
    on: "Activées",
    enable: "Activer",
  },
} as const;
