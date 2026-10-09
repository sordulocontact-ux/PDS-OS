"use client";

import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { DecisionForm } from "@/components/strategy/documents/decision-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import { remindReviewer } from "@/lib/strategy/actions/workflow";
import type { DocumentReview } from "@/lib/strategy/workspace";
import { strategyReviewTone } from "@/lib/ui/state-tones";

/**
 * Who must validate a version and where each stands (ticket § 9): validated,
 * waiting, not started (the version is not sent yet); the comments; « Relancer »
 * for the owner; the decision for a reviewer still expected.
 */
export function ReviewPanel({
  projectId,
  documentId,
  reviews,
  planned,
  meId,
  canRemind,
}: {
  projectId: string;
  documentId: string;
  reviews: DocumentReview[];
  // Before sending: the people the version will go to (« Non commencé »).
  planned: string[];
  meId: string | null;
  canRemind: boolean;
}) {
  const t = fr.strategyDocs.validation;
  const { pending, run } = useFramingAction();
  const mine = reviews.find(
    (r) => r.personId === meId && r.state === "pending",
  );
  const comments = reviews.filter((r) => r.comment);

  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-4">
      <h3 id="review-title" className="text-body-lg font-semibold">
        {t.who}
      </h3>
      <ul className="flex flex-col gap-2">
        {reviews.length === 0
          ? planned.map((name) => (
              <li
                key={name}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="font-medium">{name}</span>
                <StatusBadge tone={strategyReviewTone.not_started} size="sm">
                  {t.states.not_started}
                </StatusBadge>
              </li>
            ))
          : reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge tone={strategyReviewTone[r.state]} size="sm">
                      {t.states[r.state]}
                    </StatusBadge>
                    {canRemind &&
                      r.state === "pending" &&
                      r.personId !== meId && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => remindReviewer(projectId, r.id),
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
                      ? formatDay(r.decidedAt)
                      : t.remindedAt(formatDay(r.remindedAt!))}
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

      {mine && <DecisionForm projectId={projectId} documentId={documentId} />}
    </section>
  );
}
