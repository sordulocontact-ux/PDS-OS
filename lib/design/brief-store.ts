import "server-only";

import type { CreativeBriefContent } from "@/lib/design/brief";
import { createClient } from "@/lib/supabase/server";

// The stored versions of the Brief créatif (design_briefs), and how a
// stored version is compared with the live one.

// jsonb reorders keys: compare with keys sorted, at every depth.
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable((value as Record<string, unknown>)[k])]),
    );
  return value;
}

/** Two contents are the same Brief, whatever the order of their keys. */
export function sameBrief(a: unknown, b: unknown): boolean {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

export type StoredBrief = {
  id: string;
  number: number;
  content: CreativeBriefContent;
  createdBy: string | null;
  createdAt: string;
};

/** Every stored version, newest first (RLS: who sees the project). */
export async function loadCreativeBriefs(
  projectId: string,
): Promise<StoredBrief[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_briefs")
    .select("id, number, content, created_by, created_at")
    .eq("project_id", projectId)
    .order("number", { ascending: false });
  return (data ?? []).map((b) => ({
    id: b.id,
    number: b.number,
    // Written by buildCreativeBrief only (create_design_brief).
    content: b.content as unknown as CreativeBriefContent,
    createdBy: b.created_by,
    createdAt: b.created_at,
  }));
}
