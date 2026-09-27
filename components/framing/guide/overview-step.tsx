import Link from "next/link";

import { ApproveButton } from "@/components/framing/guide/approve-button";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { buttonVariants } from "@/components/ui/button";
import type { FramingView, StepOverview } from "@/lib/framing/guide";
import type { PendingValidation } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

/** Entry of the guided review: "start", the points themselves being listed in
 * the step nav next to it — or, for the person waited on, "Valider". */
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
      title={
        fromCall
          ? t.overview.titleFromCall(steps.length)
          : t.overview.titleManual
      }
      actionsAlign="start"
      actions={
        iAmTheValidator ? (
          <ApproveButton
            projectId={projectId}
            validationId={pendingValidation.id}
          />
        ) : (
          <>
            {firstOpen && started && (
              <Link
                href={hrefOf("summary")}
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                {t.overview.toSummary}
              </Link>
            )}
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
          </>
        )
      }
    />
  );
}
