import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { fr } from "@/lib/i18n/fr";
import {
  expectedFacts,
  expectedLines,
} from "@/lib/production/delivery/expected";
import {
  lineStateOf,
  type ExportCheckLine,
} from "@/lib/production/delivery/rules";
import type { HandedFiche } from "@/lib/production/fiche";

import { AddExportCheckButton } from "./add-export-check-button";
import { CreateChecklistButton } from "./create-checklist-button";
import { ExportCheckRow } from "./export-check-row";

const t = fr.productionDelivery.checklist;

/**
 * The technical check of the exports (ticket § 19): what the Fiche expects
 * and the points to look at (an aid, never a proof), then one line per
 * expected file, checked conforming or not, separately.
 */
export function ExportChecklistSection({
  projectId,
  sheetId,
  fiche,
  lines,
  since,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  fiche: HandedFiche | null;
  lines: ExportCheckLine[];
  // From when a check counts (lib/production/delivery/rules.ts).
  since: string | null;
  canOrganize: boolean;
}) {
  const facts = expectedFacts(fiche);
  // Proposed while the checklist is empty: a line removed stays removed.
  const proposed = lines.length === 0 ? expectedLines(fiche) : [];

  return (
    <PageSection
      id="exports"
      title={t.title}
      description={t.description}
      action={
        canOrganize && (
          <AddExportCheckButton projectId={projectId} sheetId={sheetId} />
        )
      }
    >
      <div className="flex flex-col gap-4">
        <FactList
          emptyLabel={t.expected.none}
          facts={[
            { label: t.expected.duration, value: facts.duration },
            { label: t.expected.formats, value: facts.formats },
            { label: t.expected.subtitles, value: facts.subtitles },
            { label: t.points.title, value: t.points.items },
          ]}
        />
        <p className="text-sm text-muted-foreground">{t.points.note}</p>

        {lines.length === 0 && proposed.length === 0 && (
          <EmptyNote>{fiche ? t.empty : t.noFiche}</EmptyNote>
        )}
        {proposed.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 text-sm">
            <p>{t.proposed(proposed.length)}</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {proposed.map((line) => (
                <li key={line.label}>{line.label}</li>
              ))}
            </ul>
            {canOrganize && (
              <CreateChecklistButton projectId={projectId} sheetId={sheetId} />
            )}
          </div>
        )}
        {lines.length > 0 && (
          <ul className="flex flex-col gap-2">
            {lines.map((line) => (
              <ExportCheckRow
                key={line.id}
                projectId={projectId}
                sheetId={sheetId}
                line={line}
                state={lineStateOf(line, since)}
                canOrganize={canOrganize}
              />
            ))}
          </ul>
        )}
      </div>
    </PageSection>
  );
}
