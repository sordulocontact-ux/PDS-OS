import { ProductionCallList } from "@/components/production/prep/production-call-list";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import {
  TECHNICAL_TOPICS,
  technicalCallDocuments,
  technicalCallPeople,
  technicalCallPurpose,
  technicalCallTopics,
  technicalTopicLabel,
  type TechnicalCallInput,
} from "@/lib/production/preprod/call-topics";
import type { PlanAction, PreprodData } from "@/lib/production/preprod/types";

import { AddCallItemButton } from "./add-call-item-button";
import type { Member } from "@/lib/framing/related";
import type { NetworkOption } from "@/lib/production/sheet";
import { CallItems } from "./call-items";
import { TechnicalCallLauncher } from "./technical-call-launcher";

const t = fr.productionPreprod.call;

/**
 * « Call technique »: the production calls of the sheet, then what they
 * produced, topic by topic. PO's proposals (from a call's report) wait for a
 * person; a person may also note a point during or after the call.
 */
export function TechnicalCallSection({
  projectId,
  input,
  calls,
  canOrganize,
  actions,
  members,
  contacts,
  launcher: withLauncher = true,
  listCalls = true,
}: {
  projectId: string;
  input: TechnicalCallInput & { data: { sheet: { id: string } } };
  calls: PreprodData["calls"];
  canOrganize: boolean;
  // The plan, to say which action of the call is planned (PROD-005).
  actions: PlanAction[];
  members: Member[];
  contacts: NetworkOption[];
  // External production: the call is the presentation to the company,
  // launched and listed by its own panel (ProductionCallPanel).
  launcher?: boolean;
  listCalls?: boolean;
}) {
  const sheetId = input.data.sheet.id;
  const items = input.preprod.items;
  const proposals = items.filter((i) => i.status === "proposed").length;
  // The six topics, then the other agendas' topics, then « Autres ».
  const topics = [
    ...new Set([
      ...TECHNICAL_TOPICS.map(technicalTopicLabel),
      ...calls.flatMap((c) => c.topics),
      t.otherTopic,
    ]),
  ];
  const launcher =
    canOrganize && withLauncher ? (
      <TechnicalCallLauncher
        projectId={projectId}
        data={{
          sheetId,
          deliverableId: input.data.deliverable.id,
          deliverableTitle: input.data.deliverable.title,
          topics: technicalCallTopics(input),
          purpose: technicalCallPurpose(input.data.deliverable.title),
          people: technicalCallPeople(input),
          documents: technicalCallDocuments(input),
        }}
      />
    ) : undefined;

  return (
    <PageSection
      id="technical-call"
      title={t.title}
      description={t.description}
      action={launcher}
      card
    >
      <div className="flex flex-col gap-8">
        {listCalls && (
          <section
            aria-labelledby="preprod-calls"
            className="flex flex-col gap-3"
          >
            <h3 id="preprod-calls" className="text-base font-semibold">
              {t.calls}
            </h3>
            {calls.length ? (
              <ProductionCallList calls={calls} />
            ) : (
              <EmptyNote>{t.noCalls}</EmptyNote>
            )}
          </section>
        )}
        {proposals > 0 && (
          <ToneCallout tone="warning">
            {t.proposalsTitle(proposals)}
          </ToneCallout>
        )}
        <CallItems
          projectId={projectId}
          items={items}
          topics={topics}
          canOrganize={canOrganize}
          planning={{
            sheetId,
            members,
            contacts,
            plannedByItem: Object.fromEntries(
              actions.flatMap((a) =>
                a.itemId && a.status !== "removed"
                  ? [
                      [
                        a.itemId,
                        {
                          holder: a.holder?.name ?? null,
                          dueDate: a.dueDate,
                          task: a.taskId !== null,
                        },
                      ],
                    ]
                  : [],
              ),
            ),
          }}
        />
        {canOrganize && (
          <div>
            <AddCallItemButton
              projectId={projectId}
              sheetId={sheetId}
              topics={topics}
            />
          </div>
        )}
      </div>
    </PageSection>
  );
}
