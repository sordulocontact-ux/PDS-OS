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
 * commencé), their comment quoted, « Relancée le … ».
 */
export function ReviewRows({ reviews }: { reviews: DocumentReview[] }) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby="brief-reviews">
      <h3 id="brief-reviews" className="text-body-md font-semibold">
        {t.title}
      </h3>
      <Rows label={t.title}>
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
                <StatusBadge tone={strategyBriefReviewTone[state]} size="sm">
                  {t[state]}
                </StatusBadge>
              }
            />
          );
        })}
      </Rows>
    </section>
  );
}
