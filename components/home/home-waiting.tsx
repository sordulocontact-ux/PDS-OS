import {
  HomeAvatar,
  HomeListNote,
  HomeRow,
  HomeRowText,
  HomeSection,
} from "@/components/home/home-list";
import { initials } from "@/components/shell/journey/step-waiting";
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

/** « En attente de **Karim Haddou** (lien privé) : déposer le Mix V2 ». */
function WaitingLine({ item }: { item: WaitingItem }) {
  const todo = ` : ${lowerFirst(item.todo)}`;
  if (!item.who)
    return (
      <>
        {fr.shell.home.waiting.nobody}
        {todo}
      </>
    );
  return (
    <>
      {fr.journey.now.waitingOfName(item.who)}
      <b className="font-semibold">{item.who}</b>
      {item.viaLink && ` (${fr.journey.privateLink})`}
      {todo}
    </>
  );
}

/**
 * « Ce que vous attendez » (proto `docs/protos/accueil.html`): who the
 * viewer waits for (their initials), on what, in which project and for
 * when, the late ones first; each row opens the step. Four rows, then how
 * many more: the overview of each project says the rest.
 */
export function HomeWaiting({ items }: { items: WaitingItem[] }) {
  if (items.length === 0) return null;
  const t = fr.shell.home.waiting;
  return (
    <HomeSection title={t.title} count={items.length}>
      {items.slice(0, MAX).map((item) => (
        <HomeRow
          key={item.key}
          href={item.href}
          leading={
            <HomeAvatar initials={item.who ? initials(item.who) : "?"} />
          }
          badges={
            item.overdue ? (
              <StatusBadge tone={overdueTone} size="sm">
                {fr.work.journeys.overdue}
              </StatusBadge>
            ) : undefined
          }
        >
          <HomeRowText
            main={<WaitingLine item={item} />}
            sub={[
              item.projectTitle,
              item.place,
              item.due ? fr.work.lead.due(formatDay(item.due)) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        </HomeRow>
      ))}
      {items.length > MAX && (
        <HomeListNote>{t.more(items.length - MAX)}</HomeListNote>
      )}
    </HomeSection>
  );
}
