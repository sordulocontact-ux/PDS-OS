import "server-only";

import type { ArchiveKind, RecordCounts } from "@/lib/archive/types";
import { createClient } from "@/lib/supabase/server";

const TABLES = {
  artist: "artists",
  master: "masters",
  project: "projects",
} as const satisfies Record<ArchiveKind, string>;

// Live and archived rows of a list, for its tabs; counted by the database
// with the user's session (RLS: a project the viewer may not see is not
// counted). Null when a count fails: the tabs are then left out.
export async function countRecords(
  kind: ArchiveKind,
): Promise<RecordCounts | null> {
  const supabase = await createClient();
  const rows = () =>
    supabase.from(TABLES[kind]).select("id", { count: "exact", head: true });
  const [live, archived] = await Promise.all([
    rows().is("archived_at", null),
    rows().not("archived_at", "is", null),
  ]);
  if (
    live.error ||
    archived.error ||
    live.count === null ||
    archived.count === null
  ) {
    console.error(
      "countRecords:",
      live.error?.message ?? archived.error?.message,
    );
    return null;
  }
  return { live: live.count, archived: archived.count };
}
