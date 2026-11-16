"use client";

import { useEffect, useRef } from "react";

import { SheetFacts, SheetHead } from "@/components/ui/side-sheet";
import { SignedAmount } from "@/components/ui/signed-amount";
import type { PlanningDay, PlanningMove } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";

import { amount } from "./planning-format";
import { PlanningMarks } from "./planning-pill";

const t = financePlanning;

/**
 * A day of the Planning in Finance's side sheet: the balance before and
 * after it (the large figure is the balance at the end of the day), what
 * came in and went out, then each move with where it comes from and the
 * balance after it; a move opens its record in this same panel, without
 * leaving the Planning. The move clicked in the grid is shown selected.
 */
export function PlanningDaySheet({
  day,
  focus,
  onOpenMove,
}: {
  day: PlanningDay;
  focus: string | null;
  onOpenMove: (move: PlanningMove) => void;
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
        amount={day.afterCents === null ? undefined : amount(day.afterCents)}
        caption={
          <>
            <span>{s.endOfDay}</span>
            <PlanningMarks day={day} />
          </>
        }
      />
      <SheetFacts
        facts={[
          { label: s.before, value: money(day.beforeCents) },
          {
            label: s.in,
            value:
              day.inCents > 0 ? (
                <SignedAmount event={{ direction: "in", cents: day.inCents }} />
              ) : (
                s.none
              ),
          },
          {
            label: s.out,
            value:
              day.outCents > 0 ? (
                <SignedAmount
                  event={{ direction: "out", cents: day.outCents }}
                />
              ) : (
                s.none
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
                <button
                  type="button"
                  onClick={() => onOpenMove(m)}
                  aria-label={`${m.label}, ${s.open(origin)}`}
                  className={cn(
                    "-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 py-2.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring)] [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]",
                    m.key === focus && "bg-[var(--selection-bg)]",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{m.label}</span>
                    <span className="text-caption text-[color:var(--text-tertiary)]">
                      {[
                        origin,
                        m.dueOn
                          ? t.lateSince(formatShortDay(m.dueOn, { bare: true }))
                          : m.origin !== "paid" &&
                            (m.real ? t.state.real : t.state.forecast),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <SignedAmount event={m} />
                    {m.balanceCents !== null && (
                      <span className="text-caption text-[color:var(--text-tertiary)]">
                        {s.balanceAfter}{" "}
                        <span className="tabular-nums">
                          {amount(m.balanceCents)}
                        </span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
