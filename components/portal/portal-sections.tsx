import { fr } from "@/lib/i18n/fr";

import {
  PortalCard,
  type PortalAction,
  type PortalCardState,
} from "./portal-card";

const t = fr.portal;

/** A card of a private page, from any workflow (the page by person of lot
 * 11 gathers several). `order`: its place in the journey; `dueKey`: the
 * ISO day of its deadline, to sort what is « À vous ». */
export type PortalCardItem = {
  id: string;
  title: string;
  state: PortalCardState;
  action?: PortalAction | null;
  dueKey?: string | null;
  order: number;
  workflow?: keyof typeof t.workflows;
  body?: React.ReactNode;
};

const byDue = (a: PortalCardItem, b: PortalCardItem) =>
  (a.dueKey ?? "9999").localeCompare(b.dueKey ?? "9999") || b.order - a.order;
// The journey reversed: the newest step on top; acting never moves a card.
const byJourney = (a: PortalCardItem, b: PortalCardItem) => b.order - a.order;

/**
 * The cards of a private page, sorted (proto portalCards): « À vous » by
 * deadline, then « En attente de PDS », then « Fait · n » folded. Several
 * actions: a summary on top (« action · échéance · Étape » + « Voir »).
 * Cards of several workflows: one intertitle per workflow.
 */
export function PortalSections({ cards }: { cards: PortalCardItem[] }) {
  const todo = cards.filter((c) => c.state === "todo").sort(byDue);
  const workflows = [...new Set(cards.map((c) => c.workflow))];
  return (
    <>
      {todo.length > 1 && (
        <ul className="flex flex-col gap-2">
          {todo.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <b className="font-semibold">{c.action?.label ?? c.title}</b>
                {c.action?.due && ` · ${t.due(c.action.due)}`}
                <span className="text-muted-foreground"> · {c.title}</span>
              </span>
              <a
                href={`#${c.id}`}
                className="rounded-full px-3 py-1 text-body-sm font-medium hover:bg-[var(--control-bg-hover)]"
              >
                {t.see}
              </a>
            </li>
          ))}
        </ul>
      )}
      {workflows.map((w) => (
        <div key={w ?? "one"} className="flex flex-col gap-[18px]">
          {workflows.length > 1 && w && (
            <GroupTitle>{t.workflows[w]}</GroupTitle>
          )}
          <Groups cards={cards.filter((c) => c.workflow === w)} />
        </div>
      ))}
    </>
  );
}

function Groups({ cards }: { cards: PortalCardItem[] }) {
  const todo = cards.filter((c) => c.state === "todo").sort(byDue);
  const waiting = cards.filter((c) => c.state === "waiting").sort(byJourney);
  const done = cards.filter((c) => c.state === "done").sort(byJourney);
  const card = (c: PortalCardItem) => (
    <PortalCard
      key={c.id}
      id={c.id}
      title={c.title}
      state={c.state}
      action={c.action}
    >
      {c.body}
    </PortalCard>
  );
  return (
    <>
      {todo.map(card)}
      {waiting.length > 0 && <GroupTitle>{t.waiting}</GroupTitle>}
      {waiting.map(card)}
      {done.length > 0 && (
        <details className="group/done">
          <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <GroupTitle>{t.done(done.length)}</GroupTitle>
            <span
              aria-hidden
              className="mt-1 size-2 rotate-[-45deg] border-r-2 border-b-2 border-[color:var(--text-tertiary)] transition-transform group-open/done:rotate-45"
            />
          </summary>
          <div className="mt-3 flex flex-col gap-4">{done.map(card)}</div>
        </details>
      )}
    </>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 text-body-sm font-semibold text-[color:var(--text-tertiary)]">
      {children}
    </h2>
  );
}

/** The title of a private page: « Ce que PDS attend de vous » when a card
 * is « À vous », else « Rien à faire pour l'instant ». */
export function portalTitle(cards: PortalCardItem[]): string {
  return cards.some((c) => c.state === "todo")
    ? t.headings.todo
    : t.headings.idle;
}
