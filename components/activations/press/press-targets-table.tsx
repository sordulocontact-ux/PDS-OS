import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MessageRecord } from "@/lib/activations/messages/queries";
import type { OpportunityRecord } from "@/lib/activations/press/queries";
import type { TargetRecord } from "@/lib/activations/targets";
import type { EvidenceRecord } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { activationMessageTone, proofTone } from "@/lib/ui/state-tones";

const t = fr.activationPress.targets;

/** The press targets : media and journalist, the last message's real state,
 * the opportunity, the coverage (declared ≠ verified). */
export function PressTargetsTable({
  projectId,
  activationId,
  targets,
  messages,
  opportunities,
  evidences,
}: {
  projectId: string;
  activationId: string;
  targets: TargetRecord[];
  messages: MessageRecord[];
  opportunities: OpportunityRecord[];
  evidences: EvidenceRecord[];
}) {
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.media}</DataTableHead>
        <DataTableHead>{t.lastMessage}</DataTableHead>
        <DataTableHead hideBelow="md">{t.opportunity}</DataTableHead>
        <DataTableHead fill hideBelow="sm">
          {t.coverage}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {targets.map((x) => {
          const last = messages
            .filter((m) => m.targetId === x.id && m.status !== "cancelled")
            .at(-1);
          const opportunity = opportunities
            .filter((o) => o.targetId === x.id)
            .at(-1);
          const coverage = evidences.filter(
            (e) => e.targetId === x.id && !e.withdrawnAt,
          );
          const proof =
            coverage.length === 0
              ? null
              : coverage.some((e) => e.checks[0]?.result === "verified")
                ? "verified"
                : "provided_unverified";
          return (
            <DataTableRow key={x.id}>
              <DataTableCell>
                <DataTableMedia
                  title={
                    <DataTableLink
                      href={routes.projectActivationTarget(
                        projectId,
                        activationId,
                        x.id,
                      )}
                    >
                      {x.contactName}
                    </DataTableLink>
                  }
                  subtitle={[
                    x.journalistName,
                    fr.activations.priorities[x.priority],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </DataTableCell>
              <DataTableCell>
                {last ? (
                  <StatusBadge
                    size="sm"
                    tone={activationMessageTone[last.status]}
                  >
                    {fr.activationWork.messages.statuses[last.status]}
                  </StatusBadge>
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {opportunity
                  ? fr.activationPress.opportunities.statuses[
                      opportunity.status as keyof typeof fr.activationPress.opportunities.statuses
                    ]
                  : EMPTY_CELL}
              </DataTableCell>
              <DataTableCell fill hideBelow="sm">
                {proof ? (
                  <StatusBadge size="sm" tone={proofTone[proof]}>
                    {fr.activations.proof.states[proof]}
                  </StatusBadge>
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
