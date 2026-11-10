"use client";

import { toast } from "@/components/ui/toast";

import { useFramingAction } from "@/components/framing/use-framing-action";
import {
  DecisionForm,
  type CriticalAlert,
} from "@/components/strategy/documents/decision-form";
import { ReviewRows } from "@/components/strategy/validation/review-rows";
import { Button } from "@/components/ui/button";
import { strategyDocuments } from "@/lib/i18n/fr/strategy-documents";
import type { Member } from "@/lib/framing/related";
import { remindStrategyReview } from "@/lib/strategy/actions/documents";
import type { DocumentReview } from "@/lib/strategy/documents/queries";

const fr = { strategyDocuments };

/**
 * Who must validate a sent version and where each stands (ticket Stratégie
 * § 9), on the Brief de sortie's rows (`ReviewRows`): state, comment,
 * « Relancer » for the owner on a pending reviewer; the request's message
 * under the title; the decision form for a reviewer still expected.
 * Kind-agnostic: the Plan de sortie, the Dossier de presse…
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
  const { pending, run } = useFramingAction();
  const mine = reviews.find(
    (r) => r.personId === meId && r.state === "pending",
  );

  return (
    <>
      <ReviewRows
        reviews={reviews}
        title={t.who}
        description={requestNote ? t.note(requestNote) : undefined}
        action={(r) =>
          canRemind &&
          r.state === "pending" &&
          r.personId !== meId && (
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
          )
        }
      />
      {mine && (
        <DecisionForm
          projectId={projectId}
          documentId={documentId}
          criticalAlerts={criticalAlerts}
          members={members}
        />
      )}
    </>
  );
}
