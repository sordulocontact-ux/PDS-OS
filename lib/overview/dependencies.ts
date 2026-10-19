import "server-only";

import { COVER } from "@/lib/distribution/sources";
import { fr } from "@/lib/i18n/fr";
import type { ProjectJourneys } from "@/lib/journey/types";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStates } from "@/lib/workflow-status/load";
import type { WorkflowKey } from "@/lib/workflow-status/rules";

export type OverviewDependency = {
  key: string;
  label: string;
  from: string;
  to: string;
  available: boolean;
};

/**
 * « Ce qui dépend d'un autre workflow » (proto « Projet complet »): four
 * facts one workflow hands another, each Disponible or Attendu, read from
 * their sources at every visit, never entered:
 * - Master final (Master → Distribution): every title has its master final;
 * - Pochette livrée (Marketing → Distribution): a deliverable named as the
 *   cover (lib/distribution/sources.ts, COVER) delivered by the Production;
 * - Prêt pour la sortie (Juridique → Distribution): the Juridique's step
 *   « ready » done once its journey has one, else the Juridique done;
 * - Durée du master final (Master → Juridique · SACEM): every title's master
 *   final file has its duration.
 * A line shows only when both workflows belong to the project and the
 * viewer may read its source (the Juridique with manage_legal).
 */
export async function overviewDependencies(
  project: ProjectDetail,
  flows: WorkflowStates,
  journeys: ProjectJourneys,
): Promise<OverviewDependency[]> {
  const t = fr.projectShell.overview.dependencies;
  const name = fr.shell.project.sidebar;
  const has = (w: WorkflowKey) => flows.workflows.includes(w);
  const readable = (w: WorkflowKey) =>
    has(w) && flows.states[w] !== undefined && flows.states[w] !== "restricted";
  const supabase = await createClient();
  const ids = project.masters.map((m) => m.id);
  const [deliverables, finals] = await Promise.all([
    has("marketing") && has("distribution")
      ? supabase
          .from("deliverable_deliveries")
          .select("delivered_at, deliverable:strategy_deliverables(title)")
          .eq("project_id", project.id)
          .not("delivered_at", "is", null)
      : null,
    readable("master") && readable("legal") && ids.length > 0
      ? supabase
          .from("master_files")
          .select("master_id")
          .in("master_id", ids)
          .eq("audio_state", "final_master")
          .not("duration_seconds", "is", null)
      : null,
  ]);
  if (deliverables?.error)
    console.error("overviewDependencies cover:", deliverables.error.message);
  if (finals?.error)
    console.error("overviewDependencies duration:", finals.error.message);

  const deps: OverviewDependency[] = [];
  if (readable("master") && has("distribution"))
    deps.push({
      key: "masterFinal",
      label: t.items.masterFinal,
      from: name.master,
      to: name.distribution,
      available:
        flows.dependencies.find((d) => d.key === "master-online")?.state ===
        "ready",
    });
  if (has("marketing") && has("distribution"))
    deps.push({
      key: "cover",
      label: t.items.cover,
      from: name.marketing,
      to: name.distribution,
      available: (deliverables?.data ?? []).some((row) =>
        COVER.test(row.deliverable?.title ?? ""),
      ),
    });
  if (readable("legal") && has("distribution")) {
    const ready = journeys.journeys
      .filter((j) => j.module === "legal")
      .flatMap((j) => j.steps)
      .find((s) => s.key === "ready");
    const legal = flows.states.legal;
    deps.push({
      key: "ready",
      label: t.items.ready,
      from: name.legal,
      to: name.distribution,
      available: ready
        ? ready.status === "done"
        : legal !== undefined &&
          legal !== "restricted" &&
          legal.status === "done",
    });
  }
  if (readable("master") && readable("legal")) {
    const withDuration = new Set((finals?.data ?? []).map((f) => f.master_id));
    deps.push({
      key: "duration",
      label: t.items.duration,
      from: name.master,
      to: t.sacem,
      available: ids.length > 0 && ids.every((id) => withDuration.has(id)),
    });
  }
  return deps;
}
