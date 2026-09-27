import Link from "next/link";

import { ApproveButton } from "@/components/framing/guide/approve-button";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { GuideRow } from "@/components/framing/guide/guide-row";
import { buttonVariants } from "@/components/ui/button";
import type { FramingView, StepOverview } from "@/lib/framing/guide";
import type { PendingValidation } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

/** Entry of the guided review: the 5 points as understood, then "start" —
 * or, for the person waited on to validate, "Valider" directly. */
export function OverviewStep({
  steps,
  fromCall,
  hrefOf,
  projectId,
  pendingValidation,
  mePersonId,
}: {
  steps: StepOverview[];
  fromCall: boolean;
  hrefOf: (view: FramingView) => string;
  projectId: string;
  pendingValidation: PendingValidation | null;
  mePersonId: string | null;
}) {
  const t = fr.framingGuide;
  const firstOpen = steps.find((s) => s.status !== "confirmed");
  const started = steps.some((s) => s.status === "confirmed");
  const iAmTheValidator =
    pendingValidation && pendingValidation.validatorPersonId === mePersonId;

  return (
    <FramingStepCard
      eyebrow={t.overview.eyebrow}
      title={
        fromCall
          ? t.overview.titleFromCall(steps.length)
          : t.overview.titleManual
      }
      description={t.overview.body}
      actions={
        iAmTheValidator ? (
          <ApproveButton
            projectId={projectId}
            validationId={pendingValidation.id}
          />
        ) : (
          <>
            <Link
              href={hrefOf(firstOpen?.step ?? "summary")}
              className={buttonVariants({ size: "lg" })}
            >
              {firstOpen
                ? started
                  ? t.overview.resume
                  : t.overview.start
                : t.overview.toSummary}
            </Link>
            {firstOpen && started && (
              <Link
                href={hrefOf("summary")}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t.overview.toSummary}
              </Link>
            )}
          </>
        )
      }
    >
      <div className="flex flex-col gap-1">
        {steps.map((s) => (
          <GuideRow key={s.step} href={hrefOf(s.step)}>
            {`${t.steps[s.step]} · ${s.line}`}
          </GuideRow>
        ))}
      </div>
    </FramingStepCard>
  );
}
