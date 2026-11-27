import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PageSection } from "@/components/shell/page-section";
import { SectionFrame } from "@/components/shell/section-frame";
import { SkeletonRows } from "@/components/ui/skeleton";
import { BillingForm } from "@/components/settings/billing-form";
import { DistributionForm } from "@/components/settings/distribution-form";
import { StyleChoice } from "@/components/settings/style-choice";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { shortcuts } from "@/lib/i18n/fr/shortcuts";
import { getOwnAiUsage } from "@/lib/members/queries";
import { loadDistributionFormats } from "@/lib/distribution/requirements";
import { loadBilling } from "@/lib/invoices/billing";
import { isConnectOutcome } from "@/lib/google/services";

import { AiUsageMeter } from "./ai-usage-meter";
import { GoogleConnectionsSection } from "./google-connections-section";

export const metadata = {
  title: `${fr.aiUsage.settings.title} · ${fr.app.name}`,
};

// Each member's settings: how many requests to PO they used today, against
// the daily limit the general director sets in Équipe, and their own Google
// services (Connexions, docs/ARCHITECTURE.md § 4 quater).
export default async function SettingsPage({
  searchParams,
}: PageProps<"/app/settings">) {
  const access = await requireApproved();
  // How « Connecter un compte Google » just ended (Google's return).
  const google = (await searchParams).google;
  const outcome = isConnectOutcome(google) ? google : null;
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
    <SectionFrame
      title={t.title}
      description={t.description}
      list={false}
      className="max-w-2xl"
    >
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
      <PageSection
        id="style"
        title={fr.shell.designStyle.title}
        description={fr.shell.designStyle.description}
        card
      >
        <StyleChoice />
      </PageSection>
      <PageSection
        id="shortcuts"
        title={shortcuts.title}
        description={shortcuts.settings.description}
        card
      >
        <ViewLink
          href={routes.settingsShortcuts}
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          {shortcuts.settings.open}
        </ViewLink>
      </PageSection>
      <PageSection
        id="connections"
        title={fr.googleConnections.title}
        description={fr.googleConnections.description}
        card
      >
        <Suspense fallback={<SkeletonRows count={3} />}>
          <GoogleConnectionsSection access={access} outcome={outcome} />
        </Suspense>
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
    </SectionFrame>
  );
}
