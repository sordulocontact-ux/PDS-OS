import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ConceptionDeliverable } from "@/lib/design/conception";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

/**
 * Head of a Fiche Livrable: its name and status, then who it is — its
 * identifier, type, project, version, origin and role in the Stratégie.
 */
export function SheetHeader({
  sheet,
  projectTitle,
  deliverable,
  status,
  version,
}: {
  sheet: { id: string; title: string; kind: string; items: number };
  projectTitle: string;
  deliverable: ConceptionDeliverable | null;
  status: SheetStatus;
  // Latest version number, null if never submitted.
  version: number | null;
}) {
  const t = fr.conceptionSheet;
  const origin = deliverable ? fr.conception.origins[deliverable.origin] : null;
  const role = deliverable?.leverLabel
    ? [deliverable.leverLabel, deliverable.milestone?.title]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-display-sm font-semibold break-words">
          {sheet.title}
        </h2>
        <StatusBadge tone={designReviewTone[status]}>
          {fr.conception.sheetStatuses[status]}
        </StatusBadge>
      </div>
      <FactList
        facts={[
          {
            label: t.header.id,
            value: sheet.id.slice(0, 8).toUpperCase(),
            valueClassName: "font-mono",
          },
          {
            label: t.header.type,
            value:
              sheet.kind === "series"
                ? t.kinds.series(sheet.items)
                : t.kinds.single,
          },
          { label: t.header.project, value: projectTitle },
          {
            label: t.header.version,
            value: version
              ? t.header.versionLabel(version)
              : t.header.noVersion,
          },
          { label: t.header.origin, value: origin },
          { label: t.header.role, value: role },
        ]}
        emptyLabel={t.none}
      />
    </header>
  );
}
