"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { callPage } from "@/lib/i18n/fr/calls-page";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * Deletes a meeting or a call for good, with the user's session: the SQL
 * function delete_call (20261105110101) checks the director's permission,
 * takes what belongs to the call with it and refuses a call still used.
 */
export async function deleteCall(callId: string): Promise<WriteResult> {
  const t = callPage.delete;
  if (!z.uuid().safeParse(callId).success)
    return { ok: false, error: t.errors.not_found };
  const access = await requireApproved();
  if (!can(access, "archive_records"))
    return { ok: false, error: t.errors.forbidden };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_call", { p_call_id: callId });
  if (error) {
    if (error.code === "42501" || error.message.includes("forbidden"))
      return { ok: false, error: t.errors.forbidden };
    if (error.message.includes("not_found"))
      return { ok: false, error: t.errors.not_found };
    if (error.message.includes("call_in_use"))
      return { ok: false, error: t.errors.in_use };
    console.error("deleteCall:", error.message);
    return { ok: false, error: t.errors.generic };
  }
  revalidatePath(routes.app, "layout");
  return { ok: true, done: t.done };
}
