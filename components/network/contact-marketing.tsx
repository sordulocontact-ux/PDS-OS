import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
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
          <DataTable framed>
            <DataTableHeader>
              <DataTableHead>{t.columns.campaign}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.columns.project}</DataTableHead>
              <DataTableHead hideBelow="md">{t.columns.via}</DataTableHead>
              <DataTableHead fill>{t.columns.state}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {campaigns.map((c) => (
                <DataTableRow key={c.key}>
                  <DataTableCell>
                    <DataTableLink href={c.href}>{c.title}</DataTableLink>
                  </DataTableCell>
                  <DataTableCell hideBelow="sm" className="break-words">
                    {c.projectTitle}
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    {c.via === "agency" ? t.campaignAgency : t.campaignTarget}
                  </DataTableCell>
                  <DataTableCell fill>
                    {stateLabel(c) ? (
                      <StatusBadge size="sm" tone="neutral">
                        {stateLabel(c)}
                      </StatusBadge>
                    ) : (
                      EMPTY_CELL
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
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
          <DataTable framed>
            <DataTableHeader>
              <DataTableHead>{t.columns.observation}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.columns.date}</DataTableHead>
              <DataTableHead hideBelow="md">{t.columns.source}</DataTableHead>
              <DataTableHead hideBelow="lg">{t.columns.note}</DataTableHead>
              <DataTableHead fill align="end">
                <span className="sr-only">{t.columns.actions}</span>
              </DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {observations.map((o) => (
                <DataTableRow
                  key={o.id}
                  className={o.invalidatedAt ? "opacity-60" : undefined}
                >
                  <DataTableCell>
                    <DataTableMedia
                      title={`${t.observationKinds[o.kind]} · ${
                        o.kind === "category"
                          ? o.textValue
                          : formatMetric(
                              o.value ?? 0,
                              (o.unit ?? "count") as "count",
                            )
                      }`}
                      subtitle={o.platform}
                    />
                  </DataTableCell>
                  <DataTableCell hideBelow="sm" className="tabular-nums">
                    {formatDate(o.observedOn)}
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    {t.observationSources[
                      o.source as keyof typeof t.observationSources
                    ] ?? EMPTY_CELL}
                  </DataTableCell>
                  <DataTableCell hideBelow="lg" className="break-words">
                    {(o.invalidatedAt
                      ? `${t.invalidatedLabel} : ${o.invalidationReason}`
                      : o.note) || EMPTY_CELL}
                  </DataTableCell>
                  <DataTableCell fill align="end">
                    {canWrite && !o.invalidatedAt && (
                      <InvalidateObservationButton
                        contactId={contactId}
                        observationId={o.id}
                      />
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </PageSection>
    </>
  );
}
