import { Rows } from "@/components/ui/rows";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import type { DeliveryTabData } from "@/lib/production/delivery/queries";
import {
  handoffStaleness,
  proposedFormats,
} from "@/lib/production/delivery/rules";
import type { Member } from "@/lib/framing/related";
import type { HandedFiche } from "@/lib/production/fiche";
import { formatDate } from "@/lib/release/format";

import { HandoffItem } from "./handoff-item";
import { TransmitButton } from "./transmit-button";

const fr = { productionDelivery };

const t = fr.productionDelivery.handoff;

/**
 * Transmission to Activations (ticket § 21): once delivered, a proposal the
 * owner confirms; then the transmissions, newest first. Offered again only
 * when the delivery changed since the last one.
 */
export function HandoffSection({
  projectId,
  sheetId,
  data,
  fiche,
  canOrganize,
  members,
  recipientId,
}: {
  projectId: string;
  sheetId: string;
  data: DeliveryTabData;
  fiche: HandedFiche | null;
  canOrganize: boolean;
  members: Member[];
  // Whom the deliverable is entrusted to: the default person in charge.
  recipientId: string | null;
}) {
  const { delivery, version, handoffs, lines } = data;
  const [latest] = handoffs;
  const staleness = latest ? handoffStaleness(latest, delivery) : null;
  const deliveredAt = delivery?.deliveredAt ?? null;
  const offer = canOrganize && deliveredAt && (!latest || staleness);

  return (
    <StepSection
      id="activations"
      title={t.title}
      description={t.description}
      aside={
        offer && deliveredAt ? (
          <TransmitButton
            projectId={projectId}
            sheetId={sheetId}
            again={Boolean(latest)}
            proposal={{
              version:
                delivery?.versionId && version?.id === delivery.versionId
                  ? t.versionValue(version.number)
                  : null,
              finalUrl: delivery?.finalUrl ?? null,
              deliveredOn: formatDate(deliveredAt),
              formats: proposedFormats(fiche?.ratios ?? [], lines),
              constraints: fiche?.constraints ?? null,
              exports: lines.map((l) => ({
                label: l.label,
                url: l.url,
                spec: l.spec,
              })),
              recipientId,
            }}
            members={members}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {!deliveredAt && handoffs.length === 0 && (
          <EmptyNote>{t.notDelivered}</EmptyNote>
        )}
        {deliveredAt && handoffs.length === 0 && (
          <EmptyNote>{t.none}</EmptyNote>
        )}
        {latest && !staleness && (
          <p className="text-sm text-muted-foreground">{t.upToDate}</p>
        )}
        {handoffs.length > 0 && (
          <Rows>
            {handoffs.map((h, i) => (
              <HandoffItem
                key={h.id}
                handoff={h}
                staleness={i === 0 ? staleness : null}
                earlier={i > 0}
              />
            ))}
          </Rows>
        )}
      </div>
    </StepSection>
  );
}
