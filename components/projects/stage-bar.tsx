import { CheckIcon } from "lucide-react";

import { fr } from "@/lib/i18n/fr";
import type { ProjectStage, StageState } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

const SEGMENT: Record<StageState, string> = {
  not_started: "bg-muted",
  in_progress: "bg-primary",
  awaiting_validation: "bg-primary/50",
  validated: "bg-primary",
};

// Progress through the project stages. Labels and states come from the
// database (stages are configurable rows). On narrow screens only the
// segments and the current stage are shown; labels appear from md up.
export function StageBar({
  stages,
  current,
}: {
  stages: ProjectStage[];
  current: ProjectStage | null;
}) {
  const t = fr.shell;
  if (stages.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {current && (
        <p className="text-sm md:hidden">
          <span className="text-muted-foreground">
            {t.project.stageOf(
              stages.findIndex((s) => s.id === current.id) + 1,
              stages.length,
            )}
            {" · "}
          </span>
          <span className="font-medium">{current.label}</span>
        </p>
      )}
      <ol
        aria-label={t.project.stagesLabel}
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
        }}
      >
        {stages.map((stage, index) => {
          const isCurrent = current?.id === stage.id;
          return (
            <li
              key={stage.id}
              aria-current={isCurrent ? "step" : undefined}
              className="flex min-w-0 flex-col gap-1.5"
            >
              <span
                aria-hidden
                className={cn("h-1.5 rounded-full", SEGMENT[stage.state])}
              />
              <span className="sr-only md:not-sr-only md:flex md:min-w-0 md:items-center md:gap-1 md:text-xs">
                {stage.state === "validated" ? (
                  <CheckIcon className="size-3 shrink-0" aria-hidden />
                ) : (
                  <span
                    className="text-muted-foreground tabular-nums"
                    aria-hidden
                  >
                    {index + 1}.
                  </span>
                )}
                <span
                  className={cn(
                    "truncate",
                    isCurrent ? "font-medium" : "text-muted-foreground",
                  )}
                  title={stage.label}
                >
                  {stage.label}
                </span>
                <span className="sr-only">
                  {" — "}
                  {t.stageStates[stage.state]}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
