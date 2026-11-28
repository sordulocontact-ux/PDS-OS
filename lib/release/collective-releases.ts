import "server-only";

import type { Access } from "@/lib/auth/access";
import { can } from "@/lib/auth/access";
import { loadContractGaps, type ContractGap } from "@/lib/legal/contract-gaps";
import { canEditProject } from "@/lib/projects/edit-access";
import { loadProjectTitles } from "@/lib/projects/titles";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import type { ProjectDetail } from "@/lib/projects/types";
import {
  isReleaseMode,
  releaseDistributionOf,
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
  const [titles, releases, plan, mode, gaps, deposits] = await Promise.all([
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
    // Each release's deposit in the Distribution (lot 15).
    supabase.rpc("release_distribution_states", { p_project_id: project.id }),
  ]);
  if (deposits.error)
    console.error("loadCollectiveReleases deposits:", deposits.error.message);
  const depositOf = (id: string) =>
    releaseDistributionOf(
      (deposits.data ?? []).find((d) => d.release_id === id),
    );
  if (releases.error)
    throw new Error(`loadCollectiveReleases: ${releases.error.message}`);
  // « Sortie : Non » (28/11/2026): no release of its own, not waited for.
  const { data: notOut } = await supabase
    .from("project_titles")
    .select("id")
    .eq("project_id", project.id)
    .eq("release_decision", false);
  const staysIn = new Set((notOut ?? []).map((t) => t.id));
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
      artists: titleGuestNames(t.participations),
    });
  const provisionalOf = (list: typeof titles) =>
    list.filter((t) => t.master?.provisional).map(labelOf);
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
            provisional: provisionalOf(live),
            distribution: depositOf(r.id),
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
          provisional: provisionalOf([title]),
          distribution: depositOf(r.id),
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
      .filter((t) => !t.master && !withRelease.has(t.id) && !staysIn.has(t.id))
      .map((t) => ({ id: t.id, label: labelOf(t) })),
    // Who writes the titles writes the mode (the database decides again).
    canEdit:
      canEditProject(access, project) ||
      (can(access, "create_projects") && project.stages.length === 0),
    dueDate: project.dueDate,
  };
}

/** A title's deposit as « Titres et artistes » shows it (lot 15): its own
 * release's, else the compilation's it goes out with — only in the mode
 * « compilation finale uniquement », for a title in the Catalogue (audit du
 * 28/11/2026: « Avec la compilation » was said of a title without a
 * master, or waiting for its own single). */
export type TitleDeposit = {
  releaseId: string;
  // It goes out with the compilation (no release of its own).
  withCompilation: boolean;
  distribution: ReturnType<typeof releaseDistributionOf>;
};

export async function loadTitleDeposits(
  projectId: string,
): Promise<Record<string, TitleDeposit>> {
  const supabase = await createClient();
  const [releases, titles, deposits, project] = await Promise.all([
    supabase
      .from("releases")
      .select("id, project_title_id")
      .eq("project_id", projectId)
      .is("archived_at", null),
    supabase
      .from("project_titles")
      .select("id, status, master_id, release_decision")
      .eq("project_id", projectId),
    supabase.rpc("release_distribution_states", { p_project_id: projectId }),
    supabase
      .from("projects")
      .select("collective_release_mode")
      .eq("id", projectId)
      .maybeSingle(),
  ]);
  const compilationOnly =
    project.data?.collective_release_mode === "compilation";
  const rows = releases.data ?? [];
  const stateOf = (id: string) =>
    releaseDistributionOf(
      (deposits.data ?? []).find((d) => d.release_id === id),
    );
  const compilation = rows.find((r) => !r.project_title_id) ?? null;
  const out: Record<string, TitleDeposit> = {};
  for (const title of titles.data ?? []) {
    const own = rows.find((r) => r.project_title_id === title.id);
    if (own)
      out[title.id] = {
        releaseId: own.id,
        withCompilation: false,
        distribution: stateOf(own.id),
      };
    else if (
      compilation &&
      compilationOnly &&
      title.master_id &&
      title.status !== "abandoned" &&
      // « Sortie : Non »: out of the compilation too.
      title.release_decision !== false
    )
      out[title.id] = {
        releaseId: compilation.id,
        withCompilation: true,
        distribution: stateOf(compilation.id),
      };
  }
  return out;
}
