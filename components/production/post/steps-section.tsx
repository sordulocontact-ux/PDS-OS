import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { stepLabel, stepPeriod } from "@/lib/production/post/labels";
import type { StepSuggestion } from "@/lib/production/post/suggestions";
import type {
  PostPeople,
  PostScope,
  PostStep,
} from "@/lib/production/post/types";
import { postStepTone } from "@/lib/ui/state-tones";

import { StepAddButton, StepMenu, StepSuggestions } from "./step-controls";

const t = fr.productionPost.steps;

/**
 * « Organiser la postproduction » (parcours 15): the steps the owner kept,
 * each with who does it (or « Personne à confirmer »), dates, responsibilities
 * and access; then the steps PO suggests that are not organised yet.
 */
export function StepsSection({
  scope,
  people,
  steps,
  suggestions,
  canOrganize,
}: {
  scope: PostScope;
  people: PostPeople;
  steps: PostStep[];
  suggestions: StepSuggestion[];
  canOrganize: boolean;
}) {
  return (
    <PageSection
      id="steps"
      title={t.title}
      description={t.description}
      card
      action={canOrganize && <StepAddButton scope={scope} people={people} />}
    >
      {steps.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-5">
          {steps.map((step) => {
            const label = stepLabel(step);
            const period = stepPeriod(step.startsOn, step.endsOn);
            return (
              <li key={step.id} className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{label}</span>
                    <StatusBadge tone={postStepTone[step.status]} size="sm">
                      {t.statuses[step.status]}
                    </StatusBadge>
                  </div>
                  <p
                    className={
                      step.holder ? undefined : "text-muted-foreground"
                    }
                  >
                    {step.holder?.name ?? t.toConfirm}
                    {period && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {period}
                      </span>
                    )}
                  </p>
                  {step.responsibilities && (
                    <Detail label={t.responsibilities}>
                      {step.responsibilities}
                    </Detail>
                  )}
                  {step.accessNote && (
                    <Detail label={t.access}>{step.accessNote}</Detail>
                  )}
                </div>
                {canOrganize && (
                  <StepMenu
                    scope={scope}
                    people={people}
                    step={step}
                    label={label}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canOrganize && suggestions.length > 0 && (
        <StepSuggestions
          scope={scope}
          people={people}
          suggestions={suggestions}
        />
      )}
    </PageSection>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm break-words whitespace-pre-line">
      <span className="text-muted-foreground">{label} : </span>
      {children}
    </p>
  );
}
