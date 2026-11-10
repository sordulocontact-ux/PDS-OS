import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { StepHistory } from "@/components/shell/journey/step-history";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import { reviewJourneyContext } from "@/lib/marketing/review/context";
import { reviewHistory } from "@/lib/marketing/review/history";
import { loadStanding } from "@/lib/marketing/review/standing-data";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { isLocked } from "@/lib/ui/journey";
import { reviewStepHref, type ReviewStepKey } from "@/lib/ui/review-steps";

import { StandingCard } from "./standing-card";

const fr = { reviewJourney };

const t = fr.reviewJourney;

type Query = Record<string, string | string[] | undefined>;

/**
 * The frame of a step of the Suivi & bilan (docs/VISION-UX.md § 4,
 * JourneyLayout): the journey on the left with « Historique » at its foot,
 * on its right the head (the Marketing's pills, h1 = the step's title, its
 * why, « Qui fait quoi »), « Où on en est » (four sentences, the detail
 * folded), then the step — its content, its tools, « Déjà fait ».
 */
export async function ReviewStepFrame({
  projectId,
  stepKey,
  query,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: ReviewStepKey;
  query: Query;
  children: React.ReactNode;
}) {
  const ctx = await reviewJourneyContext(projectId);
  const { steps, owner, validator } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
  const standing = await loadStanding(ctx, query);
  const stepRef: StepRef = { projectId, module: "review", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "review", stepKey: s.key }),
    label: s.title,
  }));
  const history = reviewHistory({
    ...ctx,
    validatorName: validator?.name ?? null,
  })[stepKey];
  return (
    <JourneyLayout
      spine={
        <JourneySpine
          steps={steps}
          openKey={stepKey}
          footer={{
            href: reviewStepHref(projectId, "history"),
            label: t.history.link,
          }}
        />
      }
      head={
        <>
          <ProjectHeader
            projectId={projectId}
            steps={steps}
            head={step}
            actions={
              <WhoDoesWhatButton
                roles={[
                  {
                    key: "owner",
                    label: t.roles.owner,
                    kind: "exec",
                    holder: owner ? { name: owner.name } : null,
                    what: t.roles.ownerWhat,
                  },
                  {
                    key: "validator",
                    label: t.roles.validator,
                    kind: "valid",
                    holder: validator ? { name: validator.name } : null,
                    what: t.roles.validatorWhat,
                  },
                ]}
              />
            }
          />
          <ModuleAttention
            stepRef={stepRef}
            modules={["review"]}
            steps={choices}
          />
          <StandingCard
            {...standing}
            action={reviewStepHref(projectId, stepKey)}
          />
        </>
      }
    >
      <StepPanel
        step={step}
        steps={steps}
        blockedLabel={t.blocked}
        history={<StepHistory items={history} />}
        {...slots}
      >
        <StepBlockers stepRef={stepRef} steps={choices} />
        {children}
        <StepToolsBlock
          stepRef={stepRef}
          steps={choices}
          locked={isLocked(step.status)}
        />
      </StepPanel>
    </JourneyLayout>
  );
}
