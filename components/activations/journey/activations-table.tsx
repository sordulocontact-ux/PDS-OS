import { EmptyNote } from "@/components/shell/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  DataTableViews,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { PhaseStrip } from "@/components/ui/phase-strip";
import {
  ACTIVATION_FILTERS,
  type ActivationFilter,
  activationSentence,
  filtersOf,
} from "@/lib/activations/journey";
import { phaseLabel, phaseOf } from "@/lib/activations/phase";
import type { ActivationSummary } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activations } from "@/lib/i18n/fr/activations";
import { viewHref } from "@/lib/ui/view-href";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";

const fr = { activations, activationJourney };

const t = fr.activationJourney;

export type ActivationRow = ActivationSummary & { ownerName: string | null };

/**
 * The activations of the project as a table (Sacha 10/11/2026), its views
 * as tabs with their counts — « À moi », « En cours », « À mesurer », «
 * Terminées » —, filter, count and rows read from the same state (ACT-003).
 * Sober columns, never the 9 removed on 18/10: the activation with what it
 * waits for (« À vous · … » in blue), its kind and mode, its owner, its due
 * date, its frieze. A row opens the activation's page. `action`: « Nouvelle
 * activation », at the end of the tabs.
 */
export function ActivationsTable({
  projectId,
  rows,
  filter,
  action,
}: {
  projectId: string;
  rows: ActivationRow[];
  filter: ActivationFilter;
  action?: React.ReactNode;
}) {
  const shown = rows.filter((a) => filtersOf(a, a.actions).includes(filter));
  return (
    <DataTableViews
      label={t.filters.label}
      views={ACTIVATION_FILTERS.map((f) => ({
        label: t.filters[f],
        count: rows.filter((a) => filtersOf(a, a.actions).includes(f)).length,
        current: f === filter,
        href: viewHref(routes.projectActivations(projectId), {
          vue: f === "open" ? null : f,
        }),
      }))}
      action={action}
    >
      {shown.length === 0 ? (
        <EmptyNote>{t.noneHere}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.table.activation}</DataTableHead>
            <DataTableHead hideBelow="md">{t.table.kind}</DataTableHead>
            <DataTableHead hideBelow="lg">{t.table.owner}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.table.due}</DataTableHead>
            <DataTableHead hideBelow="md">{t.table.phase}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {shown.map((a) => (
              <Row key={a.id} projectId={projectId} a={a} />
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </DataTableViews>
  );
}

function Row({ projectId, a }: { projectId: string; a: ActivationRow }) {
  const sentence = activationSentence(
    { ...a, waitsFor: a.waitsFor, closedFigure: a.lastFigure },
    a.actions,
  );
  return (
    <DataTableRow>
      <DataTableCell fill className="whitespace-normal">
        <span className="flex min-w-0 flex-col gap-0.5">
          <DataTableLink href={routes.projectActivation(projectId, a.id)}>
            {a.title}
          </DataTableLink>
          <span
            className={cn(
              "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]",
              sentence.mine
                ? "font-semibold text-[color:var(--selection)]"
                : "text-[color:var(--text-tertiary)]",
            )}
          >
            {sentence.text}
          </span>
        </span>
      </DataTableCell>
      <DataTableCell
        hideBelow="md"
        className="text-[color:var(--text-secondary)]"
      >
        {[fr.activations.kinds[a.kind], a.mode && fr.activations.modes[a.mode]]
          .filter(Boolean)
          .join(" · ")}
      </DataTableCell>
      <DataTableCell
        hideBelow="lg"
        className={cn(!a.ownerName && "text-[color:var(--text-tertiary)]")}
      >
        {a.ownerName ?? t.table.ownerToAppoint}
      </DataTableCell>
      <DataTableCell hideBelow="sm" className="tabular-nums">
        {a.dueOn ? formatDay(a.dueOn) : EMPTY_CELL}
      </DataTableCell>
      <DataTableCell hideBelow="md">
        <PhaseStrip
          phases={t.phases}
          current={Math.min(phaseOf(a), t.phases.length)}
          label={phaseLabel(a)}
        />
      </DataTableCell>
    </DataTableRow>
  );
}
