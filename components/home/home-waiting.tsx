import { CardRow, ListCard } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { WaitingItem } from "@/lib/home/feed";
import { journey } from "@/lib/i18n/fr/journey";
import { shell } from "@/lib/i18n/fr/shell";
import { work } from "@/lib/i18n/fr/work";
import { lowerFirst } from "@/lib/ui/journey";
import { overdueTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { journey, shell, work };

const MAX = 4;

/** « En attente de Karim Haddou (lien privé) : déposer le Mix V2 ». */
function waitingLine(item: WaitingItem): string {
  const who = item.who
    ? `${fr.journey.now.waitFor(item.who)}${
        item.viaLink ? ` (${fr.journey.privateLink})` : ""
      }`
    : fr.shell.home.waiting.nobody;
  return `${who} : ${lowerFirst(item.todo)}`;
}

/**
 * « Ce que vous attendez » (proto `docs/protos/accueil.html`): who the
 * viewer waits for, on what, in which project and for when, the late ones
 * first; each row opens the step. Four rows, then how many more: the
 * overview of each project says the rest.
 */
export function HomeWaiting({ items }: { items: WaitingItem[] }) {
  if (items.length === 0) return null;
  const t = fr.shell.home.waiting;
  return (
    <ListCard title={t.title} count={items.length}>
      {items.slice(0, MAX).map((item) => (
        <CardRow
          key={item.key}
          href={item.href}
          main={waitingLine(item)}
          sub={[
            item.projectTitle,
            item.place,
            item.due ? fr.work.lead.due(formatDay(item.due)) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          badge={
            item.overdue ? (
              <StatusBadge tone={overdueTone} size="sm">
                {fr.work.journeys.overdue}
              </StatusBadge>
            ) : undefined
          }
        />
      ))}
      {items.length > MAX && (
        <li className="text-caption text-[color:var(--text-secondary)]">
          {t.more(items.length - MAX)}
        </li>
      )}
    </ListCard>
  );
}
