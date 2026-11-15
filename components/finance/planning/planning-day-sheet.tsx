"use client";

import { useEffect, useRef } from "react";

import { SheetFacts, SheetHead } from "@/components/finance/finance-sheet";
import { SignedAmount } from "@/components/finance/signed-amount";
import { ViewLink } from "@/components/ui/view-link";
import type { PlanningDay } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";

import { amount, dayName } from "./planning-format";
import { PlanningMarks } from "./planning-pill";

const t = financePlanning;

/**
 * A day of the Planning in Finance's side sheet: the balance before and
 * after it, what came in and went out, then each move with where it comes
 * from (its invoice, spend or funding opens) and the balance after it. The
 * move clicked in the grid is shown selected.
 */
export function PlanningDaySheet({
  day,
  focus,
}: {
  day: PlanningDay;
  focus: string | null;
}) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!focus) return;
    list.current
      ?.querySelector(`[data-move="${focus}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focus, day.day]);
  const s = t.sheet;
  const money = (cents: number | null) =>
    cents === null ? s.unknown : amount(cents);

  return (
    <>
      <SheetHead
        eyebrow={s.eyebrow(day.moves.length)}
        title={dayName(day.day)}
        amount={day.afterCents === null ? undefined : amount(day.afterCents)}
        caption={<PlanningMarks day={day} />}
      />
      <SheetFacts
        facts={[
          { label: s.before, value: money(day.beforeCents) },
          {
            label: s.in,
            value: (
              <SignedAmount event={{ direction: "in", cents: day.inCents }} />
            ),
          },
          {
            label: s.out,
            value: (
              <SignedAmount event={{ direction: "out", cents: day.outCents }} />
            ),
          },
          {
            label: s.after,
            value: (
              <span
                className={cn(
                  day.belowReserve && "text-[color:var(--tone-warning-fg)]",
                )}
              >
                {money(day.afterCents)}
              </span>
            ),
          },
        ]}
      />
      <section className="flex flex-col gap-2">
        <h3 className="text-caption font-medium text-[color:var(--text-secondary)]">
          {s.moves}
        </h3>
        <ol ref={list} className="flex flex-col">
          {day.moves.map((m) => {
            const origin = t.origins[m.origin];
            return (
              <li
                key={m.key}
                data-move={m.key}
                className="border-b border-[color:var(--border-hairline)] last:border-b-0"
              >
                <ViewLink
                  href={m.href}
                  aria-label={`${m.label}, ${s.open(origin)}`}
                  className={cn(
                    "-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring)] [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]",
                    m.key === focus && "bg-[var(--selection-bg)]",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{m.label}</span>
                    <span className="text-caption text-[color:var(--text-tertiary)]">
                      {[
                        origin,
                        m.real ? t.real : t.forecast,
                        m.dueOn &&
                          t.lateSince(formatShortDay(m.dueOn, { bare: true })),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <SignedAmount event={m} />
                    {m.balanceCents !== null && (
                      <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums">
                        {s.balanceAfter(amount(m.balanceCents))}
                      </span>
                    )}
                  </span>
                </ViewLink>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
