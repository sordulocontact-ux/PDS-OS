import { Fold } from "@/components/ui/fold";
import { StepSection } from "@/components/shell/journey/step-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { CALL_ITEM_KINDS, type CallItem } from "@/lib/production/preprod/types";
import { formatDate } from "@/lib/release/format";

import { CallItemRow } from "./call-item-row";
import type { PlannedAction } from "./plan-call-action";
import type { Member } from "@/lib/framing/related";
import type { NetworkOption } from "@/lib/production/sheet";

const fr = { productionPreprod };

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
  planning,
}: {
  projectId: string;
  items: CallItem[];
  topics: string[];
  canOrganize: boolean;
  planning: {
    sheetId: string;
    members: Member[];
    contacts: NetworkOption[];
    plannedByItem: Record<string, PlannedAction>;
  };
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
      planning={{
        sheetId: planning.sheetId,
        members: planning.members,
        contacts: planning.contacts,
        planned: planning.plannedByItem[item.id] ?? null,
      }}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      {order.map((topic, index) => (
        <StepSection key={topic} id={`call-topic-${index}`} title={topic}>
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
        </StepSection>
      ))}
      {rejected.length > 0 && (
        <Fold summary={t.rejectedCount(rejected.length)}>
          <ul className="flex flex-col gap-3">{rejected.map(row)}</ul>
        </Fold>
      )}
    </div>
  );
}
