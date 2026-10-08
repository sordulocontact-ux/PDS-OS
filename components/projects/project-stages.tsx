import Link from "next/link";

import { StageStateBadge } from "@/components/projects/stage-state-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ProjectDetail } from "@/lib/projects/types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** The project's stages with their state, on the overview until the Plan du
 * projet takes their place (Cadrage not validated yet). */
export function ProjectStages({ project }: { project: ProjectDetail }) {
  const t = fr.shell.project.overview;
  return (
    <section aria-labelledby="stages-title" className="flex flex-col gap-3">
      <h2 id="stages-title" className="text-base font-medium">
        {t.stages}
      </h2>
      <ol className="flex flex-col gap-1 rounded-xl border border-border p-1">
        {project.stages.map((stage, index) => {
          const href =
            stage.key === "framing"
              ? routes.projectFraming(project.id)
              : stage.key === "launch_strategy"
                ? routes.projectStrategy(project.id)
                : stage.key === "design"
                  ? routes.projectDesign(project.id)
                  : null;
          const content = (
            <>
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="w-4 shrink-0 text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {stage.label}
                  </span>
                  {stage.stateChangedAt && (
                    <span className="text-xs text-muted-foreground">
                      {t.changedAt}{" "}
                      {dateFormatter.format(new Date(stage.stateChangedAt))}
                    </span>
                  )}
                </span>
              </span>
              <StageStateBadge state={stage.state} />
            </>
          );
          const current = project.currentStage?.id === stage.id;
          return (
            <li key={stage.id}>
              {href ? (
                <Link
                  href={href}
                  aria-current={current ? "step" : undefined}
                  className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 no-underline hover:bg-muted/50"
                >
                  {content}
                </Link>
              ) : (
                <div
                  aria-current={current ? "step" : undefined}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
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
