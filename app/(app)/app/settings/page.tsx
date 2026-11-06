import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { BillingForm } from "@/components/settings/billing-form";
import { DistributionForm } from "@/components/settings/distribution-form";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { getOwnAiUsage } from "@/lib/members/queries";
import { loadDistributionFormats } from "@/lib/distribution/requirements";
import { loadBilling } from "@/lib/invoices/billing";

import { AiUsageMeter } from "./ai-usage-meter";

export const metadata = {
  title: `${fr.aiUsage.settings.title} · ${fr.app.name}`,
};

// Each member's settings: how many requests to PO they used today, against
// the daily limit the general director sets in Équipe.
export default async function SettingsPage() {
  const access = await requireApproved();
  const t = fr.aiUsage.settings;
  const admin = can(access, "administer");
  const [usage, billing, formats] = await Promise.all([
    access.organizationId && access.personId
      ? getOwnAiUsage(access.organizationId, access.personId)
      : null,
    admin && access.organizationId ? loadBilling(access.organizationId) : null,
    admin && access.organizationId
      ? loadDistributionFormats(access.organizationId)
      : null,
  ]);

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
      {admin && (
        <PageSection
          id="billing"
          title={fr.invoices.billing.title}
          description={fr.invoices.billing.description}
          card
        >
          <BillingForm initial={billing} />
        </PageSection>
      )}
      {admin && (
        <PageSection
          id="distribution"
          title={fr.distribution.requirements.title}
          description={fr.distribution.requirements.description}
          card
        >
          <DistributionForm initial={formats} />
        </PageSection>
      )}
    </PageContainer>
  );
}
