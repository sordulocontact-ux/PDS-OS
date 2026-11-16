"use client";

import { SheetHead } from "@/components/finance/finance-sheet";
import { IconArrowUpRight } from "@/components/icons";
import { IncomeSheet } from "@/components/finance/income-sheet";
import { SpendSheet } from "@/components/finance/spend-sheet";
import { EmptyNote } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { incomeHref } from "@/lib/finance/income-links";
import { incomeState, type Income } from "@/lib/finance/money-in";
import type { MoveTarget } from "@/lib/finance/move-target";
import { spendsHref } from "@/lib/finance/spend-links";
import type { FinanceSpend } from "@/lib/finance/spends";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { budget } from "@/lib/i18n/fr/budget";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const t = financePlanning.record;

/** What a calendar's sheet reads its records from (plain data, so a page
 * can hand it to the client). `proofIn`: the organization a proof is kept
 * in, when the reader may attach one (who writes Finance). */
export type MoveRecordData = {
  spends: FinanceSpend[];
  incomes: Income[];
  targets: FinanceTarget[];
  today: string;
  proofIn?: string;
};

/** A move as a sheet needs to name it. */
export type MoveRef = {
  target: MoveTarget;
  label: string;
  direction: "in" | "out";
  cents: number;
  // Where it comes from, when no record says it (« Avance The Orchard »).
  eyebrow: string;
};

const openLink = (href: string, label: string) => (
  <ViewLink
    href={href}
    className={cn(buttonVariants({ variant: "outline" }), "self-start")}
  >
    {label}
  </ViewLink>
);

/**
 * The content of the side sheet a calendar move opens: the sheet of its
 * spend (as Dépenses opens it) or of its income (as Factures), read-only
 * and with the proof to attach for a spend; for a move with no record of
 * its own, its amount and the link to its page. The gestures that change a
 * record stay in its list: « Voir dans … » opens it there. One component
 * for Trésorerie's calendar and the Planning.
 */
export function MoveRecord({
  move,
  data,
}: {
  move: MoveRef;
  data: MoveRecordData;
}) {
  const { target } = move;
  const names = new Map(data.targets.map((x) => [x.id, x.name] as const));

  if (target.kind === "spend") {
    const spend = data.spends.find((s) => s.id === target.id);
    if (spend)
      return (
        <>
          <SpendSheet
            spend={spend}
            envelope={
              spend.target.kind === "off_budget"
                ? budget.form.offBudget
                : (names.get(spend.target.id) ?? "—")
            }
            // The link sits with the gestures, above the history.
            actions={[
              {
                key: "open",
                label: t.spends,
                icon: IconArrowUpRight,
                href: spendsHref({ ouvrir: spend.id }),
              },
            ]}
            proofIn={data.proofIn}
          />
        </>
      );
  }
  if (target.kind === "income") {
    const income = data.incomes.find((i) => i.id === target.id);
    if (income)
      return (
        <>
          <IncomeSheet
            income={income}
            target={
              [income.projectId, income.artistId, income.dealId]
                .flatMap((id) => (id && names.get(id) ? [names.get(id)] : []))
                .join(" · ") || "—"
            }
            today={data.today}
            actions={[]}
          />
          {openLink(
            incomeHref(income.id, incomeState(income, data.today)),
            t.incomes,
          )}
        </>
      );
  }
  const href =
    target.kind === "link"
      ? target.href
      : target.kind === "spend"
        ? spendsHref({ ouvrir: target.id })
        : incomeHref(target.id, "expected");
  const label =
    target.kind === "link"
      ? target.where === "spends"
        ? t.spends
        : t.fundings
      : target.kind === "spend"
        ? t.spends
        : t.incomes;
  return (
    <>
      <SheetHead
        eyebrow={move.eyebrow}
        amount={formatAmount(move.cents, { ht: false })}
        positive={move.direction === "in"}
      />
      {target.kind !== "link" && <EmptyNote>{t.missing}</EmptyNote>}
      {openLink(href, label)}
    </>
  );
}
