"use client";

import { useState } from "react";

import { FinanceSheet } from "@/components/finance/finance-sheet";
import {
  MoveRecord,
  type MoveRecordData,
} from "@/components/finance/move-record";
import { SignedAmount } from "@/components/finance/signed-amount";
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
import { targetOfEvent } from "@/lib/finance/move-target";
import type { TreasuryEvent } from "@/lib/finance/treasury";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { fundings } from "@/lib/i18n/fr/fundings";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { incomeStateTone, spendCashTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { fundings, financePlanning, treasury: treasuryText };

type CalendarEvent = TreasuryEvent & { balanceCents: number };

const short = (day: string) => formatShortDay(day, { bare: true });

/**
 * « Calendrier financier » (maquette 6 of Ibé's ticket): every move the
 * forecast counts, by day, with the balance after it. A row opens its
 * record in Finance's side sheet, without leaving the page (a spend's, an
 * income's; a funding move's with the link to its page); ↑ ↓ go to the row
 * before or after. A late one is counted today and says the day it was due,
 * in red. Columns: the status (an income's or a spend's state), what it is
 * for, the amount (kept on a phone) and the balance.
 */
export function TreasuryCalendar({
  events,
  reserveCents,
  data,
}: {
  events: CalendarEvent[];
  reserveCents: number;
  data: MoveRecordData;
}) {
  const t = fr.treasury.page.calendar;
  const states = fr.treasury;
  const names = new Map(data.targets.map((x) => [x.id, x.name] as const));
  const [sheet, setSheet] = useState<number | null>(null);
  const open = sheet !== null ? events[sheet] : null;

  // The kind of a move, said under its name: « Entrée · Prestation ».
  const typeOf = (e: CalendarEvent) =>
    e.source.kind === "income"
      ? (() => {
          const id = e.source.id;
          const income = data.incomes.find((i) => i.id === id);
          return income ? states.kinds[income.kind] : null;
        })()
      : e.source.kind === "engine"
        ? fr.fundings.engines[e.source.engine]
        : t.spend;

  return (
    <PageSection id="finance-calendar" title={t.title}>
      {events.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead className="w-24">{t.date}</DataTableHead>
            <DataTableHead fill>{t.operation}</DataTableHead>
            <DataTableHead hideBelow="lg">{t.source}</DataTableHead>
            <DataTableHead hideBelow="md">{t.nature}</DataTableHead>
            <DataTableHead align="end" className="w-auto sm:w-48">
              {t.amount}
            </DataTableHead>
            <DataTableHead hideBelow="sm" align="end">
              {t.balance}
            </DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {events.map((e, index) => {
              const source =
                (e.projectId && names.get(e.projectId)) ||
                (e.artistId && names.get(e.artistId)) ||
                EMPTY_CELL;
              const badge =
                e.source.kind === "income"
                  ? {
                      tone: incomeStateTone[e.dueOn ? "late" : e.source.state],
                      label: states.states[e.dueOn ? "late" : e.source.state],
                    }
                  : e.source.kind === "engine"
                    ? {
                        tone: "neutral" as const,
                        label: states.states.expected,
                      }
                    : {
                        tone: spendCashTone[e.source.status],
                        label: states.spendStates[e.source.status],
                      };
              return (
                <DataTableRow key={e.key}>
                  <DataTableCell className="w-24 tabular-nums">
                    {short(e.day)}
                  </DataTableCell>
                  <DataTableCell fill>
                    <DataTableMedia
                      title={
                        <DataTableLink
                          href={null}
                          onOpen={() => setSheet(index)}
                        >
                          {e.label}
                        </DataTableLink>
                      }
                      subtitle={
                        <>
                          {[e.direction === "in" ? t.in : t.out, typeOf(e)]
                            .filter(Boolean)
                            .join(" · ")}
                          {e.dueOn && (
                            <span className="text-[color:var(--error)]">
                              {" · "}
                              {t.late(short(e.dueOn))}
                            </span>
                          )}
                        </>
                      }
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
                  <DataTableCell align="end" className="w-auto sm:w-48">
                    <SignedAmount event={e} />
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="sm"
                    align="end"
                    className={cn(
                      "tabular-nums",
                      e.balanceCents < reserveCents &&
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
      {open && sheet !== null && (
        <FinanceSheet
          open
          onClose={() => setSheet(null)}
          title={open.label}
          index={sheet}
          total={events.length}
          onMove={setSheet}
        >
          <MoveRecord
            move={{
              target: targetOfEvent(open.source),
              label: open.label,
              direction: open.direction,
              cents: open.cents,
              eyebrow: [open.direction === "in" ? t.in : t.out, typeOf(open)]
                .filter(Boolean)
                .join(" · "),
            }}
            data={data}
          />
        </FinanceSheet>
      )}
    </PageSection>
  );
}
