import { SettingsFrame } from "@/components/settings/settings-frame";
import { ShortcutsEditor } from "@/components/settings/shortcuts-editor";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { core } from "@/lib/i18n/fr/core";
import { settings } from "@/lib/i18n/fr/settings";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

export const metadata = {
  title: `${settings.pages.shortcuts} · ${core.app.name}`,
};

// Paramètres › Raccourcis clavier (27/11/2026): each member's own keys for
// the search, the « + », PO and a feedback's capture (lib/shortcuts/).
export default async function ShortcutsPage() {
  const access = await requireApproved();
  return (
    <SettingsFrame
      page="shortcuts"
      pages={settingsPagesFor(can(access, "administer"))}
    >
      <ShortcutsEditor />
    </SettingsFrame>
  );
}
