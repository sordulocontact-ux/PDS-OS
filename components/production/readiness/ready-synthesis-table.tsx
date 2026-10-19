import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { ReadyRow } from "@/lib/production/ready-rows";
import { cn } from "@/lib/utils";

const t = fr.productionReady;

/** The synthesis before the shoot (proto synTable): each line, its value
 * as read, « Prêt » or « Pas prêt ». The same live and frozen. */
export function ReadySynthesisTable({
  rows,
  actions = {},
}: {
  rows: ReadyRow[];
  // A row's own gesture, by its key (« Changer la date et les horaires »),
  // on the live synthesis only.
  actions?: Record<string, React.ReactNode>;
}) {
  return (
    <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
      {rows.map((r) => (
        <li
          key={r.key}
          className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
            <b className="font-semibold">{r.label}</b>
            <span
              className={cn(
                r.ok
                  ? "text-[color:var(--text-secondary)]"
                  : "text-[color:var(--tone-danger-fg)]",
              )}
            >
              {r.value}
            </span>
            {actions[r.key] && <span className="mt-2">{actions[r.key]}</span>}
          </span>
          <StatusBadge size="sm" tone={r.ok ? "success" : "danger"}>
            {r.ok ? t.ready : t.notReady}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
