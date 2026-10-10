import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { ActionState, PlanState } from "@/lib/production/preprod/plan";
import type { CallItem, PlanAction } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { planStateTone } from "@/lib/ui/state-tones";

import { PlanBoard } from "./plan-board";

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
}: {
  projectId: string;
  sheetId: string;
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
    <PageSection
      id="plan"
      title={t.title}
      description={t.description}
      action={
        <StatusBadge tone={planStateTone[planState]}>
          {t.states[planState]}
        </StatusBadge>
      }
      card
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
      />
    </PageSection>
  );
}
