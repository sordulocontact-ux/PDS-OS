import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LeverBoard } from "@/lib/activations/levers";
import { kindHasMode } from "@/lib/activations/model";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activations } from "@/lib/i18n/fr/activations";

import { LeverRowActions } from "./lever-row-actions";

const fr = { activations, activationJourney };

const t = fr.activationJourney.banner;

/**
 * The levers of the Brief de sortie still to turn into activations, above
 * the table (Sacha 10/11/2026: « une frame avec le titre au-dessus », a
 * table on its card like the others). Its source said once in the title's
 * line; one row per lever — its name, its kind, the owner's gestures (mode
 * for Influence and RP, « Créer l'activation », « Plus tard »), « À
 * préparer » for the others. A lever turned into an activation leaves the
 * card for the table below. Open while one waits, folded when only levers
 * kept for later remain, gone when every lever has its activation. `#levers`
 * is where « Maintenant » and Travail send.
 */
export function LeversCard({
  projectId,
  levers,
  canCreate,
}: {
  projectId: string;
  levers: LeverBoard;
  canCreate: boolean;
}) {
  const todo = levers.items.filter((l) => l.state === "proposed");
  const later = levers.items.filter((l) => l.state === "later");
  const version = levers.briefVersion;
  if (version === null || (!todo.length && !later.length)) return null;
  return (
    <PageSection
      id="levers"
      title={t.title}
      description={
        todo.length > 0
          ? t.toTransform(todo.length, version)
          : t.kept(later.length, version)
      }
      card
      collapsible
      defaultOpen={todo.length > 0}
    >
      <DataTable>
        <DataTableHeader>
          <DataTableHead fill>{t.columns.lever}</DataTableHead>
          <DataTableHead hideBelow="sm">{t.columns.kind}</DataTableHead>
          <DataTableHead className="w-px" align="end">
            <span className="sr-only">{t.create}</span>
          </DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {[...todo, ...later].map((l) => (
            <DataTableRow key={l.leverId}>
              <DataTableCell fill className="break-words whitespace-normal">
                {l.label}
              </DataTableCell>
              <DataTableCell
                hideBelow="sm"
                className="text-[color:var(--text-secondary)]"
              >
                {fr.activations.kinds[l.kind]}
              </DataTableCell>
              <DataTableCell align="end" className="w-px whitespace-nowrap">
                {canCreate ? (
                  <span className="flex items-center justify-end gap-2">
                    {l.state === "later" && (
                      <StatusBadge tone="neutral" size="sm">
                        {t.later}
                      </StatusBadge>
                    )}
                    <LeverRowActions
                      projectId={projectId}
                      leverId={l.leverId}
                      withMode={kindHasMode(l.kind) && l.state !== "later"}
                      later={l.state === "later"}
                    />
                  </span>
                ) : (
                  <StatusBadge tone="warning" size="sm">
                    {l.state === "later" ? t.later : t.toPrepare}
                  </StatusBadge>
                )}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </PageSection>
  );
}
