"use client";

import { IconChevronRight } from "nucleo-sharp-essential";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { WORKFLOW_STEPS } from "@/lib/ui/workflow-steps";
import { cn } from "@/lib/utils";

// The 7-step breadcrumb of the business process, shown at the top of the
// "Workflow" section (Cadrage, Stratégie, Sortie) — see lib/ui/workflow-steps.ts.
// Hides itself outside those three pages, so the layout can render it
// unconditionally around every project page.
export function WorkflowBreadcrumb({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const inWorkflow =
    pathname.startsWith(routes.projectFraming(projectId)) ||
    pathname.startsWith(routes.projectStrategy(projectId)) ||
    pathname.startsWith(routes.projectRelease(projectId));
  if (!inWorkflow) return null;

  return (
    <nav
      aria-label={fr.shell.project.workflowSteps.label}
      className="overflow-x-auto"
    >
      <ol className="flex items-center gap-1.5 text-body-md whitespace-nowrap">
        {WORKFLOW_STEPS.map((step, index) => {
          const href = step.href?.(projectId);
          const active = href ? pathname === href : false;
          return (
            <li key={step.key} className="flex items-center gap-1.5">
              {index > 0 && (
                <IconChevronRight
                  className="size-4 shrink-0 text-[color:var(--nav-fg-muted)]"
                  aria-hidden
                />
              )}
              {href ? (
                <Link
                  href={href}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "rounded-lg px-2 py-1 no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)]",
                    active
                      ? "font-medium text-foreground"
                      : "text-[color:var(--nav-fg-muted)]",
                  )}
                >
                  {step.label}
                </Link>
              ) : (
                <span
                  className="cursor-not-allowed rounded-lg px-2 py-1 text-[color:var(--nav-fg-muted)]"
                  title={fr.shell.nav.comingSoon}
                >
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
