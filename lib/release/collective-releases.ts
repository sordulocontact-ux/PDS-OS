import "server-only";

import type { Access } from "@/lib/auth/access";
import { can } from "@/lib/auth/access";
import { loadContractGaps, type ContractGap } from "@/lib/legal/contract-gaps";
import { canEditProject } from "@/lib/projects/edit-access";
import { loadProjectTitles } from "@/lib/projects/titles";
import { masterNameOf, projectTitleLabel } from "@/lib/projects/title-rules";
import type { ProjectDetail } from "@/lib/projects/types";
import {
  isReleaseMode,
  type CollectiveRelease,
  type CollectiveReleases,
} from "@/lib/release/collective-rules";
import { createClient } from "@/lib/supabase/server";

/**
 * « Sorties » of a collective (lot 13, décision 7): its mode and its live
 * releases — one per title (« singles »), the compilation (the project's
 * release), or both — each with its own date, UPC and state; the title's
 * ISRC read in the Catalogue. The titles still waiting for a release
 * (live, no master yet) are named. Read with the viewer's session (RLS).
 */
export async function loadCollectiveReleases(
  project: ProjectDetail,
  access: Access,
): Promise<CollectiveReleases> {
  const supabase = await createClient();
  const [titles, releases, plan, mode, gaps] = await Promise.all([
    loadProjectTitles(project.id),
    supabase
      .from("releases")
      .select(
        "id, project_title_id, title, upc, planned_release_date, delivered_on, online_detected_at, online_confirmed_on",
      )
      .eq("project_id", project.id)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("project_plans")
      .select("id")
      .eq("project_id", project.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("collective_release_mode")
      .eq("id", project.id)
      .maybeSingle(),
    loadContractGaps(project.id, "release"),
  ]);
  if (releases.error)
    throw new Error(`loadCollectiveReleases: ${releases.error.message}`);
  const masterIds = titles.flatMap((t) => (t.master ? [t.master.id] : []));
  const isrcs = masterIds.length
    ? await supabase.from("masters").select("id, isrc").in("id", masterIds)
    : { data: [], error: null };
  if (isrcs.error)
    console.error("loadCollectiveReleases isrc:", isrcs.error.message);
  const isrcOf = new Map((isrcs.data ?? []).map((m) => [m.id, m.isrc]));
  const labelOf = (t: (typeof titles)[number]) =>
    projectTitleLabel({
      position: t.position,
      workingTitle: t.workingTitle,
      masterTitle: masterNameOf(t.master),
    });
  const live = titles.filter((t) => t.status !== "abandoned");
  const gapsOf = (titleId: string | null): ContractGap[] =>
    titleId ? gaps.filter((g) => g.titleId === titleId) : gaps;
  const state = (r: NonNullable<typeof releases.data>[number]) =>
    r.online_confirmed_on || r.online_detected_at
      ? ("online" as const)
      : r.delivered_on
        ? ("delivered" as const)
        : ("planned" as const);

  const rows: CollectiveRelease[] = (releases.data ?? []).flatMap(
    (r): CollectiveRelease[] => {
      if (!r.project_title_id)
        return [
          {
            id: r.id,
            kind: "compilation" as const,
            titleId: null,
            label: project.title,
            position: 0,
            abandoned: false,
            isrc: null,
            upc: r.upc,
            date: r.planned_release_date,
            state: state(r),
            tracks: live.filter((t) => t.master).map(labelOf),
            gaps: gapsOf(null),
          },
        ];
      const title = titles.find((t) => t.id === r.project_title_id);
      if (!title) return [];
      return [
        {
          id: r.id,
          kind: "title" as const,
          titleId: title.id,
          label: labelOf(title),
          position: title.position,
          abandoned: title.status === "abandoned",
          isrc: title.master ? (isrcOf.get(title.master.id) ?? null) : null,
          upc: r.upc,
          date: r.planned_release_date,
          state: state(r),
          tracks: [],
          gaps: gapsOf(title.id),
        },
      ];
    },
  );
  const withRelease = new Set(rows.map((r) => r.titleId));
  const modeValue = mode.data?.collective_release_mode;
  return {
    mode: isReleaseMode(modeValue) ? modeValue : "singles",
    launched: plan.data !== null,
    releases: rows.sort((a, b) => a.position - b.position),
    // Live titles a single would cover but not yet in the Catalogue.
    waiting: live
      .filter((t) => !t.master && !withRelease.has(t.id))
      .map(labelOf),
    // Who writes the titles writes the mode (the database decides again).
    canEdit:
      canEditProject(access, project) ||
      (can(access, "create_projects") && project.stages.length === 0),
    dueDate: project.dueDate,
  };
}
