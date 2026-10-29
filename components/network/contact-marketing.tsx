import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { SectionRow, SectionRows } from "@/components/ui/section-rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
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
      {campaigns.length > 0 && (
        <PageSection
          card
          id="campaigns"
          title={t.campaigns}
          description={t.campaignsDescription}
        >
          <SectionRows label={t.campaigns}>
            {campaigns.map((c) => (
              <SectionRow
                key={c.key}
                title={
                  <ViewLink
                    href={c.href}
                    className="font-semibold no-underline hover:underline"
                  >
                    {c.title}
                  </ViewLink>
                }
                detail={`${c.projectTitle} · ${c.via === "agency" ? t.campaignAgency : t.campaignTarget}`}
                badge={
                  stateLabel(c) ? (
                    <StatusBadge size="sm" tone="neutral">
                      {stateLabel(c)}
                    </StatusBadge>
                  ) : undefined
                }
              />
            ))}
          </SectionRows>
        </PageSection>
      )}
      <PageSection
        card
        id="observations"
        title={t.observations}
        description={t.observationsHint}
        action={
          canWrite && (
            <AddObservationButton contactId={contactId} today={today} />
          )
        }
      >
        {observations.length === 0 ? (
          <EmptyNote>{t.observationsEmpty}</EmptyNote>
        ) : (
          <SectionRows label={t.observations}>
            {observations.map((o) => (
              <SectionRow
                key={o.id}
                title={
                  <span className={o.invalidatedAt ? "opacity-60" : undefined}>
                    {t.observationKinds[o.kind]} ·{" "}
                    <span className="font-semibold">
                      {o.kind === "category"
                        ? o.textValue
                        : formatMetric(
                            o.value ?? 0,
                            (o.unit ?? "count") as "count",
                          )}
                    </span>
                  </span>
                }
                detail={[
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
                badge={
                  canWrite &&
                  !o.invalidatedAt && (
                    <InvalidateObservationButton
                      contactId={contactId}
                      observationId={o.id}
                    />
                  )
                }
              />
            ))}
          </SectionRows>
        )}
      </PageSection>
    </>
  );
}
