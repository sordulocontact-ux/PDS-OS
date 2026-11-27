import { SettingsFrame } from "@/components/settings/settings-frame";
import { SettingsRow } from "@/components/settings/settings-row";
import { StyleChoice } from "@/components/settings/style-choice";
import { ThemeChoice } from "@/components/settings/theme-choice";
import { Rows } from "@/components/ui/rows";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { core } from "@/lib/i18n/fr/core";
import { settings } from "@/lib/i18n/fr/settings";
import { shell } from "@/lib/i18n/fr/shell";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

export const metadata = {
  title: `${settings.pages.appearance} · ${core.app.name}`,
};

// Paramètres › Apparence: the theme (also in the account menu) and the
// style of the interface, both kept by this browser.
export default async function AppearancePage() {
  const access = await requireApproved();
  return (
    <SettingsFrame
      page="appearance"
      pages={settingsPagesFor(can(access, "administer"))}
    >
      <Rows>
        <SettingsRow label={settings.appearance.theme}>
          <ThemeChoice />
        </SettingsRow>
        <SettingsRow
          label={shell.designStyle.title}
          description={shell.designStyle.description}
        >
          <StyleChoice />
        </SettingsRow>
      </Rows>
    </SettingsFrame>
  );
}
