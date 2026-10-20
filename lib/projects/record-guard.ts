import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import { legalRouteOf } from "@/lib/ui/legal-steps";
import { createClient } from "@/lib/supabase/server";

// A real 404 for a record that does not exist under an existing project
// (docs/ARCHITECTURE.md § 3 bis, « Vrais 404 »). The project's section
// skeleton (`[projectId]/loading.tsx`) wraps every page below, so a page's
// own `notFound()` comes after the response started (200 + noindex). The
// project's layout, above that boundary, asks here before it renders: the
// proxy forwards the path it serves (`x-pds-path`), and the record named
// in it is looked up — one small read, in parallel with the project's, and
// only when the layout renders (a hard load or entering the project, never
// a navigation inside it). RLS decides: hidden = missing, as on the page.

export const PATH_HEADER = "x-pds-path";

// A section's record, by the table that holds it with its project.
const RECORDS = {
  production: "strategy_deliverables",
  activations: "marketing_activations",
  calls: "calls",
  "review/reports": "marketing_reports",
  "strategy/document": "strategy_documents",
} as const;
type RecordTable = (typeof RECORDS)[keyof typeof RECORDS];

const uuid = z.uuid();

/** The record a project path names, or `invalid` for a path that cannot be. */
export function recordOfPath(
  projectId: string,
  path: string,
): { table: RecordTable; id: string } | "invalid" | null {
  const prefix = `/app/projects/${projectId}/`;
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length).split("/").filter(Boolean);
  // The Juridique's routes are a pure function of the path.
  if (rest[0] === "legal")
    return rest.length === 1 ||
      legalRouteOf(rest.slice(1).map(decodeURIComponent))
      ? null
      : "invalid";
  for (const [section, table] of Object.entries(RECORDS)) {
    const depth = section.split("/").length;
    if (rest.slice(0, depth).join("/") !== section || rest.length <= depth)
      continue;
    const id = rest[depth];
    return uuid.safeParse(id).success ? { table, id } : "invalid";
  }
  return null;
}

/** True when the page asked names a record this project does not have. */
export const missingProjectRecord = cache(
  async (projectId: string): Promise<boolean> => {
    const path = (await headers()).get(PATH_HEADER);
    if (!path) return false;
    const record = recordOfPath(projectId, path);
    if (record === null) return false;
    if (record === "invalid") return true;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(record.table)
      .select("id")
      .eq("id", record.id)
      .eq("project_id", projectId)
      .maybeSingle();
    // A failed read is not a missing record: the page decides.
    if (error) return false;
    return data === null;
  },
);
