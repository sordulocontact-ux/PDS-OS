import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type {
  ExportCheckLine,
  ExportLineState,
} from "@/lib/production/delivery/rules";
import { formatDate } from "@/lib/release/format";
import { exportCheckTone } from "@/lib/ui/state-tones";

import { ExportCheckActions } from "./export-check-actions";

const t = fr.productionDelivery.checklist;

/** One expected file: its link, its check (who, when, why not conforming)
 * and, for the owner, the actions. */
export function ExportCheckRow({
  projectId,
  sheetId,
  line,
  state,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  line: ExportCheckLine;
  state: ExportLineState;
  canOrganize: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium break-words">{line.label}</h3>
          <StatusBadge size="sm" tone={exportCheckTone[state]}>
            {t.states[state]}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.kinds[line.kind]}
          {" · "}
          {line.url ? (
            <a
              href={line.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t.openFile}
            </a>
          ) : (
            t.noFile
          )}
        </p>
        {line.result && line.checkedAt && (
          <p className="text-sm text-muted-foreground">
            {t.checked(
              t.states[line.result],
              line.checkedBy ?? "—",
              formatDate(line.checkedAt),
            )}
          </p>
        )}
        {line.note && <p className="text-sm break-words">« {line.note} »</p>}
      </div>
      {canOrganize && (
        <ExportCheckActions
          projectId={projectId}
          sheetId={sheetId}
          line={line}
          state={state}
        />
      )}
    </li>
  );
}
