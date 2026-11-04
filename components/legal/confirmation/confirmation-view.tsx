import Link from "next/link";

import { ConfirmButton } from "@/components/legal/confirmation/confirm-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import type { Confirmation } from "@/lib/legal/confirmation/queries";
import type { SynthesisFact } from "@/lib/legal/confirmation/synthesis";
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
 * the one decision beside « Corriger une réponse ». Others read the dossier
 * under who is awaited. Once confirmed: who confirmed and when, the way to
 * the plan.
 */
export function ConfirmationView({
  projectId,
  confirmation: c,
  step,
  tagged,
  planPreview,
}: {
  projectId: string;
  confirmation: Confirmation;
  step: JourneyStep | undefined;
  // Several titles: each line says which (the title's tag).
  tagged: boolean;
  // The kinds of the démarches the plan will hold, one per action (JUR-06).
  planPreview: PlanItemKind[];
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
  if (c.status === "not_started" || c.openQuestions > 0) return null;
  // The project's owner confirms (proto: read-only for anyone else).
  const mine = step?.actor ? step.actor.viewer : true;

  return (
    <>
      {c.reopened && <ToneCallout tone="warning">{t.reopened}</ToneCallout>}
      {!mine && <StepWaiting step={step} />}
      {c.sections.map((section) => (
        <StepSection key={section.key} title={t.sections[section.key]}>
          {section.facts.length === 0 ? (
            <EmptyNote>{t.empty}</EmptyNote>
          ) : (
            <FactRows>
              {section.facts.map((fact) => (
                <SynthesisRow key={fact.key} fact={fact} tagged={tagged} />
              ))}
            </FactRows>
          )}
        </StepSection>
      ))}
      {mine && (
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

/** One line of the dossier (proto `fact(role, <b>name</b>, source)`): the
 * whole line opens where it can be corrected (its question, its record). */
function SynthesisRow({
  fact,
  tagged,
}: {
  fact: SynthesisFact;
  tagged: boolean;
}) {
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
        tagged &&
        fact.group && (
          <StatusBadge
            size="sm"
            tone={fact.group.hue}
            title={fact.group.artists || undefined}
            className="max-w-48 truncate"
          >
            {fact.group.title}
          </StatusBadge>
        )
      }
      href={fact.action?.href ?? fact.href}
    />
  );
}
