"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.masterSource;

const confirmSchema = z
  .object({
    projectId: z.uuid(),
    masterId: z.uuid(),
    fileId: z.uuid(),
    vocalsFinal: z.boolean(),
    vocalsPending: z.string().trim().max(200).nullable(),
    plan: z.enum(["wait", "anticipate"]).nullable(),
  })
  .refine((v) => v.vocalsFinal || v.plan !== null, { path: ["plan"] });

export type ConfirmSourceInput = z.input<typeof confirmSchema>;

const errorOf = (error: { code?: string; message: string }) =>
  error.code === "42501"
    ? t.errors.forbidden
    : error.code === "23503" ||
        error.message.includes("source_not_an_audio_version_of_title")
      ? t.errors.notASource
      : t.errors.failed;

const refresh = (projectId: string) =>
  revalidatePath(routes.projectMaster(projectId), "layout");

/**
 * « Utiliser cette version » (proto `master-v2.html`): a new confirmation of
 * a title's source, with whether its vocals are final and, when not, the
 * choice to wait for them or anticipate. Written with the owner's session;
 * the database checks the owner, the title and the file.
 */
export async function confirmSource(
  input: ConfirmSourceInput,
): Promise<WriteResult> {
  const parsed = confirmSchema.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !access.organizationId)
    return {
      ok: false,
      error: parsed.success ? t.errors.failed : t.errors.plan,
    };
  const v = parsed.data;
  return withOutcome(v.projectId, ["master"], t.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("master_flow_sources").insert({
      organization_id: access.organizationId!,
      project_id: v.projectId,
      master_id: v.masterId,
      file_id: v.fileId,
      vocals_final: v.vocalsFinal,
      vocals_pending: v.vocalsFinal ? null : v.vocalsPending || null,
      plan: v.vocalsFinal ? null : v.plan,
    });
    if (error) {
      console.error("confirmSource:", error.code, error.message);
      return { ok: false, error: errorOf(error) };
    }
    refresh(v.projectId);
    return { ok: true };
  });
}

const replaceSchema = z.object({
  projectId: z.uuid(),
  masterId: z.uuid(),
  fileId: z.uuid(),
});

/**
 * « Remplacer la source et prévenir Karim »: the version with the final
 * vocals becomes the source, and the live mix link shows it (same token,
 * the file and its stems signed with the owner's session for the link's
 * lifetime): the engineer's next versions start from there.
 */
export async function replaceSource(
  input: z.input<typeof replaceSchema>,
): Promise<WriteResult> {
  const parsed = replaceSchema.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.errors.failed };
  const v = parsed.data;
  let notice: string | undefined;
  const result = await withOutcome(
    v.projectId,
    ["master"],
    t.newer.done,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("master_flow_sources").insert({
        organization_id: access.organizationId!,
        project_id: v.projectId,
        master_id: v.masterId,
        file_id: v.fileId,
        vocals_final: true,
      });
      if (error) {
        console.error("replaceSource:", error.code, error.message);
        return { ok: false, error: errorOf(error) };
      }
      if (!(await refreshLink(v.projectId, v.masterId, v.fileId)))
        notice = t.errors.linkFailed;
      refresh(v.projectId);
      return { ok: true };
    },
  );
  return result.ok && notice ? { ...result, notice } : result;
}

/** The live mix link carries the new source and the title's stems. */
async function refreshLink(
  projectId: string,
  masterId: string,
  fileId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("master_transmissions")
    .select("expires_at")
    .eq("project_id", projectId)
    .eq("role", "mix")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Nothing sent yet: the next sending takes the new source.
  if (!link) return true;
  const seconds = Math.max(
    3600,
    Math.floor((Date.parse(link.expires_at) - Date.now()) / 1000),
  );
  const { data: files, error } = await supabase
    .from("master_files")
    .select("id, series_id, category, path, file_name, audio_state")
    .eq("master_id", masterId)
    .or(`id.eq.${fileId},category.eq.stems`)
    .order("created_at", { ascending: false });
  if (error || !files) return false;
  const seen = new Set<string>();
  const stems = files.filter(
    (f) =>
      f.category === "stems" && !seen.has(f.series_id) && seen.add(f.series_id),
  );
  const source = files.find((f) => f.id === fileId);
  if (!source) return false;
  const signed = await supabase.storage.from("master-files").createSignedUrls(
    [source, ...stems].map((f) => f.path),
    seconds,
  );
  if (signed.error) return false;
  const urlOf = new Map(
    signed.data.flatMap((e) =>
      e.path && e.signedUrl ? [[e.path, e.signedUrl] as const] : [],
    ),
  );
  const state = source.audio_state as keyof typeof fr.catalog.audioStates;
  const { data, error: rpcError } = await supabase.rpc(
    "refresh_master_transmission_source",
    {
      p_project_id: projectId,
      p_master_id: masterId,
      p_source: {
        fileName: source.file_name,
        url: urlOf.get(source.path) ?? "",
        state: fr.catalog.audioStates[state] ?? "",
      },
      p_stems: stems.map((f) => ({
        fileName: f.file_name,
        url: urlOf.get(f.path) ?? "",
      })),
    },
  );
  if (rpcError) console.error("refreshLink:", rpcError.message);
  return !rpcError && data !== null;
}

const declareSchema = z.object({
  projectId: z.uuid(),
  masterId: z.uuid(),
  fileId: z.uuid(),
  reason: z.string().trim().min(1).max(2000),
});

/**
 * « Utiliser ce mix comme mix final » with « Pourquoi ce mix est le bon »:
 * the title skips the Mixage (declare_mix_final, the owner only).
 */
export async function declareExistingMix(
  input: z.input<typeof declareSchema>,
): Promise<WriteResult> {
  const parsed = declareSchema.safeParse(input);
  await requireApproved();
  if (!parsed.success) return { ok: false, error: t.errors.reason };
  const v = parsed.data;
  return withOutcome(v.projectId, ["master"], t.existing.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("declare_mix_final", {
      p_project_id: v.projectId,
      p_master_id: v.masterId,
      p_file_id: v.fileId,
      p_note: v.reason,
    });
    if (error) {
      console.error("declareExistingMix:", error.code, error.message);
      return {
        ok: false,
        error: error.message.includes("reason_required")
          ? t.errors.reason
          : error.code === "42501"
            ? t.errors.forbidden
            : t.errors.failed,
      };
    }
    refresh(v.projectId);
    return { ok: true };
  });
}
