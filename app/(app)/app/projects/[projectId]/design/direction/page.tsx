import { notFound } from "next/navigation";

import { DesignDecision } from "@/components/design/design-decision";
import { DesignStepFrame } from "@/components/design/design-step-frame";
import { DirectionSubmitForm } from "@/components/design/direction-step/direction-submit-form";
import { DesignWaits } from "@/components/design/waiting-row";
import { StepHistory } from "@/components/shell/journey/step-history";
import { ReturnCallout } from "@/components/ui/return-callout";
import { ToneCallout } from "@/components/ui/tone-callout";
import { designJourneyContext } from "@/lib/design/journey-context";
import { DESIGN_TOPICS } from "@/lib/design/intentions";
import { loadSheetViews } from "@/lib/design/sheet-views";
import { fr } from "@/lib/i18n/fr";
import { isLocked } from "@/lib/ui/journey";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.designSteps.direction;

/**
 * Conception › Direction artistique (proto de2, ticket § 7): the release's
 * direction from the confirmed intentions — a point nobody said written on
 * the spot — what is submitted (the direction, each deliverable with its
 * references and what its sheet still lacks), who submits and who
 * validates (shown, set in « Qui fait quoi »), then the direction's one
 * decision in the step: Valider / Demander des modifications / Refuser.
 */
export default async function DesignDirectionPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/direction">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const { data, directionPhase: phase, latestDirection: latest } = ctx;
  const step = ctx.steps[3];
  const views = await loadSheetViews(ctx);
  const creative = ctx.creative?.name ?? "—";
  const validator = ctx.validator?.name ?? "—";
  const editable =
    (ctx.isCreative || ctx.isOwner) &&
    data.canWrite &&
    !isLocked(step.status) &&
    (phase === "draft" ||
      phase === "changes_requested" ||
      phase === "rejected");

  const rows = DESIGN_TOPICS.map((topic) => {
    const i = data.intentions.find(
      (x) =>
        x.target === "direction" &&
        x.status === "confirmed" &&
        x.topic === topic,
    );
    const source = i ? data.sources.find((s) => s.id === i.sourceId) : null;
    return {
      topic,
      label: fr.conception.directionTopics[topic],
      value: i?.value ?? null,
      source: !i
        ? null
        : source && i.sourceQuote
          ? `${source.title} « ${i.sourceQuote} »`
          : fr.designSteps.sheets.sources.intentionsOf(
              fr.designSteps.intentions.direction,
            ),
    };
  });
  const refsOf = (key: string | null) =>
    data.references.filter((r) =>
      r.links.some((l) =>
        key ? l.deliverableId === key : l.target === "direction",
      ),
    ).length;
  const sections = [
    {
      id: null,
      title: fr.designSteps.intentions.direction,
      meta: t.sectionMeta(refsOf(null), []),
      submitted: Boolean(latest),
    },
    ...data.deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      meta: t.sectionMeta(
        refsOf(d.id),
        views.find((v) => v.deliverable?.id === d.id)?.missing ?? [],
      ),
      submitted: Boolean(latest?.sections.includes(d.id)),
    })),
  ];
  const lastDecision = latest?.decisions.at(-1) ?? null;
  const returned =
    (phase === "changes_requested" || phase === "rejected") && lastDecision ? (
      <ReturnCallout
        by={lastDecision.decidedByName}
        outcome={
          phase === "rejected"
            ? t.refuse.toLowerCase()
            : t.changes.toLowerCase()
        }
        note={lastDecision.comment ?? ""}
      />
    ) : undefined;
  const history = [...ctx.direction.submissions]
    .filter((s) => s.status !== "withdrawn")
    .reverse()
    .flatMap((s) => [
      {
        key: `${s.id}-s`,
        text: t.history.submitted(s.number),
        who: s.submittedByName,
        at: s.submittedAt,
      },
      ...s.decisions.map((d) => ({
        key: d.id,
        text:
          (d.decision === "approved"
            ? t.history.approved
            : d.decision === "rejected"
              ? t.history.refused
              : t.history.changes) +
          (d.comment ? fr.designSteps.sheets.history.comment(d.comment) : ""),
        who: d.decidedByName,
        at: d.decidedAt,
      })),
    ]);

  return (
    <DesignStepFrame
      projectId={projectId}
      stepKey="direction"
      returned={returned}
      history={<StepHistory items={history} />}
    >
      {phase === "approved" && lastDecision && (
        <ToneCallout tone="success">
          {t.approved(
            lastDecision.decidedByName,
            formatShortInstant(lastDecision.decidedAt),
          )}
        </ToneCallout>
      )}
      <DirectionSubmitForm
        projectId={projectId}
        rows={rows}
        sections={sections}
        who={t.who(creative, validator)}
        editable={editable}
        creative={creative}
        submitLabel={phase === "draft" ? t.submitTo(validator) : t.resubmit}
      />
      {phase === "pending" && latest && ctx.isValidator ? (
        <DesignDecision
          id="direction-decision"
          projectId={projectId}
          submissionId={latest.id}
          title={t.decisionTitle}
          labels={{
            approve: t.approve,
            changes: t.changes,
            refuse: t.refuse,
            approved: t.approvedDone,
            changed: t.changesDone,
            refused: t.refusedDone,
          }}
          commentLabel={t.comment}
          commentHint={t.commentHint}
          commentRequired={t.commentRequired}
        />
      ) : (
        <DesignWaits step={step} actors={[step.actor]} />
      )}
    </DesignStepFrame>
  );
}
