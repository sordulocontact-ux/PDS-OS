"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ARCHIVE_KINDS,
  MAX_DELETE,
  type ArchiveErrorCode,
  type ArchiveKind,
  type ArchiveManyResult,
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

const manySchema = z.object({
  kind: z.enum(ARCHIVE_KINDS),
  ids: z.array(z.uuid()).min(1).max(MAX_DELETE),
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
  const error = await archiveOne(supabase, parsed.data);
  if (error) return { ok: false, error };

  revalidatePath(routes.app, "layout");
  return { ok: true };
}

/**
 * Archives or restores a selection of one kind, row by row with the same
 * SQL functions: a row refused (in use, launched…) is reported with its
 * reason and does not stop the others.
 */
export async function setManyArchived(
  kind: ArchiveKind,
  ids: string[],
  archived: boolean,
): Promise<ArchiveManyResult> {
  const access = await requireApproved();
  if (!can(access, "archive_records")) return { ok: false, error: "forbidden" };
  const parsed = manySchema.safeParse({ kind, ids, archived });
  if (!parsed.success) return { ok: false, error: "not_found" };

  const supabase = await createClient();
  const done: string[] = [];
  const failed: { id: string; error: ArchiveErrorCode }[] = [];
  // One after the other: each call is its own transaction in the database.
  for (const id of parsed.data.ids) {
    const error = await archiveOne(supabase, { ...parsed.data, id });
    if (error) failed.push({ id, error });
    else done.push(id);
  }

  if (done.length > 0) revalidatePath(routes.app, "layout");
  return { ok: true, done, failed };
}

async function archiveOne(
  supabase: Awaited<ReturnType<typeof createClient>>,
  { kind, id, archived }: z.infer<typeof inputSchema>,
): Promise<ArchiveErrorCode | null> {
  const args = { p_archived: archived };
  const call = () => {
    switch (kind) {
      case "artist":
        return supabase.rpc(RPC.artist, { ...args, p_artist_id: id });
      case "master":
        return supabase.rpc(RPC.master, { ...args, p_master_id: id });
      case "project":
        return supabase.rpc(RPC.project, { ...args, p_project_id: id });
      case "contact":
        return supabase.rpc(RPC.contact, { ...args, p_contact_id: id });
    }
  };
  const { error } = await call();
  if (!error) return null;

  const message = error.message ?? "";
  const code = DATABASE_CODES.find((c) => message.includes(c));
  if (code) return code;
  if (message.includes("record_not_found")) return "not_found";
  if (error.code === "42501") return "forbidden";
  console.error("setArchived:", message);
  return "generic";
}
