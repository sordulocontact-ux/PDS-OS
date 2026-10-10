import { EmptyNote } from "@/components/shell/empty-state";
import { fr } from "@/lib/i18n/fr";
import { CALL_ITEM_KINDS, type CallItem } from "@/lib/production/preprod/types";
import { formatDate } from "@/lib/release/format";

import { CallItemRow } from "./call-item-row";

const t = fr.productionPreprod.call;

/**
 * The structured report of the technical call: per topic (the six of the
 * technical call first, then any other agenda topic, « Autres » last), the
 * decisions, hypotheses, proposed actions and points to arbitrate. Rejected
 * proposals stay reachable under their own fold.
 */
export function CallItems({
  projectId,
  items,
  topics,
  canOrganize,
}: {
  projectId: string;
  items: CallItem[];
  topics: string[];
  canOrganize: boolean;
}) {
  const live = items.filter((i) => i.status !== "rejected");
  const rejected = items.filter((i) => i.status === "rejected");
  if (items.length === 0) return <EmptyNote>{t.noItems}</EmptyNote>;

  const used = [...new Set(live.map((i) => i.topic))];
  const order = [
    ...topics.filter((topic) => used.includes(topic)),
    ...used.filter(
      (topic) => !topics.includes(topic) && topic !== t.otherTopic,
    ),
    ...(used.includes(t.otherTopic) ? [t.otherTopic] : []),
  ];
  const row = (item: CallItem) => (
    <CallItemRow
      key={item.id}
      projectId={projectId}
      item={item}
      topics={topics}
      canOrganize={canOrganize}
      date={item.reviewedAt ? formatDate(item.reviewedAt) : null}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      {order.map((topic, index) => (
        <section
          key={topic}
          aria-labelledby={`call-topic-${index}`}
          className="flex flex-col gap-4"
        >
          <h3 id={`call-topic-${index}`} className="text-base font-semibold">
            {topic}
          </h3>
          {CALL_ITEM_KINDS.map((kind) => {
            const group = live.filter(
              (i) => i.topic === topic && i.kind === kind,
            );
            if (group.length === 0) return null;
            return (
              <div key={kind} className="flex flex-col gap-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  {t.kindsPlural[kind]}
                </h4>
                <ul className="flex flex-col gap-3">{group.map(row)}</ul>
              </div>
            );
          })}
        </section>
      ))}
      {rejected.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {t.rejectedCount(rejected.length)}
          </summary>
          <ul className="mt-3 flex flex-col gap-3">{rejected.map(row)}</ul>
        </details>
      )}
    </div>
  );
}
