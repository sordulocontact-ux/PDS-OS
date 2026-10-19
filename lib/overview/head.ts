import { fr } from "@/lib/i18n/fr";
import type { ProjectHeaderData } from "@/lib/projects/header";
import { projectFormatLabel } from "@/lib/projects/labels";
import type { ProjectDetail } from "@/lib/projects/types";
import type { Tone } from "@/lib/ui/state-tones";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { formatDay } from "@/lib/utils/day";
import type { WorkflowStates } from "@/lib/workflow-status/load";

/**
 * The head of the overview (proto « Projet complet »): the project's state
 * next to its name — Non démarré before « Lancer le plan », Terminé once
 * every workflow it may read is, else En cours — and its facts: artist ·
 * format, Budget, Responsable, then the Master final when the Brief
 * Mix/Master dates it, then the Sortie. Computed, never stored.
 */
export function overviewHead(
  project: ProjectDetail,
  header: ProjectHeaderData,
  flows: WorkflowStates | null,
  launchedAt: string | null,
): { status: { label: string; tone: Tone }; facts: ModuleFact[] } {
  const t = fr.projectShell;
  const states = Object.values(flows?.states ?? {}).flatMap((s) =>
    s && s !== "restricted" ? [s] : [],
  );
  const finished =
    states.length > 0 && states.every((s) => s.status === "done");
  const status = !launchedAt
    ? { label: t.status.notStarted, tone: "neutral" as const }
    : finished
      ? { label: t.status.done, tone: "success" as const }
      : { label: t.status.running, tone: "info" as const };
  const masterFinal = flows?.details.masterDates?.masterFinalDue ?? null;
  // « Mona Lys · Single »: the format says the kind (proto).
  const kind =
    projectFormatLabel({
      type: project.type,
      musicFormat: project.musicFormat,
      contentFormatName: project.contentFormat?.name ?? null,
    }) || fr.shell.projectTypes[project.type];
  const facts: ModuleFact[] = [
    {
      key: "project",
      value: [project.artistName, kind].filter(Boolean).join(" · "),
    },
    ...header.facts.filter((f) => f.key !== "project" && f.key !== "release"),
    ...(launchedAt && masterFinal
      ? [
          {
            key: "masterFinal",
            label: t.facts.masterFinal,
            value: formatDay(masterFinal),
          },
        ]
      : []),
    ...header.facts.filter((f) => f.key === "release"),
  ];
  return { status, facts };
}
