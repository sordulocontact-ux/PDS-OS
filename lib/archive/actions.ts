"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ARCHIVE_KINDS,
  type ArchiveErrorCode,
  type ArchiveKind,
  type ArchiveResult,
} from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  kind: z.enum(ARCHIVE_KINDS),
  id: z.uuid(),
  archived: z.boolean(),
});

const RPC = {
  artist: "set_artist_archived",
  master: "set_master_archived",
  project: "set_project_archived",
  contact: "set_network_contact_archived",
} as const satisfies Record<ArchiveKind, string>;

// Raised by the SQL functions (…000701_archive_records.sql).
const DATABASE_CODES = [
  "artist_in_use",
  "master_in_use",
  "project_launched",
  "artist_name_taken",
  "master_uses_archived",
  "project_uses_archived",
  "contact_in_use",
] as const satisfies readonly ArchiveErrorCode[];

/**
 * Archives (hides, keeps) or restores an artist, a master, a project or a
 * network contact, with
 * the user's session: the SQL function checks the permission and refuses a
 * row still in use. The button is only shown to the director; this is not
 * where the rule lives.
 */
export async function setArchived(
  kind: ArchiveKind,
  id: string,
  archived: boolean,
): Promise<ArchiveResult> {
  const access = await requireApproved();
  if (!can(access, "archive_records")) return { ok: false, error: "forbidden" };
  const parsed = inputSchema.safeParse({ kind, id, archived });
  if (!parsed.success) return { ok: false, error: "not_found" };

  const supabase = await createClient();
  const args = { p_archived: parsed.data.archived };
  const { id: recordId } = parsed.data;
  const call = () => {
    switch (parsed.data.kind) {
      case "artist":
        return supabase.rpc(RPC.artist, { ...args, p_artist_id: recordId });
      case "master":
        return supabase.rpc(RPC.master, { ...args, p_master_id: recordId });
      case "project":
        return supabase.rpc(RPC.project, { ...args, p_project_id: recordId });
      case "contact":
        return supabase.rpc(RPC.contact, { ...args, p_contact_id: recordId });
    }
  };
  const { error } = await call();

  if (error) {
    const message = error.message ?? "";
    const code = DATABASE_CODES.find((c) => message.includes(c));
    if (code) return { ok: false, error: code };
    if (message.includes("record_not_found"))
      return { ok: false, error: "not_found" };
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    console.error("setArchived:", message);
    return { ok: false, error: "generic" };
  }

  revalidatePath(routes.app, "layout");
  return { ok: true };
}
