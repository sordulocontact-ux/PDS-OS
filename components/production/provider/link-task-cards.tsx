import type { PortalCardItem } from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatShortDay } from "@/lib/utils/day";

import { LinkTaskRow } from "./link-task-row";

const t = fr.productionChecklist;
type Action = LinkJourney["actions"][number];

const metaOf = (a: Action, fallback: string) =>
  [
    a.dueDate ? t.due(formatShortDay(a.dueDate, { bare: true })) : null,
    a.doneAt
      ? t.doneOn(formatShortDay(a.doneAt))
      : t.origin(a.checklist || !a.origin ? fallback : a.origin),
  ]
    .filter(Boolean)
    .join(" · ");

/** The company's tasks as rows with « Fait » (the call's, the checklist's). */
export function LinkTaskList({
  token,
  actions,
  origin,
}: {
  token: string;
  actions: Action[];
  // Where they come from when not said (« Confirmé par PDS après le call »).
  origin: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {actions.map((a) => (
        <LinkTaskRow
          key={a.id}
          token={token}
          id={a.id}
          title={a.title}
          meta={metaOf(a, origin)}
          done={a.doneAt !== null}
          review={a.review}
        />
      ))}
    </ul>
  );
}

/**
 * « Préproduction » on the company's link (proto portal): the checklist it
 * keeps — calls, gear, crew, schedule, and what PDS added —, each « Fait »
 * when done; À vous while one is open.
 */
export function linkChecklistCard(
  token: string,
  j: LinkJourney,
): PortalCardItem | null {
  const list = j.actions.filter((a) => a.checklist || a.origin !== null);
  if (list.length === 0) return null;
  const open = list.filter((a) => a.doneAt === null);
  const next = [...open].sort((a, b) =>
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  )[0];
  return {
    id: "ps-checklist",
    title: t.link.title,
    state: open.length > 0 ? "todo" : "done",
    order: 30,
    action:
      open.length > 0
        ? {
            label: t.link.action(open.length),
            due: next?.dueDate
              ? formatShortDay(next.dueDate, { bare: true })
              : null,
          }
        : null,
    dueKey: next?.dueDate ?? null,
    body: (
      <>
        <p className="text-muted-foreground">{t.link.hint}</p>
        <LinkTaskList
          token={token}
          actions={list}
          origin={t.origins.checklist}
        />
      </>
    ),
  };
}
