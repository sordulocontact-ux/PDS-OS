"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileExtension } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Demander des fichiers » in a collective's Master (lot 9 bis). The
// database decides who asks (the owner), whom (the team, an in-house
// engineer, the direction), for which titles (live, in the Master), and who
// deposits (the person asked, on their own line).

const t = fr.masterFileRequests;
const d = fr.masterWorkflow.publicPackage.deliver;

const refresh = (projectId: string) =>
  revalidatePath(routes.projectMaster(projectId), "layout");

const CODES = [
  "recipient_not_allowed",
  "title_abandoned",
  "title_not_in_master",
  "title_not_found",
  "request_closed",
  "note_too_long",
] as const;
const errorOf = (message: string | undefined, fallback: string) => {
  const code = CODES.find((c) => message?.includes(c));
  return code ? t.errors[code] : fallback;
};

const requestInput = z.object({
  projectId: z.uuid(),
  titleIds: z.array(z.uuid()).max(100),
  personId: z.uuid().nullable(),
  note: z.string().max(1000),
});

/** One line per title asked for; the person asked is told. */
export async function requestMasterFiles(
  value: z.input<typeof requestInput>,
): Promise<WriteResult & { count?: number }> {
  await requireApproved();
  const parsed = requestInput.safeParse(value);
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  const v = parsed.data;
  if (v.titleIds.length === 0)
    return { ok: false, error: t.errors.titlesRequired };
  if (!v.personId) return { ok: false, error: t.errors.personRequired };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_master_files", {
    p_project_id: v.projectId,
    p_title_ids: v.titleIds,
    p_person_id: v.personId,
    ...(v.note.trim() ? { p_note: v.note.trim() } : {}),
  });
  if (error) {
    if (error.code === "42501")
      return { ok: false, error: fr.auth.errors.forbidden };
    console.error("requestMasterFiles:", error.message);
    return { ok: false, error: errorOf(error.message, t.errors.failed) };
  }
  refresh(v.projectId);
  return { ok: true, count: data ?? 0 };
}

/** « Annuler la demande »: its author or the owner, an open line. */
export async function cancelMasterFileRequest(
  projectId: string,
  requestId: string,
): Promise<WriteResult> {
  await requireApproved();
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(requestId).success
  )
    return { ok: false, error: t.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_master_file_request", {
    p_request_id: requestId,
  });
  if (error) {
    if (error.code === "42501")
      return { ok: false, error: fr.auth.errors.forbidden };
    console.error("cancelMasterFileRequest:", error.message);
    return { ok: false, error: errorOf(error.message, t.errors.failed) };
  }
  refresh(projectId);
  return { ok: true };
}

const DELIVERY_CODES = [
  "invalid_extension",
  "invalid_file_name",
  "file_mismatch",
] as const;
const deliveryError = (message: string | undefined) => {
  const code = DELIVERY_CODES.find((c) => message?.includes(c));
  return code ? d.errors[code] : errorOf(message, t.errors.depositFailed);
};

/** « Déposer le fichier », step 1: a one-hour path of the title's folder. */
export async function openFileRequestDelivery(
  requestId: string,
  fileName: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const extension = fileExtension(fileName);
  if (!z.uuid().safeParse(requestId).success || !extension)
    return { ok: false, error: deliveryError(undefined) };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_file_request_delivery", {
    p_request_id: requestId,
    p_extension: extension,
    p_file_name: fileName,
  });
  if (error || !data) {
    console.error("openFileRequestDelivery:", error?.message);
    return { ok: false, error: deliveryError(error?.message) };
  }
  return { ok: true, path: data };
}

/** Step 2: the file becomes an audio version of the title; its line is
 * received (trigger). */
export async function recordFileRequestDelivery(
  projectId: string,
  path: string,
  fileName: string,
  mime: string,
  bytes: number,
  audioState: "demo" | "rough_mix",
): Promise<WriteResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !Number.isSafeInteger(bytes) ||
    !z.enum(["demo", "rough_mix"]).safeParse(audioState).success
  )
    return { ok: false, error: t.errors.depositFailed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_file_request_delivery", {
    p_path: path,
    p_file_name: fileName.slice(0, 255),
    p_mime: mime,
    p_bytes: bytes,
    p_audio_state: audioState,
  });
  if (error) {
    console.error("recordFileRequestDelivery:", error.message);
    return { ok: false, error: deliveryError(error.message) };
  }
  refresh(projectId);
  return { ok: true };
}
