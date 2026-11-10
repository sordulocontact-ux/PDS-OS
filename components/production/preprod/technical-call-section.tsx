import { ProductionCallList } from "@/components/production/prep/production-call-list";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { CallPrepLauncher } from "@/components/calls/prep/call-prep-launcher";
import { technicalCallDefaults } from "@/lib/production/call-prep-defaults";
import {
  TECHNICAL_TOPICS,
  technicalTopicLabel,
  type TechnicalCallInput,
} from "@/lib/production/preprod/call-topics";
import type { PlanAction, PreprodData } from "@/lib/production/preprod/types";

import { AddCallItemButton } from "./add-call-item-button";
import type { Member } from "@/lib/framing/related";
import type { NetworkOption } from "@/lib/production/sheet";
import { CallItems } from "./call-items";

const fr = { productionPreprod };

const t = fr.productionPreprod.call;

/**
 * « Call technique »: the production calls of the sheet, then what they
 * produced, topic by topic. PO's proposals (from a call's report) wait for a
 * person; a person may also note a point during or after the call.
 */
export async function TechnicalCallSection({
  projectId,
  input,
  calls,
  canOrganize,
  actions,
  members,
  contacts,
  launcher: withLauncher = true,
  listCalls = true,
  heading,
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
  // prepared and held in the step itself (CallStepHead).
  launcher?: boolean;
  listCalls?: boolean;
  // The step's own words for the section (« Ce qui a été dit »).
  heading?: { title: string; description: string };
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
  const defaults =
    canOrganize && withLauncher
      ? await technicalCallDefaults(projectId, input)
      : null;
  const launcher = defaults ? (
    <CallPrepLauncher
      label={t.prepare}
      title={t.sheetTitle}
      body={t.sheetBody}
      mode="dialog"
      variant="default"
    >
      <CallPrepForm defaults={defaults} />
    </CallPrepLauncher>
  ) : undefined;

  return (
    <StepSection
      id="technical-call"
      title={heading?.title ?? t.title}
      description={heading?.description ?? t.description}
      aside={launcher}
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
    </StepSection>
  );
}
