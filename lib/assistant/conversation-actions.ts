"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { assistant } from "@/lib/i18n/fr/assistant";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/** Deletes one of the viewer's conversations with PO (RLS: their own
 * only). The history drops it at once; no page is read again (the open one
 * may be the deleted conversation). */
export async function deleteConversation(id: string): Promise<WriteResult> {
  await requireApproved();
  const t = assistant.history;
  if (!z.uuid().safeParse(id).success)
    return { ok: false, error: t.deleteFailed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_conversations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || data.length === 0) return { ok: false, error: t.deleteFailed };

  return { ok: true };
}
