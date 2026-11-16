import "server-only";

// PO's reading of Finance's money (lot 7, docs/FINANCE-V2.md): the treasury
// and its low point, the money in (late first) and the spends to pay, as
// Finance's pages compute them (lib/finance/). Facts written by code.

import { formatDay } from "@/lib/assistant/facts";
import {
  cash,
  FINANCE_MAX_LINES as MAX_LINES,
  parisToday,
} from "@/lib/assistant/read/finance-format";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { routes } from "@/lib/auth/redirects";
import { engineMoves } from "@/lib/finance/engines";
import {
  awaitedOn,
  daysLate,
  incomeState,
  isOpen,
  lastReminder,
  remainingCents,
} from "@/lib/finance/money-in";
import {
  addDays,
  asHorizon,
  computeTreasury,
  engineLabels,
  treasuryEvents,
} from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { assistantReadFinance } from "@/lib/i18n/fr/assistant-read-finance";
import { spendsHref } from "@/lib/finance/spend-links";

const fr = { assistantReadFinance };

export async function readTreasury(horizon: number): Promise<ReadResult> {
  const t = fr.assistantReadFinance.treasury;
  const today = parisToday();
  const days = asHorizon(horizon);
  const data = await loadTreasury(addDays(today, days));
  if (data.error) return readFailed();
  const source = {
    label: fr.assistantReadFinance.sources.treasury,
    href: routes.financeTreasury,
  };
  const treasury = computeTreasury({ ...data, today, horizon: days });
  if (!treasury) return { facts: [t.noStatement], sources: [source] };

  const below =
    treasury.reserveCents > 0
      ? treasury.points.find(
          (p) => p.forecast && p.cents < treasury.reserveCents,
        )
      : undefined;
  const lowIsToday = treasury.low.day === today;
  // The moves that lead to the low point: what explains it.
  const moves = treasury.events.filter((e) => e.day <= treasury.low.day);
  const shown = moves.slice(0, MAX_LINES);
  return {
    facts: [
      t.today(cash(treasury.todayCents), formatDay(treasury.statement.asOf)),
      t.at(days, cash(treasury.at(days))),
      lowIsToday
        ? t.lowToday(days, cash(treasury.low.cents))
        : t.low(days, cash(treasury.low.cents), formatDay(treasury.low.day)),
      treasury.reserveCents <= 0
        ? t.noReserve
        : below
          ? t.below(cash(treasury.reserveCents), formatDay(below.day))
          : t.held(cash(treasury.reserveCents), days),
      ...(lowIsToday
        ? []
        : moves.length === 0
          ? [t.noMove]
          : [
              t.movesTitle(moves.length),
              ...shown.map(
                (e) =>
                  t.move(
                    formatDay(e.day),
                    e.label,
                    `${e.direction === "in" ? "+" : "−"}${cash(e.cents)}`,
                    cash(e.balanceCents),
                  ) + (e.dueOn ? t.late : ""),
              ),
              ...capped(moves.length, MAX_LINES),
            ]),
      t.forecastNote,
    ],
    sources: [source],
  };
}

export async function readIncomes(): Promise<ReadResult> {
  const t = fr.assistantReadFinance.incomes;
  const today = parisToday();
  const data = await loadTreasury(today);
  if (data.error) return readFailed();
  const open = data.incomes.filter(isOpen);
  const late = open
    .filter((i) => incomeState(i, today) === "late")
    .sort((a, b) => daysLate(b, today) - daysLate(a, today));
  const next = open
    .filter((i) => incomeState(i, today) !== "late")
    .sort((a, b) => awaitedOn(a).localeCompare(awaitedOn(b)));
  const sum = (list: typeof open) =>
    list.reduce((total, i) => total + remainingCents(i), 0);
  const lateLines = late.slice(0, MAX_LINES).map((i) => {
    const reminder = lastReminder(i);
    return (
      t.lateLine(
        i.label,
        i.payer ? t.payer(i.payer) : "",
        cash(remainingCents(i)),
        daysLate(i, today),
        formatDay(awaitedOn(i)),
      ) +
      (i.invoiceNumber ? t.invoice(i.invoiceNumber) : "") +
      (reminder ? t.lastReminder(formatDay(reminder.remindedOn)) : t.noReminder)
    );
  });
  return {
    facts: [
      t.late(late.length, cash(sum(late))),
      ...lateLines,
      ...capped(late.length, MAX_LINES),
      t.open(open.length, cash(sum(open))),
      ...(next.length
        ? [
            t.nextTitle,
            ...next
              .slice(0, 5)
              .map((i) =>
                t.nextLine(
                  formatDay(awaitedOn(i)),
                  i.label,
                  cash(remainingCents(i)),
                ),
              ),
          ]
        : []),
    ],
    sources: [
      late.length
        ? {
            label: fr.assistantReadFinance.sources.late,
            href: `${routes.financeIncomes}?vue=retard`,
          }
        : {
            label: fr.assistantReadFinance.sources.incomes,
            href: routes.financeIncomes,
          },
    ],
  };
}

export async function readToPay(horizon: number): Promise<ReadResult> {
  const t = fr.assistantReadFinance.toPay;
  const today = parisToday();
  const days = asHorizon(horizon);
  const until = addDays(today, days);
  const data = await loadTreasury(until);
  if (data.error) return readFailed();
  // The overview's « À payer »: the same events as the forecast.
  const outs = treasuryEvents(
    [],
    data.upcoming,
    today,
    until,
    engineMoves(data.engines, today, until, engineLabels),
  ).filter((e) => e.direction === "out");
  const total = outs.reduce((sum, e) => sum + e.cents, 0);
  const late = outs.filter((e) => e.dueOn);
  const lateCents = late.reduce((sum, e) => sum + e.cents, 0);
  return {
    facts: [
      t.total(outs.length, days, cash(total)),
      ...outs
        .slice(0, MAX_LINES)
        .map((e) =>
          t.line(
            formatDay(e.dueOn ?? e.day),
            e.label,
            cash(e.cents),
            Boolean(e.dueOn),
          ),
        ),
      ...capped(outs.length, MAX_LINES),
      ...(lateCents > 0 ? [t.lateTotal(cash(lateCents))] : []),
    ],
    sources: [
      {
        label: fr.assistantReadFinance.sources.toPay,
        href: spendsHref({ statut: "facture" }),
      },
    ],
  };
}
