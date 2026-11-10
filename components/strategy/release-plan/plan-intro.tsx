import { IconCheck } from "nucleo-sharp-essential";
import Link from "next/link";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { KnownFacts } from "@/components/strategy/release-plan/known-facts";
import { StrategyPart } from "@/components/strategy/strategy-part";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { StepSection } from "@/components/shell/journey/step-section";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { KnownFact } from "@/lib/strategy/documents/plan-steps";
import { doneTone, draftTone } from "@/lib/ui/state-tones";

const fr = { strategyReleasePlan };

/**
 * Step 1 (ticket § 11): « Créons le Plan de sortie ». What the validated
 * strategy already says is shown as a block of facts (`KnownFacts`: the
 * label above its value, lists as pills), never asked again;
 * what the document still needs is listed apart, one row each opening its
 * screen, with its state.
 */
export function PlanIntro({
  known,
  toComplete,
  startHref,
  canEdit,
  title,
  body,
}: {
  // The document's own entry (the Plan de sortie's by default).
  title?: string;
  body?: string;
  known: KnownFact[];
  toComplete: Array<{
    key: string;
    label: string;
    done: boolean;
    href: string;
  }>;
  startHref: string;
  canEdit: boolean;
}) {
  const t = fr.strategyReleasePlan.intro;
  return (
    <StepSection title={title ?? t.title} description={body ?? t.body}>
      <div className="flex flex-col gap-7">
        <StrategyPart title={t.known} description={t.knownHint}>
          <KnownFacts facts={known} />
        </StrategyPart>
        <StrategyPart title={t.toComplete}>
          <Rows label={t.toComplete}>
            {toComplete.map((item) => (
              <InfoRow
                key={item.key}
                title={item.label}
                href={item.href}
                badge={
                  <StatusBadge
                    tone={item.done ? doneTone : draftTone}
                    size="sm"
                  >
                    {item.done && <IconCheck aria-hidden className="size-3" />}
                    {item.done ? t.confirmed : fr.strategyReleasePlan.stepTodo}
                  </StatusBadge>
                }
              />
            ))}
          </Rows>
        </StrategyPart>
        {canEdit && (
          <Link
            href={startHref}
            className={buttonVariants({ size: "lg", className: "self-start" })}
          >
            <ButtonRoll>{t.start}</ButtonRoll>
          </Link>
        )}
      </div>
    </StepSection>
  );
}
