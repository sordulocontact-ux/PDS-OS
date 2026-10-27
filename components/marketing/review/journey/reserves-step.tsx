import { AddReserveButton } from "@/components/marketing/closure/add-reserve-button";
import { ReserveMenu } from "@/components/marketing/closure/reserve-menu";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import { loadMembers } from "@/lib/framing/related";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import { reserveDecisionsFor } from "@/lib/marketing/closure/reserves";
import type { ReviewContext } from "@/lib/marketing/review/context";
import { activeClosureOf, isClosedState } from "@/lib/marketing/review/journey";
import {
  loadReserveTaskOptions,
  type Reserve,
} from "@/lib/marketing/reserves/queries";
import { formatDay } from "@/lib/utils/day";

import { ReserveArbitrateInline } from "./reserve-arbitrate-inline";
import { ReserveLiftInline } from "./reserve-lift-inline";

const fr = { marketingReview, reviewJourney };

const t = fr.reviewJourney.reserves;
const categories = fr.marketingReview.reports.reserveCategories;

/** « À suivre après clôture · Lina Haddad, pour le … · arbitrée par … ». */
function resultLine(r: Reserve, all: Reserve[]): string | null {
  if (!r.decision || !r.arbitrated) return null;
  const l = t.line;
  return [
    t.decisions[r.decision],
    r.decision === "follow_up" && r.followUp.name && r.followUp.dueOn
      ? l.follow(r.followUp.name, formatDay(r.followUp.dueOn))
      : "",
    r.duplicateOf
      ? l.duplicate(all.find((x) => x.id === r.duplicateOf)?.description ?? "")
      : "",
    r.reason ? l.reason(r.reason) : "",
    l.by(r.arbitrated.by ?? "—"),
    r.lifted?.note ? l.lifted(r.lifted.note) : "",
  ].join("");
}

/**
 * The step « Réserves » (proto `bi2`): every reserve of the bilan, its
 * arbitration in place for whoever may decide (the responsible; the
 * direction accepts a definitive limit), « Marquer levée » for a reserve to
 * lift, the follow-up tools in « ⋯ » (ticket: note, task in Travail).
 */
export async function ReservesStep({ ctx }: { ctx: ReviewContext }) {
  const { project, reserves, viewer, closures, access, activations } = ctx;
  const step = ctx.steps.find((s) => s.key === "reserves");
  if (!step) return null;
  const active = activeClosureOf(closures);
  const closed = active !== null && isClosedState(active.state);
  const [members, tasks] = await Promise.all([
    loadMembers(access),
    loadReserveTaskOptions(project.id),
  ]);
  // The reserve of an activation still open stays one (MKT-BIL-001).
  const activationOpen = (r: Reserve) =>
    r.activationId !== null &&
    activations.some(
      (a) =>
        a.id === r.activationId &&
        a.status !== "closed" &&
        a.status !== "cancelled",
    );
  const decisionsOf = (r: Reserve) =>
    reserveDecisionsFor({
      owner: viewer.isOwner,
      direction: viewer.canValidate,
      activationOpen: activationOpen(r),
    });
  const dueOn = ctx.today;
  return (
    <>
      {reserves.length === 0 ? (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
          {reserves.map((r) => {
            const line = resultLine(r, reserves);
            const follower =
              viewer.personId !== null &&
              viewer.personId === r.followUp.personId;
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3.5 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                      {categories[r.category]}
                    </span>
                    <b className="font-semibold break-words">{r.description}</b>
                    {line && (
                      <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] break-words text-[color:var(--text-tertiary)]">
                        {line}
                      </span>
                    )}
                  </div>
                  <ReserveMenu
                    inline
                    projectId={project.id}
                    reserve={{
                      id: r.id,
                      description: r.description,
                      status: r.status,
                      decision: r.decision,
                      reason: r.reason,
                      followUp: r.followUp,
                      taskId: r.task?.id ?? null,
                      activationOpen: activationOpen(r),
                    }}
                    role={{
                      owner: viewer.isOwner,
                      direction: viewer.canValidate,
                      closed,
                      follower,
                    }}
                    members={members}
                    others={reserves
                      .filter(
                        (o) => o.id !== r.id && o.decision !== "duplicate",
                      )
                      .map((o) => ({ id: o.id, label: o.description }))}
                    tasks={tasks}
                  />
                </div>
                {r.status === "open" &&
                  !closed &&
                  decisionsOf(r).length > 0 && (
                    <ReserveArbitrateInline
                      projectId={project.id}
                      reserveId={r.id}
                      decisions={decisionsOf(r)}
                      members={members}
                      others={reserves
                        .filter((o) => o.id !== r.id)
                        .map((o) => ({ id: o.id, label: o.description }))}
                      defaults={{ personId: project.ownerPersonId, dueOn }}
                    />
                  )}
                {r.status === "arbitrated" &&
                  r.decision === "blocking" &&
                  (viewer.isOwner || follower) && (
                    <ReserveLiftInline
                      projectId={project.id}
                      reserveId={r.id}
                    />
                  )}
              </li>
            );
          })}
        </ul>
      )}
      {viewer.isOwner && !closed && (
        <div>
          <AddReserveButton
            projectId={project.id}
            activations={activations.map((a) => ({ id: a.id, title: a.title }))}
          />
        </div>
      )}
      <StepWaiting step={step} />
    </>
  );
}
