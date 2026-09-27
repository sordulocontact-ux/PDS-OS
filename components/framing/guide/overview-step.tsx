import Link from "next/link";

import { FramingStepCard } from "@/components/framing/guide/step-card";
import { GuideRow } from "@/components/framing/guide/guide-row";
import { buttonVariants } from "@/components/ui/button";
import type { FramingView, StepOverview } from "@/lib/framing/guide";
import { fr } from "@/lib/i18n/fr";

/** Entry of the guided review: the 5 points as understood, then "start". */
export function OverviewStep({
  steps,
  fromCall,
  hrefOf,
}: {
  steps: StepOverview[];
  fromCall: boolean;
  hrefOf: (view: FramingView) => string;
}) {
  const t = fr.framingGuide;
  const firstOpen = steps.find((s) => s.status !== "confirmed");
  const started = steps.some((s) => s.status === "confirmed");

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
