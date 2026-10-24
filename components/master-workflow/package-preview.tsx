import { EmptyNote } from "@/components/shell/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { FactList } from "@/components/ui/fact-list";
import { BlockerCallout } from "@/components/ui/blocker-callout";
import { fr } from "@/lib/i18n/fr";
import type { StepView } from "@/lib/master-workflow/transmission";
import { formatShortDate } from "@/lib/release/format";

/**
 * What the mix engineer will receive, before it is sent (ticket § 8: "PO
 * montre précisément le package"): the titles to mix with their confirmed
 * source and stems, then what the brief asks. What blocks the sending comes
 * first.
 */
export function PackagePreview({ view }: { view: StepView }) {
  const t = fr.masterWorkflow.mix;
  const p = t.package;
  const brief = view.brief;
  const date = (value: string | null | undefined) =>
    value ? formatShortDate(value) : null;
  return (
    <div className="grid gap-6">
      <BlockerCallout blockers={view.blockers} title={t.blockers.title} />
      <FactList
        emptyLabel={p.none}
        facts={[
          {
            label: p.to,
            value: view.engineer
              ? [view.engineer.name, view.engineer.email]
                  .filter(Boolean)
                  .join(" · ")
              : null,
          },
          // Every date of the Brief leaves, each with its meaning
          // (PROJ-BUG-07), and the planned release.
          { label: p.mixV1Due, value: date(brief?.dates.mixV1Due) },
          { label: p.mixFinalDue, value: date(brief?.dates.mixFinalDue) },
          { label: p.masteringDue, value: date(brief?.dates.masteringDue) },
          { label: p.masterFinalDue, value: date(brief?.dates.masterFinalDue) },
          { label: p.releaseDue, value: date(view.releaseDue) },
          { label: p.formats, value: brief?.formats ?? null },
          {
            label: p.revisions,
            value: brief?.revisions == null ? null : String(brief.revisions),
          },
          {
            label: p.deliverables,
            value:
              brief?.deliverables
                .map((key) => fr.masterWorkflow.brief.deliverables[key])
                .join(", ") || null,
          },
          { label: p.direction, value: brief?.direction ?? null },
          { label: p.references, value: brief?.references ?? null },
          { label: p.constraints, value: brief?.constraints ?? null },
        ]}
      />
      {view.titles.length === 0 ? (
        <EmptyNote>{t.blockers.noTitle}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{p.titles[view.role]}</DataTableHead>
            <DataTableHead>{p.source[view.role]}</DataTableHead>
            {view.role === "mix" && (
              <DataTableHead hideBelow="sm" align="end">
                {fr.masterWorkflow.inventory.facts.stems}
              </DataTableHead>
            )}
          </DataTableHeader>
          <DataTableBody>
            {view.titles.map((title) => (
              <DataTableRow key={title.id}>
                <DataTableCell fill className="max-w-0">
                  <DataTableMedia
                    title={title.title}
                    subtitle={title.artists}
                  />
                </DataTableCell>
                <DataTableCell className="max-w-64 truncate">
                  {title.source
                    ? `${fr.catalog.audioStates[title.source.audioState]} · ${title.source.fileName}`
                    : p.missing[view.role]}
                </DataTableCell>
                {view.role === "mix" && (
                  <DataTableCell
                    hideBelow="sm"
                    align="end"
                    className="text-[color:var(--text-secondary)]"
                  >
                    {p.stems(title.stems)}
                  </DataTableCell>
                )}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
      <p className="text-caption text-[color:var(--text-secondary)]">
        {p.notSent}
      </p>
    </div>
  );
}
