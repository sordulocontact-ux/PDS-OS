import { DistributionForm } from "@/components/settings/distribution-form";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { sectionCardClass } from "@/components/ui/section-card";
import { requireAdmin } from "@/lib/auth/dal";
import { loadDistributionFormats } from "@/lib/distribution/requirements";
import { core } from "@/lib/i18n/fr/core";
import { distribution } from "@/lib/i18n/fr/distribution";
import { settings } from "@/lib/i18n/fr/settings";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

export const metadata = {
  title: `${settings.pages.distribution} · ${core.app.name}`,
};

// Paramètres › Distribution (direction): what The Orchard requires of the
// audio files, read again by the engineers' Brief.
export default async function DistributionPage() {
  const access = await requireAdmin();
  const formats = access.organizationId
    ? await loadDistributionFormats(access.organizationId)
    : null;
  return (
    <SettingsFrame
      page="distribution"
      pages={settingsPagesFor(true)}
      description={distribution.requirements.description}
    >
      <div className={sectionCardClass}>
        <DistributionForm initial={formats} />
      </div>
    </SettingsFrame>
  );
}
