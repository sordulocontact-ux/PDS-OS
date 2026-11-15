import "server-only";

import {
  PROJECT_SCOPE,
  titleScopeKindOf,
  type ActionTitleScope,
  type ScopeTitle,
} from "@/lib/projects/title-scope-rules";
import { masterNameOf, projectTitleLabel } from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { createClient } from "@/lib/supabase/server";
import { trackedCache } from "@/lib/projects/live-deps";

/** The scopes of a collective's marketing actions (lot 10). */
export type TitleScopes = {
  // Its titles, in order (abandoned ones at the end, to name a scope that
  // still holds them).
  titles: ScopeTitle[];
  deliverables: Map<string, ActionTitleScope>;
  activations: Map<string, ActionTitleScope>;
};

/** The scope of an action: its own, else the whole project. */
export const scopeOf = (map: Map<string, ActionTitleScope>, id: string) =>
  map.get(id) ?? PROJECT_SCOPE;

/**
 * The titles each marketing action of a collective targets
 * (deliverable_titles), read with the viewer's session. Null for any other
 * project: no scope, no filter.
 */
export const loadTitleScopes = trackedCache(
  async (projectId: string): Promise<TitleScopes | null> => {
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("collective")
      .eq("id", projectId)
      .maybeSingle();
    if (!project?.collective) return null;
    const [titles, rows] = await Promise.all([
      loadProjectTitles(projectId),
      supabase
        .from("deliverable_titles")
        .select("strategy_deliverable_id, activation_id, scope, title_id")
        .eq("project_id", projectId),
    ]);
    if (rows.error) console.error("loadTitleScopes:", rows.error.message);
    const deliverables = new Map<string, ActionTitleScope>();
    const activations = new Map<string, ActionTitleScope>();
    for (const row of rows.data ?? []) {
      const map = row.strategy_deliverable_id ? deliverables : activations;
      const id = row.strategy_deliverable_id ?? row.activation_id;
      if (!id) continue;
      const scope = map.get(id) ?? {
        kind: titleScopeKindOf(row.scope),
        titleIds: [],
      };
      if (row.title_id) scope.titleIds.push(row.title_id);
      map.set(id, scope);
    }
    return {
      titles: titles.map((title) => ({
        id: title.id,
        label: projectTitleLabel({
          position: title.position,
          workingTitle: title.workingTitle,
          masterTitle: masterNameOf(title.master),
        }),
        abandoned: title.status === "abandoned",
      })),
      deliverables,
      activations,
    };
  },
);
