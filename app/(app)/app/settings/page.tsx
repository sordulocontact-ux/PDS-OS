import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { getOwnAiUsage } from "@/lib/members/queries";

import { AiUsageMeter } from "./ai-usage-meter";

// Each member's settings: how many requests to PO they used today, against
// the daily limit the general director sets in Équipe.
export default async function SettingsPage() {
  const access = await requireApproved();
  const t = fr.aiUsage.settings;
  const usage =
    access.organizationId && access.personId
      ? await getOwnAiUsage(access.organizationId, access.personId)
      : null;

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title={t.title} description={t.description} />
      <PageSection
        id="ai-usage"
        title={t.usage.title}
        description={t.usage.description}
        card
      >
        {usage ? (
          <AiUsageMeter
            used={usage.used}
            limit={usage.limit}
            setsOwnLimit={can(access, "administer")}
          />
        ) : (
          <FormMessage kind="error">{t.usage.loadError}</FormMessage>
        )}
      </PageSection>
    </PageContainer>
  );
}
