import { IconRocket } from "nucleo-sharp-essential";

import { ActivationMenu } from "@/components/marketing/activation-menu";
import { AddActivationButton } from "@/components/marketing/add-activation-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Activation } from "@/lib/marketing/model";
import type { MarketingData } from "@/lib/marketing/queries";
import { activationStatusTone } from "@/lib/ui/state-tones";

const t = fr.marketing.activations;

/**
 * « Suivi des activations » on the Activations page: what the Marketing runs
 * and how much evidence each activation has (verified apart). Archived ones
 * are folded below, never deleted.
 */
export function ActivationsSection({
  projectId,
  data,
}: {
  projectId: string;
  data: MarketingData;
}) {
  const options = {
    members: data.members,
    deliverables: data.deliverables,
    levers: data.levers,
  };
  const active = data.activations.filter((a) => a.archivedAt === null);
  const archived = data.activations.filter((a) => a.archivedAt !== null);
  // Closed: read under control, activations no longer move.
  const canEdit = data.canContribute && !data.marketingClosed;
  const add = canEdit ? (
    <AddActivationButton projectId={projectId} options={options} />
  ) : undefined;

  const table = (rows: Activation[]) => (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.kind}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.owner}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.evidence}</DataTableHead>
        {canEdit && <DataTableActionsHead label={t.edit} />}
      </DataTableHeader>
      <DataTableBody>
        {rows.map((a) => {
          const evidence = data.evidence.filter(
            (e) => e.activationId === a.id && e.archivedAt === null,
          );
          const verified = evidence.filter(
            (e) => e.verification === "verified",
          ).length;
          return (
            <DataTableRow key={a.id}>
              <DataTableCell fill>
                <DataTableLink href={routes.projectActivation(projectId, a.id)}>
                  {a.title}
                </DataTableLink>
              </DataTableCell>
              <DataTableCell hideBelow="md">{t.kinds[a.kind]}</DataTableCell>
              <DataTableCell>
                {a.archivedAt ? (
                  <StatusBadge tone="neutral" size="sm">
                    {t.archivedBadge}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone={activationStatusTone[a.status]} size="sm">
                    {t.statuses[a.status]}
                  </StatusBadge>
                )}
              </DataTableCell>
              <DataTableCell hideBelow="lg">
                {a.ownerName ?? (
                  <span className="text-muted-foreground">
                    {t.fields.noOwner}
                  </span>
                )}
              </DataTableCell>
              <DataTableCell hideBelow="sm" className="tabular-nums">
                {t.evidenceSummary(evidence.length, verified)}
              </DataTableCell>
              {canEdit && (
                <DataTableActionsCell>
                  <ActivationMenu
                    projectId={projectId}
                    activation={a}
                    options={options}
                  />
                </DataTableActionsCell>
              )}
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );

  return (
    <PageSection
      id="tracking"
      title={t.title}
      description={t.description}
      action={active.length > 0 ? add : undefined}
    >
      {active.length === 0 ? (
        <EmptyState
          icon={IconRocket}
          title={t.emptyTitle}
          body={canEdit ? t.emptyBody : t.emptyReadOnly}
          action={add}
        />
      ) : (
        table(active)
      )}
      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            {t.archived(archived.length)}
          </summary>
          <div className="pt-3">{table(archived)}</div>
        </details>
      )}
    </PageSection>
  );
}
