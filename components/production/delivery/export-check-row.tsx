import { StatusBadge } from "@/components/ui/status-badge";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import type {
  ExportCheckLine,
  ExportLineState,
} from "@/lib/production/delivery/rules";
import { EXPORT_POINTS } from "@/lib/production/delivery/points";
import { formatDate } from "@/lib/release/format";
import { exportCheckTone } from "@/lib/ui/state-tones";

import { ExportCheckActions } from "./export-check-actions";
import { ExportFilesHistory } from "./export-files-history";

const fr = { productionDelivery, productionClosure };

const t = fr.productionDelivery.checklist;
const p = fr.productionClosure.points;

/** One expected file: what is expected of it, its link and the files
 * deposited before, its check point by point (who, when, why not
 * conforming) and, for the owner, the actions. */
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
  const total = EXPORT_POINTS[line.kind].length;
  const failed = line.points.filter((point) => point.result === "not_ok");
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium break-words">{line.label}</h3>
          <StatusBadge size="sm" tone={exportCheckTone[state]}>
            {t.states[state]}
          </StatusBadge>
        </div>
        {line.spec && <p className="text-sm break-words">{line.spec}</p>}
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
        {failed.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-sm">
            {failed.map((point) => (
              <li key={point.key} className="break-words">
                {p.failed(p.labels[point.key] ?? point.key, point.note)}
              </li>
            ))}
          </ul>
        ) : (
          line.note && <p className="text-sm break-words">« {line.note} »</p>
        )}
        {line.points.length > 0 && line.points.length < total && (
          <p className="text-sm text-muted-foreground">
            {p.progress(line.points.length, total)}
          </p>
        )}
        <ExportFilesHistory files={line.files} />
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
