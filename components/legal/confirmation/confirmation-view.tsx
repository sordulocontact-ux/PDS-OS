import Link from "next/link";

import { ConfirmButton } from "@/components/legal/confirmation/confirm-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { SynthesisAction } from "@/components/legal/confirmation/synthesis-action";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import type { Confirmation } from "@/lib/legal/confirmation/queries";
import type {
  SynthesisFact,
  SynthesisSection,
} from "@/lib/legal/confirmation/synthesis";
import type { PlanItemKind } from "@/lib/legal/plan/proposal";
import { factTone } from "@/lib/ui/state-tones";
import type { JourneyStep } from "@/lib/ui/journey";
import { formatInstant } from "@/lib/utils/instant";

const fr = { legal };

const PLAN_KINDS: PlanItemKind[] = [
  "onboarding",
  "contract",
  "splits",
  "clearance",
  "formality",
];

/**
 * The Confirmation step as the proto draws it (Juridique v3, `synth()`): a
 * correction since the last confirmation said first; then the dossier part
 * by part (Personnes, Éléments repris, Contrats, Éditeurs), each line its
 * role, the person or thing in bold, its source and its state; then, for
 * whoever confirms, what confirming is not, the plan it will generate and
 * the one decision beside « Corriger une réponse ». Anyone holding
 * `manage_legal` may confirm (JUR-04, as `confirm_legal_intake`), each line
 * keeping its « Corriger » / « Répondre » (ticket Juridique 01). Once
 * confirmed: who confirmed and when, the way to the plan, the dossier folded.
 */
export function ConfirmationView({
  projectId,
  confirmation: c,
  step,
  canAct,
  tagged,
  planPreview,
}: {
  projectId: string;
  confirmation: Confirmation;
  step: JourneyStep | undefined;
  // `manage_legal`: may confirm and correct (JUR-04).
  canAct: boolean;
  // Several titles: each line says which (the title's tag).
  tagged: boolean;
  // The kinds of the démarches the plan will hold, one per action (JUR-06).
  planPreview: PlanItemKind[];
}) {
  const t = fr.legal.confirmation;
  if (c.status === "confirmed" && c.confirmedAt)
    return (
      <>
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
        <Fold summary={t.confirmedTitle}>
          <div className="flex flex-col gap-3.5 pt-3">
            <SynthesisSections
              sections={c.sections}
              tagged={tagged}
              canAct={canAct}
            />
          </div>
        </Fold>
      </>
    );
  if (c.status === "not_started" || c.openQuestions > 0) return null;

  return (
    <>
      {c.reopened && <ToneCallout tone="warning">{t.reopened}</ToneCallout>}
      {!canAct && <StepWaiting step={step} />}
      <SynthesisSections
        sections={c.sections}
        tagged={tagged}
        canAct={canAct}
      />
      {canAct && (
        <>
          <ToneCallout tone="info">{t.notice}</ToneCallout>
          {/* What confirming creates, said before (JUR-06). */}
          <StepSection title={t.preview.title}>
            {planPreview.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                {t.preview.empty}
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-body-sm">
                {PLAN_KINDS.filter((kind) => planPreview.includes(kind)).map(
                  (kind) => (
                    <li key={kind} className="flex gap-2">
                      <span aria-hidden className="text-muted-foreground">
                        •
                      </span>
                      {t.preview.kind[kind](
                        planPreview.filter((k) => k === kind).length,
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}
            <p className="text-caption text-muted-foreground">
              {t.preview.then}
            </p>
          </StepSection>
          <ConfirmButton
            projectId={projectId}
            label={c.reopened ? t.confirmAgain : t.confirm}
          >
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={routes.projectLegalStep(projectId, "framing")} />
              }
            >
              {t.correct}
            </Button>
          </ConfirmButton>
        </>
      )}
    </>
  );
}

/** Personnes, Éléments repris, Contrats, Éditeurs: one section each. */
function SynthesisSections({
  sections,
  tagged,
  canAct,
}: {
  sections: SynthesisSection[];
  tagged: boolean;
  canAct: boolean;
}) {
  const t = fr.legal.confirmation;
  return sections.map((section) => (
    <StepSection key={section.key} title={t.sections[section.key]}>
      {section.facts.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <FactRows>
          {section.facts.map((fact) => (
            <SynthesisRow
              key={fact.key}
              fact={fact}
              tagged={tagged}
              canAct={canAct}
            />
          ))}
        </FactRows>
      )}
    </StepSection>
  ));
}

/** One line of the dossier (proto `fact(role, <b>name</b>, source)`): an
 * answer keeps its « Corriger » / « Répondre » back to its question; any
 * other line opens its record. */
function SynthesisRow({
  fact,
  tagged,
  canAct,
}: {
  fact: SynthesisFact;
  tagged: boolean;
  canAct: boolean;
}) {
  const action = canAct ? fact.action : undefined;
  return (
    <FactRow
      label={fact.detail ?? undefined}
      value={<span className="font-semibold">{fact.label}</span>}
      source={
        fact.quote ? { quote: fact.quote, from: fact.source } : fact.source
      }
      state={{
        tone: fact.tone ?? factTone[fact.status],
        label: fact.statusLabel,
      }}
      side={
        ((tagged && fact.group) || action) && (
          <>
            {tagged && fact.group && (
              <StatusBadge
                size="sm"
                tone={fact.group.hue}
                title={fact.group.artists || undefined}
                className="max-w-48 truncate"
              >
                {fact.group.title}
              </StatusBadge>
            )}
            {action && <SynthesisAction action={action} />}
          </>
        )
      }
      // A row with a button never opens a view itself (FactRow).
      href={action ? null : fact.href}
    />
  );
}
