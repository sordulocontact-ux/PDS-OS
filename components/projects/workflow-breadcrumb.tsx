"use client";

import { IconChevronRight, IconCheck } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";

import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { WORKFLOW_STEPS } from "@/lib/ui/workflow-steps";
import { cn } from "@/lib/utils";

// The 7-step breadcrumb of the business process, shown at the top of the
// "Workflow" section (Cadrage, Stratégie, Sortie) — see lib/ui/workflow-steps.ts.
// Hides itself outside those three pages, so the layout can render it
// unconditionally around every project page.
// `lockedSteps`: steps that have a page but may not be opened yet (the
// Stratégie before the Cadrage is validated) — shown greyed, not linked.
//
// Design: numbered dots between chevrons, so the current step reads at a
// glance without losing the original ">" breadcrumb feel. Steps before the
// active one look "done" (filled dot, check mark); the active dot is filled
// too, its label in bold.
export function WorkflowBreadcrumb({
  projectId,
  lockedSteps = [],
}: {
  projectId: string;
  lockedSteps?: readonly string[];
}) {
  const pathname = usePathname();
  const inWorkflow =
    pathname.startsWith(routes.projectFraming(projectId)) ||
    pathname.startsWith(routes.projectStrategy(projectId)) ||
    pathname.startsWith(routes.projectRelease(projectId));
  if (!inWorkflow) return null;

  const activeIndex = WORKFLOW_STEPS.findIndex((step) => {
    const href = step.href?.(projectId);
    return href ? pathname === href : false;
  });

  return (
    <nav
      aria-label={fr.shell.project.workflowSteps.label}
      className="overflow-x-auto"
    >
      <ol className="flex items-center whitespace-nowrap">
        {WORKFLOW_STEPS.map((step, index) => {
          const locked = lockedSteps.includes(step.key);
          const href = locked ? undefined : step.href?.(projectId);
          const active = index === activeIndex;
          const done = activeIndex >= 0 && index < activeIndex;

          return (
            <li key={step.key} className="flex items-center gap-1.5">
              {index > 0 && (
                <IconChevronRight
                  className="size-4 shrink-0 text-[color:var(--nav-fg-muted)]"
                  aria-hidden
                />
              )}
              {href ? (
                <ViewLink
                  href={href}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "group flex items-center gap-2 rounded-pill py-1 pr-3 pl-1 no-underline hover:bg-[var(--nav-item-hover-bg)]",
                  )}
                >
                  <StepDot active={active} done={done}>
                    {index + 1}
                  </StepDot>
                  <span
                    className={cn(
                      "text-body-md",
                      active
                        ? "font-medium text-[color:var(--tone-info-fg)]"
                        : "text-[color:var(--nav-fg-muted)] group-hover:text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </ViewLink>
              ) : (
                <span
                  className="flex cursor-not-allowed items-center gap-2 rounded-pill py-1 pr-3 pl-1 text-[color:var(--nav-fg-muted)]"
                  aria-disabled
                  title={
                    locked
                      ? fr.shell.project.workflowSteps.locked[step.key]
                      : fr.shell.nav.comingSoon
                  }
                >
                  <StepDot active={false} done={false}>
                    {index + 1}
                  </StepDot>
                  <span className="text-body-md">{step.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepDot({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border text-[length:var(--type-caption)] font-medium",
        active
          ? "border-[var(--tone-info-fg)] text-[color:var(--tone-info-fg)]"
          : done
            ? "border-[var(--nav-fg)] text-[color:var(--nav-fg)]"
            : "border-[var(--border-default)] text-[color:var(--nav-fg-muted)]",
      )}
    >
      {done && !active ? <IconCheck className="size-3.5" /> : children}
    </span>
  );
}
