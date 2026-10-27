"use client";

import { IconLock } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { MineBadge } from "@/components/ui/mine-badge";
import { StatusDot } from "@/components/ui/status-dot";
import { ViewLink } from "@/components/ui/view-link";
import { shell } from "@/lib/i18n/fr/shell";
import { workflowStatus } from "@/lib/i18n/fr/workflow-status";
import type {
  ProjectSection,
  ProjectSectionGroup,
} from "@/lib/ui/project-sections";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { shell, workflowStatus };

/** What the navigation knows of each entry, computed on the server: its
 * common status (a dot, the Cadrage and the workflows) and the viewer's
 * actions in it (« À vous », from lib/journey/). Keyed by section. */
export type ProjectNavState = {
  statuses?: Partial<Record<string, string>>;
  counts?: Partial<Record<string, number>>;
  // Why a workflow has not started once the plan is launched: left out of
  // it, or in it and waiting to be launched (lib/plan/queries.ts).
  reasons?: Partial<Record<string, NotStartedReason>>;
};

export type NotStartedReason = "absent" | "waiting";

type Block = { group?: ProjectSectionGroup; items: ProjectSection[] };

// Consecutive sections of the same group form one titled block; the
// overview and the Cadrage, ungrouped, stand alone at the top.
function toBlocks(items: ProjectSection[]): Block[] {
  const blocks: Block[] = [];
  for (const item of items) {
    const last = blocks.at(-1);
    if (last && last.group === item.group) last.items.push(item);
    else blocks.push({ group: item.group, items: [item] });
  }
  return blocks;
}

// Proto « Projet complet » (`.pitem`): 38 px, 15 px grey at rest, sunken
// grey and ink when open.
const item =
  "relative flex min-h-9.5 w-full items-center gap-2.5 rounded-lg px-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] no-underline";

/** The status dot of an entry, said in its label; a workflow not started
 * says why (before the plan, left out of it, waiting in it). */
export function NavDot({
  status,
  reason,
}: {
  status: string;
  reason?: NotStartedReason;
}) {
  const t = fr.workflowStatus;
  return (
    <StatusDot
      tone={workflowStatusTone[status] ?? "neutral"}
      label={
        status === "not_started"
          ? reason === "absent"
            ? t.notInPlanHint
            : reason === "waiting"
              ? t.waitingInPlanHint
              : t.notStartedHint
          : (t.statuses[status as keyof typeof t.statuses] ?? status)
      }
    />
  );
}

/** The sections of a launched project as the proto lists them: dot on the
 * left, label, the viewer's count on the right; groups titled in 13 px. */
export function ProjectNavList({
  items,
  statuses = {},
  counts = {},
  reasons = {},
}: { items: ProjectSection[] } & ProjectNavState) {
  const pathname = usePathname();
  const groups = fr.shell.project.sidebar.groups;
  const idPrefix = useId();

  return (
    <div className="flex flex-col">
      {toBlocks(items).map((block) => (
        <div key={block.group ?? "top"} className="flex flex-col">
          {block.group && (
            <p
              id={`${idPrefix}-${block.group}`}
              className="px-2.5 pt-3 pb-1 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]"
            >
              {groups[block.group]}
            </p>
          )}
          <ul
            className="flex flex-col gap-px"
            aria-labelledby={
              block.group ? `${idPrefix}-${block.group}` : undefined
            }
          >
            {block.items.map((section) => {
              const status = statuses[section.key];
              // Listed but closed to this viewer: readable, never a link.
              if (section.restricted)
                return (
                  <li key={section.key}>
                    <span
                      aria-disabled
                      title={fr.shell.project.sidebar.restricted}
                      className={cn(
                        item,
                        "cursor-not-allowed text-[color:var(--text-muted)]",
                      )}
                    >
                      <span className="min-w-0 flex-1">{section.label}</span>
                      <IconLock aria-hidden className="size-3.5 shrink-0" />
                      <span className="sr-only">
                        , {fr.shell.project.sidebar.restricted}
                      </span>
                    </span>
                  </li>
                );
              const active = section.match(pathname);
              return (
                <li key={section.key}>
                  <ViewLink
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      item,
                      "text-[color:var(--text-secondary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)] hover:text-[color:var(--text-primary)]",
                      active &&
                        "bg-[var(--surface-sunken)] text-[color:var(--text-primary)] hover:bg-[var(--surface-sunken)]",
                    )}
                  >
                    {status && (
                      <NavDot status={status} reason={reasons[section.key]} />
                    )}
                    <span className="min-w-0 flex-1">{section.label}</span>
                    <MineBadge count={counts[section.key] ?? 0} />
                  </ViewLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
