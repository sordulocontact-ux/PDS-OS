import { rowBadge, titleOf, whereOf } from "@/components/work/work-row";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { work } from "@/lib/i18n/fr/work";
import { overdueTone } from "@/lib/ui/state-tones";
import type { WorkRow } from "@/lib/work/rows";

const fr = { shell, work };

// Three rows under « Maintenant »; the rest is in Travail, one click away.
const MAX = 3;

/**
 * « Aussi à vous » (proto `docs/protos/accueil.html`): the viewer's moves
 * after the one in « Maintenant », in the Travail's order; each row opens
 * its gesture. Nothing when « Maintenant » holds the only one.
 */
export function HomeAlso({ rows }: { rows: WorkRow[] }) {
  if (rows.length === 0) return null;
  const t = fr.shell.home;
  return (
    <ListCard
      title={t.also}
      count={rows.length}
      action={
        rows.length > MAX ? { label: t.allWork, href: routes.work } : undefined
      }
    >
      {rows.slice(0, MAX).map((row) => {
        const badge = rowBadge(row);
        return (
          <CardRow
            key={row.key}
            href={row.href}
            main={titleOf(row)}
            sub={whereOf(row)}
            badge={
              row.overdue || badge ? (
                <span className="flex flex-wrap justify-end gap-1.5">
                  {row.overdue && (
                    <StatusBadge tone={overdueTone} size="sm">
                      {fr.work.journeys.overdue}
                    </StatusBadge>
                  )}
                  {badge}
                </span>
              ) : undefined
            }
          />
        );
      })}
      {rows.length > MAX && (
        <li className="text-caption text-[color:var(--text-secondary)]">
          {t.moreInWork(rows.length - MAX)}
        </li>
      )}
    </ListCard>
  );
}
