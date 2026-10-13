import { Lines, Part } from "@/components/design/brief/brief-part";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CreativeBriefContent } from "@/lib/design/brief";
import {
  intentionLine,
  sheetItemLines,
  sheetLine,
} from "@/lib/design/brief-text";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { conceptionDeliverableTone } from "@/lib/ui/state-tones";

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="text-caption text-muted-foreground">{children}</p>
);

/**
 * The deliverables of the Brief créatif: each one's concept, its Fiche
 * Livrable (responsible, validators, date, a series' contents — MKT-C2-12),
 * the proposal retained and what it inherits; then the needs still to
 * qualify, left out of the dossier.
 */
export function BriefDeliverablesPart({
  deliverables,
  excluded,
}: {
  deliverables: CreativeBriefContent["deliverables"];
  excluded: string[];
}) {
  const t = fr.conceptionDirection.brief;
  return (
    <Part name="deliverables" empty={!deliverables.length && !excluded.length}>
      <ul className="flex flex-col gap-3">
        {deliverables.map((d, index) => (
          <li key={`${index}-${d.title}`} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{d.title}</span>
              <StatusBadge tone={conceptionDeliverableTone[d.status]} size="sm">
                {t.deliverableStatus[d.status]}
              </StatusBadge>
            </div>
            {d.sheet && <Note>{sheetLine(d.sheet)}</Note>}
            {d.intentions.length > 0 && (
              <Lines items={d.intentions.map(intentionLine)} />
            )}
            {d.sheet && d.sheet.kind === "series" && (
              <Lines items={sheetItemLines(d.sheet)} />
            )}
            {d.retained && (
              <Note>
                {t.retained(
                  d.retained.number,
                  d.retained.approvedOn
                    ? formatBriefDate(d.retained.approvedOn)
                    : null,
                  d.retained.total,
                )}
              </Note>
            )}
            {d.inherits && d.inherits.length > 0 && (
              <Note>
                {t.inherits(
                  d.inherits
                    .map((x) => fr.conception.directionTopics[x])
                    .join(", "),
                )}
              </Note>
            )}
          </li>
        ))}
      </ul>
      {excluded.length > 0 && (
        <div className="flex flex-col gap-1">
          <Note>{t.document.excluded}</Note>
          <Lines items={excluded} />
        </div>
      )}
    </Part>
  );
}
