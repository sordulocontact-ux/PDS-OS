import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import {
  canMarkReady,
  openChecks,
  type CheckRow,
} from "@/lib/production/preprod/readiness";
import type { CheckKey } from "@/lib/production/preprod/types";
import { formatDate } from "@/lib/release/format";
import { readinessTone } from "@/lib/ui/state-tones";

import { MarkReadyButton, ReadinessActions } from "./readiness-actions";

const t = fr.productionPreprod.readiness;

/**
 * « Contrôle avant tournage »: each prerequisite, what the code knows of it
 * (shown, never a confirmation), who confirmed it and when; « Marquer prête
 * pour tournage » once no required check is open.
 */
export function ReadinessSection({
  projectId,
  sheetId,
  rows,
  evidence,
  readyAt,
  readyBy,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  rows: CheckRow[];
  evidence: Record<CheckKey, string>;
  readyAt: string | null;
  readyBy: string | null;
  canOrganize: boolean;
}) {
  const open = openChecks(rows);
  return (
    <PageSection
      id="readiness"
      title={t.title}
      description={t.description}
      card
    >
      <div className="flex flex-col gap-6">
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-start justify-between gap-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {t.checks[row.key]}
                  </span>
                  <StatusBadge tone={readinessTone[row.state]} size="sm">
                    {t.states[row.state]}
                  </StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {evidence[row.key]}
                </p>
                {row.confirmedBy && row.confirmedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t.confirmedBy(
                      row.confirmedBy,
                      formatDate(row.confirmedAt),
                    )}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                )}
              </div>
              {canOrganize && (
                <ReadinessActions
                  projectId={projectId}
                  sheetId={sheetId}
                  row={row}
                />
              )}
            </li>
          ))}
        </ul>
        {readyAt ? (
          <ToneCallout tone="success">
            {t.readyBy(readyBy ?? "—", formatDate(readyAt))}
          </ToneCallout>
        ) : canMarkReady(rows) ? (
          canOrganize && (
            <div>
              <MarkReadyButton projectId={projectId} sheetId={sheetId} />
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">{t.openLeft(open)}</p>
        )}
      </div>
    </PageSection>
  );
}
