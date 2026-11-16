// « Alertes utiles » of Ibé's ticket « Cockpit Finance » (lot 7): passing
// under the reserve, a budget at 82 % or over, the due days, a possibly
// duplicated invoice, a rebillable spend not paid back, a spend on no
// envelope, the bank to reconcile, an Orchard advance due (16/11/2026), the
// positive impact of moving a show.
// Computed from what Finance reads, never stored. Client-safe, pure code.

import { BUDGET_ALERT_SHARE } from "@/lib/finance/cockpit";
import { orchardAdvances, type EngineData } from "@/lib/finance/engines";
import type { EnvelopeRow } from "@/lib/finance/envelopes";
import {
  daysLate,
  incomeState,
  isOpen,
  remainingCents,
  type Income,
} from "@/lib/finance/money-in";
import { txState, type BankTransaction } from "@/lib/finance/reconcile";
import {
  rebillMissing,
  spendDay,
  spendTtc,
  type FinanceSpend,
} from "@/lib/finance/spends";
import { addDays, type Treasury } from "@/lib/finance/treasury";

export type AlertSeverity = "danger" | "warning" | "info";

export type Alert =
  | { kind: "below_reserve"; day: string; cents: number }
  | { kind: "budget"; envelope: EnvelopeRow; share: number }
  | { kind: "late_income"; income: Income; days: number; cents: number }
  | { kind: "to_pay"; spend: FinanceSpend; day: string; late: boolean }
  | {
      kind: "duplicate_invoice";
      label: string;
      count: number;
      incomeIds: string[];
    }
  | { kind: "duplicate_spend"; label: string; count: number }
  | { kind: "rebill"; spend: FinanceSpend }
  | { kind: "off_budget"; spend: FinanceSpend }
  | { kind: "no_proof"; count: number }
  | { kind: "to_reconcile"; count: number; oldest: string }
  | { kind: "orchard_due"; count: number; cents: number }
  | {
      kind: "shift";
      showLabel: string;
      from: string;
      to: string;
      gainCents: number;
    };

export const severityOf = (alert: Alert): AlertSeverity => {
  switch (alert.kind) {
    case "below_reserve":
    case "late_income":
      return "danger";
    case "budget":
      return alert.share > 1 ? "danger" : "warning";
    case "to_pay":
      return alert.late ? "danger" : "warning";
    case "shift":
      return "info";
    default:
      return "warning";
  }
};

const RANK: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };

// A spend's invoice to pay within this many days is announced.
const DUE_SOON_DAYS = 7;
// Two incomes of the same payer and amount closer than this look doubled.
const DOUBLE_INCOME_DAYS = 30;
// Two spends of the same envelope, label and amount closer than this too.
const DOUBLE_SPEND_DAYS = 7;
// Bank transactions waiting longer than this to be reconciled.
const RECONCILE_AFTER_DAYS = 7;

const fold = (v: string | null) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const gap = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) /
  86400000;

function duplicateInvoices(incomes: Income[]): Alert[] {
  const live = incomes.filter((i) => !i.cancelledAt);
  const byNumber = new Map<string, Income[]>();
  for (const i of live) {
    const key = fold(i.invoiceNumber);
    if (key) byNumber.set(key, [...(byNumber.get(key) ?? []), i]);
  }
  const alerts: Alert[] = [...byNumber.values()]
    .filter((list) => list.length > 1)
    .map((list) => ({
      kind: "duplicate_invoice",
      label: list[0].invoiceNumber ?? "",
      count: list.length,
      incomeIds: list.map((i) => i.id),
    }));
  const flagged = new Set(
    alerts.flatMap((a) => (a.kind === "duplicate_invoice" ? a.incomeIds : [])),
  );
  for (let x = 0; x < live.length; x++)
    for (let y = x + 1; y < live.length; y++) {
      const a = live[x];
      const b = live[y];
      if (flagged.has(a.id) || flagged.has(b.id)) continue;
      if (
        a.cents === b.cents &&
        fold(a.payer) &&
        fold(a.payer) === fold(b.payer) &&
        gap(a.expectedOn, b.expectedOn) <= DOUBLE_INCOME_DAYS
      ) {
        alerts.push({
          kind: "duplicate_invoice",
          label: a.label,
          count: 2,
          incomeIds: [a.id, b.id],
        });
        flagged.add(a.id).add(b.id);
      }
    }
  return alerts;
}

function duplicateSpends(spends: FinanceSpend[]): Alert[] {
  const live = spends.filter((s) => !s.refused);
  const groups = new Map<string, FinanceSpend[]>();
  for (const s of live) {
    const key = `${s.target.kind}:${s.target.id}|${fold(s.label)}|${s.cents}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()].flatMap((list): Alert[] => {
    const close = list.filter((s) =>
      list.some(
        (o) => o.id !== s.id && gap(o.spentOn, s.spentOn) <= DOUBLE_SPEND_DAYS,
      ),
    );
    return close.length > 1
      ? [
          {
            kind: "duplicate_spend",
            label: close[0].label,
            count: close.length,
          },
        ]
      : [];
  });
}

/** Every alert of Finance, the most serious first. `simulate`: the
 * treasury's low point with one show moved (the engines' « impact positif
 * d'un décalage de planning »). */
export function financeAlerts({
  treasury,
  incomes,
  spends,
  envelopes,
  transactions,
  engines,
  today,
  simulate,
}: {
  treasury: Treasury | null;
  incomes: Income[];
  spends: FinanceSpend[];
  envelopes: EnvelopeRow[];
  transactions: BankTransaction[];
  engines: EngineData;
  today: string;
  simulate?: (engines: EngineData) => Treasury | null;
}): Alert[] {
  const alerts: Alert[] = [];
  const below =
    treasury && treasury.reserveCents > 0
      ? treasury.points.find(
          (p) => p.forecast && p.cents < treasury.reserveCents,
        )
      : undefined;
  if (below)
    alerts.push({ kind: "below_reserve", day: below.day, cents: below.cents });

  for (const e of envelopes) {
    if (e.archived || !e.currentCents) continue;
    const share = e.engagedCents / e.currentCents;
    if (share >= BUDGET_ALERT_SHARE)
      alerts.push({ kind: "budget", envelope: e, share });
  }

  for (const i of incomes.filter(isOpen))
    if (incomeState(i, today) === "late")
      alerts.push({
        kind: "late_income",
        income: i,
        days: daysLate(i, today),
        cents: remainingCents(i),
      });

  const soon = addDays(today, DUE_SOON_DAYS);
  for (const s of spends)
    if (!s.refused && s.status === "invoiced" && spendDay(s) <= soon)
      alerts.push({
        kind: "to_pay",
        spend: s,
        day: spendDay(s),
        late: spendDay(s) < today,
      });

  alerts.push(...duplicateInvoices(incomes), ...duplicateSpends(spends));
  for (const s of spends.filter(rebillMissing))
    alerts.push({ kind: "rebill", spend: s });
  for (const s of spends)
    if (!s.refused && s.target.kind === "off_budget")
      alerts.push({ kind: "off_budget", spend: s });

  const noProof = spends.filter(
    (s) =>
      !s.refused &&
      (s.status === "invoiced" || s.status === "paid") &&
      !s.hasProof,
  ).length;
  if (noProof) alerts.push({ kind: "no_proof", count: noProof });

  const waiting = transactions
    .filter(
      (t) =>
        (txState(t) === "open" || txState(t) === "partial") &&
        gap(t.bookedOn, today) > RECONCILE_AFTER_DAYS,
    )
    .sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
  if (waiting.length)
    alerts.push({
      kind: "to_reconcile",
      count: waiting.length,
      oldest: waiting[0].bookedOn,
    });

  // A tranche of The Orchard's contract delivered and not received yet.
  const orchard = orchardAdvances(engines, today);
  if (orchard.due > 0)
    alerts.push({
      kind: "orchard_due",
      count: orchard.due,
      cents: orchard.advances
        .filter((a) => a.show === null)
        .reduce((sum, a) => sum + a.cents, 0),
    });

  // A show moved a month later that lifts the low point over the reserve.
  if (below && treasury && simulate) {
    for (const show of engines.shows) {
      if (show.cancelled || show.costCenterId || show.plannedOn < today)
        continue;
      const to = addDays(show.plannedOn, 30);
      const moved = simulate({
        ...engines,
        shows: engines.shows.map((s) =>
          s.id === show.id ? { ...s, plannedOn: to } : s,
        ),
      });
      if (
        moved &&
        moved.low.cents >= treasury.reserveCents &&
        moved.low.cents > treasury.low.cents
      )
        alerts.push({
          kind: "shift",
          showLabel: show.label,
          from: show.plannedOn,
          to,
          gainCents: moved.low.cents - treasury.low.cents,
        });
    }
  }

  return alerts.sort((a, b) => RANK[severityOf(a)] - RANK[severityOf(b)]);
}

/** The money an alert is about, to sort or sum (0 when none). */
export const alertCents = (alert: Alert) => {
  switch (alert.kind) {
    case "below_reserve":
    case "late_income":
    case "orchard_due":
      return alert.cents;
    case "to_pay":
    case "rebill":
    case "off_budget":
      return spendTtc(alert.spend);
    default:
      return 0;
  }
};
