import { PageSection } from "@/components/shell/page-section";
import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import { loadActivationHandoffs } from "@/lib/production/delivery/activation-queries";

import { HandoffItem } from "./handoff-item";

const fr = { productionDelivery };

const t = fr.productionDelivery.activations;

/**
 * Activations: the deliverables the Production transmitted, the latest
 * transmission of each, flagged when the delivery changed since (an
 * activation may point to an earlier version). Nothing when none was
 * transmitted.
 */
export async function ActivationHandoffsSection({
  projectId,
  access,
}: {
  projectId: string;
  access: Access;
}) {
  const handoffs = await loadActivationHandoffs(projectId, access);
  if (handoffs.length === 0) return null;
  return (
    <PageSection
      id="production-handoffs"
      title={t.title}
      description={t.description}
    >
      <ul className="flex flex-col gap-2">
        {handoffs.map((h) => (
          <HandoffItem
            key={h.id}
            handoff={h}
            staleness={h.staleness}
            deliverable={{
              title: h.deliverableTitle,
              href: routes.projectProductionStep(
                projectId,
                h.deliverableId,
                "delivery",
              ),
            }}
          />
        ))}
      </ul>
    </PageSection>
  );
}
