import { ToneCallout } from "@/components/ui/tone-callout";
import { ReturnCallout } from "@/components/ui/return-callout";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import type { ReviewContext } from "@/lib/marketing/review/context";
import { bilanIssues } from "@/lib/marketing/review/issues";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";

import { BilanPrepareForm } from "./bilan-prepare-form";
import { ReportCards } from "./report-cards";
import { ReportDecision } from "./report-decision";
import { SubmitReportButton } from "./submit-report-button";

const fr = { reviewJourney };

const t = fr.reviewJourney.bilan;
const sl = fr.reviewJourney.standing.labels;

/**
 * The step « Bilan provisoire » (proto `bi1`): the reason of a version sent
 * back, the versions, then what the viewer does — prepare the next version
 * (after the release), submit it to the direction, decide on it — or who
 * is expected.
 */
export async function BilanStep({ ctx }: { ctx: ReviewContext }) {
  const { project, reports, approvals, reserves, activations, viewer } = ctx;
  const step = ctx.steps.find((s) => s.key === "bilan");
  if (!step) return null;
  const latest = reports[0] ?? null;
  const decision = latest
    ? approvals.find((a) => a.reportId === latest.id)
    : undefined;
  const returned =
    latest &&
    decision?.comment &&
    (latest.state === "changes_requested" || latest.state === "postponed")
      ? {
          by: decision.validatorName,
          state: latest.state,
          note: decision.comment,
        }
      : null;
  const validatorName = ctx.validator?.name ?? t.noValidator;
  const mine = step.actor?.viewer === true;
  const preparing =
    viewer.isOwner &&
    activations.length > 0 &&
    (!latest || latest.state === "changes_requested") &&
    step.status !== "done";
  const released = ctx.releaseDate === null || ctx.today >= ctx.releaseDate;

  let action: React.ReactNode = null;
  if (preparing && released) {
    const supabase = await createClient();
    const { data: objectives } = await supabase
      .from("strategy_objectives")
      .select("id, label, due_on")
      .eq("project_id", project.id)
      .order("created_at");
    const open = reserves.filter(
      (r) => r.status === "open" || r.status === "arbitrated",
    );
    const issues = bilanIssues(
      activations,
      (objectives ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        dueOn: o.due_on,
      })),
      ctx.today,
      open.map((r) => r.description),
    );
    const from = activations.map((a) => a.startsOn).sort()[0] ?? ctx.today;
    action = (
      <BilanPrepareForm
        projectId={project.id}
        version={(latest?.version ?? 0) + 1}
        issues={issues}
        carried={open.length}
        activations={activations.map((a) => {
          const phase = a.phase;
          return {
            id: a.id,
            title: a.title,
            state:
              phase === -1
                ? t.scopeState.cancelled
                : phase === 5
                  ? t.scopeState.closed
                  : t.scopeState.phase(sl.phases[phase]),
          };
        })}
        defaults={{ from: from <= ctx.today ? from : ctx.today, to: ctx.today }}
      />
    );
  } else if (preparing && ctx.releaseDate)
    action = (
      <ToneCallout tone="info">
        {t.afterRelease(formatDay(ctx.releaseDate))}
      </ToneCallout>
    );
  else if (
    latest &&
    mine &&
    (latest.state === "generated" || latest.state === "postponed")
  )
    action = (
      <SubmitReportButton
        projectId={project.id}
        reportId={latest.id}
        label={
          latest.state === "postponed"
            ? t.resubmitTo(validatorName)
            : t.submitTo(validatorName)
        }
      />
    );
  else if (latest && latest.state === "to_validate" && viewer.canValidate)
    action =
      latest.authorPersonId === viewer.personId ||
      latest.submitterPersonId === viewer.personId ? (
        <ToneCallout tone="info">{t.self}</ToneCallout>
      ) : (
        <ReportDecision
          projectId={project.id}
          reportId={latest.id}
          version={latest.version}
          withReserves={reserves.some(
            (r) => r.status === "open" || r.status === "arbitrated",
          )}
        />
      );

  return (
    <>
      {returned && (
        <ReturnCallout
          by={returned.by}
          outcome={t.returned[returned.state]}
          note={returned.note}
        />
      )}
      <ReportCards ctx={ctx} />
      {action ?? <StepWaiting step={step} />}
      {!action && activations.length === 0 && step.status !== "done" && (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.noActivation}
        </p>
      )}
    </>
  );
}
