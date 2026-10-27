import { DimensionNav } from "@/components/framing/intel/dimension-nav";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";

const fr = { strategyReleasePlan };

export type GeneratorStep = { name: string; href: string; done: boolean };

/**
 * The Plan de sortie generator: its eight steps on the left, each done or
 * to do, and the open step's screen. One step at a time, in the URL
 * (?step=n), so a step can be reopened from the recap or the preview.
 */
export function GeneratorShell({
  steps,
  current,
  label,
  children,
}: {
  // The name of the steps' list (the Plan de sortie's by default).
  label?: string;
  steps: GeneratorStep[];
  // 1-based.
  current: number;
  children: React.ReactNode;
}) {
  const t = fr.strategyReleasePlan;
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <DimensionNav
        label={label ?? t.stepsLabel}
        current={String(current)}
        items={steps.map((s, index) => ({
          key: String(index + 1),
          href: s.href,
          title: `${index + 1}. ${s.name}`,
          line: s.done ? t.stepDone : t.stepTodo,
          status: s.done ? "known" : "missing",
        }))}
      />
      <div className="flex min-w-0 flex-col gap-6">
        <p className="text-caption text-muted-foreground">
          {t.stepOf(current, steps.length)} · {steps[current - 1]?.name}
        </p>
        {children}
      </div>
    </div>
  );
}
