import Link from "next/link";

import { DelegateButton } from "@/components/legal/tracking/delegate-button";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { lineOf } from "@/lib/legal/plan/groups";
import { legalActionHref, legalActionLabel } from "@/lib/legal/plan/where";
import type { TrackedItem } from "@/lib/legal/tracking/state";
import { formatDate } from "@/lib/release/format";
import { planItemTone, type Tone } from "@/lib/ui/state-tones";

// A refusal or a rejection is a block; a missed due date or a decision
// awaited waits for someone's action; otherwise the item state's tone.
function toneOf(item: TrackedItem): Tone {
  if (item.overdue) return "warning";
  if (item.group === "decision")
    return item.current === "waiting_external" ? "warning" : "danger";
  return planItemTone[item.current];
}

/** One action of the Suivi, in its group: its subject, where it stands,
 * its source and its delegation. */
export function TrackedRow({
  projectId,
  item,
  line,
  ownAction,
  people,
}: {
  projectId: string;
  item: TrackedItem;
  line: ReturnType<typeof lineOf>;
  // The group has no single place: this line leads to its own.
  ownAction: boolean;
  people: Array<{ personId: string; name: string }>;
}) {
  const t = fr.legal.tracking;
  const meta = [
    item.responsibleName ?? fr.legal.plan.noResponsible,
    item.dueOn
      ? item.overdue
        ? t.overdue(formatDate(item.dueOn))
        : t.due(formatDate(item.dueOn))
      : null,
    item.since ? t.since(formatDate(item.since)) : null,
  ].filter(Boolean);
  const finished = item.current === "done" || item.current === "obsolete";
  // A line points at its precise source (that contract, that title) when
  // it has one; the group's button leads to the list.
  const href = ownAction
    ? legalActionHref(projectId, item.kind)
    : item.sourceHref !== groupHrefOf(projectId, item)
      ? item.sourceHref
      : null;

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium break-words">{line.title}</span>
        {line.detail && (
          <span className="text-sm break-words text-muted-foreground">
            {line.detail}
          </span>
        )}
        {line.why && (
          <span className="text-sm break-words text-muted-foreground">
            {line.why}
          </span>
        )}
        {line.after.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {fr.legal.plan.after(line.after.join(", "))}
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {meta.join(" · ")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <StatusBadge tone={toneOf(item)}>{item.reason}</StatusBadge>
        {href && !finished && (
          <Button
            variant="outline"
            size="xs"
            nativeButton={false}
            render={<Link href={href} />}
          >
            {ownAction ? legalActionLabel(item.kind) : t.open}
          </Button>
        )}
        {!finished && (
          <DelegateButton
            projectId={projectId}
            itemId={item.id}
            label={item.label}
            responsibleId={item.responsibleId}
            dueOn={item.dueOn}
            people={people}
          />
        )}
      </div>
    </li>
  );
}

const groupHrefOf = (projectId: string, item: TrackedItem) =>
  legalActionHref(projectId, item.kind);
