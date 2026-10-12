import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { BriefChange } from "@/lib/strategy/documents/brief-diff";
import { briefChangeTone } from "@/lib/ui/state-tones";

/**
 * « Changements depuis la V… » (MKT-S1-16): what a revision changed in the
 * Brief, item by item, read in the two frozen versions; folded, under the
 * version it describes.
 */
export function BriefVersionChanges({
  previous,
  changes,
}: {
  previous: number;
  changes: BriefChange[];
}) {
  const t = fr.strategyDocuments.changes;
  const dims = fr.strategyPilot.dimensions;
  return (
    <PageSection
      id="brief-changes"
      title={t.title(previous)}
      card
      collapsible
      defaultOpen={changes.length > 0 && changes.length <= 6}
    >
      {changes.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {changes.map((c, index) => (
            <li key={index} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-md font-semibold">
                  {dims[c.dimension]} · {c.label ?? t.main}
                </span>
                <StatusBadge tone={briefChangeTone[c.kind]} size="sm">
                  {t[c.kind]}
                </StatusBadge>
              </div>
              {c.before && (
                <p className="text-body-md whitespace-pre-wrap text-muted-foreground line-through decoration-1">
                  <span className="sr-only">{t.before} : </span>
                  {c.before}
                </p>
              )}
              {c.after && (
                <p className="text-body-md whitespace-pre-wrap">
                  <span className="sr-only">{t.after} : </span>
                  {c.after}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
