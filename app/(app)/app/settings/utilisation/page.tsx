import { FormMessage } from "@/components/auth/form-message";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { sectionCardClass } from "@/components/ui/section-card";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { aiUsage } from "@/lib/i18n/fr/ai-usage";
import { core } from "@/lib/i18n/fr/core";
import { settings } from "@/lib/i18n/fr/settings";
import { getOwnAiUsage } from "@/lib/members/queries";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

import { AiUsageMeter } from "../ai-usage-meter";

export const metadata = {
  title: `${settings.pages.usage} · ${core.app.name}`,
};

// Paramètres › Utilisation de PO: the requests of the day against the
// limit the general director sets in Équipe.
export default async function UsagePage() {
  const access = await requireApproved();
  const t = aiUsage.settings.usage;
  const usage =
    access.organizationId && access.personId
      ? await getOwnAiUsage(access.organizationId, access.personId)
      : null;
  return (
    <SettingsFrame
      page="usage"
      pages={settingsPagesFor(can(access, "administer"))}
      description={t.description}
    >
      <div className={sectionCardClass}>
        {usage ? (
          <AiUsageMeter
            used={usage.used}
            limit={usage.limit}
            setsOwnLimit={can(access, "administer")}
          />
        ) : (
          <FormMessage kind="error">{t.loadError}</FormMessage>
        )}
      </div>
    </SettingsFrame>
  );
}
