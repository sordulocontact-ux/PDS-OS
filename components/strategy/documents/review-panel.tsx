"use client";

import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import {
  DecisionForm,
  type CriticalAlert,
} from "@/components/strategy/documents/decision-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { Member } from "@/lib/framing/related";
import { remindStrategyReview } from "@/lib/strategy/actions/documents";
import type { DocumentReview } from "@/lib/strategy/documents/queries";
import { strategyReviewTone } from "@/lib/ui/state-tones";

/**
 * Who must validate a sent version and where each stands (ticket Stratégie
 * § 9): validé, en attente, non commencé; the comments; « Relancer » for the
 * owner on a pending reviewer; the decision form for a reviewer still
 * expected. Kind-agnostic: the Brief de sortie, the Plan de sortie…
 */
export function ReviewPanel({
  projectId,
  documentId,
  reviews,
  requestNote,
  meId,
  canRemind,
  criticalAlerts,
  members,
}: {
  projectId: string;
  documentId: string;
  reviews: DocumentReview[];
  requestNote: string | null;
  meId: string | null;
  canRemind: boolean;
  // The Brief only (MKT-S1-16): alerts to accept, who may own a reserve.
  criticalAlerts?: CriticalAlert[];
  members?: Member[];
}) {
  const t = fr.strategyDocuments.review;
  const states = fr.strategyDocuments.reviewStates;
  const { pending, run } = useFramingAction();
  const mine = reviews.find(
    (r) => r.personId === meId && r.state === "pending",
  );
  const comments = reviews.filter((r) => r.comment);

  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-4">
      <h3 id="review-title" className="text-body-md font-semibold">
        {t.who}
      </h3>
      {requestNote && (
        <p className="text-caption text-muted-foreground">
          {t.note(requestNote)}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{r.name}</span>
              <span className="flex items-center gap-2">
                <StatusBadge tone={strategyReviewTone[r.state]} size="sm">
                  {states[r.state]}
                </StatusBadge>
                {canRemind && r.state === "pending" && r.personId !== meId && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => remindStrategyReview(projectId, r.id),
                        () => toast.success(t.reminded),
                      )
                    }
                  >
                    {t.remind}
                  </Button>
                )}
              </span>
            </div>
            {(r.decidedAt || r.remindedAt) && (
              <span className="text-caption text-muted-foreground">
                {r.decidedAt
                  ? t.decidedOn(formatDay(r.decidedAt))
                  : t.remindedOn(formatDay(r.remindedAt!))}
                {r.withReserves && ` · ${t.withReserves}`}
                {r.acceptedAlerts.length > 0 &&
                  ` · ${t.accepted(r.acceptedAlerts.length)}`}
              </span>
            )}
          </li>
        ))}
      </ul>

      {comments.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">{t.comments}</p>
          <ul className="flex flex-col gap-2">
            {comments.map((r) => (
              <li
                key={r.id}
                className="rounded-xl bg-[var(--surface-tint)] px-3 py-2 text-body-md"
              >
                <span className="font-semibold">{r.name}</span> · {r.comment}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mine && (
        <DecisionForm
          projectId={projectId}
          documentId={documentId}
          criticalAlerts={criticalAlerts}
          members={members}
        />
      )}
    </section>
  );
}
