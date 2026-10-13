"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designError, refreshConception } from "@/lib/design/actions/shared";
import {
  type ReferenceResult,
  addLinks,
  existingReference,
  invalid,
  referenceType,
  referenceUsage,
  targets,
  text,
} from "@/lib/design/reference-db";
import {
  MAX_REFERENCE_BYTES,
  isReferenceMime,
  isReferencePath,
} from "@/lib/design/reference-rules";
import { createClient } from "@/lib/supabase/server";

// Reference files of the Conception (étape 6), with the user's session:
// RLS lets the writers in (design_can_write). One resource per file (sha256).

const fileSchema = z.object({
  projectId: z.uuid(),
  path: z.string().max(200),
  fileName: z.string().trim().min(1).max(255),
  mime: z.string().refine(isReferenceMime),
  bytes: z.number().int().positive().max(MAX_REFERENCE_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  title: text(200),
  note: text(500),
  targets,
  type: referenceType,
  usage: referenceUsage,
});

/** Same file already in the project? Then only its links are added. */
export async function linkExistingFile(input: {
  projectId: string;
  sha256: string;
  targets: string[];
}): Promise<ReferenceResult | null> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      targets,
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const access = await requireApproved();
  if (!access.organizationId) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const id = await existingReference(supabase, v.projectId, {
    sha256: v.sha256,
  });
  if (!id) return null;
  const error = await addLinks(
    supabase,
    access.organizationId,
    v.projectId,
    id,
    v.targets,
  );
  if (error) return { ok: false, error: designError(error) };
  refreshConception(v.projectId);
  return { ok: true, deduped: true };
}

// The browser uploaded the object (storage RLS); this records it.
export async function recordReferenceFile(
  input: z.input<typeof fileSchema>,
): Promise<ReferenceResult> {
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const access = await requireApproved();
  const v = parsed.data;
  if (
    !access.organizationId ||
    !isReferencePath(v.path, access.organizationId, v.projectId)
  )
    return invalid();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_references")
    .insert({
      organization_id: access.organizationId,
      project_id: v.projectId,
      kind: "file",
      path: v.path,
      file_name: v.fileName,
      mime: v.mime,
      bytes: v.bytes,
      sha256: v.sha256,
      title: v.title,
      note: v.note,
      type: v.type,
      usage: v.usage,
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: designError(error ?? { message: "" }) };
  const linkError = await addLinks(
    supabase,
    access.organizationId,
    v.projectId,
    data.id,
    v.targets,
  );
  if (linkError) return { ok: false, error: designError(linkError) };
  refreshConception(v.projectId);
  return { ok: true, deduped: false };
}
