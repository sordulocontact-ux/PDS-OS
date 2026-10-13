import { IconChevronDown } from "nucleo-sharp-essential";

import { RemoveDeliverableButton } from "@/components/design/remove-deliverable-button";
import { buttonVariants } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import type { ConceptionDeliverable } from "@/lib/design/conception";
import type { SheetSummary } from "@/lib/design/sheet-summaries";
import { DESIGN_TOPICS } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { conceptionDeliverableTone } from "@/lib/ui/state-tones";

/**
 * One deliverable of the Conception's entry, folded to a line (title,
 * lever, due date, how many intentions are set) and unfolded on demand:
 * provenance, timing, owner, the way into its work. Native <details>: no
 * JavaScript, keyboard and screen readers for free.
 */
export function ConceptionDeliverableRow({
  projectId,
  deliverable: d,
  sheet,
  canWork,
  canRemove,
}: {
  projectId: string;
  deliverable: ConceptionDeliverable;
  // Its Fiche Livrable, once created.
  sheet: SheetSummary | null;
  // The work is open: the row leads into it.
  canWork: boolean;
  // A need still to qualify, the owner may take it back.
  canRemove: boolean;
}) {
  const t = fr.conception.deliverables;
  const due = d.dueDate ? formatDay(d.dueDate) : null;
  const conceptionDue = d.upstream.find((s) => s.key === "conception");
  const facts = [
    {
      label: t.provenance,
      value:
        d.origin === "strategy_decision" && d.leverLabel
          ? `${fr.conception.origins[d.origin]} · ${fr.conception.originDetails.strategy_decision(d.leverLabel)}`
          : d.origin === "call" && d.callTitle
            ? `${fr.conception.origins[d.origin]} · ${fr.conception.originDetails.call(d.callTitle)}`
            : fr.conception.origins[d.origin],
    },
    d.origin === "strategy" && { label: t.lever, value: d.leverLabel },
    d.status === "confirmed" && { label: t.due, value: due ?? t.noDue },
    d.milestone && {
      label: t.milestone,
      value: `${d.milestone.title} · ${formatDay(d.milestone.date)}`,
    },
    conceptionDue && {
      label: t.conceptionDue,
      value: formatDay(conceptionDue.date),
    },
    d.status === "confirmed" && {
      label: t.assignee,
      value: d.assigneeName ?? t.noAssignee,
    },
    d.note && { label: t.note, value: d.note },
  ].filter((fact) => fact && fact.value) as Array<{
    label: string;
    value: string;
  }>;

  return (
    <details className="group rounded-xl border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-md font-medium break-words">
            {d.title}
          </span>
          <span className="text-caption text-muted-foreground">
            {[
              d.leverLabel,
              d.status === "confirmed" ? (due ?? t.noDue) : null,
              t.answered(d.answered + d.inherited, DESIGN_TOPICS.length),
              d.inherited > 0 ? t.inherited(d.inherited) : null,
              d.proposals > 0 ? t.proposals(d.proposals) : null,
              sheet ? t.sheet(fr.conception.sheetStatuses[sheet.status]) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {d.status === "to_qualify" && (
          <StatusBadge tone={conceptionDeliverableTone[d.status]} size="sm">
            {fr.conception.statuses[d.status]}
          </StatusBadge>
        )}
        <IconChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
        {/* Inside the entry's section card: no frame of its own. */}
        <FactList facts={facts} />
        {(canWork || canRemove || sheet) && (
          <div className="flex flex-wrap gap-2">
            {canWork && (
              <ViewLink
                href={routes.projectDesignWork(projectId, d.id)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t.open}
              </ViewLink>
            )}
            {sheet && (
              <ViewLink
                href={routes.projectDesignSheet(projectId, sheet.id)}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t.openSheet}
              </ViewLink>
            )}
            {canRemove && (
              <RemoveDeliverableButton
                projectId={projectId}
                deliverableId={d.id}
              />
            )}
          </div>
        )}
      </div>
    </details>
  );
}
