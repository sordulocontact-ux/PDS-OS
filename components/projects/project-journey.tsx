import Link from "next/link";

import { StageStateBadge } from "@/components/projects/stage-state-badge";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import type { ProjectDetail } from "@/lib/projects/types";

const fr = { shell };

/**
 * « Comment avance un projet », on the overview until the plan du projet
 * takes its place (Cadrage not validated yet): one model of progress, the
 * Cadrage, the plan du projet, then the workflows in parallel (UX test of
 * 09/10/2026: seven « Étapes » beside four workflows).
 */
export function ProjectJourney({ project }: { project: ProjectDetail }) {
  const t = fr.shell.project.journey;
  const framing = project.stages.find((stage) => stage.key === "framing");
  const steps = [
    {
      key: "framing",
      title: t.framing.title,
      body: t.framing.body,
      href: routes.projectFraming(project.id),
      state: framing?.state ?? null,
    },
    { key: "plan", title: t.plan.title, body: t.plan.body },
    { key: "workflows", title: t.workflows.title, body: t.workflows.body },
  ];
  return (
    <section aria-labelledby="journey-title" className="flex flex-col gap-3">
      <h2 id="journey-title" className="text-base font-medium">
        {t.title}
      </h2>
      <ol className="flex flex-col gap-1 rounded-xl border border-border bg-card p-1">
        {steps.map((step, index) => {
          const content = (
            <>
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="w-4 shrink-0 text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{step.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {step.body}
                  </span>
                </span>
              </span>
              {"state" in step && step.state && (
                <StageStateBadge state={step.state} />
              )}
            </>
          );
          return (
            <li key={step.key}>
              {"href" in step && step.href ? (
                <Link
                  href={step.href}
                  aria-current={index === 0 ? "step" : undefined}
                  className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 no-underline hover:bg-muted/50"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
