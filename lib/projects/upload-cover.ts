import { projectShell } from "@/lib/i18n/fr/project-shell";
import { setProjectCover } from "@/lib/projects/cover-actions";
import {
  COVER_EXTENSIONS,
  coverFileProblem,
  PROJECT_COVER_BUCKET,
} from "@/lib/projects/cover-rules";
import { createClient } from "@/lib/supabase/client";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { projectShell };

/**
 * Browser-side: uploads the image straight to the private bucket (storage
 * RLS: can_edit_project_cover), then records it on the project through a
 * server action. Same flow as an artist's picture
 * (lib/catalog/upload-picture.ts). Used at creation, once the project
 * exists, and from its overview.
 */
export async function uploadProjectCover(input: {
  organizationId: string;
  projectId: string;
  file: File;
}): Promise<WriteResult> {
  const t = fr.projectShell.cover;
  const problem = coverFileProblem(input.file);
  if (problem) return { ok: false, error: t.problem[problem] };

  const ext = COVER_EXTENSIONS[input.file.type];
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(PROJECT_COVER_BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (error) {
    console.error("[projects] cover upload failed:", error.message);
    return { ok: false, error: t.failed };
  }
  return setProjectCover({ projectId: input.projectId, path });
}
