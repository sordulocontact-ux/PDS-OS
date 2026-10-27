import { StatusBadge } from "@/components/ui/status-badge";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { formatMetric } from "@/lib/activations/totals";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { network } from "@/lib/i18n/fr/network";
import type {
  ContactCampaign,
  ContactObservation,
} from "@/lib/network/campaigns";
import { formatDate } from "@/lib/release/format";

import {
  AddObservationButton,
  InvalidateObservationButton,
} from "./observation-buttons";

const fr = { network, activationWork, activationAgency };

const t = fr.network.page;

/** The profile's campaigns (in house or through an agency) and its dated
 * observations, never overwritten (tickets Influence and RP, Réseau). */
export function ContactMarketing({
  contactId,
  campaigns,
  observations,
  canWrite,
  today,
}: {
  contactId: string;
  campaigns: ContactCampaign[];
  observations: ContactObservation[];
  canWrite: boolean;
  today: string;
}) {
  const stateLabel = (c: ContactCampaign) =>
    c.via === "agency"
      ? fr.activationAgency.gallery.decisions[
          c.state as keyof typeof fr.activationAgency.gallery.decisions
        ]
      : c.state
        ? fr.activationWork.targets.outcomes[
            c.state as keyof typeof fr.activationWork.targets.outcomes
          ]
        : null;
  return (
    <>
      <ListCard
        title={t.campaigns}
        count={campaigns.length}
        empty={campaigns.length === 0 ? t.campaignsEmpty : undefined}
      >
        {campaigns.map((c) => (
          <CardRow
            key={c.key}
            href={c.href}
            main={c.title}
            sub={`${c.projectTitle} · ${c.via === "agency" ? t.campaignAgency : t.campaignTarget}`}
            badge={
              stateLabel(c) ? (
                <StatusBadge size="sm" tone="neutral">
                  {stateLabel(c)}
                </StatusBadge>
              ) : undefined
            }
          />
        ))}
      </ListCard>
      <div className="flex flex-col gap-2">
        <ListCard
          title={t.observations}
          count={observations.length}
          empty={observations.length === 0 ? t.observationsEmpty : undefined}
        >
          {observations.map((o) => (
            <div
              key={o.id}
              className={
                o.invalidatedAt
                  ? "flex items-start justify-between gap-2 opacity-60"
                  : "flex items-start justify-between gap-2"
              }
            >
              <CardRow
                main={`${t.observationKinds[o.kind]} · ${o.kind === "category" ? o.textValue : formatMetric(o.value ?? 0, (o.unit ?? "count") as "count")}`}
                sub={[
                  o.platform,
                  formatDate(o.observedOn),
                  t.observationSources[
                    o.source as keyof typeof t.observationSources
                  ],
                  o.invalidatedAt
                    ? `${t.invalidatedLabel} : ${o.invalidationReason}`
                    : o.note,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              {canWrite && !o.invalidatedAt && (
                <InvalidateObservationButton
                  contactId={contactId}
                  observationId={o.id}
                />
              )}
            </div>
          ))}
        </ListCard>
        <p className="text-xs text-muted-foreground">{t.observationsHint}</p>
        {canWrite && (
          <div>
            <AddObservationButton contactId={contactId} today={today} />
          </div>
        )}
      </div>
    </>
  );
}
