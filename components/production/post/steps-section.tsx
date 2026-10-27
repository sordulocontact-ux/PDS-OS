import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { stepLabel, stepPeriod } from "@/lib/production/post/labels";
import type { StepSuggestion } from "@/lib/production/post/suggestions";
import type {
  PostPeople,
  PostScope,
  PostStep,
  ProviderLinkState,
} from "@/lib/production/post/types";
import { postStepTone } from "@/lib/ui/state-tones";
import { STEP_AFTER } from "@/lib/production/post/suggestions";

import { ProviderLinkButton } from "./provider-link-button";
import { StepAddButton, StepMenu, StepSuggestions } from "./step-controls";

const fr = { productionPost };

const t = fr.productionPost.steps;

/**
 * « Organiser la postproduction » (parcours 15): the steps the owner kept,
 * each with who does it (or « Personne à confirmer »), dates, responsibilities
 * and access, and the provider's private link (PROD-026); then the steps PO
 * suggests that are not organised yet.
 */
export function StepsSection({
  scope,
  people,
  steps,
  suggestions,
  canOrganize,
  links,
  deliverableId,
}: {
  scope: PostScope;
  people: PostPeople;
  steps: PostStep[];
  suggestions: StepSuggestion[];
  canOrganize: boolean;
  // Each provider's current private link, by Réseau contact.
  links: Record<string, ProviderLinkState>;
  deliverableId: string;
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
                  {t.inputs[step.key] && (
                    <Detail label={t.inputsLabel}>{t.inputs[step.key]}</Detail>
                  )}
                  {(() => {
                    const before = (STEP_AFTER[step.key] ?? []).filter((k) =>
                      steps.some((s) => s.key === k),
                    );
                    return before.length > 0 ? (
                      <Detail label={t.afterLabel}>
                        {before.map((k) => t.keys[k]).join(", ")}
                      </Detail>
                    ) : null;
                  })()}
                  {step.responsibilities && (
                    <Detail label={t.responsibilities}>
                      {step.responsibilities}
                    </Detail>
                  )}
                  {step.accessNote && (
                    <Detail label={t.access}>{step.accessNote}</Detail>
                  )}
                  {canOrganize && step.holder?.kind === "contact" && (
                    <div className="pt-1">
                      <ProviderLinkButton
                        projectId={scope.projectId}
                        sheetId={scope.sheetId}
                        holder={step.holder}
                        link={links[step.holder.id] ?? null}
                      />
                    </div>
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
          deliverableId={deliverableId}
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
