import { Fold } from "@/components/ui/fold";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { formatEuros } from "@/lib/budget/types";
import type { Member } from "@/lib/framing/related";
import { productionLocations } from "@/lib/i18n/fr/production-locations";
import {
  awaited,
  missingOf,
  type LocationsData,
} from "@/lib/production/locations/types";
import type { ProviderLinkState } from "@/lib/production/post/types";
import type { NetworkOption } from "@/lib/production/sheet";

import { LocationCard } from "./location-card";
import { LocationConsults } from "./location-consults";
import { AddLocationButton } from "./add-location-button";

const fr = { productionLocations };

const t = fr.productionLocations;

/**
 * « Lieux candidats » (PROD-011 to PROD-013): who is consulted and who is
 * still awaited, the board of places with their media and opinions, then
 * the comparison of what is known and what is missing.
 */
export function LocationsBoard({
  scope,
  data,
  canOrganize,
  members,
  contacts,
  links,
  budgetNotes = {},
}: {
  scope: { projectId: string; sheetId: string; organizationId: string };
  links: Record<string, ProviderLinkState>;
  data: LocationsData;
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
  // By place: its price against the quote's places (proto).
  budgetNotes?: Record<string, { ok: boolean; text: string }>;
}) {
  const waiting = awaited(data).map((c) => c.id);
  const hasChoice = data.options.some((o) => o.status === "chosen");
  const live = data.options.filter(
    (o) => o.status === "candidate" || o.status === "chosen",
  );
  const discarded = data.options.filter(
    (o) => o.status === "discarded" || o.status === "replaced",
  );
  const card = (o: (typeof data.options)[number]) => (
    <LocationCard
      key={o.id}
      option={o}
      data={data}
      scope={scope}
      canOrganize={canOrganize}
      hasChoice={hasChoice && o.status !== "chosen"}
      budgetNote={budgetNotes[o.id] ?? null}
    />
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">{t.title}</h3>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        {canOrganize && (
          <AddLocationButton
            projectId={scope.projectId}
            sheetId={scope.sheetId}
          />
        )}
      </div>
      <LocationConsults
        projectId={scope.projectId}
        sheetId={scope.sheetId}
        consults={data.consults}
        awaitedIds={waiting}
        canOrganize={canOrganize}
        members={members}
        contacts={contacts}
        links={links}
      />
      {live.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{live.map(card)}</div>
      )}
      {live.length > 1 && (
        <Fold summary={t.compare.title}>
          <div>
            <DataTable>
              <DataTableHeader>
                <DataTableHead icon="place" fill>
                  {t.compare.place}
                </DataTableHead>
                <DataTableHead icon="amount">{t.compare.price}</DataTableHead>
                <DataTableHead icon="date" hideBelow="md">
                  {t.compare.availability}
                </DataTableHead>
                <DataTableHead icon="note">{t.compare.reviews}</DataTableHead>
                <DataTableHead icon="status" hideBelow="sm">
                  {t.compare.missing}
                </DataTableHead>
              </DataTableHeader>
              <DataTableBody>
                {live.map((o) => {
                  const count = (v: string) =>
                    o.reviews.filter((r) => r.verdict === v).length;
                  const missing = missingOf(o);
                  return (
                    <DataTableRow key={o.id}>
                      <DataTableCell fill className="max-w-0">
                        <DataTableMedia
                          title={o.name}
                          subtitle={`${t.statuses[o.status]} · ${t.verification[o.verification]}`}
                        />
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {o.priceCents !== null
                          ? formatEuros(o.priceCents)
                          : EMPTY_CELL}
                      </DataTableCell>
                      <DataTableCell
                        hideBelow="md"
                        className="max-w-48 truncate"
                      >
                        {o.availability ?? EMPTY_CELL}
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        {t.compare.reviewCount(
                          count("favorable"),
                          count("reserved"),
                          count("unfavorable"),
                        )}
                      </DataTableCell>
                      <DataTableCell hideBelow="sm" className="text-xs">
                        {missing.length
                          ? missing.map((m) => t.missing[m]).join(", ")
                          : EMPTY_CELL}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </div>
        </Fold>
      )}
      {discarded.length > 0 && (
        <Fold summary={`${t.statuses.discarded} (${discarded.length})`}>
          <div className="grid gap-4 md:grid-cols-2">{discarded.map(card)}</div>
        </Fold>
      )}
    </div>
  );
}
