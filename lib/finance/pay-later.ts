// Finance › Financements: what the Pay Later draws ask to pay back, read at
// each opening from the draws, never stored (the installments themselves
// are `installmentsOf`, lib/finance/engines.ts). Client-safe, pure code.

import { installmentsOf, type CreditDraw } from "@/lib/finance/engines";

export type Installment = {
  key: string;
  drawId: string;
  label: string;
  // 1-based, out of `of`.
  n: number;
  of: number;
  day: string;
  cents: number;
  // The part of this installment that is the credit's fee.
  feeCents: number;
};

/** Every installment of every draw, by day. */
export function allInstallments(draws: CreditDraw[]): Installment[] {
  return draws
    .flatMap((d) => {
      const fee = Math.round((d.cents * d.feeBp) / 10000 / d.installments);
      return installmentsOf(d).map((x, i): Installment => ({
        key: `${d.id}-${i}`,
        drawId: d.id,
        label: d.label,
        n: i + 1,
        of: d.installments,
        day: x.day,
        cents: x.cents,
        feeCents: fee,
      }));
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** The installments still to pay after today (the next first), and how many
 * were paid out of all of them. */
export function payLaterSummary(draws: CreditDraw[], today: string) {
  const all = allInstallments(draws);
  const upcoming = all.filter((x) => x.day > today);
  return {
    upcoming,
    next: upcoming[0] ?? null,
    paid: all.length - upcoming.length,
    total: all.length,
  };
}
