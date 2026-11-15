import { SignedAmount } from "@/components/finance/signed-amount";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
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
import { StatusBadge } from "@/components/ui/status-badge";
import type { Treasury } from "@/lib/finance/treasury";
import { fundings } from "@/lib/i18n/fr/fundings";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { incomeStateTone, spendCashTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatDay, formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { fundings, treasury: treasuryText };

/**
 * « Calendrier financier » (maquette 6 of Ibé's ticket): every move the
 * forecast counts, by day, with the balance after it. A late one is counted
 * today and says the day it was due.
 */
export function TreasuryCalendar({
  treasury,
  names,
}: {
  treasury: Treasury;
  names: Map<string, string>;
}) {
  const t = fr.treasury.page.calendar;
  const states = fr.treasury;
  return (
    <PageSection id="finance-calendar" title={t.title}>
      {treasury.events.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead className="w-28">{t.date}</DataTableHead>
            <DataTableHead fill>{t.operation}</DataTableHead>
            <DataTableHead hideBelow="lg">{t.source}</DataTableHead>
            <DataTableHead hideBelow="md">{t.nature}</DataTableHead>
            <DataTableHead align="end">{t.amount}</DataTableHead>
            <DataTableHead hideBelow="sm" align="end">
              {t.balance}
            </DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {treasury.events.map((e) => {
              const source =
                (e.projectId && names.get(e.projectId)) ||
                (e.artistId && names.get(e.artistId)) ||
                EMPTY_CELL;
              const badge =
                e.source.kind === "income"
                  ? {
                      tone: incomeStateTone[e.dueOn ? "late" : e.source.state],
                      label: e.dueOn
                        ? states.states.late
                        : states.states[e.source.state],
                    }
                  : e.source.kind === "engine"
                    ? {
                        tone: "info" as const,
                        label: fr.fundings.engines[e.source.engine],
                      }
                    : {
                        tone: spendCashTone[e.source.status],
                        label: states.spendStates[e.source.status],
                      };
              return (
                <DataTableRow key={e.key}>
                  <DataTableCell className="w-28 tabular-nums">
                    {formatDay(e.day, { weekday: false })}
                  </DataTableCell>
                  <DataTableCell fill>
                    <DataTableMedia
                      title={<span className="truncate">{e.label}</span>}
                      subtitle={[
                        e.direction === "in" ? t.in : t.out,
                        e.dueOn &&
                          t.late(formatShortDay(e.dueOn, { bare: true })),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="lg"
                    className="text-[color:var(--text-secondary)]"
                  >
                    <span className="truncate">{source}</span>
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  </DataTableCell>
                  <DataTableCell align="end">
                    <SignedAmount event={e} />
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="sm"
                    align="end"
                    className={cn(
                      "tabular-nums",
                      e.balanceCents < treasury.reserveCents &&
                        "text-[color:var(--tone-warning-fg)]",
                    )}
                  >
                    {formatAmount(e.balanceCents, { ht: false })}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
