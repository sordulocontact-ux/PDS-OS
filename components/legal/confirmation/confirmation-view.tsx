import Link from "next/link";

import { ConfirmButton } from "@/components/legal/confirmation/confirm-button";
import type { PlanItemKind } from "@/lib/legal/plan/proposal";

const PLAN_KINDS: PlanItemKind[] = [
  "onboarding",
  "contract",
  "splits",
  "clearance",
  "formality",
];
import { SynthesisAction } from "@/components/legal/confirmation/synthesis-action";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactTable } from "@/components/ui/fact-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import type { Confirmation } from "@/lib/legal/confirmation/queries";
import { formatInstant } from "@/lib/utils/instant";
import { StepSection } from "@/components/shell/journey/step-section";

const fr = { legal };

/** Where the dossier stands, said once at the top of the État des lieux:
 * confirmed (by whom, when, and the way to the plan), or reopened by a
 * correction. Nothing while questions are still being answered. */
export function ConfirmationStatus({
  projectId,
  confirmation: c,
}: {
  projectId: string;
  confirmation: Confirmation;
}) {
  const t = fr.legal.confirmation;
  if (c.status === "confirmed" && c.confirmedAt)
    return (
      <ToneCallout tone="success">
        {t.confirmed(formatInstant(c.confirmedAt), c.confirmedBy)}{" "}
        {t.confirmedNote}{" "}
        <Link
          href={routes.projectLegalStep(projectId, "plan")}
          className="underline underline-offset-4"
        >
          {t.openPlan}
        </Link>
      </ToneCallout>
    );
  if (c.reopened && c.openQuestions === 0)
    return <ToneCallout tone="warning">{t.reopened}</ToneCallout>;
  return null;
}

/**
 * The dossier PO reformulates (ticket Juridique 01: « PO reformule le
 * dossier, montre les corrections possibles et demande confirmation »),
 * part by part, each line with its source and a way back to its question;
 * then the one decision, « Confirmer le dossier ». Shown once every
 * question has an answer; folded away once confirmed.
 */
export function ConfirmationPanel({
  projectId,
  confirmation: c,
  planPreview,
}: {
  projectId: string;
  confirmation: Confirmation;
  // The kinds of the démarches the plan will hold, one per action (JUR-06).
  planPreview: PlanItemKind[];
}) {
  const t = fr.legal.confirmation;
  if (c.status === "not_started" || c.openQuestions > 0) return null;
  const confirmed = c.status === "confirmed";

  return (
    <PageSection
      card
      id="legal-dossier"
      title={confirmed ? t.confirmedTitle : t.toConfirmTitle}
      description={t.description}
      collapsible={confirmed}
      defaultOpen={!confirmed}
    >
      <div className="flex flex-col gap-3.5">
        {c.sections.map((section) => (
          <StepSection key={section.key} title={t.sections[section.key].title}>
            <p className="text-sm text-muted-foreground">
              {t.sections[section.key].description}
            </p>
            {section.facts.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
              <FactTable
                facts={section.facts}
                renderAction={(action) => <SynthesisAction action={action} />}
              />
            )}
          </StepSection>
        ))}
        {!confirmed && (
          <div className="flex flex-col gap-3">
            {/* What confirming creates, said before (JUR-06). */}
            <StepSection title={t.preview.title}>
              {planPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.preview.empty}
                </p>
              ) : (
                <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
                  {PLAN_KINDS.filter((kind) => planPreview.includes(kind)).map(
                    (kind) => (
                      <li key={kind}>
                        {t.preview.kind[kind](
                          planPreview.filter((k) => k === kind).length,
                        )}
                      </li>
                    ),
                  )}
                </ul>
              )}
              <p className="text-sm text-muted-foreground">{t.preview.then}</p>
            </StepSection>
            <div className="flex flex-col items-end gap-3">
              <p className="text-sm text-muted-foreground">{t.notice}</p>
              <ConfirmButton projectId={projectId} />
            </div>
          </div>
        )}
      </div>
    </PageSection>
  );
}
