"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designError, refreshConception } from "@/lib/design/actions/shared";
import { loadConception } from "@/lib/design/conception";
import { MAX_IMPORT_CHARS } from "@/lib/design/intentions";
import { proposeDesignIntentions } from "@/lib/design/propose";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export type ImportBriefResult =
  | { ok: true; count: number }
  // The brief is kept as a source, but PO could not read it; `quota`: the
  // sentence to show when the day's limit of requests to PO is reached.
  | { ok: true; count: null; quota?: string }
  | { ok: false; error: string };

const importSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(MAX_IMPORT_CHARS),
});

/**
 * « Importer un brief existant »: the text is kept once as a source of the
 * Conception (data, never an instruction), then PO reads it and proposes
 * intentions attached to the deliverables, each to confirm by a person.
 */
export async function importDesignBrief(
  projectId: string,
  title: string,
  body: string,
): Promise<ImportBriefResult> {
  const parsed = importSchema.safeParse({ projectId, title, body });
  if (!parsed.success)
    return { ok: false, error: fr.conceptionWork.errors.invalid };
  const p = parsed.data;
  const access = await requireApproved();
  const project = await getProject(p.projectId);
  if (!project || !access.organizationId)
    return { ok: false, error: fr.conception.errors.generic };

  const supabase = await createClient();
  const { data: source, error } = await supabase
    .from("design_sources")
    .insert({
      organization_id: access.organizationId,
      project_id: p.projectId,
      kind: "import",
      title: p.title,
      body: p.body,
    })
    .select("id")
    .single();
  if (error || !source) {
    console.error("importDesignBrief:", error?.code, error?.message);
    return {
      ok: false,
      error: error ? designError(error) : fr.conception.errors.generic,
    };
  }

  const data = await loadConception(project, access);
  const proposed = data
    ? await proposeDesignIntentions(supabase, {
        organizationId: access.organizationId,
        projectId: p.projectId,
        sourceId: source.id,
        sourceType: "import",
        passages: [{ id: "brief", text: p.body }],
        data,
      })
    : ({ ok: false, error: "write" } as const);
  refreshConception(p.projectId);
  return proposed.ok
    ? { ok: true, count: proposed.count }
    : {
        ok: true,
        count: null,
        quota: proposed.error === "quota" ? proposed.message : undefined,
      };
}
