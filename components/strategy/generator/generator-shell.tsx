import { DimensionNav } from "@/components/framing/intel/dimension-nav";
import { fr } from "@/lib/i18n/fr";
import type { Tone } from "@/lib/ui/state-tones";

export type GeneratorStep = {
  name: string;
  href: string;
  done: boolean;
};

/**
 * A document generator (Plan de sortie, Dossier de presse): its steps on the
 * left, each with its state, and the open step's screen. One step at a time,
 * in the URL (?step=n), so a step can be reopened from the recap.
 */
export function GeneratorShell({
  label,
  steps,
  current,
  children,
}: {
  label: string;
  steps: GeneratorStep[];
  // 1-based.
  current: number;
  children: React.ReactNode;
}) {
  const t = fr.strategyDocs.generator;
  const tone = (done: boolean): Tone => (done ? "success" : "neutral");
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <DimensionNav
        label={label}
        current={String(current)}
        items={steps.map((s, index) => ({
          key: String(index + 1),
          href: s.href,
          title: `${index + 1}. ${s.name}`,
          line: s.done ? t.stepDone : t.stepTodo,
          tone: tone(s.done),
          statusLabel: s.done ? t.stepDone : t.stepTodo,
          done: s.done,
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
