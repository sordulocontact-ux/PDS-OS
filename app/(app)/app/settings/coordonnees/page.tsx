import { BillingForm } from "@/components/settings/billing-form";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { sectionCardClass } from "@/components/ui/section-card";
import { requireAdmin } from "@/lib/auth/dal";
import { core } from "@/lib/i18n/fr/core";
import { invoices } from "@/lib/i18n/fr/invoices";
import { settings } from "@/lib/i18n/fr/settings";
import { loadBilling } from "@/lib/invoices/billing";
import { settingsPagesFor } from "@/lib/ui/settings-sections";

export const metadata = {
  title: `${settings.pages.billing} · ${core.app.name}`,
};

// Paramètres › Coordonnées de PDS (direction): on the providers' invoices
// and at the head of the contracts.
export default async function BillingPage() {
  const access = await requireAdmin();
  const billing = access.organizationId
    ? await loadBilling(access.organizationId)
    : null;
  return (
    <SettingsFrame
      page="billing"
      pages={settingsPagesFor(true)}
      description={invoices.billing.description}
    >
      <div className={sectionCardClass}>
        <BillingForm initial={billing} />
      </div>
    </SettingsFrame>
  );
}
