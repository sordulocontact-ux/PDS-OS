import { IconCheck } from "nucleo-sharp-essential";

import { ReturnCallout } from "@/components/ui/return-callout";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import { workflowStatus } from "@/lib/i18n/fr/workflow-status";
import type { ReviewContext } from "@/lib/marketing/review/context";
import {
  activeClosureOf,
  isClosedState,
  referenceOf,
  reservesInTheWay,
} from "@/lib/marketing/review/journey";
import { money } from "@/lib/marketing/review/standing";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { reviewCheckTone } from "@/lib/ui/state-tones";
import { createClient } from "@/lib/supabase/server";
import { formatShortInstant } from "@/lib/utils/day";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

import {
  ClosureDecisionPanel,
  ReopenForm,
  RequestClosureButton,
} from "./closure-actions";

const fr = { reviewJourney, workflowStatus };

const t = fr.reviewJourney.closure;
const LABEL = {
  ready: t.ready,
  not_ready: t.notReady,
  attention: t.attention,
  with_reserves: t.withReserves,
};

type Check = {
  key: string;
  text: string;
  kind: keyof typeof reviewCheckTone;
};

/**
 * The step « Clôture du Marketing » (proto `bi3`): the closing said once
 * decided, « Avant la clôture » in lines Prêt / Pas prêt / Attention (with
 * the ticket's unpaid commitments and Juridique), then the gesture of the
 * person looking — ask, decide, reopen with a reason — or who is expected.
 */
export async function ClosureStep({ ctx }: { ctx: ReviewContext }) {
  const { project, reports, reserves, closures, activations, viewer, access } =
    ctx;
  const step = ctx.steps.find((s) => s.key === "closure");
  if (!step) return null;
  const reference = referenceOf(reports);
  const active = activeClosureOf(closures);
  const closed = active !== null && isClosedState(active.state);
  const last = closures[0] ?? null;
  const { unarbitrated, toLift } = reservesInTheWay(reserves);
  const followed = reserves.filter(
    (r) =>
      r.status === "arbitrated" &&
      (r.decision === "follow_up" || r.decision === "accepted_limit"),
  );
  const remaining = reserves.filter((r) => r.status === "arbitrated");
  const open = activations.filter(
    (a) => a.status !== "closed" && a.status !== "cancelled",
  );
  // Each open activation is followed or accepted before the closure
  // (MKT-BIL-001; SQL marketing_uncovered_activations).
  const uncovered = open.filter(
    (a) => !followed.some((r) => r.activationId === a.id),
  );
  const [flows, lines] = await Promise.all([
    loadWorkflowStates(project.id),
    canSeeProjectBudget(access, project)
      ? (await createClient())
          .from("budget_lines")
          .select("amount_cents, status")
          .eq("project_id", project.id)
      : Promise.resolve(null),
  ]);
  const unpaid = (lines?.data ?? []).reduce(
    (total, l) =>
      total +
      (l.status === "committed" || l.status === "invoiced"
        ? l.amount_cents
        : 0),
    0,
  );
  const legal = flows?.states.legal;
  const checks: Check[] = [
    {
      key: "bilan",
      text: t.approved,
      kind: reference ? "ready" : "not_ready",
    },
    {
      key: "reserves",
      text: t.arbitrated,
      kind:
        unarbitrated.length + toLift.length === 0 && reference
          ? "ready"
          : "not_ready",
    },
    ...(uncovered.length
      ? [
          {
            key: "activations",
            text: t.uncovered(
              uncovered.length,
              uncovered.map((a) => a.title).join(", "),
            ),
            kind: "not_ready" as const,
          },
        ]
      : open.length
        ? [
            {
              key: "activations",
              text: t.openActivations(
                open.length,
                open.map((a) => a.title).join(", "),
              ),
              kind: "with_reserves" as const,
            },
          ]
        : []),
    ...(followed.length
      ? [
          {
            key: "followed",
            text: t.followed(followed.length),
            kind: "with_reserves" as const,
          },
        ]
      : []),
    ...(unpaid > 0
      ? [
          {
            key: "unpaid",
            text: t.unpaid(money(unpaid)),
            kind: "attention" as const,
          },
        ]
      : []),
    ...(legal && legal !== "restricted" && legal.status !== "done"
      ? [
          {
            key: "legal",
            text: t.legal(fr.workflowStatus.statuses[legal.status]),
            kind: "attention" as const,
          },
        ]
      : []),
  ];
  const self = active?.requestedByPersonId === viewer.personId;

  let action: React.ReactNode = null;
  if (!active && viewer.isOwner && reference && step.status === "current")
    action = (
      <RequestClosureButton projectId={project.id} reportId={reference.id} />
    );
  else if (active?.state === "requested" && viewer.canValidate)
    action = self ? (
      <ToneCallout tone="info">{t.self}</ToneCallout>
    ) : (
      <ClosureDecisionPanel
        projectId={project.id}
        closureId={active.id}
        withReserves={remaining.length > 0}
      />
    );

  return (
    <>
      {closed && active && (
        <ToneCallout tone="success" icon={<IconCheck />}>
          <strong className="font-semibold">
            {t.closed(active.state === "closed_with_reserves")}
          </strong>
          {t.closedBy(
            active.decidedBy ?? "—",
            active.decidedAt ? formatShortInstant(active.decidedAt) : "",
          )}
        </ToneCallout>
      )}
      {!active &&
        last &&
        last.comment &&
        (last.state === "changes_requested" || last.state === "postponed") && (
          <ReturnCallout
            by={last.decidedBy ?? "—"}
            outcome={t.returned[last.state]}
            note={last.comment}
          />
        )}
      {active?.state === "requested" && active.requestNote && (
        <ToneCallout tone="warning">{active.requestNote}</ToneCallout>
      )}
      <section className="flex flex-col gap-2.5">
        <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
          {t.before}
        </h3>
        <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
          {checks.map((c) => (
            <li
              key={c.key}
              className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[color:var(--border-hairline)] px-4 py-3 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] last:border-b-0"
            >
              <span className="min-w-0 flex-1 break-words">{c.text}</span>
              <StatusBadge tone={reviewCheckTone[c.kind]} size="sm">
                {LABEL[c.kind]}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>
      {closed && active && viewer.canValidate && (
        <ReopenForm projectId={project.id} closureId={active.id} />
      )}
      {!active && last?.state === "reopened" && last.reopenReason && (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.reopenedNote(
            last.reopenedBy ?? "—",
            last.reopenedAt ? formatShortInstant(last.reopenedAt) : "",
            last.reopenReason,
          )}
        </p>
      )}
      {action ?? <StepWaiting step={step} />}
    </>
  );
}
