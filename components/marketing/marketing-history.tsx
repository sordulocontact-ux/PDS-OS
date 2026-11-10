import { EmptyNote } from "@/components/shell/empty-state";
import {
  StepHistory,
  type StepHistoryItem,
} from "@/components/shell/journey/step-history";
import { marketing } from "@/lib/i18n/fr/marketing";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import type { MarketingEvent } from "@/lib/marketing/queries";

const fr = { marketing, marketingReview, reviewJourney };

const t = fr.marketing.events;

/**
 * The audit of the Marketing follow-up, newest first, as every module's
 * history (`StepHistory`, like the Master's): what happened, who did it,
 * when, the fields that changed and the reason given. Written by the
 * database's triggers, never by the screen.
 */
export function MarketingHistory({
  events,
  emptyLabel,
}: {
  events: MarketingEvent[];
  emptyLabel: string;
}) {
  if (events.length === 0) return <EmptyNote>{emptyLabel}</EmptyNote>;
  const items: StepHistoryItem[] = events.map((event) => {
    const changed = event.newValue
      ? Object.keys(event.newValue)
          .map((key) => t.fields[key])
          .filter(Boolean)
      : [];
    const detail = [
      event.kind.endsWith(".updated") && changed.length > 0
        ? t.changed([...new Set(changed)].join(", "))
        : null,
      event.reason ? t.reason(event.reason) : null,
    ].filter(Boolean);
    return {
      key: event.id,
      text: [fr.marketingReview.events[event.kind] ?? t.other, ...detail].join(
        " · ",
      ),
      who: event.actorName,
      at: event.createdAt,
    };
  });
  return (
    <StepHistory
      items={items}
      title={fr.reviewJourney.history.title}
      hideTitle
    />
  );
}
