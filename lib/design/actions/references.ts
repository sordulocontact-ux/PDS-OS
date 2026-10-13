"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Removing a reference gathered while working. Adding one goes through the
// References dialog (reference-links.ts, reference-files.ts: MKT-C2-09).
// RLS: design_can_write.

export async function removeDesignReference(
  projectId: string,
  referenceId: string,
): Promise<DesignResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(referenceId).success
  )
    return { ok: false, error: fr.conceptionWork.errors.invalid };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_references")
    .delete()
    .eq("id", referenceId)
    .eq("project_id", projectId)
    .select("id");
  // RLS hides what it refuses: nothing deleted means not allowed.
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conception.errors.notAllowed };
  return designDone(projectId, error, "removeDesignReference");
}
