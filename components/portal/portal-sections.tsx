import { portal } from "@/lib/i18n/fr/portal";

import {
  PortalCard,
  type PortalAction,
  type PortalCardState,
} from "./portal-card";

const fr = { portal };

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
  // A call the person is invited to: sorted with what is « À vous », but
  // not an action (its pill says « Invité »).
  invite?: boolean;
  badge?: string;
  // The gesture of the moment, framed like a step's lead (lot 6 of Ibé's
  // feedback): « À vous » in selection, the gesture first in its body.
  lead?: boolean;
  body?: React.ReactNode;
};

// The order of the intertitles (shell.md E10): the framing's calls, then
// Master, Juridique, Marketing, Distribution.
const WORKFLOW_ORDER = Object.keys(t.workflows);
const rank = (w: PortalCardItem["workflow"]) =>
  w ? WORKFLOW_ORDER.indexOf(w) : -1;

const byDue = (a: PortalCardItem, b: PortalCardItem) =>
  (a.dueKey ?? "9999").localeCompare(b.dueKey ?? "9999") || b.order - a.order;
// The journey reversed: the newest step on top; acting never moves a card.
const byJourney = (a: PortalCardItem, b: PortalCardItem) => b.order - a.order;

/**
 * The cards of a private page, sorted (proto portalCards): « À vous » by
 * deadline, then « En attente de PDS », then « Fait · n » folded. Several
 * actions: a summary on top (« action · échéance · Étape » + « Voir »).
 * Cards of several workflows (or `grouped`): one intertitle per workflow.
 */
export function PortalSections({
  cards,
  grouped = false,
}: {
  cards: PortalCardItem[];
  // The person's page by project: one intertitle per workflow, even alone.
  grouped?: boolean;
}) {
  const todo = cards.filter((c) => c.state === "todo" && !c.invite).sort(byDue);
  const workflows = [...new Set(cards.map((c) => c.workflow))].sort(
    (a, b) => rank(a) - rank(b),
  );
  return (
    <>
      {todo.length > 1 && (
        <ul className="flex flex-col gap-2">
          {todo.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 modern:py-2"
            >
              <span className="min-w-0 flex-1">
                <b className="font-semibold">{c.action?.label ?? c.title}</b>
                {c.action?.due && ` · ${t.due(c.action.due)}`}
                <span className="text-muted-foreground"> · {c.title}</span>
              </span>
              <a
                href={`#${c.id}`}
                className="rounded-full px-3 py-1 text-body-sm font-medium hover:bg-[var(--control-bg-hover)] modern:rounded-lg"
              >
                {t.see}
              </a>
            </li>
          ))}
        </ul>
      )}
      {workflows.map((w) => (
        <div key={w ?? "one"} className="flex flex-col gap-[18px] modern:gap-4">
          {(grouped || workflows.length > 1) && w && (
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
      badge={c.badge}
      action={c.action}
      lead={c.lead}
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
 * is « À vous », else « Votre prochain rendez-vous avec PDS » when invited
 * to a call, else « Rien à faire pour l'instant ». */
export function portalTitle(cards: PortalCardItem[]): string {
  if (cards.some((c) => c.state === "todo" && !c.invite))
    return t.headings.todo;
  return cards.some((c) => c.invite) ? t.headings.invited : t.headings.idle;
}
