// The week's summary of Finance's overview (lot 7, docs/FINANCE-V2.md, after
// Midday's weekly summary, docs/ANALYSE-MIDDAY.md § 4.2): the code computes
// and chooses the figures (« slots »), each with the sentence the code would
// say; PO only rewords them (lib/assistant/finance-brief/generate.ts), and
// lib/assistant/finance-brief/verify.ts keeps PO's text only when every
// figure in it is one of these. Pure code.

import { BUDGET_ALERT_SHARE } from "@/lib/finance/cockpit";
import {
  incomeState,
  isOpen,
  remainingCents,
  type Income,
} from "@/lib/finance/money-in";
import {
  addDays,
  type PaidDay,
  type Treasury,
  type TreasuryHorizon,
} from "@/lib/finance/treasury";
import { financeHome } from "@/lib/i18n/fr/finance-home";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeHome.brief;
const amount = (cents: number) => formatAmount(cents, { ht: false });

// The week: today and the six days before (Paris days).
export const WEEK_DAYS = 7;
// The forecast the summary looks at, whatever horizon the page shows.
export const BRIEF_HORIZON = 90 satisfies TreasuryHorizon;
// At most three sentences on the card, as Midday's « 2-3 phrases ».
export const BRIEF_SENTENCES = 3;

export type BriefSlotKey =
  "below_reserve" | "week" | "late" | "budget" | "no_proof" | "reserve_held";

/** One thing the summary may say: its sentence as the code says it, and
 * the figures in it (shown in bold, the only ones PO may write). */
export type BriefSlot = {
  key: BriefSlotKey;
  sentence: string;
  figures: string[];
};

export type BriefInput = {
  today: string;
  // Every receipt and every spend paid, by day (lib/finance/treasury-queries.ts).
  receipts: PaidDay[];
  paid: PaidDay[];
  incomes: Income[];
  // The forecast over BRIEF_HORIZON days; null without a statement.
  treasury: Treasury | null;
  // The live envelope nearest to its amount, if any.
  topBudget: { name: string; share: number } | null;
  noProof: number;
};

/** The slots, most urgent first. */
export function briefSlots(input: BriefInput): BriefSlot[] {
  const { today, treasury } = input;
  const from = addDays(today, -(WEEK_DAYS - 1));
  // A move dated later than today already happened: counted this week.
  const inWeek = (list: PaidDay[]) =>
    list.filter((x) => x.day >= from).reduce((sum, x) => sum + x.cents, 0);
  const received = inWeek(input.receipts);
  const paid = inWeek(input.paid);
  const late = input.incomes.filter(
    (i) => isOpen(i) && incomeState(i, today) === "late",
  );
  const lateCents = late.reduce((sum, i) => sum + remainingCents(i), 0);
  const below =
    treasury && treasury.reserveCents > 0
      ? treasury.points.find(
          (p) => p.forecast && p.cents < treasury.reserveCents,
        )
      : undefined;

  const slots: BriefSlot[] = [];
  if (below) {
    const day = formatDay(below.day);
    slots.push({
      key: "below_reserve",
      sentence: t.belowReserve(day),
      figures: [day],
    });
  }
  slots.push(
    received > 0 || paid > 0
      ? {
          key: "week",
          sentence: t.week(amount(received), amount(paid)),
          figures: [amount(received), amount(paid)],
        }
      : { key: "week", sentence: t.weekQuiet, figures: [] },
  );
  if (late.length > 0)
    slots.push({
      key: "late",
      sentence: t.lateCount(late.length, amount(lateCents)),
      figures: [String(late.length), amount(lateCents)],
    });
  if (input.topBudget && input.topBudget.share >= BUDGET_ALERT_SHARE) {
    const percent = Math.round(input.topBudget.share * 100);
    slots.push({
      key: "budget",
      sentence: t.budget(input.topBudget.name, percent),
      figures: [`${percent} %`],
    });
  }
  if (input.noProof > 0)
    slots.push({
      key: "no_proof",
      sentence: t.noProof(input.noProof),
      figures: [String(input.noProof)],
    });
  if (treasury && treasury.reserveCents > 0 && !below)
    slots.push({
      key: "reserve_held",
      sentence: t.reserveHeld(BRIEF_HORIZON),
      figures: [],
    });
  return slots;
}

/** The code's own summary: the first slots, as the code says them. */
export function codeBrief(slots: BriefSlot[]): string {
  const said = slots
    .filter((s) => s.key !== "week" || s.figures.length > 0)
    .slice(0, BRIEF_SENTENCES);
  return said.length ? said.map((s) => s.sentence).join(" ") : t.calm;
}
