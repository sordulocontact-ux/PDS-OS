import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import type { Clearance } from "@/lib/legal/clearance/types";
import { formatInstant } from "@/lib/utils/instant";

const fr = { legalClearance };

/** « Historique » : every change, who and when, never rewritten. */
export function HistoryTab({ clearance }: { clearance: Clearance }) {
  const t = fr.legalClearance;
  if (clearance.history.length === 0)
    return <p className="text-sm text-muted-foreground">{t.history.empty}</p>;
  return (
    <ul className="flex flex-col divide-y">
      {clearance.history.map((e) => (
        <li key={e.id} className="flex flex-col gap-0.5 py-2">
          <span className="font-medium">
            {t.events[e.kind] ?? e.kind}
            {e.to && ` · ${t.statuses[e.to] ?? e.to}`}
          </span>
          <span className="text-sm text-muted-foreground">
            {[e.by, formatInstant(e.at)].filter(Boolean).join(" · ")}
          </span>
          {e.note && <span className="text-sm break-words">{e.note}</span>}
        </li>
      ))}
    </ul>
  );
}
