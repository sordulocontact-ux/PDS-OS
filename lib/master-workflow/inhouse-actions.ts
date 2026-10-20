"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileExtension } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The in-house engineer (proto `master:hugo`): the owner assigns the round,
// the member deposits his versions in the app. The database checks who
// (assign_master_round, open_ / record_master_member_delivery).

const t = fr.masterInHouse;
const d = fr.masterWorkflow.publicPackage.deliver;
const stage = z.enum(["mix", "mastering"]);

const refresh = (projectId: string) =>
  revalidatePath(routes.projectMaster(projectId), "layout");

/** « Assigner à Hugo Martin ». */
export async function assignRound(
  projectId: string,
  round: "mix" | "mastering",
  name: string,
): Promise<WriteResult> {
  if (!z.uuid().safeParse(projectId).success || !stage.safeParse(round).success)
    return { ok: false, error: t.errors.failed };
  await requireApproved();
  return withOutcome(projectId, ["master"], t.assigned(name), async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_master_round", {
      p_project_id: projectId,
      p_role: round,
    });
    if (error) {
      console.error("assignRound:", error.message);
      return {
        ok: false,
        error: error.message.includes("vocals_awaited")
          ? t.errors.vocals
          : error.code === "42501"
            ? fr.auth.errors.forbidden
            : t.errors.failed,
      };
    }
    refresh(projectId);
    return { ok: true };
  });
}

const CODES = [
  "invalid_extension",
  "invalid_file_name",
  "file_mismatch",
] as const;
const errorOf = (message: string | undefined) => {
  const code = CODES.find((c) => message?.includes(c));
  return code ? d.errors[code] : d.errors.failed;
};

/** « Déposer ma version », step 1: a one-time path of master-files. */
export async function openMemberDelivery(
  projectId: string,
  masterId: string,
  round: "mix" | "mastering",
  fileName: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const extension = fileExtension(fileName);
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(masterId).success ||
    !stage.safeParse(round).success ||
    !extension
  )
    return { ok: false, error: errorOf(undefined) };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_master_member_delivery", {
    p_project_id: projectId,
    p_master_id: masterId,
    p_stage: round,
    p_extension: extension,
    p_file_name: fileName,
  });
  if (error || !data) {
    console.error("openMemberDelivery:", error?.message);
    return { ok: false, error: errorOf(error?.message) };
  }
  return { ok: true, path: data };
}

/** Step 2: the file becomes a version of the title (mix or master). */
export async function recordMemberDelivery(
  projectId: string,
  path: string,
  fileName: string,
  mime: string,
  bytes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(projectId).success || !Number.isSafeInteger(bytes))
    return { ok: false, error: errorOf(undefined) };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_master_member_delivery", {
    p_path: path,
    p_file_name: fileName.slice(0, 255),
    p_mime: mime,
    p_bytes: bytes,
  });
  if (error) {
    console.error("recordMemberDelivery:", error.message);
    return { ok: false, error: errorOf(error.message) };
  }
  refresh(projectId);
  return { ok: true };
}
