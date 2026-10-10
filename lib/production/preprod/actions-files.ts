"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { PRODUCTION_FILE_BUCKET } from "@/lib/production/files/rules";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import { forbidden, invalid, preprodFailure } from "./result";

const fileSchema = z.object({ projectId: z.uuid(), fileId: z.uuid() });

/** « Supprimer ce document »: the row first (storage refuses an object
 * still recorded), then the object. Lines read from it lose the link. */
export async function deleteProductionFile(
  input: z.input<typeof fileSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_files")
    .delete()
    .eq("id", parsed.data.fileId)
    .eq("project_id", parsed.data.projectId)
    .select("path");
  if (error) return preprodFailure(error);
  if (!data?.length) return forbidden;
  const { error: storageError } = await supabase.storage
    .from(PRODUCTION_FILE_BUCKET)
    .remove(data.map((f) => f.path));
  if (storageError)
    console.error(
      "[production] file object not removed:",
      storageError.message,
    );
  return prepDone(parsed.data.projectId);
}
