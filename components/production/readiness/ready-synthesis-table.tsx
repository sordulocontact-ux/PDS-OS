import { StatusBadge } from "@/components/ui/status-badge";
import { productionReady } from "@/lib/i18n/fr/production-ready";
import type { ReadyRow } from "@/lib/production/ready-rows";
import { cn } from "@/lib/utils";

const fr = { productionReady };

const t = fr.productionReady;

/** The synthesis before the shoot (proto synTable): each line, its
 * severity (« Critique » or « Mineur », recette 23/10), its value as read,
 * « Prêt » or « Pas prêt ». The same live and frozen. */
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
            <span className="flex flex-wrap items-baseline gap-x-2">
              <b className="font-semibold">{r.label}</b>
              <span className="text-sm text-[color:var(--text-tertiary)]">
                {r.critical ? t.critical : t.minor}
              </span>
            </span>
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
