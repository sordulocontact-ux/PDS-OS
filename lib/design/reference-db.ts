import "server-only";

import { z } from "zod";

import { DIRECTION_TARGET, toLink } from "@/lib/design/reference-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Database helpers of the references (étape 6), shared by their actions.
// Not a "use server" file: none of this is callable from the browser.

export type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ReferenceResult =
  { ok: true; deduped: boolean } | { ok: false; error: string };

export const targets = z
  .array(z.union([z.literal(DIRECTION_TARGET), z.uuid()]))
  .max(60)
  .transform((list) => [...new Set(list)]);
export const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
export const invalid = () => ({
  ok: false as const,
  error: fr.conceptionRefs.errors.invalid,
});

/** Adds the links the reference lacks, never removing any. */
export async function addLinks(
  supabase: Supabase,
  organizationId: string,
  projectId: string,
  referenceId: string,
  keys: string[],
) {
  const { data: existing } = await supabase
    .from("design_reference_links")
    .select("design_deliverable_id")
    .eq("reference_id", referenceId);
  const have = new Set(
    (existing ?? []).map((l) => l.design_deliverable_id ?? DIRECTION_TARGET),
  );
  const missing = keys.filter((k) => !have.has(k));
  if (missing.length === 0) return null;
  const { error } = await supabase.from("design_reference_links").insert(
    missing.map((key) => {
      const link = toLink(key);
      return {
        organization_id: organizationId,
        project_id: projectId,
        reference_id: referenceId,
        target: link.target,
        design_deliverable_id: link.deliverableId,
      };
    }),
  );
  return error;
}

/** A reference of the project already holding this file or address. */
export async function existingReference(
  supabase: Supabase,
  projectId: string,
  match: { sha256: string } | { url: string },
): Promise<string | null> {
  const query = supabase
    .from("design_references")
    .select("id")
    .eq("project_id", projectId);
  const { data } = await (
    "sha256" in match
      ? query.eq("sha256", match.sha256)
      : query.eq("url", match.url)
  ).maybeSingle();
  return data?.id ?? null;
}
