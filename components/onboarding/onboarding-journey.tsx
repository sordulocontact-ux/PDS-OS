"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import type { WelcomeVariant } from "@/lib/home/welcome";
import { onboarding } from "@/lib/i18n/fr/onboarding";
import { cn } from "@/lib/utils";

const fr = { onboarding };

const TICK_MS = 1100;
// Rest on the finished journey before starting over.
const PAUSE_TICKS = 2;
// Under reduced motion: a journey in progress, still.
const STILL_TICK = 3;

// The journey of the example project: the hand passes by itself, the viewer's
// steps in blue. Calculated from nothing but the tick: an illustration.
export function OnboardingJourney({
  variant,
  name,
}: {
  variant: WelcomeVariant;
  name: string;
}) {
  const t = fr.onboarding;
  const steps = t.journey;
  const [tick, setTick] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? STILL_TICK
      : 0,
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setTick((now) => (now >= steps.length + PAUSE_TICKS ? 0 : now + 1)),
      TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="onboarding-rise rounded-[14px] border border-[color:var(--border-default)] bg-[var(--surface-raised)] p-[18px] modern:rounded-xl modern:p-5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <b className="font-semibold">{t.journeyProject}</b>
        <span className="text-[length:var(--type-micro)] text-[color:var(--text-tertiary)]">
          {t.journeyCaption}
        </span>
      </div>
      <ul className="flex flex-col">
        {steps.map((row, index) => {
          const mine = row.by === variant;
          const state =
            index < tick ? "done" : index === tick ? "current" : "later";
          const person = t.people[row.by];
          return (
            <li
              key={row.title}
              className="relative grid grid-cols-[22px_minmax(0,1fr)_28px] items-center gap-2.5 py-[7px] not-last:after:absolute not-last:after:top-[31px] not-last:after:-bottom-[7px] not-last:after:left-[10.5px] not-last:after:w-px not-last:after:bg-[var(--border-default)]"
            >
              <span
                className={cn(
                  "relative z-[1] grid size-[22px] place-items-center rounded-[var(--radius-circle)] bg-[var(--surface-raised)]",
                  state === "done" &&
                    "bg-[var(--text-primary)] text-[color:var(--surface-raised)]",
                  state === "later" &&
                    "border-[1.5px] border-dashed border-[color:var(--border-hover)]",
                )}
              >
                {state === "done" && (
                  <IconCheck aria-hidden className="onboarding-pop size-3" />
                )}
                {state === "current" && (
                  <span className="size-2.5 rounded-[var(--radius-circle)] bg-[var(--selection)] shadow-[0_0_0_4px_var(--selection-bg)]" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-[length:var(--type-caption)] leading-[19px] font-semibold",
                    state === "later" && "text-[color:var(--text-secondary)]",
                  )}
                >
                  {row.title}
                </span>
                <span
                  className={cn(
                    "block truncate text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]",
                    mine && state !== "done" && "text-[color:var(--selection)]",
                  )}
                >
                  {state === "done"
                    ? row.done
                    : state === "current"
                      ? mine
                        ? t.journeyMineStep(row.action)
                        : t.journeyOtherStep(person, row.action)
                      : t.journeyAfter(steps[index - 1].title)}
                </span>
              </span>
              <Avatar
                name={mine ? name : person}
                pictureUrl={null}
                className={cn(
                  "size-[26px] text-[11px] tracking-normal modern:text-[length:var(--type-micro)]",
                  mine && "bg-[var(--selection)] text-white",
                )}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
