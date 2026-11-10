import { IconCheck } from "nucleo-sharp-essential";

import { RankArrows } from "@/components/ui/rank-arrows";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";

const fr = { strategyReleasePlan };

export type GeneratorStep = { name: string; href: string; done: boolean };

/**
 * A generator's eight screens (Plan de sortie, Dossier de presse) inside
 * the step's panel, walked like the questions of the dimensions (Sacha,
 * 10/11/2026): the open screen's name on the left, a check when it is
 * done, « ‹ 3 sur 8 › » on the right, then its screen. The journey on the
 * left stays the Stratégie's; what remains to do is listed on the first
 * screen (« À confirmer ou compléter »). One screen at a time, in the URL
 * (?step=n), so a screen can be reopened from the recap or the preview.
 */
export function GeneratorShell({
  steps,
  current,
  label,
  children,
}: {
  // The name of the screens' list (the Plan de sortie's by default).
  label?: string;
  steps: GeneratorStep[];
  // 1-based.
  current: number;
  children: React.ReactNode;
}) {
  const t = fr.strategyReleasePlan;
  const open = steps[current - 1];
  const hrefAt = (n: number) => steps[n - 1]?.href ?? null;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-caption text-[color:var(--text-secondary)]">
          {open?.done && (
            <IconCheck
              aria-hidden
              className="size-3.5 shrink-0 text-[color:var(--tone-success-fg)]"
            />
          )}
          <span className="truncate">{open?.name}</span>
          {open && (
            <span className="sr-only">
              {` (${open.done ? t.stepDone : t.stepTodo})`}
            </span>
          )}
        </span>
        <RankArrows
          nav={{
            position: current,
            total: steps.length,
            previous: hrefAt(current - 1),
            next: hrefAt(current + 1),
          }}
          labels={{
            nav: label ?? t.stepsLabel,
            previous: t.previousStep,
            next: t.nextStep,
          }}
        />
      </div>
      {children}
    </div>
  );
}
