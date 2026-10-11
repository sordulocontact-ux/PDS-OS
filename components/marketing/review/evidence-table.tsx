import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { Evidence } from "@/lib/marketing/model";
import { formatLongDay } from "@/lib/project-history/format";
import { evidenceVerificationTone } from "@/lib/ui/state-tones";

const t = fr.marketingReview.dashboard.detail;
const ev = fr.marketing.evidence;

/**
 * Evidence with its activation, level and provenance (who declared it, when
 * it was observed, entered, verified): the detail of a dashboard figure and
 * the annexes of a report. `activationHref` null: plain text (a report).
 */
export function EvidenceTable({
  evidence,
  titleOf,
  activationHref,
}: {
  evidence: Evidence[];
  titleOf: (activationId: string) => string;
  activationHref: ((activationId: string) => string) | null;
}) {
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.activation}</DataTableHead>
        <DataTableHead fill>{t.evidence}</DataTableHead>
        <DataTableHead>{t.level}</DataTableHead>
        <DataTableHead hideBelow="md">{t.provenance}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {evidence.map((e) => (
          <DataTableRow key={e.id}>
            <DataTableCell>
              {activationHref ? (
                <DataTableLink href={activationHref(e.activationId)}>
                  {titleOf(e.activationId)}
                </DataTableLink>
              ) : (
                titleOf(e.activationId)
              )}
            </DataTableCell>
            <DataTableCell fill>
              {e.url ? (
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 break-words hover:underline"
                >
                  {e.label}
                </a>
              ) : (
                <span className="break-words">{e.label}</span>
              )}
              <span className="block text-caption text-muted-foreground tabular-nums">
                {[
                  ev.sections[e.kind],
                  e.kind === "statistic" &&
                    (e.value === null ? ev.unavailableValue : String(e.value)),
                  e.metric,
                  e.kind === "publication" && !e.url && ev.noLink,
                  e.linkUnreachableAt && ev.linkUnreachable,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </DataTableCell>
            <DataTableCell>
              <StatusBadge
                tone={evidenceVerificationTone[e.verification]}
                size="sm"
              >
                {ev.verifications[e.verification]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell hideBelow="md">
              <span className="text-caption text-muted-foreground">
                {[
                  e.reportedBy && ev.provenance.reportedBy(e.reportedBy),
                  e.observedOn &&
                    ev.provenance.observedOn(formatBriefDate(e.observedOn)),
                  ev.provenance.importedOn(formatLongDay(e.createdAt)),
                  e.verifiedAt &&
                    ev.provenance.verified(
                      e.verifiedByName,
                      formatLongDay(e.verifiedAt),
                    ),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
