import { StepSection } from "@/components/shell/journey/step-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Member } from "@/lib/framing/related";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import type { ActionState, PlanState } from "@/lib/production/preprod/plan";
import type { CallItem, PlanAction } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { planStateTone } from "@/lib/ui/state-tones";

import { PlanBoard } from "./plan-board";
import type { Reschedule } from "@/lib/production/preprod/plan-template";

const fr = { productionPreprod };

const t = fr.productionPreprod.plan;

/** « Plan de préproduction »: its state (computed), then the board. */
export function PlanSection({
  projectId,
  sheetId,
  actions,
  states,
  planState,
  items,
  members,
  contacts,
  canOrganize,
  template,
}: {
  projectId: string;
  sheetId: string;
  template: {
    deliverableId: string;
    missing: number;
    reschedule: Reschedule[];
  };
  actions: PlanAction[];
  states: Map<string, ActionState>;
  planState: PlanState;
  items: CallItem[];
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  const planned = new Set(actions.map((a) => a.itemId));
  const fromCall = items.filter(
    (i) =>
      i.kind === "action" && i.status === "confirmed" && !planned.has(i.id),
  ).length;
  return (
    <StepSection
      id="plan"
      title={t.title}
      description={t.description}
      aside={
        <StatusBadge tone={planStateTone[planState]}>
          {t.states[planState]}
        </StatusBadge>
      }
    >
      <PlanBoard
        projectId={projectId}
        sheetId={sheetId}
        actions={actions}
        states={Object.fromEntries(states)}
        fromCall={fromCall}
        members={members}
        contacts={contacts}
        canOrganize={canOrganize}
        template={template}
      />
    </StepSection>
  );
}
