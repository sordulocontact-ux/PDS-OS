"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ARCHIVE_KINDS,
  MAX_DELETE,
  type ArchiveKind,
  type DeleteErrorCode,
  type DeleteResult,
} from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  kind: z.enum(ARCHIVE_KINDS),
  ids: z.array(z.uuid()).min(1).max(MAX_DELETE),
});

// Returned row by row by delete_records (…20261006000101_delete_records.sql).
const ROW_CODES = [
  "forbidden",
  "not_found",
  "artist_in_use",
  "master_in_use",
  "contact_in_use",
] as const satisfies readonly DeleteErrorCode[];

const rowCode = (error: string): DeleteErrorCode =>
  ROW_CODES.find((code) => code === error) ?? "generic";

/**
 * Deletes artists, masters, projects or network contacts for good, with the
 * user's session: the SQL function checks the permission row by row, takes
 * what belongs to each row with it, and reports the rows still in use
 * instead of failing the whole selection.
 */
export async function deleteRecords(
  kind: ArchiveKind,
  ids: string[],
): Promise<DeleteResult> {
  const access = await requireApproved();
  if (!can(access, "archive_records")) return { ok: false, error: "forbidden" };
  const parsed = inputSchema.safeParse({ kind, ids });
  if (!parsed.success) return { ok: false, error: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_records", {
    p_kind: parsed.data.kind,
    p_ids: parsed.data.ids,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    console.error("deleteRecords:", error.message);
    return { ok: false, error: "generic" };
  }

  const deleted: string[] = [];
  const failed: { id: string; error: DeleteErrorCode }[] = [];
  for (const row of data ?? []) {
    // Null (typed as a string by the generator) when the row went.
    if (!row.error) deleted.push(row.record_id);
    else failed.push({ id: row.record_id, error: rowCode(row.error) });
  }
  if (failed.some((f) => f.error === "generic"))
    console.error("deleteRecords: rows not deleted", failed);

  if (deleted.length > 0) revalidatePath(routes.app, "layout");
  return { ok: true, deleted, failed };
}
