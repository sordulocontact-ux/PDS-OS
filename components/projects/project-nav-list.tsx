"use client";

import { IconLock } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { useId } from "react";

import {
  contextNavItem,
  ContextNavGroupTitle,
  ContextNavLink,
} from "@/components/shell/context-sidebar";
import { MineBadge } from "@/components/ui/mine-badge";
import { StatusDot } from "@/components/ui/status-dot";
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
            <ContextNavGroupTitle id={`${idPrefix}-${block.group}`}>
              {groups[block.group]}
            </ContextNavGroupTitle>
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
                        contextNavItem,
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
                  <ContextNavLink href={section.href} active={active}>
                    {status && (
                      <NavDot status={status} reason={reasons[section.key]} />
                    )}
                    <span className="min-w-0 flex-1">{section.label}</span>
                    <MineBadge count={counts[section.key] ?? 0} />
                  </ContextNavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
