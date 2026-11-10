import type { ReactNode } from "react";

import { StepSection } from "@/components/shell/journey/step-section";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import type { DocumentReview } from "@/lib/strategy/documents/queries";
import { strategyBriefReviewTone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.validation;

/**
 * « Validation » (proto st3 decs): one row per validator with their state
 * (En attente / Validé / Validé avec réserves / Modification demandée / Non
 * commencé), their comment quoted, « Relancée le … ». Every strategy
 * document reads its validators here (the Brief de sortie, the Plan de
 * sortie, the Dossier de presse): `title` names the section, `description`
 * the request's message, `action` a gesture on a row (« Relancer »).
 */
export function ReviewRows({
  reviews,
  title = t.title,
  description,
  action,
}: {
  reviews: DocumentReview[];
  title?: string;
  description?: string;
  action?: (review: DocumentReview) => ReactNode;
}) {
  return (
    <StepSection title={title} description={description}>
      <Rows label={title}>
        {reviews.map((r) => {
          const state =
            r.state === "approved"
              ? r.withReserves
                ? "reserves"
                : "approved"
              : r.state === "changes_requested"
                ? "changes"
                : r.state === "cancelled"
                  ? "cancelled"
                  : "pending";
          const gesture = action?.(r);
          const badge = (
            <StatusBadge tone={strategyBriefReviewTone[state]} size="sm">
              {t[state]}
            </StatusBadge>
          );
          return (
            <InfoRow
              key={r.id}
              title={r.name}
              detail={
                [
                  r.comment && `« ${r.comment} »`,
                  r.state === "pending" &&
                    r.remindedAt &&
                    t.remindedOn(formatShortInstant(r.remindedAt)),
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              badge={
                gesture ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {badge}
                    {gesture}
                  </span>
                ) : (
                  badge
                )
              }
            />
          );
        })}
      </Rows>
    </StepSection>
  );
}
