import { StepHistory } from "@/components/shell/journey/step-history";
import { StepPanel } from "@/components/shell/journey/step-panel";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import type { DistributionContext } from "@/lib/distribution/journey-context";
import { stepHistory } from "@/lib/distribution/step-history";
import { fr } from "@/lib/i18n/fr";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { isLocked } from "@/lib/ui/journey";
import type { DistributionStep as StepKey } from "@/lib/ui/distribution-steps";
import type { Tone } from "@/lib/ui/state-tones";

const t = fr.distributionJourney;

/**
 * One step of the Distribution on the right of its journey (StepPanel): the
 * grid, a locked step's « Se débloque quand… » and « Ce qui viendra », the
 * reason of a return in its head, the step's content, then « Déjà fait »
 * from the module's journal.
 */
export function DistributionStep({
  ctx,
  stepKey,
  badge,
  returned,
  children,
}: {
  ctx: DistributionContext;
  stepKey: StepKey;
  badge?: { tone: Tone; label: string };
  returned?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const step = ctx.steps.find((s) => s.key === stepKey);
  if (!step) return null;
  const locked = isLocked(step.status);
  const acts = stepKey === "prep" ? [] : t.acts[stepKey];
  // Blockers and noted information of the step (sub-lot C6).
  const stepRef: StepRef = {
    projectId: ctx.project.id,
    module: "distribution",
    stepKey,
  };
  const choices = ctx.steps.map((s) => ({
    key: stepChoiceKey({ module: "distribution", stepKey: s.key }),
    label: s.title,
  }));
  return (
    <StepPanel
      step={step}
      steps={ctx.steps}
      rootPrereq={t.rootPrereq}
      badge={badge}
      returned={locked ? undefined : returned}
      history={<StepHistory items={stepHistory(ctx, stepKey)} />}
      blockers={<StepBlockers stepRef={stepRef} steps={choices} />}
      tools={
        <StepToolsBlock stepRef={stepRef} steps={choices} locked={locked} />
      }
    >
      {locked ? (
        acts.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-secondary)]">
              {t.coming}
            </h3>
            <ol className="flex flex-col gap-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
              {acts.map((label, index) => (
                <li key={label} className="flex gap-2">
                  <span className="text-[color:var(--text-tertiary)]">
                    {index + 1}.
                  </span>
                  <span>
                    {label}
                    <span className="text-[color:var(--text-tertiary)]">
                      {" · "}
                      {whoActs(ctx, stepKey, index)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null
      ) : (
        children
      )}
    </StepPanel>
  );
}

// The second gesture of the Dossier and of the Clôture is the validator's.
function whoActs(ctx: DistributionContext, key: StepKey, index: number) {
  const byValidator = (key === "dossier" || key === "closure") && index === 1;
  return byValidator
    ? (ctx.validator?.name ?? t.toAppoint)
    : (ctx.project.ownerName ?? "—");
}
