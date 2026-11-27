import { PushToggle } from "@/components/notifications/push-toggle";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { SettingsRow } from "@/components/settings/settings-row";
import { Rows } from "@/components/ui/rows";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getPublicEnv } from "@/lib/env-public";
import { core } from "@/lib/i18n/fr/core";
import { settings } from "@/lib/i18n/fr/settings";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

export const metadata = {
  title: `${settings.pages.notifications} · ${core.app.name}`,
};

// Paramètres › Notifications: the browser's notifications on this computer
// (the bell always lists them; docs/ARCHITECTURE.md § 8 bis).
export default async function NotificationsPage() {
  const access = await requireApproved();
  const t = settings.notifications;
  return (
    <SettingsFrame
      page="notifications"
      pages={settingsPagesFor(can(access, "administer"))}
    >
      <Rows>
        <SettingsRow label={t.browser} description={t.browserDescription}>
          <PushToggle
            publicKey={getPublicEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
            row
          />
        </SettingsRow>
      </Rows>
    </SettingsFrame>
  );
}
