"use server";

import { z } from "zod";

import {
  FILE_KINDS,
  MAX_ACTIVATION_FILE_BYTES,
  RESTRICTED_FILE_KINDS,
} from "@/lib/activations/model";
import { activationFailure } from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$/;

const schema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  kind: z.enum(FILE_KINDS),
  path: z.string().regex(PATH),
  fileName: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(255),
  bytes: z.number().int().positive().max(MAX_ACTIVATION_FILE_BYTES),
});

export type RecordActivationFileResult =
  { ok: true; fileId: string } | { ok: false; error: string };

/** The browser uploaded the object (storage RLS: a writer of an activation of
 * the project); this records it. Invoices and payment proofs are restricted. */
export async function recordActivationFile(
  input: z.input<typeof schema>,
): Promise<RecordActivationFileResult> {
  const access = await requireApproved();
  const parsed = schema.safeParse(input);
  if (!access.organizationId || !parsed.success)
    return { ok: false, error: fr.activations.errors.invalid };
  const v = parsed.data;
  if (!v.path.startsWith(`${access.organizationId}/${v.projectId}/`))
    return { ok: false, error: fr.activations.errors.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activation_files")
    .insert({
      organization_id: access.organizationId,
      project_id: v.projectId,
      activation_id: v.activationId,
      kind: v.kind,
      path: v.path,
      file_name: v.fileName,
      mime: v.mime,
      bytes: v.bytes,
      restricted: RESTRICTED_FILE_KINDS.includes(v.kind),
    })
    .select("id")
    .single();
  if (error || !data) return activationFailure(error ?? {});
  return { ok: true, fileId: data.id };
}
